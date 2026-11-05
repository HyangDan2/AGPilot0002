import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_VERSION,
  createExportPayload,
  validateBackupPayload,
  mergeTodos
} from '../../js/services/backup.js';

describe('backup.js', () => {
  it('createExportPayload should create valid version 2 JSON payload', () => {
    const todos = [{ id: '1', title: 'Task A', completed: false }];
    const jsonStr = createExportPayload(todos);
    const parsed = JSON.parse(jsonStr);

    assert.equal(parsed.app, 'HD2Lab Todo Master');
    assert.equal(parsed.version, BACKUP_VERSION);
    assert.equal(parsed.itemCount, 1);
    assert.equal(parsed.todos[0].title, 'Task A');
  });

  it('validateBackupPayload should accept valid v2 payload and reject malformed JSON', () => {
    const validV2 = {
      app: 'HD2Lab Todo Master',
      version: 2,
      todos: [
        { id: 't1', title: 'Valid 1', priority: 'high' },
        { id: 't2', title: 'Valid 2', completed: true }
      ]
    };

    const res = validateBackupPayload(JSON.stringify(validV2));
    assert.equal(res.isValid, true);
    assert.equal(res.validTodos.length, 2);
    assert.equal(res.invalidCount, 0);

    const badJson = validateBackupPayload('{ not valid json');
    assert.equal(badJson.isValid, false);
    assert.match(badJson.error, /유효한 JSON/);
  });

  it('validateBackupPayload should accept legacy v1 array and migrate items', () => {
    const legacyArray = [
      { id: 'old_1', title: 'Old Task 1', completed: false },
      { id: 'bad_item' } // missing title -> invalid
    ];

    const res = validateBackupPayload(legacyArray);
    assert.equal(res.isValid, true);
    assert.equal(res.version, 1);
    assert.equal(res.validTodos.length, 1);
    assert.equal(res.invalidCount, 1);
    assert.equal(res.validTodos[0].title, 'Old Task 1');
  });

  it('mergeTodos should append items and resolve ID collisions with existing tasks', () => {
    const existing = [
      { id: 'id_1', title: 'Existing 1', order: 0 }
    ];
    const incoming = [
      { id: 'id_1', title: 'Imported Collision', order: 0 },
      { id: 'id_2', title: 'Imported New', order: 1 }
    ];

    const merged = mergeTodos(existing, incoming);
    assert.equal(merged.length, 3);
    assert.equal(merged[0].id, 'id_1');
    assert.notEqual(merged[1].id, 'id_1'); // Regenerated due to collision with existing!
    assert.equal(merged[2].id, 'id_2');
    assert.equal(merged[0].order, 0);
    assert.equal(merged[1].order, 1);
    assert.equal(merged[2].order, 2);
  });
});
