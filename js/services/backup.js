/**
 * HD2Lab Todo Master - Backup, Export & Import Engine with Schema Validation
 */

import { validateAndSanitizeTodo } from '../models/todo.js';
import { generateId, safeJSONParse } from '../utils/security.js';
import { getLocalDateString } from '../utils/date.js';

export const BACKUP_VERSION = 2;
export const APP_IDENTIFIER = 'HD2Lab Todo Master';

/**
 * Creates a versioned export payload.
 * @param {Array<object>} todos
 * @returns {string} - Formatted JSON string
 */
export function createExportPayload(todos) {
  const safeTodos = Array.isArray(todos) ? todos : [];
  const payload = {
    app: APP_IDENTIFIER,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    itemCount: safeTodos.length,
    todos: safeTodos
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates any imported backup payload (supports v2 object or legacy v1 array).
 * @param {string|object} rawInput
 * @returns {{
 *   isValid: boolean,
 *   version: number,
 *   validTodos: Array<object>,
 *   invalidCount: number,
 *   totalCount: number,
 *   error: string|null
 * }}
 */
export function validateBackupPayload(rawInput) {
  let parsed = rawInput;
  if (typeof rawInput === 'string') {
    parsed = safeJSONParse(rawInput, null);
    if (!parsed) {
      return {
        isValid: false,
        version: 0,
        validTodos: [],
        invalidCount: 0,
        totalCount: 0,
        error: '유효한 JSON 파일이 아닙니다.'
      };
    }
  }

  let version = 1;
  let rawList = [];

  if (Array.isArray(parsed)) {
    // Legacy v1 raw array format
    version = 1;
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Version 2 structure
    version = parsed.version || 2;
    if (version > BACKUP_VERSION) {
      return {
        isValid: false,
        version,
        validTodos: [],
        invalidCount: 0,
        totalCount: 0,
        error: `지원되지 않는 최신 백업 버전(v${version})입니다. 앱을 업데이트해 주세요.`
      };
    }

    if (Array.isArray(parsed.todos)) {
      rawList = parsed.todos;
    } else {
      return {
        isValid: false,
        version,
        validTodos: [],
        invalidCount: 0,
        totalCount: 0,
        error: '백업 파일 내 할 일 목록(todos)이 배열 형식이 아닙니다.'
      };
    }
  } else {
    return {
      isValid: false,
      version: 0,
      validTodos: [],
      invalidCount: 0,
      totalCount: 0,
      error: '인식할 수 없는 백업 데이터 형식입니다.'
    };
  }

  // Item count safeguard
  if (rawList.length > 5000) {
    return {
      isValid: false,
      version,
      validTodos: [],
      invalidCount: 0,
      totalCount: rawList.length,
      error: '최대 허용 항목 수(5000개)를 초과하여 복원할 수 없습니다.'
    };
  }

  const validTodos = [];
  let invalidCount = 0;
  const seenIds = new Set();

  rawList.forEach((raw, index) => {
    const item = validateAndSanitizeTodo(raw, index);
    if (item) {
      // Ensure unique ID inside import set
      if (seenIds.has(item.id)) {
        item.id = generateId('todo');
      }
      seenIds.add(item.id);
      validTodos.push(item);
    } else {
      invalidCount++;
    }
  });

  if (rawList.length > 0 && validTodos.length === 0) {
    return {
      isValid: false,
      version,
      validTodos: [],
      invalidCount,
      totalCount: rawList.length,
      error: '백업 파일에 유효한 할 일 항목이 하나도 없습니다.'
    };
  }

  return {
    isValid: true,
    version,
    validTodos,
    invalidCount,
    totalCount: rawList.length,
    error: null
  };
}

/**
 * Analyzes duplicates between existing todos and incoming backup todos.
 * A task is considered duplicate if it shares the same ID OR (same title + same dueDate).
 * @param {Array<object>} existingTodos
 * @param {Array<object>} incomingTodos
 * @returns {{
 *   totalCount: number,
 *   newCount: number,
 *   duplicateCount: number,
 *   duplicates: Array<object>
 * }}
 */
export function analyzeBackupDuplicates(existingTodos, incomingTodos) {
  const existingIdSet = new Set(existingTodos.map(t => t.id));
  const existingKeySet = new Set(existingTodos.map(t => `${t.title.trim()}_${t.dueDate || ''}`));

  let duplicateCount = 0;
  const duplicates = [];

  incomingTodos.forEach(item => {
    const isDupId = existingIdSet.has(item.id);
    const key = `${item.title.trim()}_${item.dueDate || ''}`;
    const isDupKey = existingKeySet.has(key);

    if (isDupId || isDupKey) {
      duplicateCount++;
      duplicates.push(item);
    }
  });

  return {
    totalCount: incomingTodos.length,
    newCount: incomingTodos.length - duplicateCount,
    duplicateCount,
    duplicates
  };
}

/**
 * Merge imported todos safely with existing todos, skipping unintended duplicates.
 * @param {Array<object>} existingTodos
 * @param {Array<object>} importedTodos
 * @returns {Array<object>}
 */
export function mergeTodosSafely(existingTodos, importedTodos) {
  const existingIdSet = new Set(existingTodos.map(t => t.id));
  const existingKeySet = new Set(existingTodos.map(t => `${t.title.trim()}_${t.dueDate || ''}`));

  const merged = [...existingTodos];
  let maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order || 0), -1);

  importedTodos.forEach(imported => {
    const key = `${imported.title.trim()}_${imported.dueDate || ''}`;
    // If exact duplicate exists, skip to prevent unintended duplication
    if (existingIdSet.has(imported.id) || existingKeySet.has(key)) {
      return;
    }

    const item = { ...imported };
    if (existingIdSet.has(item.id)) {
      item.id = generateId('todo');
    }
    existingIdSet.add(item.id);
    existingKeySet.add(key);

    maxOrder++;
    item.order = maxOrder;
    merged.push(item);
  });

  return merged;
}

/**
 * Merge imported todos with existing todos, preventing ID collisions.
 * @param {Array<object>} existingTodos
 * @param {Array<object>} importedTodos
 * @returns {Array<object>}
 */
export function mergeTodos(existingTodos, importedTodos) {
  const existingMap = new Map();
  const existingIds = new Set();

  existingTodos.forEach(item => {
    existingMap.set(item.id, item);
    existingIds.add(item.id);
  });

  const merged = [...existingTodos];
  let maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order || 0), -1);

  importedTodos.forEach(imported => {
    const item = { ...imported };
    if (existingIds.has(item.id)) {
      // Collision with existing task: assign a new ID to the imported copy
      item.id = generateId('todo');
    }
    existingIds.add(item.id);
    maxOrder++;
    item.order = maxOrder;
    merged.push(item);
  });

  return merged;
}

/**
 * Trigger client-side browser file download for export.
 * @param {string} payload - JSON string
 * @param {string} [filename]
 */
export function downloadBackupFile(payload, filename = null) {
  if (typeof document === 'undefined') return;

  const actualFilename = filename || `hd2lab_todo_backup_${getLocalDateString(new Date())}.json`;
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = actualFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
