import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';
import { calculateNextRecurringDate } from '../../js/utils/date.js';

class MockStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

describe('P1 - Recurring Task Engine', () => {
  it('handles leap-year and month-end dates correctly', () => {
    // Leap year 2028
    const leapBase = new Date(2028, 1, 28); // 2028-02-28
    assert.equal(calculateNextRecurringDate('2028-02-28', 'daily', leapBase), '2028-02-29');

    // Feb 29 + 1 day
    const leapDay = new Date(2028, 1, 29);
    assert.equal(calculateNextRecurringDate('2028-02-29', 'daily', leapDay), '2028-03-01');

    // Month-end: Aug 31 -> Sep 30
    const aug31 = new Date(2026, 7, 31);
    assert.equal(calculateNextRecurringDate('2026-08-31', 'monthly', aug31), '2026-09-30');
  });

  it('overdue recurring tasks calculate next date relative to today', () => {
    const today = new Date(2026, 10, 6); // 2026-11-06
    // Task was due 2026-10-01 (overdue)
    const nextDaily = calculateNextRecurringDate('2026-10-01', 'daily', today);
    assert.equal(nextDaily, '2026-11-07'); // Tomorrow, not in the past!

    const nextWeekly = calculateNextRecurringDate('2026-10-01', 'weekly', today);
    assert.equal(nextWeekly, '2026-11-13'); // +7 days from today
  });

  it('undoing a completed recurring task reverts completed status and deletes the spawned occurrence', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const task = store.addTodo({
      title: '영양제 복용',
      recurrence: 'daily',
      dueDate: '2026-11-06'
    });

    assert.equal(store.todos.length, 1);

    const toggleRes = store.toggleTodo(task.id);
    assert.equal(store.todos.length, 2);
    assert.ok(toggleRes.undoId);

    // Undo recurring completion
    store.undo(toggleRes.undoId);

    assert.equal(store.todos.length, 1);
    const restored = store.todos[0];
    assert.equal(restored.id, task.id);
    assert.equal(restored.completed, false);
    assert.equal(restored.recurrence, 'daily');
  });

  it('toggleAll() completes recurring tasks and auto-schedules next occurrence consistently', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    store.addTodo({ title: '일반 작업' });
    store.addTodo({ title: '매일 반복 작업', recurrence: 'daily', dueDate: '2026-11-06' });

    assert.equal(store.todos.length, 2);

    // Batch complete all
    store.toggleAll();

    // The recurring task should be completed, and its next cycle spawned
    assert.equal(store.todos.length, 3);
    const completedRecurring = store.todos.find(t => t.title === '매일 반복 작업' && t.completed);
    const nextRecurring = store.todos.find(t => t.title === '매일 반복 작업' && !t.completed);

    assert.ok(completedRecurring);
    assert.ok(nextRecurring);
    assert.equal(nextRecurring.recurrence, 'daily');
    assert.equal(nextRecurring.dueDate, '2026-11-07');
  });
});
