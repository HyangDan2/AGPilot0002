import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBackupPayload,
  analyzeBackupDuplicates,
  mergeTodosSafely
} from '../../js/services/backup.js';

describe('P0 - Backup Validation & Data Restoration (v2.1)', () => {
  it('rejects unsupported future versions', () => {
    const futureBackup = {
      app: 'HD2Lab Todo Master',
      version: 99,
      todos: [{ id: 't1', title: 'Future task' }]
    };
    const res = validateBackupPayload(futureBackup);
    assert.equal(res.isValid, false);
    assert.match(res.error, /지원되지 않는 최신 백업 버전/);
  });

  it('rejects excessive item counts (> 5000) as a safeguard', () => {
    const hugeTodos = Array.from({ length: 5001 }, (_, i) => ({ id: `t_${i}`, title: `Task ${i}` }));
    const payload = { app: 'HD2Lab Todo Master', version: 2, todos: hugeTodos };
    const res = validateBackupPayload(payload);
    assert.equal(res.isValid, false);
    assert.match(res.error, /최대 허용 항목 수/);
  });

  it('rejects invalid dates like 2026-02-31 during validation', () => {
    const payload = {
      app: 'HD2Lab Todo Master',
      version: 2,
      todos: [
        { id: 't1', title: 'Valid Date', dueDate: '2026-11-06' },
        { id: 't2', title: 'Invalid Date', dueDate: '2026-02-31' }
      ]
    };
    const res = validateBackupPayload(payload);
    assert.equal(res.isValid, true);
    assert.equal(res.validTodos.length, 2);
    // t2's invalid dueDate should have been stripped to empty string
    assert.equal(res.validTodos.find(t => t.id === 't2').dueDate, '');
  });

  it('analyzeBackupDuplicates correctly counts new vs duplicate items', () => {
    const existing = [
      { id: 'e1', title: 'Task 1', dueDate: '2026-11-06' },
      { id: 'e2', title: 'Task 2', dueDate: '' }
    ];
    const incoming = [
      { id: 'e1', title: 'Task 1 (Same ID)', dueDate: '2026-11-06' }, // duplicate ID
      { id: 'diff_id', title: 'Task 2', dueDate: '' }, // duplicate by title + dueDate
      { id: 'new_id', title: 'Brand New Task', dueDate: '2026-11-07' } // new
    ];

    const analysis = analyzeBackupDuplicates(existing, incoming);
    assert.equal(analysis.totalCount, 3);
    assert.equal(analysis.duplicateCount, 2);
    assert.equal(analysis.newCount, 1);
  });

  it('mergeTodosSafely avoids creating unintended duplicate tasks', () => {
    const existing = [
      { id: 'e1', title: 'Task 1', dueDate: '2026-11-06', order: 0 }
    ];
    const incoming = [
      { id: 'e1', title: 'Task 1', dueDate: '2026-11-06', order: 0 }, // duplicate
      { id: 'new_1', title: 'New Task', dueDate: '2026-11-07', order: 1 }
    ];

    const merged = mergeTodosSafely(existing, incoming);
    assert.equal(merged.length, 2); // 1 existing + 1 new (duplicate skipped)
    assert.equal(merged[0].id, 'e1');
    assert.equal(merged[1].title, 'New Task');
  });
});
