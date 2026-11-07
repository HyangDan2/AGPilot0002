/**
 * HD2Lab Todo Master - Calendar Date Utilities
 * Pure functions for calendar grid generation, month/week navigation, and date formatting.
 */

import { getLocalDateString } from './date.js';

/**
 * Returns the number of days in a given month.
 * @param {number} year 
 * @param {number} month 1-12
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Generates a full month calendar grid (Sunday to Saturday, 35 or 42 cells).
 * @param {number} year 
 * @param {number} month 1-12
 * @returns {Array<{ dateString: string, day: number, isCurrentMonth: boolean, isToday: boolean, dayOfWeek: number }>}
 */
export function getMonthGrid(year, month) {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 6 = Saturday
  const totalDays = getDaysInMonth(year, month);
  
  const todayStr = getLocalDateString(new Date());
  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const cells = [];

  // 1. Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateString = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      dateString,
      day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      dayOfWeek: (cells.length) % 7
    });
  }

  // 2. Current month days
  for (let day = 1; day <= totalDays; day++) {
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      dateString,
      day,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      dayOfWeek: (cells.length) % 7
    });
  }

  // 3. Next month leading days (fill up to complete weeks, 35 or 42)
  const remainingCells = (7 - (cells.length % 7)) % 7;
  // If only 35 cells and more space is needed or standard grid:
  const targetTotal = (cells.length + remainingCells <= 35) ? 35 : 42;
  const fillCount = targetTotal - cells.length;

  for (let day = 1; day <= fillCount; day++) {
    const dateString = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      dateString,
      day,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      dayOfWeek: (cells.length) % 7
    });
  }

  return cells;
}

/**
 * Generates 7 days for a week view containing the given date.
 * @param {string|Date} date YYYY-MM-DD or Date object
 * @returns {Array<{ dateString: string, day: number, dayOfWeek: number, isToday: boolean, dayName: string }>}
 */
export function getWeekDays(date) {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00`) : new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dayOfWeek);

  const todayStr = getLocalDateString(new Date());
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const week = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(sunday);
    current.setDate(sunday.getDate() + i);
    const dateString = getLocalDateString(current);
    week.push({
      dateString,
      day: current.getDate(),
      dayOfWeek: i,
      dayName: dayNames[i],
      isToday: dateString === todayStr
    });
  }

  return week;
}

/**
 * Returns previous year and month.
 * @param {number} year 
 * @param {number} month 1-12
 * @returns {{ year: number, month: number }}
 */
export function getPrevMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/**
 * Returns next year and month.
 * @param {number} year 
 * @param {number} month 1-12
 * @returns {{ year: number, month: number }}
 */
export function getNextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Formats year and month in Korean.
 * @param {number} year 
 * @param {number} month 1-12
 * @returns {string} e.g. "2026년 11월"
 */
export function formatYearMonth(year, month) {
  return `${year}년 ${String(month).padStart(2, '0')}월`;
}
