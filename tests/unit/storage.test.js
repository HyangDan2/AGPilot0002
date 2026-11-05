import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  THEME_KEY,
  loadStoredTodos,
  saveStoredTodos,
  loadStoredTheme,
  saveStoredTheme
} from '../../js/services/storage.js';

class MockStorage {
  constructor(shouldThrowQuota = false) {
    this.store = new Map();
    this.shouldThrowQuota = shouldThrowQuota;
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    if (this.shouldThrowQuota) {
      const err = new Error('Storage quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

describe('storage.js', () => {
  it('loadStoredTodos on empty storage should initialize with default tasks', () => {
    const storage = new MockStorage();
    const result = loadStoredTodos(storage);
    assert.equal(result.todos.length, 3);
    assert.equal(result.error, null);
    assert.ok(storage.getItem(STORAGE_KEY));
  });

  it('loadStoredTodos should seamlessly migrate legacy v1 data', () => {
    const storage = new MockStorage();
    const legacy = [
      {
        id: 'leg_1',
        title: 'Legacy Item',
        category: '업무',
        priority: 'high',
        dueDate: '2026-11-06',
        completed: false,
        createdAt: '2026-11-05T00:00:00.000Z'
      }
    ];
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const result = loadStoredTodos(storage);
    assert.equal(result.isMigrated, true);
    assert.equal(result.todos[0].title, 'Legacy Item');
    assert.equal(result.todos[0].order, 0);
    assert.deepEqual(result.todos[0].subtasks, []);
    assert.equal(result.todos[0].recurrence, 'none');
  });

  it('saveStoredTodos should gracefully catch QuotaExceededError', () => {
    const storage = new MockStorage(true); // throws QuotaExceededError
    const res = saveStoredTodos([{ id: '1', title: 'test' }], storage);
    assert.equal(res.success, false);
    assert.match(res.error, /저장 공간이 가득 차/);
  });

  it('loadStoredTheme and saveStoredTheme should default to dark and persist choice', () => {
    const storage = new MockStorage();
    assert.equal(loadStoredTheme(storage), 'dark');

    saveStoredTheme('light', storage);
    assert.equal(loadStoredTheme(storage), 'light');

    saveStoredTheme('dark', storage);
    assert.equal(loadStoredTheme(storage), 'dark');
  });
});
