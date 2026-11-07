import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';

class MockStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

describe('P0 - Multi-Delete Undo Integrity', () => {
  it('supports multiple consecutive deletions with independent undos', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const tA = store.addTodo({ title: 'Task A' });
    const tB = store.addTodo({ title: 'Task B' });
    const tC = store.addTodo({ title: 'Task C' });

    assert.equal(store.todos.length, 3);

    // Delete sequence: A -> B -> C
    const resA = store.deleteTodo(tA.id);
    const resB = store.deleteTodo(tB.id);
    const resC = store.deleteTodo(tC.id);

    assert.equal(store.todos.length, 0);
    assert.ok(resA.undoId);
    assert.ok(resB.undoId);
    assert.ok(resC.undoId);

    // Undo in non-LIFO order: restore B first!
    const restoredB = store.undo(resB.undoId);
    assert.equal(store.todos.length, 1);
    assert.equal(store.todos[0].id, tB.id);
    assert.equal(store.todos[0].title, 'Task B');

    // Restore A next
    const restoredA = store.undo(resA.undoId);
    assert.equal(store.todos.length, 2);
    assert.ok(store.todos.some(t => t.id === tA.id));

    // Restore C next
    const restoredC = store.undo(resC.undoId);
    assert.equal(store.todos.length, 3);
    assert.ok(store.todos.some(t => t.id === tC.id));

    // Attempting to undo resB again should do nothing (no duplicate restoration)
    const duplicateB = store.undo(resB.undoId);
    assert.equal(duplicateB, null);
    assert.equal(store.todos.length, 3);
  });

  it('supports undoing clearCompleted batch deletion', () => {
    const store = new Store({ storageEngine: new MockStorage() });
    const t1 = store.addTodo({ title: 'Active 1' });
    const t2 = store.addTodo({ title: 'Done 1' });
    const t3 = store.addTodo({ title: 'Done 2' });

    store.toggleTodo(t2.id);
    store.toggleTodo(t3.id);

    const { count, undoId } = store.clearCompleted();
    assert.equal(count, 2);
    assert.equal(store.todos.length, 1);
    assert.equal(store.todos[0].id, t1.id);

    // Undo clearCompleted
    const restored = store.undo(undoId);
    assert.equal(restored.length, 2);
    assert.equal(store.todos.length, 3);
    assert.ok(store.todos.some(t => t.id === t2.id && t.completed));
    assert.ok(store.todos.some(t => t.id === t3.id && t.completed));
  });
});
