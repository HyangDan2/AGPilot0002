/**
 * HD2Lab Todo Master - Interactive Calendar View
 * Monthly and Weekly responsive calendar with task distribution & date navigation.
 */

import { getMonthGrid, getWeekDays, getPrevMonth, getNextMonth, formatYearMonth } from '../utils/calendar-date.js';
import { getLocalDateString } from '../utils/date.js';
import { escapeHTML } from '../utils/security.js';

export class CalendarController {
  /**
   * @param {HTMLElement} container 
   * @param {object} callbacks
   * @param {Function} callbacks.onSelectDate
   * @param {Function} callbacks.onSelectTask
   * @param {Function} callbacks.onQuickAdd
   * @param {Function} callbacks.onToggleTask
   */
  constructor(container, { onSelectDate, onSelectTask, onQuickAdd, onToggleTask } = {}) {
    this.container = container;
    this.onSelectDate = onSelectDate || (() => {});
    this.onSelectTask = onSelectTask || (() => {});
    this.onQuickAdd = onQuickAdd || (() => {});
    this.onToggleTask = onToggleTask || (() => {});

    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1; // 1-12
    this.activeDate = getLocalDateString(now);
  }

  setDate(year, month) {
    this.currentYear = year;
    this.currentMonth = month;
  }

  render(store) {
    if (!this.container) return;
    const mode = store.calendarMode || 'month';
    const selectedDate = store.selectedDate || getLocalDateString(new Date());

    // Group tasks by dueDate
    const tasksByDate = new Map();
    for (const todo of store.todos) {
      if (todo.dueDate) {
        if (!tasksByDate.has(todo.dueDate)) {
          tasksByDate.set(todo.dueDate, []);
        }
        tasksByDate.get(todo.dueDate).push(todo);
      }
    }

    this.container.innerHTML = `
      <div class="calendar-wrapper" role="region" aria-label="일정 달력">
        <div class="calendar-header">
          <div class="cal-nav-group">
            <h2 class="cal-title">${formatYearMonth(this.currentYear, this.currentMonth)}</h2>
            <div class="cal-nav-buttons">
              <button type="button" class="cal-btn prev-period-btn" aria-label="이전 기간">‹</button>
              <button type="button" class="cal-btn today-btn" aria-label="오늘 날짜로 이동">오늘</button>
              <button type="button" class="cal-btn next-period-btn" aria-label="다음 기간">›</button>
            </div>
          </div>
          <div class="cal-view-switch">
            <button type="button" class="view-mode-btn ${mode === 'month' ? 'active' : ''}" data-mode="month">월간</button>
            <button type="button" class="view-mode-btn ${mode === 'week' ? 'active' : ''}" data-mode="week">주간</button>
          </div>
        </div>

        ${mode === 'month' 
          ? this._renderMonthView(tasksByDate, selectedDate)
          : this._renderWeekView(tasksByDate, selectedDate)
        }
      </div>
    `;

    this._attachEvents(store);
  }

  _renderMonthView(tasksByDate, selectedDate) {
    const grid = getMonthGrid(this.currentYear, this.currentMonth);
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];

    return `
      <div class="calendar-grid-month" role="grid" aria-label="월간 달력">
        <div class="cal-weekdays-row" role="row">
          ${dayHeaders.map((dh, idx) => `
            <div class="cal-weekday ${idx === 0 ? 'sun' : (idx === 6 ? 'sat' : '')}" role="columnheader">
              ${dh}
            </div>
          `).join('')}
        </div>
        <div class="cal-cells-grid">
          ${grid.map(cell => {
            const dayTasks = tasksByDate.get(cell.dateString) || [];
            const isSelected = cell.dateString === selectedDate;
            const previewLimit = 3;
            const visibleTasks = dayTasks.slice(0, previewLimit);
            const extraCount = dayTasks.length - previewLimit;

            return `
              <div 
                class="cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" 
                data-date="${cell.dateString}"
                tabindex="0"
                role="gridcell"
                aria-label="${cell.dateString}, 할 일 ${dayTasks.length}개"
                aria-selected="${isSelected}"
              >
                <div class="cell-top">
                  <span class="cell-day-num">${cell.day}</span>
                  ${dayTasks.length > 0 ? `<span class="cell-task-count" title="${dayTasks.length}개 할 일">${dayTasks.length}</span>` : ''}
                  <button type="button" class="cell-quick-add" data-date="${cell.dateString}" title="이 날짜에 할 일 추가" aria-label="할 일 추가">+</button>
                </div>

                <div class="cell-tasks-list">
                  ${visibleTasks.map(t => `
                    <div 
                      class="cal-task-pill ${t.completed ? 'completed' : ''} p-${t.priority || 'medium'}" 
                      data-todo-id="${t.id}"
                      title="${escapeHTML(t.title)}"
                      role="button"
                      tabindex="0"
                    >
                      <span class="pill-dot"></span>
                      <span class="pill-title">${escapeHTML(t.title)}</span>
                    </div>
                  `).join('')}

                  ${extraCount > 0 ? `
                    <div class="cal-more-pill" data-date="${cell.dateString}">
                      +${extraCount}개 더보기
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _renderWeekView(tasksByDate, selectedDate) {
    const weekDays = getWeekDays(selectedDate);

    return `
      <div class="calendar-grid-week" role="grid" aria-label="주간 달력">
        <div class="cal-week-columns">
          ${weekDays.map(day => {
            const dayTasks = tasksByDate.get(day.dateString) || [];
            const isSelected = day.dateString === selectedDate;

            return `
              <div 
                class="cal-week-col ${day.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" 
                data-date="${day.dateString}"
                role="gridcell"
                tabindex="0"
                aria-selected="${isSelected}"
              >
                <div class="week-col-header">
                  <span class="week-day-name ${day.dayOfWeek === 0 ? 'sun' : (day.dayOfWeek === 6 ? 'sat' : '')}">${day.dayName}</span>
                  <span class="week-day-num">${day.day}</span>
                  <button type="button" class="col-quick-add" data-date="${day.dateString}" title="추가" aria-label="할 일 추가">+</button>
                </div>
                <div class="week-col-tasks">
                  ${dayTasks.length === 0 ? `
                    <div class="week-empty-slot">일정 없음</div>
                  ` : dayTasks.map(t => `
                    <div 
                      class="week-task-card ${t.completed ? 'completed' : ''} p-${t.priority || 'medium'}" 
                      data-todo-id="${t.id}"
                    >
                      <button 
                        type="button" 
                        class="week-check-btn" 
                        data-toggle-id="${t.id}" 
                        title="${t.completed ? '미완료로 변경' : '완료'}"
                        aria-label="완료 여부"
                      >
                        ${t.completed ? '✓' : ''}
                      </button>
                      <div class="week-task-info">
                        <span class="week-task-title">${escapeHTML(t.title)}</span>
                        ${t.category ? `<span class="week-task-cat">#${escapeHTML(t.category)}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _attachEvents(store) {
    // 1. Navigation buttons
    const prevBtn = this.container.querySelector('.prev-period-btn');
    const nextBtn = this.container.querySelector('.next-period-btn');
    const todayBtn = this.container.querySelector('.today-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (store.calendarMode === 'week') {
          const current = new Date(`${store.selectedDate}T00:00:00`);
          current.setDate(current.getDate() - 7);
          const newDateStr = getLocalDateString(current);
          this.currentYear = current.getFullYear();
          this.currentMonth = current.getMonth() + 1;
          store.setSelectedDate(newDateStr);
        } else {
          const prev = getPrevMonth(this.currentYear, this.currentMonth);
          this.currentYear = prev.year;
          this.currentMonth = prev.month;
          this.render(store);
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (store.calendarMode === 'week') {
          const current = new Date(`${store.selectedDate}T00:00:00`);
          current.setDate(current.getDate() + 7);
          const newDateStr = getLocalDateString(current);
          this.currentYear = current.getFullYear();
          this.currentMonth = current.getMonth() + 1;
          store.setSelectedDate(newDateStr);
        } else {
          const next = getNextMonth(this.currentYear, this.currentMonth);
          this.currentYear = next.year;
          this.currentMonth = next.month;
          this.render(store);
        }
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth() + 1;
        const todayStr = getLocalDateString(now);
        store.setSelectedDate(todayStr);
      });
    }

    // 2. View mode buttons (Month / Week)
    this.container.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        store.setCalendarMode(btn.dataset.mode);
      });
    });

    // 3. Date selection click on cells
    this.container.querySelectorAll('[data-date]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.cell-quick-add') || e.target.closest('.col-quick-add')) return;
        if (e.target.closest('.cal-task-pill') || e.target.closest('.week-task-card')) return;
        const dateStr = el.dataset.date;
        if (dateStr) {
          store.setSelectedDate(dateStr);
          this.onSelectDate(dateStr);
        }
      });
    });

    // 4. Quick add button
    this.container.querySelectorAll('.cell-quick-add, .col-quick-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dateStr = btn.dataset.date;
        store.setSelectedDate(dateStr);
        this.onQuickAdd(dateStr);
      });
    });

    // 5. Task pill click
    this.container.querySelectorAll('.cal-task-pill, .week-task-card').forEach(pill => {
      pill.addEventListener('click', (e) => {
        if (e.target.closest('.week-check-btn')) return;
        e.stopPropagation();
        const id = pill.dataset.todoId;
        const todo = store.todos.find(t => t.id === id);
        if (todo) {
          store.setSelectedTodo(id);
          this.onSelectTask(todo);
        }
      });
    });

    // 6. Week check button toggle
    this.container.querySelectorAll('.week-check-btn').forEach(chk => {
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = chk.dataset.toggleId;
        this.onToggleTask(id);
      });
    });
  }
}
