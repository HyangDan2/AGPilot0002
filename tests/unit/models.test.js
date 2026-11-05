import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTodo,
  createSubtask,
  validateAndSanitizeTodo,
  migrateTodoList
} from '../../js/models/todo.js';

describe('todo model & migration', () => {
  it('createTodo should initialize properly with defaults', () => {
    const item = createTodo({ title: '테스트 할 일' });
    assert.equal(item.title, '테스트 할 일');
    assert.equal(item.category, '개인');
    assert.equal(item.priority, 'medium');
    assert.equal(item.completed, false);
    assert.equal(item.completedAt, null);
    assert.equal(item.recurrence, 'none');
    assert.deepEqual(item.subtasks, []);
    assert.ok(item.id.startsWith('todo_'));
  });

  it('createTodo should throw if title is empty or whitespace', () => {
    assert.throws(() => createTodo({ title: '   ' }), /제목/);
  });

  it('validateAndSanitizeTodo should clean dirty input and fix missing fields', () => {
    const dirty = {
      id: 'custom_id_1',
      title: '<script>alert(1)</script>   Clean Title   ',
      category: '유효하지않은카테고리',
      priority: 'invalid_priority',
      dueDate: '2026-11-15',
      completed: true,
      subtasks: [
        '단순 문자열 서브태스크',
        { title: '객체 서브태스크', completed: true },
        null,
        { title: '   ' }
      ]
    };

    const valid = validateAndSanitizeTodo(dirty, 3);
    assert.equal(valid.id, 'custom_id_1');
    assert.equal(valid.title, '<script>alert(1)</script>   Clean Title');
    assert.equal(valid.category, '기타');
    assert.equal(valid.priority, 'medium');
    assert.equal(valid.completed, true);
    assert.ok(valid.completedAt); // auto-assigned since completed is true
    assert.equal(valid.subtasks.length, 2);
    assert.equal(valid.subtasks[0].title, '단순 문자열 서브태스크');
    assert.equal(valid.subtasks[1].title, '객체 서브태스크');
    assert.equal(valid.subtasks[1].completed, true);
  });

  it('migrateTodoList should migrate legacy v1 data and resolve duplicate IDs', () => {
    const legacyV1 = [
      {
        id: 'dup_id',
        title: 'Legacy Task 1',
        category: '업무',
        priority: 'high',
        dueDate: '2026-11-06',
        completed: false,
        createdAt: '2026-11-05T12:00:00.000Z'
      },
      {
        id: 'dup_id', // Duplicate ID collision!
        title: 'Legacy Task 2 (Duplicate ID)',
        category: '개인',
        priority: 'low',
        completed: true,
        createdAt: '2026-11-05T13:00:00.000Z'
      }
    ];

    const migrated = migrateTodoList(legacyV1);
    assert.equal(migrated.length, 2);
    assert.equal(migrated[0].id, 'dup_id');
    assert.notEqual(migrated[1].id, 'dup_id'); // Regenerated due to collision!
    assert.equal(migrated[0].order, 0);
    assert.equal(migrated[1].order, 1);
    assert.equal(migrated[1].completed, true);
    assert.ok(migrated[1].completedAt);
    assert.deepEqual(migrated[0].subtasks, []);
    assert.equal(migrated[0].recurrence, 'none');
  });
});
