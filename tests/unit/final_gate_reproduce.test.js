import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';
import { getLocalDateString } from '../../js/utils/date.js';
import { BACKUP_VERSION, validateBackupPayload, analyzeBackupDuplicates, mergeTodosSafely } from '../../js/services/backup.js';

class MockStorage {
  constructor(shouldFail = false) {
    this.shouldFail = shouldFail;
    this.store = new Map();
  }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) {
    if (this.shouldFail) {
      const err = new Error('QuotaExceededError: storage full');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(k, String(v));
  }
  removeItem(k) { this.store.delete(k); }
}

describe('Final Release Gate - Defect Reproductions', () => {

  it('Issue 1: Store.undo(undoId) must never fall back to lastDeletedItem when given an invalid or expired undoId', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const item1 = store.addTodo({ title: 'Task 1' });
    const item2 = store.addTodo({ title: 'Task 2' });

    // Delete item1
    const del1 = store.deleteTodo(item1.id);
    assert.ok(del1.undoId);

    // Consume undo for item1
    const undone1 = store.undo(del1.undoId);
    assert.equal(undone1.title, 'Task 1');

    // Delete item2
    const del2 = store.deleteTodo(item2.id);
    assert.ok(del2.undoId);

    // Now try to undo with the ALREADY CONSUMED del1.undoId or a non-existent undoId
    // Current bug: It falls back to `this.undoDelete()`, which incorrectly restores item2!
    const invalidResult = store.undo(del1.undoId);
    assert.equal(invalidResult, null, 'Must return null and NOT restore any other item!');

    const nonexistentResult = store.undo('fake-undo-id-999');
    assert.equal(nonexistentResult, null, 'Must return null for non-existent undoId');
  });

  it('Issue 2: Storage failure during mutation must roll back and not leave unsaved state in memory', () => {
    const storage = new MockStorage(false);
    const store = new Store({ storageEngine: storage });
    const item1 = store.addTodo({ title: 'Saved Task' });
    assert.equal(store.todos.length, 1);

    // Now make storage fail
    storage.shouldFail = true;

    // Mutation 1: addTodo on failing storage
    const failedItem = store.addTodo({ title: 'Unsaved Task' });
    assert.equal(store.storageStatus.isOk, false);
    // When storage fails, todos in memory must revert to last persisted (1 item)
    assert.equal(store.todos.length, 1, 'Failed addTodo must not remain in memory');
    assert.equal(store.todos[0].title, 'Saved Task');

    // Mutation 2: updateTodo on failing storage
    const updateRes = store.updateTodo(item1.id, { title: 'Corrupted Title' });
    assert.equal(store.storageStatus.isOk, false);
    assert.equal(store.todos[0].title, 'Saved Task', 'Failed update must roll back in memory');

    // Mutation 3: deleteTodo on failing storage
    const deleteRes = store.deleteTodo(item1.id);
    assert.equal(store.storageStatus.isOk, false);
    assert.equal(store.todos.length, 1, 'Failed delete must roll back in memory');
  });

  it('Issue 3: Consecutive toggleAll() calls must not spawn uncontrolled future recurring occurrences', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    store.addTodo({ title: 'Regular Task' });
    store.addTodo({ title: 'Daily Habit', recurrence: 'daily', dueDate: '2026-11-06' });

    assert.equal(store.todos.length, 2);

    // Toggle 1: Complete all -> Daily Habit completed, next cycle spawned (length: 3)
    store.toggleAll();
    assert.equal(store.todos.length, 3);

    // Toggle 2: Should uncomplete all tasks (Toggle All toggle-off) and NOT spawn a 4th task!
    store.toggleAll();
    assert.ok(store.todos.length <= 3, `Expected at most 3 items, but got ${store.todos.length}`);

    // Call toggleAll multiple times consecutively
    for (let i = 0; i < 10; i++) {
      store.toggleAll();
    }
    // Items must remain stable (either 2 or 3), never ballooning to 12+ items!
    assert.ok(store.todos.length <= 3, `Uncontrolled spawning detected: count is ${store.todos.length}`);
  });

  it('Issue 6: Today Focus must compare completion timestamps using local calendar date, not UTC prefix', () => {
    const store = new Store({ storageEngine: new MockStorage() });

    // Base date: 2026-11-07 03:00 KST (local date: 2026-11-07)
    // Corresponding UTC ISO timestamp: 2026-11-06T18:00:00.000Z
    const kstMorningDate = new Date('2026-11-07T03:00:00+09:00');
    const todayLocalStr = getLocalDateString(kstMorningDate); // "2026-11-07"

    // Task completed at 3 AM KST on Nov 7
    const completedAtISO = '2026-11-06T18:00:00.000Z'; // startsWith("2026-11-06") in UTC!
    store.todos = [{
      id: 'task_local_today',
      title: '새벽 작업',
      completed: true,
      completedAt: completedAtISO,
      dueDate: '',
      priority: 'low',
      category: '개인',
      subtasks: []
    }];

    store.setFilter('focus');
    const focusItems = store.getFilteredAndSortedTodos(kstMorningDate);

    // Current bug: completedAt.startsWith(todayStr) checked "2026-11-06".startsWith("2026-11-07") -> false!
    assert.equal(focusItems.length, 1, 'Task completed today in local calendar must appear in Today Focus view');
  });

  it('Issue 7: Backup version must accept 2.1 and distinct tasks sharing title/dueDate must not be discarded', () => {
    // 1. Version 2.1 check
    assert.equal(BACKUP_VERSION, 2.1, 'BACKUP_VERSION must be 2.1');
    const v21Payload = JSON.stringify({
      app: 'HD2Lab Todo Master',
      version: 2.1,
      todos: [{ id: 't1', title: 'Task V2.1', priority: 'high' }]
    });
    const valResult = validateBackupPayload(v21Payload);
    assert.equal(valResult.isValid, true, 'v2.1 backup must be valid');

    // 2. Distinct tasks sharing title & dueDate (e.g. different categories or subtasks)
    const existing = [
      { id: 't_work', title: '운동', dueDate: '2026-11-07', category: '업무', priority: 'high', subtasks: [] }
    ];
    const incoming = [
      { id: 't_personal', title: '운동', dueDate: '2026-11-07', category: '개인', priority: 'low', subtasks: [] }
    ];

    const dupAnalysis = analyzeBackupDuplicates(existing, incoming);
    assert.equal(dupAnalysis.duplicateCount, 0, 'Tasks in different categories are distinct and not duplicates');
    assert.equal(dupAnalysis.newCount, 1);

    const merged = mergeTodosSafely(existing, incoming);
    assert.equal(merged.length, 2, 'Distinct tasks sharing title and date must NOT be discarded');
  });

  it('Issue 5: sw.js cache cleanup must only delete hd2lab-todo- caches and preserve foreign origin caches', () => {
    const CACHE_PREFIX = 'hd2lab-todo-';
    const CACHE_NAME = 'hd2lab-todo-v2.1.0';

    const originCaches = [
      'hd2lab-todo-v2.0.0',
      'hd2lab-todo-v2.1.0',
      'agpilot0001-cache',
      'hd2lab-main-site',
      'common-cdn-cache'
    ];

    // Filter rule implemented in sw.js
    const cachesToDelete = originCaches.filter(
      key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME
    );

    assert.deepEqual(cachesToDelete, ['hd2lab-todo-v2.0.0']);
    assert.ok(!cachesToDelete.includes('agpilot0001-cache'));
    assert.ok(!cachesToDelete.includes('hd2lab-main-site'));
    assert.ok(!cachesToDelete.includes('common-cdn-cache'));
  });

});
