/**
 * HD2Lab Todo Master - Rule-Based Smart Natural Language Task Parser
 * Parses date keywords, category hashtags, priority tags, and recurrence expressions in Korean.
 */

import { getLocalDateString } from './date.js';

const KOREAN_DAY_MAP = {
  '일요일': 0, '일': 0,
  '월요일': 1, '월': 1,
  '화요일': 2, '화': 2,
  '수요일': 3, '수': 3,
  '목요일': 4, '목': 4,
  '금요일': 5, '금': 5,
  '토요일': 6, '토': 6
};

const CATEGORY_MAP = {
  '개인': '개인',
  '업무': '업무',
  '공부': '공부',
  '쇼핑': '쇼핑',
  '기타': '기타'
};

const PRIORITY_MAP = {
  '높음': 'high', '긴급': 'high', 'high': 'high', '1': 'high',
  '보통': 'medium', '중간': 'medium', 'medium': 'medium', '2': 'medium',
  '낮음': 'low', '여유': 'low', 'low': 'low', '3': 'low'
};

/**
 * Calculates the next occurrence Date of a target day-of-week relative to baseDate.
 * If targetDay matches today, returns today.
 * @param {number} targetDay - 0 to 6
 * @param {Date} baseDate
 * @returns {Date}
 */
function getNextDayOfWeek(targetDay, baseDate) {
  const currentDay = baseDate.getDay();
  let diff = targetDay - currentDay;
  if (diff < 0) {
    diff += 7;
  }
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + diff);
  return result;
}

/**
 * Parses smart task input string.
 * @param {string} input - Raw user input text
 * @param {Date} [baseDate=new Date()]
 * @returns {{
 *   raw: string,
 *   title: string,
 *   category: '개인'|'업무'|'공부'|'쇼핑'|'기타'|null,
 *   priority: 'high'|'medium'|'low'|null,
 *   dueDate: string|null,
 *   recurrence: 'daily'|'weekly'|'monthly'|'none'|null,
 *   tokens: Array<{ type: string, text: string, value: any }>
 * }}
 */
export function parseSmartTaskInput(input, baseDate = new Date()) {
  if (typeof input !== 'string') {
    return {
      raw: '',
      title: '',
      category: null,
      priority: null,
      dueDate: null,
      recurrence: null,
      tokens: []
    };
  }

  const raw = input.trim();
  if (!raw) {
    return {
      raw: '',
      title: '',
      category: null,
      priority: null,
      dueDate: null,
      recurrence: null,
      tokens: []
    };
  }

  let workingText = raw;
  const tokens = [];

  let category = null;
  let priority = null;
  let dueDate = null;
  let recurrence = null;

  // 1. Category Hashtag: e.g. #업무, #개인, #쇼핑
  const catRegex = /#([가-힣a-zA-Z]+)/g;
  workingText = workingText.replace(catRegex, (match, tag) => {
    if (CATEGORY_MAP[tag]) {
      category = CATEGORY_MAP[tag];
      tokens.push({ type: 'category', text: match, value: category });
      return '';
    }
    return match;
  });

  // 2. Priority Tag: e.g. !높음, !보통, !낮음, !긴급
  const priorityRegex = /!([가-힣a-zA-Z0-9]+)/g;
  workingText = workingText.replace(priorityRegex, (match, tag) => {
    const lower = tag.toLowerCase();
    if (PRIORITY_MAP[lower]) {
      priority = PRIORITY_MAP[lower];
      tokens.push({ type: 'priority', text: match, value: priority });
      return '';
    }
    return match;
  });

  // 3. Recurrence keyword: e.g. 매일, 매주, 매월
  const recurRegex = /(?:^|\s)(매일|매주|매월)(?:\s|$)/;
  const recurMatch = workingText.match(recurRegex);
  if (recurMatch) {
    const kw = recurMatch[1];
    if (kw === '매일') recurrence = 'daily';
    else if (kw === '매주') recurrence = 'weekly';
    else if (kw === '매월') recurrence = 'monthly';

    if (recurrence) {
      tokens.push({ type: 'recurrence', text: kw, value: recurrence });
      workingText = workingText.replace(kw, '');
    }
  }

  // 4. Relative Date: 오늘, 내일, 모레, 글피
  const relDateRegex = /(?:^|\s)(오늘|내일|모레|글피)(?:\s|$)/;
  const relMatch = workingText.match(relDateRegex);
  if (relMatch) {
    const kw = relMatch[1];
    let offsetDays = 0;
    if (kw === '오늘') offsetDays = 0;
    else if (kw === '내일') offsetDays = 1;
    else if (kw === '모레') offsetDays = 2;
    else if (kw === '글피') offsetDays = 3;

    const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offsetDays);
    dueDate = getLocalDateString(targetDate);
    tokens.push({ type: 'dueDate', text: kw, value: dueDate });
    workingText = workingText.replace(kw, '');
  }

  // 5. Day of week: e.g. 월요일, 금요일, 다음주 수요일
  if (!dueDate) {
    const dayRegex = /(?:^|\s)(다음주\s*)?(월요일|화요일|수요일|목요일|금요일|토요일|일요일)(?:\s|$)/;
    const dayMatch = workingText.match(dayRegex);
    if (dayMatch) {
      const isNextWeek = Boolean(dayMatch[1]);
      const dayName = dayMatch[2];
      const targetDay = KOREAN_DAY_MAP[dayName];
      if (targetDay !== undefined) {
        let target = getNextDayOfWeek(targetDay, baseDate);
        if (isNextWeek) {
          target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 7);
        } else if (recurrence === 'weekly' && target.getTime() === new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime()) {
          // If "매주 월요일" and today is Monday, target can be today or next Monday.
          // Keeping today as first occurrence.
        }
        dueDate = getLocalDateString(target);
        tokens.push({ type: 'dueDate', text: dayMatch[0].trim(), value: dueDate });
        workingText = workingText.replace(dayMatch[0].trim(), '');
      }
    }
  }

  // Clean title: multiple spaces collapsed and trimmed
  let cleanTitle = workingText.replace(/\s+/g, ' ').trim();
  if (!cleanTitle) {
    // If user input was only tags/dates, retain raw input so title is never empty
    cleanTitle = raw;
  }

  return {
    raw,
    title: cleanTitle,
    category,
    priority,
    dueDate,
    recurrence: recurrence || null,
    tokens
  };
}
