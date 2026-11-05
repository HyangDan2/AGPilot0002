/**
 * HD2Lab Todo Master - Central Application State Store
 */

import { createTodo, createSubtask } from '../models/todo.js';
import { calculateDDay, calculateNextRecurringDate, getLocalDateString } from '../utils/date.js';
import { sanitizeText } from '../utils/security.js';
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

    this.filter = 'all'; // 'all' | 'today' | 'upcoming' | 'overdue' | 'active' | 'completed'
    this.category = 'all';
    this.searchQuery = '';
    this.sort = 'manual'; // 'manual' | 'created-desc' | 'created-asc' | 'due-date' | 'priority'

    this.subscribers = new Set();
    this.lastDeletedItem = null;
    this.undoTimeoutId = null;
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
    saveStoredTodos(this.todos, this.storageEngine);
    saveStoredTheme(this.theme, this.storageEngine);
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

    // If recurring task was completed and has a recurrence rule, auto-schedule next occurrence
    if (willBeCompleted && todo.recurrence && todo.recurrence !== 'none') {
      const nextDueDate = calculateNextRecurringDate(todo.dueDate, todo.recurrence);
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
    } else {
      this.todos[index] = updated;
    }

    this.notify();
    return updated;
  }

  deleteTodo(id) {
    const index = this.todos.findIndex(t => t.id === id);
    if (index === -1) return null;

    const [deleted] = this.todos.splice(index, 1);
    this.lastDeletedItem = { item: deleted, originalIndex: index };
    this.notify();
    return deleted;
  }

  undoDelete() {
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

    this.todos = this.todos.map(t => ({
      ...t,
      completed: hasActive,
      completedAt: hasActive ? (t.completedAt || now) : null,
      updatedAt: now
    }));
    this.notify();
  }

  clearCompleted() {
    const beforeCount = this.todos.length;
    this.todos = this.todos.filter(t => !t.completed);
    const deletedCount = beforeCount - this.todos.length;
    if (deletedCount > 0) {
      this.notify();
    }
    return deletedCount;
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
