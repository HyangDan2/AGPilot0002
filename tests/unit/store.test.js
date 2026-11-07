import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';
import { getLocalDateString, calculateNextRecurringDate } from '../../js/utils/date.js';

class MockStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) { return this.map.get(k) || null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

describe('Store', () => {
  it('should add, toggle, and update a todo', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const item = store.addTodo({ title: '첫 번째 할 일', priority: 'high' });

    assert.equal(store.todos.length, 1);
    assert.equal(item.title, '첫 번째 할 일');
    assert.equal(item.completed, false);

    // Toggle
    store.toggleTodo(item.id);
    assert.equal(store.todos[0].completed, true);
    assert.ok(store.todos[0].completedAt);

    // Update
    store.updateTodo(item.id, { title: '수정된 할 일' });
    assert.equal(store.todos[0].title, '수정된 할 일');
  });

  it('should auto-schedule next occurrence when completing a recurring task', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const todayStr = getLocalDateString(new Date());
    const expectedNext = calculateNextRecurringDate(todayStr, 'daily');
    const recurring = store.addTodo({
      title: '매일 영양제 먹기',
      dueDate: todayStr,
      recurrence: 'daily'
    });

    assert.equal(store.todos.length, 1);

    // Complete recurring task
    store.toggleTodo(recurring.id);

    // Should now have completed previous task and newly created next task
    assert.equal(store.todos.length, 2);
    const completedPrev = store.todos.find(t => t.completed);
    const nextTask = store.todos.find(t => !t.completed);

    assert.ok(completedPrev);
    assert.ok(nextTask);
    assert.equal(nextTask.title, '매일 영양제 먹기');
    assert.equal(nextTask.dueDate, expectedNext);
    assert.equal(nextTask.recurrence, 'daily');
  });

  it('should delete a todo and support undo', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const item = store.addTodo({ title: '삭제될 항목' });
    assert.equal(store.todos.length, 1);

    const deleted = store.deleteTodo(item.id);
    assert.equal(store.todos.length, 0);
    assert.equal(deleted.id, item.id);

    // Undo delete
    const restored = store.undoDelete();
    assert.equal(store.todos.length, 1);
    assert.equal(restored.id, item.id);
    assert.equal(store.todos[0].title, '삭제될 항목');
  });

  it('should manage subtasks', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const item = store.addTodo({ title: '프로젝트 개발' });

    const sub = store.addSubtask(item.id, '기획서 작성');
    assert.equal(item.subtasks.length, 1);
    assert.equal(sub.title, '기획서 작성');
    assert.equal(sub.completed, false);

    store.toggleSubtask(item.id, sub.id);
    assert.equal(item.subtasks[0].completed, true);

    store.deleteSubtask(item.id, sub.id);
    assert.equal(item.subtasks.length, 0);
  });

  it('should accurately filter by views (today, upcoming, overdue)', () => {
    const baseDate = new Date(2026, 10, 6); // 2026-11-06
    const store = new Store({ storageEngine: new MockStorage() });

    store.addTodo({ title: '오늘 마감', dueDate: '2026-11-06' });
    store.addTodo({ title: '예정 마감', dueDate: '2026-11-10' });
    store.addTodo({ title: '지연 마감', dueDate: '2026-11-02' });

    // Today view
    store.setFilter('today');
    let res = store.getFilteredAndSortedTodos(baseDate);
    assert.equal(res.length, 1);
    assert.equal(res[0].title, '오늘 마감');

    // Upcoming view
    store.setFilter('upcoming');
    res = store.getFilteredAndSortedTodos(baseDate);
    assert.equal(res.length, 1);
    assert.equal(res[0].title, '예정 마감');

    // Overdue view
    store.setFilter('overdue');
    res = store.getFilteredAndSortedTodos(baseDate);
    assert.equal(res.length, 1);
    assert.equal(res[0].title, '지연 마감');
  });

  it('should calculate accurate statistics', () => {
    const baseDate = new Date(2026, 10, 6);
    const store = new Store({ storageEngine: new MockStorage() });

    const t1 = store.addTodo({ title: 'T1' });
    const t2 = store.addTodo({ title: 'T2', dueDate: '2026-11-01' }); // overdue
    store.toggleTodo(t1.id); // 1 done, 1 active

    const stats = store.getStats(baseDate);
    assert.equal(stats.total, 2);
    assert.equal(stats.done, 1);
    assert.equal(stats.active, 1);
    assert.equal(stats.overdue, 1);
    assert.equal(stats.percent, 50);
  });
});
