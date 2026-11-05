/**
 * HD2Lab Todo Master - Date Utilities & D-Day Engine
 */

/**
 * Format a Date object to YYYY-MM-DD string in local time.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a Date at local midnight.
 * Returns null if invalid.
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null; // invalid date like 2026-02-31
  }
  return date;
}

/**
 * Calculate D-Day status relative to baseDate (default: today local midnight).
 * @param {string} dueDateStr - 'YYYY-MM-DD'
 * @param {Date} [baseDate=new Date()]
 * @returns {{ diffDays: number, status: 'today'|'tomorrow'|'overdue'|'upcoming', text: string, isUrgent: boolean }|null}
 */
export function calculateDDay(dueDateStr, baseDate = new Date()) {
  if (!dueDateStr) return null;
  const dueDate = parseLocalDate(dueDateStr);
  if (!dueDate) return null;

  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { diffDays: 0, status: 'today', text: '오늘 마감', isUrgent: true };
  }
  if (diffDays === 1) {
    return { diffDays: 1, status: 'tomorrow', text: '내일 마감', isUrgent: false };
  }
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { diffDays, status: 'overdue', text: `${overdueDays}일 지남`, isUrgent: true };
  }
  return { diffDays, status: 'upcoming', text: `D-${diffDays}`, isUrgent: false };
}

/**
 * Calculate the next recurrence due date based on type.
 * @param {string} currentDueDateStr - 'YYYY-MM-DD' (if empty, base from today)
 * @param {'daily'|'weekly'|'monthly'} recurrenceType
 * @param {Date} [baseDate=new Date()]
 * @returns {string} - 'YYYY-MM-DD'
 */
export function calculateNextRecurringDate(currentDueDateStr, recurrenceType, baseDate = new Date()) {
  let startDate = parseLocalDate(currentDueDateStr);
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);

  // If no due date or already past, calculate from today
  if (!startDate || startDate < today) {
    startDate = new Date(today);
  } else {
    startDate = new Date(startDate);
  }

  const nextDate = new Date(startDate);

  switch (recurrenceType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly': {
      const currentDay = nextDate.getDate();
      nextDate.setMonth(nextDate.getMonth() + 1);
      // If month overflowed (e.g. Jan 31 -> Feb 28), adjust to last day of target month
      if (nextDate.getDate() !== currentDay) {
        nextDate.setDate(0);
      }
      break;
    }
    default:
      return currentDueDateStr || getLocalDateString(today);
  }

  return getLocalDateString(nextDate);
}

/**
 * Format an ISO timestamp to human-friendly Korean date-time.
 * e.g. "2026-11-06 01:45"
 * @param {string} isoString
 * @returns {string}
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}
