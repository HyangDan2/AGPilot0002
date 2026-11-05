import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocalDateString,
  parseLocalDate,
  calculateDDay,
  calculateNextRecurringDate,
  formatDateTime
} from '../../js/utils/date.js';

describe('date.js', () => {
  it('getLocalDateString should return YYYY-MM-DD in local time', () => {
    const fixed = new Date(2026, 10, 6, 15, 30); // Nov 6, 2026
    assert.equal(getLocalDateString(fixed), '2026-11-06');
  });

  it('parseLocalDate should parse valid date and reject invalid ones', () => {
    const valid = parseLocalDate('2026-11-06');
    assert.ok(valid instanceof Date);
    assert.equal(valid.getFullYear(), 2026);
    assert.equal(valid.getMonth(), 10);
    assert.equal(valid.getDate(), 6);

    assert.equal(parseLocalDate('2026-02-31'), null);
    assert.equal(parseLocalDate('not-a-date'), null);
    assert.equal(parseLocalDate(''), null);
  });

  it('calculateDDay should properly determine today, tomorrow, upcoming, and overdue', () => {
    const base = new Date(2026, 10, 6, 12, 0); // 2026-11-06

    const todayRes = calculateDDay('2026-11-06', base);
    assert.equal(todayRes.status, 'today');
    assert.equal(todayRes.text, '오늘 마감');
    assert.equal(todayRes.isUrgent, true);

    const tomRes = calculateDDay('2026-11-07', base);
    assert.equal(tomRes.status, 'tomorrow');
    assert.equal(tomRes.text, '내일 마감');
    assert.equal(tomRes.isUrgent, false);

    const upcomingRes = calculateDDay('2026-11-10', base);
    assert.equal(upcomingRes.status, 'upcoming');
    assert.equal(upcomingRes.text, 'D-4');

    const overdueRes = calculateDDay('2026-11-03', base);
    assert.equal(overdueRes.status, 'overdue');
    assert.equal(overdueRes.text, '3일 지남');
    assert.equal(overdueRes.isUrgent, true);
  });

  it('calculateNextRecurringDate handles daily, weekly, and monthly', () => {
    const base = new Date(2026, 10, 6); // 2026-11-06

    assert.equal(calculateNextRecurringDate('2026-11-06', 'daily', base), '2026-11-07');
    assert.equal(calculateNextRecurringDate('2026-11-06', 'weekly', base), '2026-11-13');
    assert.equal(calculateNextRecurringDate('2026-11-06', 'monthly', base), '2026-12-06');

    // Month end edge case: Jan 31 -> Feb 28 in non-leap year (e.g. 2027)
    const jan31 = new Date(2027, 0, 31);
    assert.equal(calculateNextRecurringDate('2027-01-31', 'monthly', jan31), '2027-02-28');
  });

  it('formatDateTime formats ISO strings to YYYY-MM-DD HH:mm', () => {
    const d = new Date(2026, 10, 6, 9, 5);
    const formatted = formatDateTime(d.toISOString());
    assert.equal(formatted, '2026-11-06 09:05');
  });
});
