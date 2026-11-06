/**
 * HD2Lab Todo Master - Todo Data Model & Schema Migration
 */

import { generateId, sanitizeText } from '../utils/security.js';
import { getLocalDateString, parseLocalDate } from '../utils/date.js';

export const VALID_PRIORITIES = ['high', 'medium', 'low'];
export const VALID_CATEGORIES = ['개인', '업무', '공부', '쇼핑', '기타'];
export const VALID_RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];

/**
 * Creates a valid Subtask object.
 * @param {string} title
 * @param {boolean} [completed=false]
 * @param {string} [id]
 * @returns {{ id: string, title: string, completed: boolean }}
 */
export function createSubtask(title, completed = false, id = null) {
  const cleanTitle = sanitizeText(title, 200);
  return {
    id: id || generateId('sub'),
    title: cleanTitle,
    completed: Boolean(completed)
  };
}

/**
 * Creates a new Todo item with default values and validation.
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.category='개인']
 * @param {'high'|'medium'|'low'} [params.priority='medium']
 * @param {string} [params.dueDate='']
 * @param {'none'|'daily'|'weekly'|'monthly'} [params.recurrence='none']
 * @param {number} [params.order=0]
 * @param {Array<{ title: string, completed?: boolean }>} [params.subtasks=[]]
 * @returns {object}
 */
export function createTodo({
  title,
  category = '개인',
  priority = 'medium',
  dueDate = '',
  recurrence = 'none',
  order = 0,
  subtasks = []
}) {
  const now = new Date().toISOString();
  const cleanTitle = sanitizeText(title, 300);
  if (!cleanTitle) {
    throw new Error('할 일 제목을 입력해 주세요.');
  }

  const cleanCategory = VALID_CATEGORIES.includes(category) ? category : '기타';
  const cleanPriority = VALID_PRIORITIES.includes(priority) ? priority : 'medium';
  const cleanRecurrence = VALID_RECURRENCES.includes(recurrence) ? recurrence : 'none';

  return {
    id: generateId('todo'),
    title: cleanTitle,
    category: cleanCategory,
    priority: cleanPriority,
    dueDate: typeof dueDate === 'string' ? dueDate.trim() : '',
    recurrence: cleanRecurrence,
    completed: false,
    completedAt: null,
    order: typeof order === 'number' ? order : 0,
    subtasks: Array.isArray(subtasks)
      ? subtasks
          .map(st => (typeof st === 'string' ? createSubtask(st) : createSubtask(st.title, st.completed, st.id)))
          .filter(st => st.title.length > 0)
      : [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Validates and repairs an arbitrary todo object (from storage or JSON import).
 * Returns a sanitized, valid Todo object, or null if completely unrecoverable.
 * @param {any} raw
 * @param {number} [fallbackOrder=0]
 * @returns {object|null}
 */
export function validateAndSanitizeTodo(raw, fallbackOrder = 0) {
  if (!raw || typeof raw !== 'object') return null;

  const rawTitle = raw.title || raw.text;
  if (!rawTitle || typeof rawTitle !== 'string') return null;

  const cleanTitle = sanitizeText(rawTitle, 300);
  if (!cleanTitle) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : generateId('todo');
  const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : '기타';
  const priority = VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'medium';
  const recurrence = VALID_RECURRENCES.includes(raw.recurrence) ? raw.recurrence : 'none';

  let dueDate = '';
  if (typeof raw.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate.trim())) {
    if (parseLocalDate(raw.dueDate.trim()) !== null) {
      dueDate = raw.dueDate.trim();
    }
  }

  const completed = Boolean(raw.completed || raw.isCompleted);
  const now = new Date().toISOString();

  let createdAt = now;
  if (raw.createdAt && !isNaN(new Date(raw.createdAt).getTime())) {
    createdAt = new Date(raw.createdAt).toISOString();
  }

  let updatedAt = createdAt;
  if (raw.updatedAt && !isNaN(new Date(raw.updatedAt).getTime())) {
    updatedAt = new Date(raw.updatedAt).toISOString();
  }

  let completedAt = null;
  if (completed) {
    if (raw.completedAt && !isNaN(new Date(raw.completedAt).getTime())) {
      completedAt = new Date(raw.completedAt).toISOString();
    } else {
      completedAt = updatedAt;
    }
  }

  const order = typeof raw.order === 'number' && !isNaN(raw.order) ? raw.order : fallbackOrder;

  // Validate Subtasks with unique IDs
  let subtasks = [];
  const seenSubtaskIds = new Set();
  if (Array.isArray(raw.subtasks)) {
    subtasks = raw.subtasks
      .map(st => {
        if (!st) return null;
        if (typeof st === 'string') return createSubtask(st);
        if (typeof st === 'object' && typeof st.title === 'string') {
          let sId = typeof st.id === 'string' && st.id.trim() ? st.id.trim() : generateId('sub');
          if (seenSubtaskIds.has(sId)) {
            sId = generateId('sub');
          }
          seenSubtaskIds.add(sId);
          return createSubtask(st.title, st.completed, sId);
        }
        return null;
      })
      .filter(st => st !== null && st.title.length > 0);
  }

  return {
    id,
    title: cleanTitle,
    category,
    priority,
    dueDate,
    recurrence,
    completed,
    completedAt,
    order,
    subtasks,
    createdAt,
    updatedAt
  };
}

/**
 * Migration helper to ensure legacy localStorage array (v1) is upgraded seamlessly to v2.
 * @param {Array<any>} rawList
 * @returns {Array<object>}
 */
export function migrateTodoList(rawList) {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set();
  const migrated = [];

  rawList.forEach((raw, index) => {
    const item = validateAndSanitizeTodo(raw, index);
    if (!item) return;

    // Handle ID collisions safely
    if (seenIds.has(item.id)) {
      item.id = generateId('todo');
    }
    seenIds.add(item.id);

    // If order was not set in legacy item, set by index
    if (typeof raw.order !== 'number') {
      item.order = index;
    }

    migrated.push(item);
  });

  return migrated;
}
