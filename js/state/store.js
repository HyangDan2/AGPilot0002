/**
 * HD2Lab Todo Master - Central Application State Store
 */

import { createTodo, createSubtask } from '../models/todo.js';
import { calculateDDay, calculateNextRecurringDate, getLocalDateString } from '../utils/date.js';
import { generateId, sanitizeText } from '../utils/security.js';
import { saveStoredTodos, saveStoredTheme } from '../services/storage.js';

export class Store {
  /**
   * @param {object} [initialOptions]
   * @param {Array<object>} [initialOptions.todos=[]]
   * @param {'dark'|'light'} [initialOptions.theme='dark']
   * @param {Storage} [initialOptions.storageEngine=null]
   */
  constructor({ todos = [], theme = 'dark', storageEngine = null } = {}) {
    this.storageEngine = storageEngine;
    this.todos = Array.isArray(todos) ? [...todos] : [];
    this.theme = theme;

    this.filter = 'all'; // 'all' | 'today' | 'upcoming' | 'overdue' | 'active' | 'completed' | 'focus'
    this.category = 'all';
    this.searchQuery = '';
    this.sort = 'manual'; // 'manual' | 'created-desc' | 'created-asc' | 'due-date' | 'priority'

    this.subscribers = new Set();
    this.lastDeletedItem = null;
    this.undoRegistry = new Map(); // undoId -> undoRecord
    this.onStorageError = null;

    // Reliability & Persistence tracking
    this.storageStatus = { isOk: true, lastError: null, code: null };
    this.lastPersistedTodos = JSON.parse(JSON.stringify(this.todos));
  }

  /**
   * Subscribe to state changes.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify() {
    this.persist();
    for (const listener of this.subscribers) {
      try {
        listener(this);
      } catch (err) {
        console.error('Subscriber listener error:', err);
      }
    }
  }

  persist() {
    const res = saveStoredTodos(this.todos, this.storageEngine);
    saveStoredTheme(this.theme, this.storageEngine);

    if (!res.success) {
      this.storageStatus = { isOk: false, lastError: res.error, code: res.code };
      if (typeof this.onStorageError === 'function') {
        this.onStorageError(this.storageStatus);
      }
      return false;
    } else {
      this.storageStatus = { isOk: true, lastError: null, code: null };
      this.lastPersistedTodos = JSON.parse(JSON.stringify(this.todos));
      return true;
    }
  }

  /**
   * Rollback memory state to the last successfully persisted state.
   * @returns {boolean}
   */
  rollbackToLastPersisted() {
    if (!this.lastPersistedTodos) return false;
    this.todos = JSON.parse(JSON.stringify(this.lastPersistedTodos));
    for (const listener of this.subscribers) {
      try {
        listener(this);
      } catch (err) {
        console.error(err);
      }
    }
    return true;
  }

  // Setters
  setFilter(filter) {
    this.filter = filter;
    this.notify();
  }

  setCategory(category) {
    this.category = category;
    this.notify();
  }

  setSearchQuery(query) {
    this.searchQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
    this.notify();
  }

  setSort(sort) {
    this.sort = sort;
    this.notify();
  }

  setTheme(theme) {
    this.theme = theme === 'light' ? 'light' : 'dark';
    this.notify();
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.notify();
    return this.theme;
  }

  // Task Operations
  addTodo(params) {
    const minOrder = this.todos.reduce((min, t) => Math.min(min, t.order || 0), 0);
    const newTodo = createTodo({
      ...params,
      order: minOrder - 1 // Place newly added items at the top in manual order
    });
    this.todos.unshift(newTodo);
    this.notify();
    return newTodo;
  }

  updateTodo(id, updates) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const current = this.todos[index];
    const updated = {
      ...current,
      ...updates,
      id: current.id, // ID must not change
      updatedAt: new Date().toISOString()
    };

    if (typeof updates.title === 'string') {
      const cleanTitle = sanitizeText(updates.title, 300);
      if (!cleanTitle) return null;
      updated.title = cleanTitle;
    }

    this.todos[index] = updated;
    this.notify();
    return updated;
  }

  toggleTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const todo = this.todos[index];
    const willBeCompleted = !todo.completed;
    const now = new Date().toISOString();

    const updated = {
      ...todo,
      completed: willBeCompleted,
      completedAt: willBeCompleted ? now : null,
      updatedAt: now
    };

    let undoId = null;

    // If recurring task was completed and has a recurrence rule, auto-schedule next occurrence
    if (willBeCompleted && todo.recurrence && todo.recurrence !== 'none') {
      const nextDueDate = calculateNextRecurringDate(todo.dueDate, todo.recurrence);
      const originalRecurrence = todo.recurrence;

      // Spawn next cycle task
      const nextTodo = createTodo({
        title: todo.title,
        category: todo.category,
        priority: todo.priority,
        dueDate: nextDueDate,
        recurrence: todo.recurrence,
        order: (todo.order || 0) - 0.5,
        subtasks: todo.subtasks.map(st => ({ title: st.title, completed: false }))
      });

      // Mark current occurrence as completed non-recurring
      updated.recurrence = 'none';
      this.todos.splice(index, 1, updated, nextTodo);

      undoId = generateId('undo');
      this.undoRegistry.set(undoId, {
        undoId,
        type: 'recurring_completion',
        completedId: todo.id,
        spawnedId: nextTodo.id,
        originalRecurrence,
        timestamp: Date.now()
      });
    } else {
      this.todos[index] = updated;
    }

    this.notify();
    return { ...updated, undoId };
  }

  deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const [deleted] = this.todos.splice(index, 1);
    const undoId = generateId('undo');
    this.undoRegistry.set(undoId, {
      undoId,
      type: 'delete_single',
      items: [{ item: deleted, originalIndex: index }],
      timestamp: Date.now()
    });

    this.lastDeletedItem = { item: deleted, originalIndex: index }; // backward compatibility
    this.notify();
    return { ...deleted, undoId };
  }

  undo(undoId = null) {
    let record = null;
    if (undoId) {
      record = this.undoRegistry.get(undoId);
    } else {
      // Get most recent record from registry
      const keys = Array.from(this.undoRegistry.keys());
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        record = this.undoRegistry.get(lastKey);
      }
    }

    if (!record) {
      // Fallback to legacy lastDeletedItem
      return this.undoDelete();
    }

    this.undoRegistry.delete(record.undoId);

    if (record.type === 'recurring_completion') {
      // Delete spawned occurrence if not yet completed
      const spawnedIndex = this.todos.findIndex(t => t.id === record.spawnedId);
      if (spawnedIndex !== -1 && !this.todos[spawnedIndex].completed) {
        this.todos.splice(spawnedIndex, 1);
      }

      // Revert completed status on original task
      const target = this.todos.find(t => t.id === record.completedId);
      if (target) {
        target.completed = false;
        target.completedAt = null;
        target.recurrence = record.originalRecurrence;
        target.updatedAt = new Date().toISOString();
      }

      this.notify();
      return target;
    }

    if (record.type === 'delete_single' || record.type === 'delete_batch') {
      const restoredItems = [];
      const existingIds = new Set(this.todos.map(t => t.id));

      for (const entry of record.items) {
        const item = entry.item;
        // Avoid duplicate insertion
        if (existingIds.has(item.id)) {
          continue;
        }
        const safeIndex = Math.min(entry.originalIndex, this.todos.length);
        this.todos.splice(safeIndex, 0, item);
        existingIds.add(item.id);
        restoredItems.push(item);
      }

      this.lastDeletedItem = null;
      this.notify();
      return record.type === 'delete_single' ? (restoredItems[0] || null) : restoredItems;
    }

    return null;
  }

  undoDelete(undoId = null) {
    if (undoId || this.undoRegistry.size > 0) {
      return this.undo(undoId);
    }
    if (!this.lastDeletedItem) return null;
    const { item, originalIndex } = this.lastDeletedItem;
    const safeIndex = Math.min(originalIndex, this.todos.length);
    this.todos.splice(safeIndex, 0, item);
    this.lastDeletedItem = null;
    this.notify();
    return item;
  }

  toggleAll() {
    if (this.todos.length === 0) return;
    const hasActive = this.todos.some(t => !t.completed);
    const now = new Date().toISOString();

    if (hasActive) {
      // Completing all active tasks
      const newTodos = [];
      for (const todo of this.todos) {
        if (!todo.completed) {
          const completedTask = {
            ...todo,
            completed: true,
            completedAt: todo.completedAt || now,
            updatedAt: now
          };

          if (todo.recurrence && todo.recurrence !== 'none') {
            const nextDueDate = calculateNextRecurringDate(todo.dueDate, todo.recurrence);
            const nextTodo = createTodo({
              title: todo.title,
              category: todo.category,
              priority: todo.priority,
              dueDate: nextDueDate,
              recurrence: todo.recurrence,
              order: (todo.order || 0) - 0.5,
              subtasks: todo.subtasks.map(st => ({ title: st.title, completed: false }))
            });
            completedTask.recurrence = 'none';
            newTodos.push(completedTask, nextTodo);
          } else {
            newTodos.push(completedTask);
          }
        } else {
          newTodos.push(todo);
        }
      }
      this.todos = newTodos;
    } else {
      // Uncompleting all
      this.todos = this.todos.map(t => ({
        ...t,
        completed: false,
        completedAt: null,
        updatedAt: now
      }));
    }

    this.notify();
  }

  clearCompleted() {
    const beforeCount = this.todos.length;
    const deletedEntries = [];

    this.todos = this.todos.filter((t, index) => {
      if (t.completed) {
        deletedEntries.push({ item: t, originalIndex: index });
        return false;
      }
      return true;
    });

    const deletedCount = beforeCount - this.todos.length;
    let undoId = null;

    if (deletedCount > 0) {
      undoId = generateId('undo');
      this.undoRegistry.set(undoId, {
        undoId,
        type: 'delete_batch',
        items: deletedEntries,
        timestamp: Date.now()
      });
      this.notify();
    }

    return { count: deletedCount, undoId };
  }

  // Subtask Operations
  addSubtask(todoId, title) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return null;

    const subtask = createSubtask(title);
    if (!subtask.title) return null;

    todo.subtasks.push(subtask);
    todo.updatedAt = new Date().toISOString();
    this.notify();
    return subtask;
  }

  toggleSubtask(todoId, subtaskId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return null;

    const subtask = todo.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return null;

    subtask.completed = !subtask.completed;
    todo.updatedAt = new Date().toISOString();
    this.notify();
    return subtask;
  }

  deleteSubtask(todoId, subtaskId) {
    const todo = this.todos.find(t => t.id === todoId);
    if (!todo) return false;

    const initialLen = todo.subtasks.length;
    todo.subtasks = todo.subtasks.filter(st => st.id !== subtaskId);
    if (todo.subtasks.length !== initialLen) {
      todo.updatedAt = new Date().toISOString();
      this.notify();
      return true;
    }
    return false;
  }

  // Reordering
  moveTodo(id, direction) {
    const list = this.getFilteredAndSortedTodos();
    const index = list.findIndex(t => t.id === id);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return false;

    const currentItem = list[index];
    const targetItem = list[targetIndex];

    // Swap their order property
    const tempOrder = currentItem.order;
    currentItem.order = targetItem.order;
    targetItem.order = tempOrder;

    // Switch sort mode to manual so the user sees their ordering
    this.sort = 'manual';
    this.notify();
    return true;
  }

  reorderTodos(sourceId, targetId) {
    if (sourceId === targetId) return false;
    const source = this.todos.find(t => t.id === sourceId);
    const target = this.todos.find(t => t.id === targetId);
    if (!source || !target) return false;

    // Move source to immediately before or after target in array
    const sourceIndex = this.todos.indexOf(source);
    this.todos.splice(sourceIndex, 1);
    const targetIndex = this.todos.indexOf(target);
    this.todos.splice(targetIndex, 0, source);

    // Re-index orders based on array sequence
    this.todos.forEach((t, i) => {
      t.order = i;
    });

    this.sort = 'manual';
    this.notify();
    return true;
  }

  // Filter & Sort View Logic
  getFilteredAndSortedTodos(baseDate = new Date()) {
    const todayStr = getLocalDateString(baseDate);

    // 1. Filter
    let result = this.todos.filter(todo => {
      // Category filter
      if (this.category !== 'all' && todo.category !== this.category) {
        return false;
      }

      // Search query filter (matches title and subtasks)
      if (this.searchQuery) {
        const titleMatch = todo.title.toLowerCase().includes(this.searchQuery);
        const subtaskMatch = todo.subtasks.some(st =>
          st.title.toLowerCase().includes(this.searchQuery)
        );
        if (!titleMatch && !subtaskMatch) return false;
      }

      // Status / Date Filter View
      switch (this.filter) {
        case 'active':
          return !todo.completed;
        case 'completed':
          return todo.completed;
        case 'today':
          return !todo.completed && todo.dueDate === todayStr;
        case 'focus': {
          const isOverdue = !todo.completed && todo.dueDate && calculateDDay(todo.dueDate, baseDate)?.diffDays < 0;
          const isTodayActive = !todo.completed && todo.dueDate === todayStr;
          const isHighActive = !todo.completed && todo.priority === 'high';
          const isTodayCompleted = todo.completed && todo.completedAt && todo.completedAt.startsWith(todayStr);
          return isOverdue || isTodayActive || isHighActive || isTodayCompleted;
        }
        case 'upcoming': {
          if (todo.completed || !todo.dueDate) return false;
          const dday = calculateDDay(todo.dueDate, baseDate);
          return dday && dday.diffDays > 0;
        }
        case 'overdue': {
          if (todo.completed || !todo.dueDate) return false;
          const dday = calculateDDay(todo.dueDate, baseDate);
          return dday && dday.diffDays < 0;
        }
        case 'all':
        default:
          return true;
      }
    });

    // 2. Sort
    result.sort((a, b) => {
      switch (this.sort) {
        case 'manual':
          return (a.order || 0) - (b.order || 0);
        case 'created-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'created-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'due-date':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        case 'priority': {
          const weight = { high: 3, medium: 2, low: 1 };
          return (weight[b.priority] || 0) - (weight[a.priority] || 0);
        }
        default:
          return (a.order || 0) - (b.order || 0);
      }
    });

    return result;
  }

  // Summary Statistics
  getStats(baseDate = new Date()) {
    const total = this.todos.length;
    const done = this.todos.filter(t => t.completed).length;
    const active = total - done;
    const overdue = this.todos.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const dday = calculateDDay(t.dueDate, baseDate);
      return dday && dday.diffDays < 0;
    }).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, active, done, overdue, percent };
  }
}
