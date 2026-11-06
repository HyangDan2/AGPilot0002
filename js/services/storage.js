/**
 * HD2Lab Todo Master - Storage Service with Migration & Quota Protection
 */

import { migrateTodoList } from '../models/todo.js';
import { getLocalDateString } from '../utils/date.js';
import { safeJSONParse } from '../utils/security.js';

export const STORAGE_KEY = 'todo_master_items_v1';
export const THEME_KEY = 'todo_master_theme_v1';
export const SCHEMA_VERSION = 2;

/**
 * Returns the active storage engine (window.localStorage or custom mock).
 * @param {Storage} [customStorage]
 * @returns {Storage|null}
 */
export function getStorage(customStorage = null) {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Test if localStorage is accessible (can throw in private mode or iframe restrictions)
      const testKey = '__hd2_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Default sample tasks for new installations.
 */
export function getDefaultTodos() {
  const today = getLocalDateString(new Date());
  return [
    {
      id: 'sample_1',
      title: 'HD2Lab Server HQ 아키텍처 점검 및 서비스 배포',
      category: '업무',
      priority: 'high',
      dueDate: today,
      recurrence: 'daily',
      completed: false,
      completedAt: null,
      order: 0,
      subtasks: [
        { id: 'sub_1', title: '배포 상태 헬스체크', completed: true },
        { id: 'sub_2', title: '도메인 SSL 인증서 만료일 확인', completed: false }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'sample_2',
      title: '데일리 할 일 목록 정리 및 우선순위 분배',
      category: '개인',
      priority: 'medium',
      dueDate: '',
      recurrence: 'none',
      completed: true,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      order: 1,
      subtasks: [],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'sample_3',
      title: 'AI 에이전트 실험 워크스페이스 구축',
      category: '공부',
      priority: 'high',
      dueDate: '',
      recurrence: 'weekly',
      completed: false,
      completedAt: null,
      order: 2,
      subtasks: [],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
}

/**
 * Load todos from storage, apply migrations, and handle errors.
 * @param {Storage} [storageEngine]
 * @returns {{ todos: Array<object>, isMigrated: boolean, error: string|null }}
 */
export function loadStoredTodos(storageEngine = null) {
  const storage = getStorage(storageEngine);
  if (!storage) {
    return {
      todos: getDefaultTodos(),
      isMigrated: false,
      error: '로컬 스토리지를 사용할 수 없어 임시 메모리 모드로 동작합니다.'
    };
  }

  try {
    const rawData = storage.getItem(STORAGE_KEY);
    if (!rawData) {
      // First visit: save default sample tasks
      const defaultList = getDefaultTodos();
      saveStoredTodos(defaultList, storage);
      return { todos: defaultList, isMigrated: false, error: null };
    }

    const parsed = safeJSONParse(rawData, null);
    if (!parsed || !Array.isArray(parsed)) {
      // Data corrupted: save backup copy before resetting
      storage.setItem(`${STORAGE_KEY}_corrupted_backup_${Date.now()}`, rawData);
      const defaultList = getDefaultTodos();
      saveStoredTodos(defaultList, storage);
      return {
        todos: defaultList,
        isMigrated: false,
        error: '기존 데이터가 손상되어 복구 백업 후 초기화되었습니다.'
      };
    }

    // Migrate to v2
    const migrated = migrateTodoList(parsed);
    // Write back migrated structure to keep storage synchronized
    saveStoredTodos(migrated, storage);

    return { todos: migrated, isMigrated: true, error: null };
  } catch (err) {
    return {
      todos: getDefaultTodos(),
      isMigrated: false,
      error: `저장소 읽기 오류: ${err.message || '알 수 없는 오류'}`
    };
  }
}

/**
 * Save todos into storage with quota error handling.
 * @param {Array<object>} todos
 * @param {Storage} [storageEngine]
 * @returns {{ success: boolean, error: string|null, code: string|null }}
 */
export function saveStoredTodos(todos, storageEngine = null) {
  const storage = getStorage(storageEngine);
  if (!storage) {
    return { success: false, error: '저장소를 사용할 수 없습니다.', code: 'STORAGE_UNAVAILABLE' };
  }

  try {
    const serialized = JSON.stringify(todos);
    storage.setItem(STORAGE_KEY, serialized);
    return { success: true, error: null, code: null };
  } catch (err) {
    // QuotaExceededError check
    const isQuota =
      err.name === 'QuotaExceededError' ||
      err.code === 22 ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED';

    const code = isQuota ? 'QUOTA_EXCEEDED' : 'STORAGE_ERROR';
    const errorMsg = isQuota
      ? '브라우저 저장 공간이 가득 차 데이터를 저장할 수 없습니다.'
      : `저장 실패: ${err.message || '알 수 없는 오류'}`;

    return { success: false, error: errorMsg, code };
  }
}

/**
 * Load saved theme.
 * @param {Storage} [storageEngine]
 * @returns {'dark'|'light'}
 */
export function loadStoredTheme(storageEngine = null) {
  const storage = getStorage(storageEngine);
  if (!storage) return 'dark';
  const saved = storage.getItem(THEME_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

/**
 * Save theme choice.
 * @param {'dark'|'light'} theme
 * @param {Storage} [storageEngine]
 */
export function saveStoredTheme(theme, storageEngine = null) {
  const storage = getStorage(storageEngine);
  if (!storage) return;
  try {
    storage.setItem(THEME_KEY, theme === 'light' ? 'light' : 'dark');
  } catch (err) {
    console.warn('Failed to persist theme choice:', err);
  }
}
