/**
 * HD2Lab Todo Master - Sidebar Navigation Component
 * Left panel navigation for desktop workspace with view filters, category shortcuts, and utility actions.
 */

export class SidebarController {
  /**
   * @param {HTMLElement} container
   * @param {object} callbacks
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
  }

  render(store) {
    if (!this.container) return;

    const stats = store.getStats();
    const activeView = store.workspaceView;
    const currentFilter = store.filter;
    const currentCategory = store.category;
    const unscheduledCount = store.getUnscheduledTodos().length;

    // Calculate category counts
    const catCounts = {
      'all': store.todos.filter(t => !t.completed).length,
      '개인': store.todos.filter(t => !t.completed && t.category === '개인').length,
      '업무': store.todos.filter(t => !t.completed && t.category === '업무').length,
      '공부': store.todos.filter(t => !t.completed && t.category === '공부').length,
      '쇼핑': store.todos.filter(t => !t.completed && t.category === '쇼핑').length,
      '기타': store.todos.filter(t => !t.completed && t.category === '기타').length
    };

    this.container.innerHTML = `
      <div class="sidebar-inner">
        <!-- Brand Header -->
        <div class="sidebar-brand">
          <div class="sidebar-brand-logo">
            <span class="mark" aria-hidden="true"></span>
            HD2Lab
            <em>Todo Master</em>
          </div>
          <div class="sidebar-badge">v2.2 WORKSPACE</div>
        </div>

        <!-- Primary Navigation -->
        <nav class="sidebar-nav" aria-label="기본 탐색">
          <div class="nav-section-title">작업 공간</div>
          <button type="button" class="sidebar-nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
            <span class="nav-icon">📊</span>
            <span class="nav-text">대시보드</span>
            <span class="nav-count">${stats.active}</span>
          </button>
          <button type="button" class="sidebar-nav-item ${activeView === 'list' && currentFilter === 'all' ? 'active' : ''}" data-view="list" data-nav-filter="all">
            <span class="nav-icon">📋</span>
            <span class="nav-text">전체 할 일</span>
            <span class="nav-count">${stats.total}</span>
          </button>
          <button type="button" class="sidebar-nav-item ${activeView === 'calendar' ? 'active' : ''}" data-view="calendar">
            <span class="nav-icon">📅</span>
            <span class="nav-text">캘린더</span>
          </button>
          <button type="button" class="sidebar-nav-item ${activeView === 'list' && currentFilter === 'focus' ? 'active' : ''}" data-view="list" data-nav-filter="focus">
            <span class="nav-icon">🎯</span>
            <span class="nav-text">오늘 집중</span>
            ${stats.overdue > 0 ? `<span class="nav-badge danger">🚨 ${stats.overdue}</span>` : ''}
          </button>
          <button type="button" class="sidebar-nav-item ${activeView === 'inbox' ? 'active' : ''}" data-view="inbox">
            <span class="nav-icon">📥</span>
            <span class="nav-text">인박스 (미지정)</span>
            ${unscheduledCount > 0 ? `<span class="nav-count">${unscheduledCount}</span>` : ''}
          </button>
          <button type="button" class="sidebar-nav-item ${activeView === 'list' && currentFilter === 'completed' ? 'active' : ''}" data-view="list" data-nav-filter="completed">
            <span class="nav-icon">✅</span>
            <span class="nav-text">완료된 항목</span>
            <span class="nav-count">${stats.done}</span>
          </button>
        </nav>

        <!-- Category Filters -->
        <div class="sidebar-categories" aria-label="카테고리별 보기">
          <div class="nav-section-title">카테고리</div>
          ${[
            { id: 'all', name: '전체 카테고리', icon: '📂' },
            { id: '개인', name: '개인', icon: '👤' },
            { id: '업무', name: '업무', icon: '💼' },
            { id: '공부', name: '공부', icon: '📚' },
            { id: '쇼핑', name: '쇼핑', icon: '🛒' },
            { id: '기타', name: '기타', icon: '📌' }
          ].map(cat => `
            <button 
              type="button" 
              class="category-item-btn ${currentCategory === cat.id ? 'active' : ''}" 
              data-category="${cat.id}"
            >
              <span class="cat-icon">${cat.icon}</span>
              <span class="cat-name">${cat.name}</span>
              <span class="cat-count">${catCounts[cat.id] || 0}</span>
            </button>
          `).join('')}
        </div>

        <!-- Display & Density Controls -->
        <div class="sidebar-display-options">
          <div class="nav-section-title">보기 설정</div>
          <div class="display-toggle-row">
            <span class="option-label">표시 밀도</span>
            <button type="button" id="densityToggleBtn" class="pill-toggle-btn" title="여유롭게 / 조밀하게 전환">
              ${store.displayDensity === 'compact' ? '조밀하게' : '기본'}
            </button>
          </div>
          <div class="display-toggle-row">
            <label for="groupSelect" class="option-label">그룹화</label>
            <select id="groupSelect" class="sidebar-select" aria-label="항목 그룹화">
              <option value="none" ${store.groupBy === 'none' ? 'selected' : ''}>없음</option>
              <option value="category" ${store.groupBy === 'category' ? 'selected' : ''}>카테고리별</option>
              <option value="priority" ${store.groupBy === 'priority' ? 'selected' : ''}>우선순위별</option>
              <option value="status" ${store.groupBy === 'status' ? 'selected' : ''}>상태별</option>
              <option value="dueDate" ${store.groupBy === 'dueDate' ? 'selected' : ''}>마감일별</option>
            </select>
          </div>
        </div>

        <!-- Utility Footer -->
        <div class="sidebar-footer">
          <button id="sidebarThemeBtn" class="sidebar-util-btn" title="테마 전환">
            <span class="util-icon">🌓</span>
            <span class="theme-label">${store.theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>
          <button id="sidebarShortcutsBtn" class="sidebar-util-btn" title="단축키 안내">
            <span class="util-icon">⌨️</span>
            <span>단축키</span>
          </button>
          <button id="sidebarExportBtn" class="sidebar-util-btn" title="데이터 백업">
            <span class="util-icon">📥</span>
            <span>백업</span>
          </button>
          <label for="sidebarImportInput" class="sidebar-util-btn" title="데이터 복원">
            <span class="util-icon">📤</span>
            <span>복원</span>
            <input type="file" id="sidebarImportInput" accept=".json" hidden>
          </label>
        </div>
      </div>
    `;

    this._attachEvents(store);
  }

  _attachEvents(store) {
    // Nav items
    this.container.querySelectorAll('.sidebar-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const filter = btn.dataset.navFilter;
        if (filter) {
          store.setFilter(filter);
        }
        if (view) {
          store.setWorkspaceView(view);
        }
      });
    });

    // Categories
    this.container.querySelectorAll('.category-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        store.setCategory(cat);
        if (store.workspaceView !== 'list') {
          store.setWorkspaceView('list');
        }
      });
    });

    // Density toggle
    const densityBtn = this.container.querySelector('#densityToggleBtn');
    if (densityBtn) {
      densityBtn.addEventListener('click', () => {
        const nextDensity = store.displayDensity === 'compact' ? 'comfortable' : 'compact';
        store.setDisplayDensity(nextDensity);
      });
    }

    // Grouping select
    const groupSelect = this.container.querySelector('#groupSelect');
    if (groupSelect) {
      groupSelect.addEventListener('change', (e) => {
        store.setGroupBy(e.target.value);
      });
    }

    // Utility actions delegation
    const themeBtn = this.container.querySelector('#sidebarThemeBtn');
    if (themeBtn && this.callbacks.onToggleTheme) {
      themeBtn.addEventListener('click', () => this.callbacks.onToggleTheme());
    }

    const shortcutsBtn = this.container.querySelector('#sidebarShortcutsBtn');
    if (shortcutsBtn && this.callbacks.onOpenShortcuts) {
      shortcutsBtn.addEventListener('click', () => this.callbacks.onOpenShortcuts());
    }

    const exportBtn = this.container.querySelector('#sidebarExportBtn');
    if (exportBtn && this.callbacks.onExportBackup) {
      exportBtn.addEventListener('click', () => this.callbacks.onExportBackup());
    }

    const importInput = this.container.querySelector('#sidebarImportInput');
    if (importInput && this.callbacks.onImportBackup) {
      importInput.addEventListener('change', (e) => this.callbacks.onImportBackup(e));
    }
  }
}
