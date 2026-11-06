import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../js/state/store.js';

class FailingStorage {
  constructor(shouldFail = true) {
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

describe('P0 - Storage Failure & Recovery', () => {
  it('Store.persist() must catch failure, set storageStatus, and notify subscriber', () => {
    const failingStorage = new FailingStorage(true);
    const store = new Store({ storageEngine: failingStorage });

    let receivedEvent = null;
    store.onStorageError = (errInfo) => {
      receivedEvent = errInfo;
    };

    // Attempt to add a todo
    const newTodo = store.addTodo({ title: '용량 초과 테스트' });

    assert.ok(newTodo);
    assert.equal(store.storageStatus.isOk, false);
    assert.match(store.storageStatus.lastError, /저장 공간이 가득 차/);
    assert.ok(receivedEvent);
    assert.equal(receivedEvent.code, 'QUOTA_EXCEEDED');

    // Rollback to last persisted state
    assert.equal(store.todos.length, 1);
    const rollbackSuccess = store.rollbackToLastPersisted();
    assert.equal(rollbackSuccess, true);
    assert.equal(store.todos.length, 0); // Reverted back!
  });
});
