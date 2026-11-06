import test from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';

class MockStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(key) {
    return this.data.get(key) || null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

test('Store - Pagination functionality (Phase A)', () => {
  const mockStorage = new MockStorage();
  const todos = [];
  for (let i = 1; i <= 25; i++) {
    todos.push({
      id: `task_${i}`,
      title: `Task ${i}`,
      category: i % 2 === 0 ? '업무' : '개인',
      priority: 'medium',
      dueDate: '2026-11-10',
      completed: false,
      subtasks: []
    });
  }

  const store = new Store({ todos, storageEngine: mockStorage });

  // Default page size: 10
  assert.equal(store.pageSize, 10);
  assert.equal(store.currentPage, 1);

  let p = store.getPaginatedTodos();
  assert.equal(p.totalItems, 25);
  assert.equal(p.totalPages, 3);
  assert.equal(p.items.length, 10);
  assert.equal(p.items[0].id, 'task_1');

  // Go to page 2
  store.setPage(2);
  p = store.getPaginatedTodos();
  assert.equal(p.currentPage, 2);
  assert.equal(p.items.length, 10);
  assert.equal(p.items[0].id, 'task_11');

  // Go to page 3
  store.setPage(3);
  p = store.getPaginatedTodos();
  assert.equal(p.currentPage, 3);
  assert.equal(p.items.length, 5);
  assert.equal(p.items[0].id, 'task_21');

  // Page size switch to 20
  store.setPageSize(20);
  assert.equal(store.pageSize, 20);
  assert.equal(store.currentPage, 1); // resets to 1
  p = store.getPaginatedTodos();
  assert.equal(p.totalPages, 2);
  assert.equal(p.items.length, 20);

  // Filter combined with pagination
  store.setCategory('업무'); // 12 items
  p = store.getPaginatedTodos();
  assert.equal(p.totalItems, 12);
  assert.equal(p.totalPages, 1);
  assert.equal(p.items.length, 12);

  // Clamp page if beyond total
  store.setPage(5);
  p = store.getPaginatedTodos();
  assert.equal(p.currentPage, 1);
});

test('Store - Grouping functionality (Phase E)', () => {
  const todos = [
    { id: '1', title: 'Task 1', category: '업무', priority: 'high', completed: false, dueDate: '2026-11-06' },
    { id: '2', title: 'Task 2', category: '개인', priority: 'low', completed: true, dueDate: '' },
    { id: '3', title: 'Task 3', category: '업무', priority: 'medium', completed: false, dueDate: '' }
  ];

  const store = new Store({ todos });

  // None
  store.setGroupBy('none');
  let groups = store.getGroupedTodos(store.todos);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 3);

  // By category
  store.setGroupBy('category');
  groups = store.getGroupedTodos(store.todos);
  assert.equal(groups.length, 2); // 업무(2), 개인(1)

  // By status
  store.setGroupBy('status');
  groups = store.getGroupedTodos(store.todos);
  assert.equal(groups.length, 2); // active(2), completed(1)
});

test('Store - UI Preferences Persistence (Phase E)', () => {
  const mockStorage = new MockStorage();
  const store = new Store({
    storageEngine: mockStorage,
    uiPrefs: { pageSize: 20, displayDensity: 'compact', groupBy: 'priority' }
  });

  assert.equal(store.pageSize, 20);
  assert.equal(store.displayDensity, 'compact');
  assert.equal(store.groupBy, 'priority');

  store.setWorkspaceView('calendar');
  assert.equal(store.workspaceView, 'calendar');

  // Verify stored in mockStorage
  const saved = JSON.parse(mockStorage.getItem('todo_master_ui_prefs_v1'));
  assert.equal(saved.workspaceView, 'calendar');
  assert.equal(saved.pageSize, 20);
  assert.equal(saved.displayDensity, 'compact');
});
