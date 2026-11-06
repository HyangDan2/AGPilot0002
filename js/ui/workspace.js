/**
 * HD2Lab Todo Master - Workspace Controller
 * Manages the three-panel desktop workspace, active view transitions, and the right context panel.
 */

import { escapeHTML } from '../utils/security.js';
import { calculateDDay, getLocalDateString, formatDateTime } from '../utils/date.js';

export class WorkspaceController {
  /**
   * @param {HTMLElement} rightPanelContainer 
   * @param {object} callbacks
   * @param {Function} callbacks.onToggleTodo
   * @param {Function} callbacks.onEditTodo
   * @param {Function} callbacks.onDeleteTodo
   * @param {Function} callbacks.onAddSubtask
   * @param {Function} callbacks.onToggleSubtask
   * @param {Function} callbacks.onDeleteSubtask
   * @param {Function} callbacks.onQuickAddDate
   */
  constructor(rightPanelContainer, callbacks = {}) {
    this.rightPanelContainer = rightPanelContainer;
    this.callbacks = callbacks;
  }

  /**
   * Render the Right Context Panel
   * @param {Store} store 
   */
  renderRightPanel(store) {
    if (!this.rightPanelContainer) return;

    const selectedTodo = store.selectedTodoId 
      ? store.todos.find(t => t.id === store.selectedTodoId) 
      : null;

    const selectedDate = store.selectedDate || getLocalDateString(new Date());
    const dateTasks = store.getTodosForDate(selectedDate);

    // Calculate upcoming deadlines (next 3 days)
    const today = new Date();
    const upcomingDeadlines = store.todos.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const dday = calculateDDay(t.dueDate, today);
      return dday && dday.diffDays >= 0 && dday.diffDays <= 3;
    }).slice(0, 5);

    let contentHtml = '';

    if (selectedTodo) {
      // 1. Task Details Mode
      const dday = selectedTodo.dueDate ? calculateDDay(selectedTodo.dueDate, today) : null;
      const ddayBadge = dday ? `<span class="badge ${dday.status === 'overdue' ? 'badge-danger' : 'badge-subtle'}">${dday.text}</span>` : '';

      contentHtml = `
        <div class="context-panel-card">
          <div class="context-header">
            <span class="context-eyebrow">TASK DETAILS</span>
            <button type="button" class="context-close-btn" id="closeTaskDetailBtn" aria-label="선택 해제">✕</button>
          </div>

          <div class="context-task-title-row">
            <button 
              type="button" 
              class="context-check-btn ${selectedTodo.completed ? 'checked' : ''}" 
              id="contextToggleBtn"
              title="${selectedTodo.completed ? '미완료로 변경' : '완료'}"
            >
              ${selectedTodo.completed ? '✓' : ''}
            </button>
            <h3 class="context-task-title ${selectedTodo.completed ? 'completed-text' : ''}">
              ${escapeHTML(selectedTodo.title)}
            </h3>
          </div>

          <div class="context-meta-grid">
            <div class="meta-item">
              <span class="meta-label">카테고리</span>
              <span class="meta-val">🏷️ ${escapeHTML(selectedTodo.category || '기타')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">우선순위</span>
              <span class="meta-val priority-${selectedTodo.priority}">
                ${selectedTodo.priority === 'high' ? '🔥 높음' : (selectedTodo.priority === 'low' ? '🌱 낮음' : '⚡ 보통')}
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">마감일</span>
              <span class="meta-val">${selectedTodo.dueDate ? `📅 ${selectedTodo.dueDate} ${ddayBadge}` : '미지정'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">반복 주기</span>
              <span class="meta-val">
                ${selectedTodo.recurrence && selectedTodo.recurrence !== 'none'
                  ? `🔁 ${selectedTodo.recurrence === 'daily' ? '매일' : (selectedTodo.recurrence === 'weekly' ? '매주' : '매월')}`
                  : '반복 없음'}
              </span>
            </div>
          </div>

          <!-- Subtasks Section -->
          <div class="context-subtasks-section">
            <div class="subtasks-header">
              <span class="subtasks-title">세부 항목 (${selectedTodo.subtasks.filter(s => s.completed).length}/${selectedTodo.subtasks.length})</span>
            </div>
            <div class="context-subtasks-list">
              ${selectedTodo.subtasks.map(st => `
                <div class="context-subtask-item ${st.completed ? 'completed' : ''}" data-st-id="${st.id}">
                  <input type="checkbox" class="st-check" ${st.completed ? 'checked' : ''} aria-label="${escapeHTML(st.title)} 완료">
                  <span class="st-title">${escapeHTML(st.title)}</span>
                  <button type="button" class="st-del-btn" aria-label="세부 항목 삭제">✕</button>
                </div>
              `).join('')}
            </div>
            <form class="context-add-subtask-form" id="contextAddSubtaskForm">
              <input type="text" id="contextSubtaskInput" placeholder="+ 새 세부 항목 입력" autocomplete="off" maxlength="150">
              <button type="submit" class="st-add-submit-btn">추가</button>
            </form>
          </div>

          <!-- Context Actions -->
          <div class="context-actions-row">
            <button type="button" class="btn-action edit-action-btn" id="contextEditBtn">
              ✏️ 상세 수정
            </button>
            <button type="button" class="btn-action delete-action-btn" id="contextDeleteBtn">
              🗑️ 삭제
            </button>
          </div>
        </div>
      `;
    } else {
      // 2. Selected Date Schedule & Deadlines Mode
      contentHtml = `
        <div class="context-panel-card">
          <div class="context-header">
            <span class="context-eyebrow">DATE SCHEDULE</span>
            <span class="context-date-badge">${selectedDate}</span>
          </div>

          <div class="date-schedule-box">
            <div class="date-schedule-title">
              📅 <strong>${selectedDate}</strong> 일정 (${dateTasks.length}개)
            </div>

            <!-- Quick Add for this date -->
            <form class="date-quick-add-form" id="dateQuickAddForm">
              <input 
                type="text" 
                id="dateQuickInput" 
                placeholder="이 날짜에 할 일 바로 추가..." 
                autocomplete="off" 
                maxlength="200" 
                required
              >
              <button type="submit" class="date-quick-submit">+</button>
            </form>

            <div class="date-tasks-scroller">
              ${dateTasks.length === 0 ? `
                <div class="date-empty-msg">이 날짜에 등록된 일정이 없습니다.</div>
              ` : dateTasks.map(t => `
                <div class="date-task-item ${t.completed ? 'completed' : ''}" data-todo-id="${t.id}">
                  <button 
                    type="button" 
                    class="date-task-check ${t.completed ? 'checked' : ''}" 
                    data-toggle-id="${t.id}"
                    title="${t.completed ? '미완료로 변경' : '완료'}"
                  >
                    ${t.completed ? '✓' : ''}
                  </button>
                  <span class="date-task-name ${t.completed ? 'completed-text' : ''}" title="${escapeHTML(t.title)}">
                    ${escapeHTML(t.title)}
                  </span>
                  <span class="date-task-cat">#${escapeHTML(t.category || '기타')}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Upcoming Deadlines -->
          <div class="upcoming-deadlines-box">
            <div class="upcoming-title">⏰ 임박한 마감일 (3일 이내)</div>
            ${upcomingDeadlines.length === 0 ? `
              <div class="upcoming-empty">임박한 마감 일정이 없습니다.</div>
            ` : upcomingDeadlines.map(t => {
              const d = calculateDDay(t.dueDate, today);
              return `
                <div class="upcoming-item" data-todo-id="${t.id}">
                  <span class="upcoming-dday ${d.status === 'overdue' ? 'overdue' : ''}">${d.text}</span>
                  <span class="upcoming-name">${escapeHTML(t.title)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    this.rightPanelContainer.innerHTML = contentHtml;
    this._attachRightPanelEvents(store, selectedTodo, selectedDate);
  }

  _attachRightPanelEvents(store, selectedTodo, selectedDate) {
    if (selectedTodo) {
      // Close detail view
      const closeBtn = this.rightPanelContainer.querySelector('#closeTaskDetailBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          store.setSelectedTodo(null);
        });
      }

      // Toggle completion
      const toggleBtn = this.rightPanelContainer.querySelector('#contextToggleBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.callbacks.onToggleTodo(selectedTodo.id);
        });
      }

      // Edit full
      const editBtn = this.rightPanelContainer.querySelector('#contextEditBtn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this.callbacks.onEditTodo(selectedTodo);
        });
      }

      // Delete
      const delBtn = this.rightPanelContainer.querySelector('#contextDeleteBtn');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          this.callbacks.onDeleteTodo(selectedTodo.id);
          store.setSelectedTodo(null);
        });
      }

      // Add Subtask form
      const stForm = this.rightPanelContainer.querySelector('#contextAddSubtaskForm');
      const stInput = this.rightPanelContainer.querySelector('#contextSubtaskInput');
      if (stForm && stInput) {
        stForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = stInput.value.trim();
          if (val) {
            this.callbacks.onAddSubtask(selectedTodo.id, val);
            stInput.value = '';
          }
        });
      }

      // Subtask toggles & deletes
      this.rightPanelContainer.querySelectorAll('.context-subtask-item').forEach(item => {
        const stId = item.dataset.stId;
        const chk = item.querySelector('.st-check');
        const del = item.querySelector('.st-del-btn');
        if (chk) {
          chk.addEventListener('change', () => {
            this.callbacks.onToggleSubtask(selectedTodo.id, stId);
          });
        }
        if (del) {
          del.addEventListener('click', () => {
            this.callbacks.onDeleteSubtask(selectedTodo.id, stId);
          });
        }
      });

    } else {
      // Date quick add form
      const dateForm = this.rightPanelContainer.querySelector('#dateQuickAddForm');
      const dateInput = this.rightPanelContainer.querySelector('#dateQuickInput');
      if (dateForm && dateInput) {
        dateForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = dateInput.value.trim();
          if (val) {
            this.callbacks.onQuickAddDate(val, selectedDate);
            dateInput.value = '';
          }
        });
      }

      // Date task click & toggle
      this.rightPanelContainer.querySelectorAll('.date-task-item').forEach(item => {
        const todoId = item.dataset.todoId;
        item.addEventListener('click', (e) => {
          if (e.target.closest('.date-task-check')) return;
          store.setSelectedTodo(todoId);
        });
      });

      this.rightPanelContainer.querySelectorAll('.date-task-check').forEach(chk => {
        chk.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = chk.dataset.toggleId;
          this.callbacks.onToggleTodo(id);
        });
      });

      // Upcoming item click
      this.rightPanelContainer.querySelectorAll('.upcoming-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.todoId;
          store.setSelectedTodo(id);
        });
      });
    }
  }

  /**
   * Render Dashboard Overview inside the central view
   * @param {HTMLElement} targetContainer 
   * @param {Store} store 
   */
  renderDashboard(targetContainer, store) {
    if (!targetContainer) return;
    const stats = store.getStats();
    const today = new Date();
    const todayStr = getLocalDateString(today);

    const overdueTasks = store.todos.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const dday = calculateDDay(t.dueDate, today);
      return dday && dday.diffDays < 0;
    });

    const todayFocusTasks = store.todos.filter(t => {
      if (t.completed) return false;
      return t.dueDate === todayStr || t.priority === 'high';
    });

    targetContainer.innerHTML = `
      <div class="dashboard-workspace" role="region" aria-label="생산성 대시보드">
        <!-- Dashboard Greeting & Summary Banner -->
        <div class="dash-banner">
          <div class="dash-banner-content">
            <h2 class="dash-greeting">반갑습니다, 작업 관리자님 ⚡</h2>
            <p class="dash-sub">오늘의 생산성 목표를 확인하고 중요한 일부터 먼저 해결하세요.</p>
          </div>
          <div class="dash-quick-actions">
            <button type="button" class="dash-action-btn" id="dashGoListBtn">📋 전체 목록 가기</button>
            <button type="button" class="dash-action-btn" id="dashGoCalBtn">📅 캘린더 보기</button>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="dash-kpi-grid">
          <div class="kpi-card">
            <span class="kpi-icon">📋</span>
            <div class="kpi-info">
              <span class="kpi-num">${stats.total}</span>
              <span class="kpi-label">전체 할 일</span>
            </div>
          </div>
          <div class="kpi-card active-kpi">
            <span class="kpi-icon">⏳</span>
            <div class="kpi-info">
              <span class="kpi-num">${stats.active}</span>
              <span class="kpi-label">진행 중</span>
            </div>
          </div>
          <div class="kpi-card done-kpi">
            <span class="kpi-icon">✅</span>
            <div class="kpi-info">
              <span class="kpi-num">${stats.done}</span>
              <span class="kpi-label">완료됨</span>
            </div>
          </div>
          <div class="kpi-card overdue-kpi ${stats.overdue > 0 ? 'alert' : ''}">
            <span class="kpi-icon">🚨</span>
            <div class="kpi-info">
              <span class="kpi-num">${stats.overdue}</span>
              <span class="kpi-label">기한 초과</span>
            </div>
          </div>
        </div>

        <!-- Progress Card -->
        <div class="dash-progress-card">
          <div class="progress-top-row">
            <span class="progress-title">전체 목표 달성률</span>
            <span class="progress-rate-num">${stats.percent}%</span>
          </div>
          <div class="dash-progress-track">
            <div class="dash-progress-bar" style="width: ${stats.percent}%;"></div>
          </div>
        </div>

        <!-- Two Column Attention Layout -->
        <div class="dash-two-col">
          <!-- Overdue Tasks Warning -->
          <div class="dash-col-card">
            <div class="card-header danger">
              <h3>🚨 즉시 조치 필요 (기한 초과 ${overdueTasks.length}개)</h3>
            </div>
            <div class="card-list">
              ${overdueTasks.length === 0 ? `
                <div class="empty-col-msg">🎉 지연된 할 일이 없습니다! 훌륭합니다.</div>
              ` : overdueTasks.map(t => {
                const d = calculateDDay(t.dueDate, today);
                return `
                  <div class="dash-task-row" data-todo-id="${t.id}">
                    <span class="badge badge-danger">${d.text}</span>
                    <span class="dash-task-title">${escapeHTML(t.title)}</span>
                    <span class="dash-task-meta">#${escapeHTML(t.category)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Today Focus Tasks -->
          <div class="dash-col-card">
            <div class="card-header highlight">
              <h3>🎯 오늘 우선 처리할 작업 (${todayFocusTasks.length}개)</h3>
            </div>
            <div class="card-list">
              ${todayFocusTasks.length === 0 ? `
                <div class="empty-col-msg">오늘 예정된 급한 작업이 없습니다. 새로운 할 일을 등록해 보세요.</div>
              ` : todayFocusTasks.map(t => `
                <div class="dash-task-row" data-todo-id="${t.id}">
                  <span class="badge priority-${t.priority}">
                    ${t.priority === 'high' ? '🔥 높음' : '⚡ 보통'}
                  </span>
                  <span class="dash-task-title">${escapeHTML(t.title)}</span>
                  <span class="dash-task-meta">${t.dueDate || '미지정'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Events
    targetContainer.querySelector('#dashGoListBtn')?.addEventListener('click', () => {
      store.setWorkspaceView('list');
    });
    targetContainer.querySelector('#dashGoCalBtn')?.addEventListener('click', () => {
      store.setWorkspaceView('calendar');
    });

    targetContainer.querySelectorAll('.dash-task-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.todoId;
        store.setSelectedTodo(id);
      });
    });
  }
}
