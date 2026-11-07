import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDaysInMonth,
  getMonthGrid,
  getWeekDays,
  getPrevMonth,
  getNextMonth,
  formatYearMonth
} from '../../js/utils/calendar-date.js';

test('Calendar Date Utils - getDaysInMonth', () => {
  assert.equal(getDaysInMonth(2026, 2), 28);
  assert.equal(getDaysInMonth(2024, 2), 29); // leap year
  assert.equal(getDaysInMonth(2026, 11), 30);
  assert.equal(getDaysInMonth(2026, 12), 31);
});

test('Calendar Date Utils - getMonthGrid', () => {
  // November 2026 starts on Sunday (2026-11-01 is Sunday)
  const grid = getMonthGrid(2026, 11);
  assert.ok(grid.length === 35 || grid.length === 42, 'Grid should have 35 or 42 cells');
  
  // First cell should be 2026-11-01
  const nov1 = grid.find(c => c.dateString === '2026-11-01');
  assert.ok(nov1, 'Nov 1 must exist');
  assert.equal(nov1.isCurrentMonth, true);
  assert.equal(nov1.day, 1);
  
  // Verify trailing / leading dates
  const nov30 = grid.find(c => c.dateString === '2026-11-30');
  assert.ok(nov30, 'Nov 30 must exist');
  assert.equal(nov30.isCurrentMonth, true);
});

test('Calendar Date Utils - getWeekDays', () => {
  const week = getWeekDays('2026-11-06');
  assert.equal(week.length, 7);
  assert.equal(week[0].dayOfWeek, 0); // Sunday
  assert.equal(week[6].dayOfWeek, 6); // Saturday
  assert.ok(week.some(d => d.dateString === '2026-11-06'));
});

test('Calendar Date Utils - Month navigation', () => {
  assert.deepEqual(getPrevMonth(2026, 1), { year: 2025, month: 12 });
  assert.deepEqual(getPrevMonth(2026, 5), { year: 2026, month: 4 });
  assert.deepEqual(getNextMonth(2026, 12), { year: 2027, month: 1 });
  assert.deepEqual(getNextMonth(2026, 5), { year: 2026, month: 6 });
  assert.equal(formatYearMonth(2026, 5), '2026년 05월');
});
