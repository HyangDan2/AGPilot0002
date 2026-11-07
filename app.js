/**
 * HD2Lab Todo Master - Main Application Entrypoint (ES Module)
 * Upgraded for v2.2.0: Productivity Workspace, Calendar, Desktop 3-Panel, Pagination & Mobile Nav.
 */

import { Store } from './js/state/store.js';
import { loadStoredTodos, loadStoredTheme, loadStoredUiPrefs, saveStoredUiPrefs } from './js/services/storage.js';
import { createExportPayload, validateBackupPayload, downloadBackupFile, mergeTodosSafely, analyzeBackupDuplicates } from './js/services/backup.js';
import { createTodoCardElement, getContextualEmptyState } from './js/ui/components.js';
import { ToastManager } from './js/ui/toast.js';
import { ModalController } from './js/ui/modal.js';
import { DragDropController } from './js/ui/dnd.js';
import { parseSmartTaskInput } from './js/utils/parser.js';
import { escapeHTML } from './js/utils/security.js';
import { getLocalDateString } from './js/utils/date.js';

// Workspace & Navigation Controllers
import { renderPaginationControls } from './js/ui/pagination.js';
import { CalendarController } from './js/ui/calendar.js';
import { SidebarController } from './js/ui/sidebar.js';
import { WorkspaceController } from './js/ui/workspace.js';
import { MobileNavController } from './js/ui/mobile-nav.js';

// DOM Element References - Workspace Layout & Panels
const workspaceSidebar = document.getElementById('workspaceSidebar');
const workspaceRightPanel = document.getElementById('workspaceRightPanel');
const mobileBottomNav = document.getElementById('mobileBottomNav');
const dashboardView = document.getElementById('dashboardView');
const calendarView = document.getElementById('calendarView');
const listView = document.getElementById('listView');
const paginationContainer = document.getElementById('paginationContainer');

// Form & Task Input Elements
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const smartInputPreview = document.getElementById('smartInputPreview');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const recurrenceSelect = document.getElementById('recurrenceSelect');
const dueDateInput = document.getElementById('dueDateInput');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statDone = document.getElementById('statDone');
const statOverdue = document.getElementById('statOverdue');
const progressBarBg = document.querySelector('.progress-bar-bg');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');

// Controls Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');
const toggleAllBtn = document.getElementById('toggleAllBtn');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const toastContainer = document.getElementById('toastContainer');
const shortcutsDialog = document.getElementById('shortcutsDialog');

// Initialize Core Controllers
const toast = new ToastManager(toastContainer);
const modal = new ModalController();
const expandedTodoIds = new Set();

// Load initial state
const initialStorage = loadStoredTodos();
const initialTheme = loadStoredTheme();
const initialUiPrefs = loadStoredUiPrefs();

const store = new Store({
  todos: initialStorage.todos,
  theme: initialTheme,
  uiPrefs: initialUiPrefs
});

// Storage failure error notification handler
store.onStorageError = (errInfo) => {
  toast.show({
    message: errInfo.lastError || '저장 공간 부족 등으로 인해 데이터가 영구 저장되지 못했습니다.',
    type: 'error',
    duration: 6000
  });
};

if (initialStorage.error) {
  setTimeout(() => {
    toast.show({ message: initialStorage.error, type: 'warning', duration: 6000 });
  }, 300);
}

// Drag & Drop Controller
const dnd = new DragDropController({
  onReorder: (sourceId, targetId) => {
    store.reorderTodos(sourceId, targetId);
    if (!store.storageStatus.isOk) return;
    toast.show({ message: '순서가 변경되었습니다.', type: 'info', duration: 2000 });
  }
});

// Shared Task Action Handlers
const taskActionHandlers = {
  onToggleTodo: (id) => {
    const updated = store.toggleTodo(id);
    if (!store.storageStatus.isOk) return;
    if (updated && updated.completed) {
      if (updated.undoId) {
        toast.show({
          message: '반복 할 일이 완료되고 다음 일정이 자동 등록되었습니다. 🎉',
          type: 'success',
          duration: 6000,
          action: {
            label: '실행 취소',
            onClick: () => {
              store.undo(updated.undoId);
              toast.show({ message: '반복 완료가 취소되었습니다.', type: 'info', duration: 2000 });
            }
          }
        });
      } else {
        toast.show({ message: '할 일을 완료했습니다! 🎉', type: 'success', duration: 2000 });
      }
    }
  },
  onUpdateTitle: (id, newTitle) => {
    store.updateTodo(id, { title: newTitle });
    if (!store.storageStatus.isOk) return;
    toast.show({ message: '할 일이 수정되었습니다.', type: 'info', duration: 2000 });
  },
  onEditTodo: async (todo) => {
    const updatedData = await modal.showEditTaskModal(todo);
    if (updatedData) {
      store.updateTodo(todo.id, updatedData);
      if (!store.storageStatus.isOk) return;
      toast.show({ message: '할 일 상세 정보가 저장되었습니다.', type: 'success', duration: 2500 });
    }
  },
  onDeleteTodo: (id) => {
    const deleted = store.deleteTodo(id);
    if (!store.storageStatus.isOk) return;
    if (deleted) {
      toast.show({
        message: `"${deleted.title}" 항목이 삭제되었습니다.`,
        type: 'warning',
        duration: 6000,
        action: {
          label: '실행 취소',
          onClick: () => {
            store.undo(deleted.undoId);
            toast.show({ message: '삭제가 취소되었습니다.', type: 'success', duration: 2000 });
          }
        }
      });
    }
  },
  onAddSubtask: (todoId, title) => {
    store.addSubtask(todoId, title);
    expandedTodoIds.add(todoId);
  },
  onToggleSubtask: (todoId, subtaskId) => {
    store.toggleSubtask(todoId, subtaskId);
  },
  onDeleteSubtask: (todoId, subtaskId) => {
    store.deleteSubtask(todoId, subtaskId);
  },
  onQuickAddDate: (title, dateStr) => {
    const parsed = parseSmartTaskInput(title);
    store.addTodo({
      title: parsed.title,
      category: parsed.category || '업무',
      priority: parsed.priority || 'medium',
      recurrence: parsed.recurrence || 'none',
      dueDate: dateStr
    });
    if (!store.storageStatus.isOk) return;
    toast.show({ message: `${dateStr} 일정에 추가되었습니다.`, type: 'success', duration: 2500 });
  }
};

// Initialize Workspace Panels
const sidebar = new SidebarController(workspaceSidebar, {
  onToggleTheme: () => {
    const nextTheme = store.toggleTheme();
    applyTheme(nextTheme);
  },
  onOpenShortcuts: () => {
    if (shortcutsDialog) modal.open(shortcutsDialog);
  },
  onExportBackup: () => handleExportBackup(),
  onImportBackup: (e) => handleImportBackup(e)
});

const workspace = new WorkspaceController(workspaceRightPanel, {
  onToggleTodo: taskActionHandlers.onToggleTodo,
  onEditTodo: taskActionHandlers.onEditTodo,
  onDeleteTodo: taskActionHandlers.onDeleteTodo,
  onAddSubtask: taskActionHandlers.onAddSubtask,
  onToggleSubtask: taskActionHandlers.onToggleSubtask,
  onDeleteSubtask: taskActionHandlers.onDeleteSubtask,
  onQuickAddDate: taskActionHandlers.onQuickAddDate
});

const calendar = new CalendarController(calendarView, {
  onSelectDate: (dateStr) => {
    store.setSelectedDate(dateStr);
  },
  onSelectTask: (todo) => {
    store.setSelectedTodo(todo.id);
  },
  onQuickAdd: (dateStr) => {
    store.setSelectedDate(dateStr);
    store.setWorkspaceView('list');
    if (dueDateInput) dueDateInput.value = dateStr;
    todoInput.focus();
    toast.show({ message: `${dateStr} 마감일로 설정되었습니다.`, type: 'info', duration: 2000 });
  },
  onToggleTask: (id) => {
    taskActionHandlers.onToggleTodo(id);
  }
});

const mobileNav = new MobileNavController(mobileBottomNav, {
  onViewChange: (view) => {
    store.setWorkspaceView(view);
  },
  onQuickAdd: () => {
    store.setWorkspaceView('list');
    todoInput.scrollIntoView({ behavior: 'smooth' });
    todoInput.focus();
  }
});

/**
 * Handle Backup Export
 */
function handleExportBackup() {
  try {
    const payload = createExportPayload(store.todos);
    downloadBackupFile(payload);
    toast.show({ message: `할 일 ${store.todos.length}개가 백업되었습니다.`, type: 'success' });
  } catch (err) {
    toast.show({ message: '백업 생성 중 오류가 발생했습니다.', type: 'error' });
  }
}

/**
 * Handle Backup Import
 */
async function handleImportBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const validation = validateBackupPayload(event.target.result);
      if (!validation.isValid) {
        toast.show({ message: validation.error || '백업 데이터가 올바르지 않습니다.', type: 'error' });
        return;
      }

      const analysis = analyzeBackupDuplicates(store.todos, validation.validTodos);

      const choice = await modal.showImportPreview({
        totalCount: validation.totalCount,
        validCount: validation.validTodos.length,
        newCount: analysis.newCount,
        duplicateCount: analysis.duplicateCount,
        invalidCount: validation.invalidCount,
        existingCount: store.todos.length
      });

      if (choice === 'replace') {
        store.todos = validation.validTodos;
        store.notify();
        toast.show({ message: `${validation.validTodos.length}개 항목으로 덮어썼습니다.`, type: 'success' });
      } else if (choice === 'merge') {
        store.todos = mergeTodosSafely(store.todos, validation.validTodos);
        store.notify();
        toast.show({ message: `${analysis.newCount}개 신규 항목을 병합했습니다. (중복 ${analysis.duplicateCount}개 건너뜀)`, type: 'success' });
      }
    } catch (err) {
      toast.show({ message: '파일 복원 처리 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      e.target.value = '';
    }
  };
  reader.readAsText(file);
}

/**
 * Update live smart input token preview
 */
function updateSmartInputPreview() {
  if (!smartInputPreview) return;
  const val = todoInput.value.trim();
  if (!val) {
    smartInputPreview.classList.add('hidden');
    smartInputPreview.innerHTML = '';
    return;
  }

  const parsed = parseSmartTaskInput(val);
  const chips = [];

  if (parsed.dueDate) {
    chips.push(`<span class="smart-chip due">📅 ${parsed.dueDate}</span>`);
  }
  if (parsed.category) {
    chips.push(`<span class="smart-chip category">🏷️ #${escapeHTML(parsed.category)}</span>`);
  }
  if (parsed.priority) {
    const pLabel = parsed.priority === 'high' ? '🔥 높음' : (parsed.priority === 'low' ? '🌱 낮음' : '⚡ 보통');
    chips.push(`<span class="smart-chip priority-${parsed.priority}">!${pLabel}</span>`);
  }
  if (parsed.recurrence && parsed.recurrence !== 'none') {
    const rLabel = parsed.recurrence === 'daily' ? '매일' : (parsed.recurrence === 'weekly' ? '매주' : '매월');
    chips.push(`<span class="smart-chip recurrence">🔁 ${rLabel}</span>`);
  }

  if (chips.length > 0) {
    smartInputPreview.innerHTML = `
      <span class="smart-preview-title">⚡ 스마트 감지:</span>
      ${chips.join('')}
      <span class="smart-clean-title" style="color: var(--muted); margin-left: auto;">제목: "${escapeHTML(parsed.title)}"</span>
    `;
    smartInputPreview.classList.remove('hidden');
  } else {
    smartInputPreview.classList.add('hidden');
    smartInputPreview.innerHTML = '';
  }
}

/**
 * Setup All Event Listeners
 */
function setupEvents() {
  // 0. Live input parsing
  todoInput.addEventListener('input', updateSmartInputPreview);

  // 1. Add Todo Form
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawValue = todoInput.value.trim();
    if (!rawValue) return;

    try {
      const parsed = parseSmartTaskInput(rawValue);
      const category = parsed.category || (categorySelect ? categorySelect.value : '개인');
      const priority = parsed.priority || (prioritySelect ? prioritySelect.value : 'medium');
      const recurrence = (parsed.recurrence && parsed.recurrence !== 'none')
        ? parsed.recurrence
        : (recurrenceSelect ? recurrenceSelect.value : 'none');
      const dueDate = parsed.dueDate || (dueDateInput ? dueDateInput.value : '');

      store.addTodo({
        title: parsed.title,
        category,
        priority,
        recurrence,
        dueDate
      });

      todoInput.value = '';
      if (dueDateInput) dueDateInput.value = '';
      if (recurrenceSelect) recurrenceSelect.value = 'none';
      updateSmartInputPreview();
      todoInput.focus();

      if (store.storageStatus && !store.storageStatus.isOk) {
        return;
      }

      toast.show({ message: '할 일이 추가되었습니다.', type: 'success', duration: 2500 });
    } catch (err) {
      toast.show({ message: err.message, type: 'error' });
    }
  });

  // 2. View Filter Tabs (All, Focus, Today, Upcoming, Overdue, Active, Completed)
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      store.setFilter(btn.dataset.filter);
    });
  });

  // 3. Search input
  searchInput.addEventListener('input', (e) => {
    store.setSearchQuery(e.target.value);
  });

  // 4. Category filter
  categoryFilter.addEventListener('change', (e) => {
    store.setCategory(e.target.value);
  });

  // 5. Sort selection
  sortSelect.addEventListener('change', (e) => {
    store.setSort(e.target.value);
  });

  // 6. Theme Toggle Header button
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = store.toggleTheme();
    applyTheme(nextTheme);
  });

  // 7. Backup Export Header button
  exportBtn.addEventListener('click', () => {
    handleExportBackup();
  });

  // 8. Backup Import Header input
  importInput.addEventListener('change', (e) => {
    handleImportBackup(e);
  });

  // 9. Batch Actions
  toggleAllBtn.addEventListener('click', () => {
    store.toggleAll();
  });

  clearCompletedBtn.addEventListener('click', async () => {
    const completedCount = store.todos.filter(t => t.completed).length;
    if (completedCount === 0) {
      toast.show({ message: '삭제할 완료 항목이 없습니다.', type: 'info' });
      return;
    }

    const confirmed = await modal.confirm({
      title: '완료 항목 일괄 삭제',
      message: `완료된 할 일 ${completedCount}개를 영구적으로 삭제하시겠습니까?`,
      confirmText: '삭제 실행',
      cancelText: '취소',
      isDestructive: true
    });

    if (confirmed) {
      const { count, undoId } = store.clearCompleted();
      if (!store.storageStatus.isOk) return;
      toast.show({
        message: `완료 항목 ${count}개가 삭제되었습니다.`,
        type: 'warning',
        duration: 7000,
        action: {
          label: '실행 취소',
          onClick: () => {
            store.undo(undoId);
            toast.show({ message: '완료 항목 삭제가 취소되었습니다.', type: 'success', duration: 2000 });
          }
        }
      });
    }
  });

  // 10. Shortcuts dialog toggle
  if (shortcutsBtn && shortcutsDialog) {
    shortcutsBtn.addEventListener('click', () => {
      modal.open(shortcutsDialog);
    });
    const closeShortcutsBtn = shortcutsDialog.querySelector('.close-dialog-btn');
    if (closeShortcutsBtn) {
      closeShortcutsBtn.addEventListener('click', () => modal.close());
    }
  }

  // 11. Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

    if (e.key === '?' && !isInputActive && shortcutsDialog) {
      e.preventDefault();
      modal.open(shortcutsDialog);
    } else if (e.key === 'n' && !isInputActive && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (store.workspaceView !== 'list') {
        store.setWorkspaceView('list');
      }
      todoInput.focus();
    } else if (e.key === 't' && !isInputActive && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const nextTheme = store.toggleTheme();
      applyTheme(nextTheme);
    }
  });
}

/**
 * Apply theme to document element and update toggle button.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeLabels = document.querySelectorAll('.theme-label');
  themeLabels.forEach(lbl => {
    lbl.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
  });
}

/**
 * Main Render Loop
 */
function render() {
  const currentView = store.workspaceView;
  const stats = store.getStats();

  // 0. Update Density on body
  document.body.classList.toggle('density-compact', store.displayDensity === 'compact');

  // 1. Toggle Workspace Views
  if (currentView === 'dashboard') {
    if (dashboardView) dashboardView.classList.remove('hidden');
    if (calendarView) calendarView.classList.add('hidden');
    if (listView) listView.classList.add('hidden');
    workspace.renderDashboard(dashboardView, store);
  } else if (currentView === 'calendar') {
    if (calendarView) calendarView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (listView) listView.classList.add('hidden');
    calendar.render(store);
  } else {
    // List & Inbox Views
    if (listView) listView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    if (calendarView) calendarView.classList.add('hidden');

    // Update Tab Buttons active class
    tabBtns.forEach(btn => {
      const isMatch = btn.dataset.filter === store.filter;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    // Render paginated & grouped items
    const paginated = store.getPaginatedTodos();
    todoList.innerHTML = '';

    if (paginated.totalItems === 0) {
      emptyState.classList.remove('hidden');
      const emptyInfo = getContextualEmptyState(store.filter, store.searchQuery);
      emptyState.querySelector('.empty-icon').textContent = emptyInfo.icon;
      emptyState.querySelector('.empty-title').textContent = emptyInfo.title;
      emptyState.querySelector('.empty-desc').textContent = emptyInfo.desc;
    } else {
      emptyState.classList.add('hidden');

      const groups = store.getGroupedTodos(paginated.items);
      groups.forEach(group => {
        if (store.groupBy !== 'none' && group.title) {
          const groupHeader = document.createElement('div');
          groupHeader.className = 'todo-group-header';
          groupHeader.innerHTML = `
            <span>${group.title}</span>
            <span class="group-count-pill">${group.count}</span>
          `;
          todoList.appendChild(groupHeader);
        }

        group.items.forEach(todo => {
          const card = createTodoCardElement(
            todo,
            {
              onToggle: (id) => taskActionHandlers.onToggleTodo(id),
              onUpdateTitle: (id, newTitle) => taskActionHandlers.onUpdateTitle(id, newTitle),
              onEditFull: (t) => taskActionHandlers.onEditTodo(t),
              onDelete: (id) => taskActionHandlers.onDeleteTodo(id),
              onSelectTodo: (id) => store.setSelectedTodo(id),
              onMove: (id, direction) => {
                const success = store.moveTodo(id, direction);
                if (success) {
                  sortSelect.value = 'manual';
                }
              },
              onToggleSubtasksExpand: (id) => {
                if (expandedTodoIds.has(id)) {
                  expandedTodoIds.delete(id);
                } else {
                  expandedTodoIds.add(id);
                }
                render();
              },
              onAddSubtask: (todoId, title) => taskActionHandlers.onAddSubtask(todoId, title),
              onToggleSubtask: (todoId, subtaskId) => taskActionHandlers.onToggleSubtask(todoId, subtaskId),
              onDeleteSubtask: (todoId, subtaskId) => taskActionHandlers.onDeleteSubtask(todoId, subtaskId),
              setupDragAndDrop: (el, id) => {
                dnd.attach(el, id);
              }
            },
            expandedTodoIds.has(todo.id),
            new Date(),
            store.displayDensity
          );
          todoList.appendChild(card);
        });
      });
    }

    // Render Pagination Component
    renderPaginationControls(paginationContainer, paginated, {
      onPageChange: (page) => store.setPage(page),
      onPageSizeChange: (size) => store.setPageSize(size)
    });
  }

  // 2. Render Left Sidebar, Right Context Panel & Mobile Nav
  sidebar.render(store);
  workspace.renderRightPanel(store);
  mobileNav.render(store);

  // 3. Update Global Stats
  if (statTotal) statTotal.textContent = stats.total;
  if (statActive) statActive.textContent = stats.active;
  if (statDone) statDone.textContent = stats.done;
  if (statOverdue) {
    statOverdue.textContent = stats.overdue;
    const box = statOverdue.closest('.stat-item');
    if (box) box.style.display = stats.overdue > 0 ? 'flex' : 'none';
  }
  if (progressBarBg) progressBarBg.setAttribute('aria-valuenow', stats.percent);
  if (progressBar) {
    progressBar.style.width = `${stats.percent}%`;
    progressBar.setAttribute('aria-valuenow', stats.percent);
  }
  if (progressPercent) progressPercent.textContent = `${stats.percent}%`;
}

/**
 * Service Worker Registration for PWA Offline Support
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then(reg => {
          console.log('HD2Lab ServiceWorker registered successfully:', reg.scope);
        })
        .catch(err => {
          console.warn('ServiceWorker registration skipped/failed:', err);
        });
    });
  }
}

// Start Application
applyTheme(store.theme);
setupEvents();
store.subscribe(() => render());
render();
registerServiceWorker();
