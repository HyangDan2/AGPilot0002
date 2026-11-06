import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmartTaskInput } from '../../js/utils/parser.js';

describe('Phase 3 - Smart Task Input Parser', () => {
  const baseDate = new Date(2026, 10, 6, 12, 0); // Friday, 2026-11-06

  it('parses "내일 회의 #업무 !높음"', () => {
    const res = parseSmartTaskInput('내일 회의 #업무 !높음', baseDate);
    assert.equal(res.title, '회의');
    assert.equal(res.category, '업무');
    assert.equal(res.priority, 'high');
    assert.equal(res.dueDate, '2026-11-07'); // Tomorrow
    assert.equal(res.recurrence, null);
  });

  it('parses "오늘 장보기 #쇼핑"', () => {
    const res = parseSmartTaskInput('오늘 장보기 #쇼핑', baseDate);
    assert.equal(res.title, '장보기');
    assert.equal(res.category, '쇼핑');
    assert.equal(res.dueDate, '2026-11-06'); // Today
  });

  it('parses "매주 월요일 운동 #개인"', () => {
    const res = parseSmartTaskInput('매주 월요일 운동 #개인', baseDate);
    assert.equal(res.title, '운동');
    assert.equal(res.category, '개인');
    assert.equal(res.recurrence, 'weekly');
    assert.equal(res.dueDate, '2026-11-09'); // Next Monday (Nov 9)
  });

  it('parses "금요일 보고서 제출 #업무"', () => {
    // baseDate is Friday Nov 6. "금요일" refers to today or next Friday.
    // If today is Friday, "금요일" means today Nov 6.
    const res = parseSmartTaskInput('금요일 보고서 제출 #업무', baseDate);
    assert.equal(res.title, '보고서 제출');
    assert.equal(res.category, '업무');
    assert.equal(res.dueDate, '2026-11-06');
  });

  it('parses "모레 병원 예약 !보통"', () => {
    const res = parseSmartTaskInput('모레 병원 예약 !보통', baseDate);
    assert.equal(res.title, '병원 예약');
    assert.equal(res.dueDate, '2026-11-08'); // Day after tomorrow
    assert.equal(res.priority, 'medium');
  });

  it('falls back cleanly to title when no smart tokens exist', () => {
    const res = parseSmartTaskInput('단순한 일반 할 일 제목', baseDate);
    assert.equal(res.title, '단순한 일반 할 일 제목');
    assert.equal(res.category, null);
    assert.equal(res.priority, null);
    assert.equal(res.dueDate, null);
    assert.equal(res.recurrence, null);
  });
});
