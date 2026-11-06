import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';
import { createTodo } from '../../js/models/todo.js';
import { createExportPayload, validateBackupPayload, mergeTodosSafely } from '../../js/services/backup.js';

class MockStorage {
  constructor() { this.store = new Map(); }
  getItem(k) { return this.store.get(k) || null; }
  setItem(k, v) { this.store.set(k, String(v)); }
  removeItem(k) { this.store.delete(k); }
}

describe('Phase 4 - Performance & Scalability Benchmarks', () => {
  it('handles 1,000 items creation, filtering, and stats calculation in < 50ms', () => {
    const rawTodos = [];
    for (let i = 0; i < 1000; i++) {
      rawTodos.push(createTodo({
        title: `대용량 벤치마크 작업 #${i}`,
        category: i % 2 === 0 ? '업무' : '개인',
        priority: i % 3 === 0 ? 'high' : (i % 3 === 1 ? 'medium' : 'low'),
        dueDate: '2026-11-07',
        subtasks: [{ title: '하위작업 1', completed: i % 2 === 0 }]
      }));
    }

    const startInit = performance.now();
    const store = new Store({ todos: rawTodos, storageEngine: new MockStorage() });
    const endInit = performance.now();
    assert.ok(endInit - startInit < 50, `Store init took ${endInit - startInit}ms (expected < 50ms)`);

    // Filtering benchmark
    const startFilter = performance.now();
    const active = store.getFilteredAndSortedTodos();
    const endFilter = performance.now();
    assert.ok(endFilter - startFilter < 50, `Filtering took ${endFilter - startFilter}ms (expected < 50ms)`);
    assert.equal(active.length, 1000);

    // Stats benchmark
    const startStats = performance.now();
    const stats = store.getStats();
    const endStats = performance.now();
    assert.ok(endStats - startStats < 30, `Stats calculation took ${endStats - startStats}ms (expected < 30ms)`);
    assert.equal(stats.total, 1000);
  });

  it('validates and safely merges 1,000 backup tasks in < 50ms', () => {
    const existing = [];
    for (let i = 0; i < 500; i++) {
      existing.push(createTodo({ id: `todo_exist_${i}`, title: `기존 항목 #${i}` }));
    }

    const incoming = [];
    for (let i = 0; i < 500; i++) {
      // 250 overlap, 250 new
      incoming.push(createTodo({
        id: i < 250 ? `todo_exist_${i}` : `todo_new_${i}`,
        title: i < 250 ? `기존 항목 #${i}` : `신규 백업 항목 #${i}`
      }));
    }

    const payload = createExportPayload(incoming);
    const startVal = performance.now();
    const val = validateBackupPayload(payload);
    const endVal = performance.now();
    assert.ok(endVal - startVal < 50, `Payload validation took ${endVal - startVal}ms`);
    assert.equal(val.isValid, true);

    const startMerge = performance.now();
    const merged = mergeTodosSafely(existing, val.validTodos);
    const endMerge = performance.now();
    assert.ok(endMerge - startMerge < 50, `Safe merge took ${endMerge - startMerge}ms`);
    assert.equal(merged.length, 750); // 500 existing + 250 new (250 duplicates skipped)
  });
});
