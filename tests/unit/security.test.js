import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateId, escapeHTML, sanitizeText, safeJSONParse } from '../../js/utils/security.js';

describe('security.js', () => {
  it('generateId should return unique IDs with prefix', () => {
    const id1 = generateId('task');
    const id2 = generateId('task');
    assert.ok(id1.startsWith('task_'));
    assert.ok(id2.startsWith('task_'));
    assert.notEqual(id1, id2);
  });

  it('escapeHTML should escape all dangerous XSS characters', () => {
    const dangerous = `<script>alert("XSS & 'hack' ` + '`' + `/");</script>`;
    const safe = escapeHTML(dangerous);
    assert.ok(!safe.includes('<script>'));
    assert.ok(!safe.includes('"'));
    assert.ok(!safe.includes("'"));
    assert.ok(safe.includes('&lt;script&gt;'));
    assert.ok(safe.includes('&quot;'));
    assert.ok(safe.includes('&#39;'));
    assert.ok(safe.includes('&amp;'));
  });

  it('sanitizeText should trim, strip control chars, and truncate', () => {
    const dirty = '  \x00Hello\x1F World!  ';
    assert.equal(sanitizeText(dirty), 'Hello World!');

    const longStr = 'a'.repeat(600);
    assert.equal(sanitizeText(longStr, 100).length, 100);
  });

  it('safeJSONParse should parse valid JSON and return fallback on failure', () => {
    assert.deepEqual(safeJSONParse('{"a": 1}'), { a: 1 });
    assert.equal(safeJSONParse('invalid json', 'fallback'), 'fallback');
    assert.equal(safeJSONParse('', null), null);
  });
});
