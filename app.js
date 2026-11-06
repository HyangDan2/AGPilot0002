/**
 * HD2Lab Todo Master - Main Application Entrypoint (ES Module)
 */

import { Store } from './js/state/store.js';
import { loadStoredTodos, loadStoredTheme } from './js/services/storage.js';
import { createExportPayload, validateBackupPayload, downloadBackupFile, mergeTodosSafely, analyzeBackupDuplicates } from './js/services/backup.js';
import { createTodoCardElement, getContextualEmptyState } from './js/ui/components.js';
import { ToastManager } from './js/ui/toast.js';
import { ModalController } from './js/ui/modal.js';
import { DragDropController } from './js/ui/dnd.js';
import { parseSmartTaskInput } from './js/utils/parser.js';
import { escapeHTML } from './js/utils/security.js';

// DOM Element References
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

// Initialize Controllers
const toast = new ToastManager(toastContainer);
const modal = new ModalController();
const expandedTodoIds = new Set();

// Load initial state
const initialStorage = loadStoredTodos();
const initialTheme = loadStoredTheme();

const store = new Store({
  todos: initialStorage.todos,
  theme: initialTheme
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
    toast.show({ message: '순서가 변경되었습니다.', type: 'info', duration: 2000 });
  }
});

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

  // 2. View Filter Tabs (All, Today, Upcoming, Overdue, Active, Completed)
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

  // 6. Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    const nextTheme = store.toggleTheme();
    applyTheme(nextTheme);
  });

  // 7. Backup Export
  exportBtn.addEventListener('click', () => {
    try {
      const payload = createExportPayload(store.todos);
      downloadBackupFile(payload);
      toast.show({ message: `할 일 ${store.todos.length}개가 백업되었습니다.`, type: 'success' });
    } catch (err) {
      toast.show({ message: '백업 생성 중 오류가 발생했습니다.', type: 'error' });
    }
  });

  // 8. Backup Import
  importInput.addEventListener('change', async (e) => {
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
  const themeLabel = themeToggleBtn.querySelector('.theme-label');
  if (themeLabel) {
    themeLabel.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
  }
}

/**
 * Main Render Loop
 */
function render() {
  const filteredList = store.getFilteredAndSortedTodos();
  const stats = store.getStats();

  // 1. Render items
  todoList.innerHTML = '';
  if (filteredList.length === 0) {
    emptyState.classList.remove('hidden');
    const emptyInfo = getContextualEmptyState(store.filter, store.searchQuery);
    emptyState.querySelector('.empty-icon').textContent = emptyInfo.icon;
    emptyState.querySelector('.empty-title').textContent = emptyInfo.title;
    emptyState.querySelector('.empty-desc').textContent = emptyInfo.desc;
  } else {
    emptyState.classList.add('hidden');
    filteredList.forEach(todo => {
      const card = createTodoCardElement(
        todo,
        {
          onToggle: (id) => {
            const updated = store.toggleTodo(id);
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
            toast.show({ message: '할 일이 수정되었습니다.', type: 'info', duration: 2000 });
          },
          onEditFull: async (todo) => {
            const updatedData = await modal.showEditTaskModal(todo);
            if (updatedData) {
              store.updateTodo(todo.id, updatedData);
              toast.show({ message: '할 일 상세 정보가 저장되었습니다.', type: 'success', duration: 2500 });
            }
          },
          onDelete: (id) => {
            const deleted = store.deleteTodo(id);
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
          setupDragAndDrop: (el, id) => {
            dnd.attach(el, id);
          }
        },
        expandedTodoIds.has(todo.id)
      );
      todoList.appendChild(card);
    });
  }

  // 2. Update Stats
  if (statTotal) statTotal.textContent = stats.total;
  if (statActive) statActive.textContent = stats.active;
  if (statDone) statDone.textContent = stats.done;
  if (statOverdue) {
    statOverdue.textContent = stats.overdue;
    statOverdue.closest('.stat-item').style.display = stats.overdue > 0 ? 'flex' : 'none';
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
