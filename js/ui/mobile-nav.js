/**
 * HD2Lab Todo Master - Mobile Bottom Navigation Component
 * Provides clean thumb-accessible mobile navigation across Home, List, Calendar, and Add.
 */

export class MobileNavController {
  /**
   * @param {HTMLElement} container 
   * @param {object} callbacks
   * @param {Function} callbacks.onViewChange
   * @param {Function} callbacks.onQuickAdd
   */
  constructor(container, { onViewChange, onQuickAdd } = {}) {
    this.container = container;
    this.onViewChange = onViewChange || (() => {});
    this.onQuickAdd = onQuickAdd || (() => {});
  }

  render(store) {
    if (!this.container) return;
    const currentView = store.workspaceView;

    this.container.innerHTML = `
      <nav class="mobile-bottom-nav" aria-label="모바일 하단 탐색">
        <button 
          type="button" 
          class="mobile-nav-btn ${currentView === 'dashboard' ? 'active' : ''}" 
          data-view="dashboard"
          aria-label="홈 대시보드"
        >
          <span class="m-icon">🏠</span>
          <span class="m-label">홈</span>
        </button>

        <button 
          type="button" 
          class="mobile-nav-btn ${currentView === 'list' ? 'active' : ''}" 
          data-view="list"
          aria-label="할 일 목록"
        >
          <span class="m-icon">📋</span>
          <span class="m-label">목록</span>
        </button>

        <button 
          type="button" 
          class="mobile-nav-btn ${currentView === 'calendar' ? 'active' : ''}" 
          data-view="calendar"
          aria-label="캘린더"
        >
          <span class="m-icon">📅</span>
          <span class="m-label">달력</span>
        </button>

        <button 
          type="button" 
          class="mobile-nav-btn m-add-action-btn" 
          id="mobileAddTriggerBtn"
          aria-label="새 할 일 추가"
        >
          <span class="m-icon-add">+</span>
          <span class="m-label">추가</span>
        </button>
      </nav>
    `;

    this._attachEvents(store);
  }

  _attachEvents(store) {
    this.container.querySelectorAll('.mobile-nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        store.setWorkspaceView(view);
        this.onViewChange(view);
      });
    });

    const addBtn = this.container.querySelector('#mobileAddTriggerBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.onQuickAdd();
      });
    }
  }
}
