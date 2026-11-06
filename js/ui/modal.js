/**
 * HD2Lab Todo Master - Accessible Modal Dialog Controller
 * Guaranteed single-resolution Promise lifecycle for confirm, backup preview, and full task editing.
 */

import { escapeHTML } from '../utils/security.js';
import { VALID_CATEGORIES, VALID_PRIORITIES, VALID_RECURRENCES, createSubtask } from '../models/todo.js';

export class ModalController {
  constructor() {
    this.activeDialog = null;
    this.previousFocusedElement = null;
    this.setupGlobalListeners();
  }

  setupGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeDialog) {
        // Native <dialog> triggers 'cancel' on Escape, but for custom dialogs ensure close
        this.close();
      }
    });
  }

  /**
   * Open an existing <dialog> element and trap focus.
   * @param {HTMLDialogElement} dialog
   */
  open(dialog) {
    if (!dialog) return;
    this.previousFocusedElement = document.activeElement;
    this.activeDialog = dialog;

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    } else {
      dialog.setAttribute('open', '');
    }

    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = dialog.querySelector(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
      }
    });
  }

  /**
   * Close the currently active dialog and restore focus.
   */
  close() {
    if (!this.activeDialog) return;
    const dialog = this.activeDialog;
    this.activeDialog = null;

    if (typeof dialog.close === 'function' && dialog.open) {
      try {
        dialog.close();
      } catch {
        dialog.removeAttribute('open');
      }
    } else {
      dialog.removeAttribute('open');
    }

    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          this.previousFocusedElement.focus();
        } catch {
          // ignore if previous element unmounted
        }
      });
    }
  }

  /**
   * Show an accessible confirmation dialog. Guaranteed single Promise resolution.
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText='확인']
   * @param {string} [options.cancelText='취소']
   * @param {boolean} [options.isDestructive=false]
   * @returns {Promise<boolean>}
   */
  confirm({ title, message, confirmText = '확인', cancelText = '취소', isDestructive = false }) {
    return new Promise((resolve) => {
      let dialog = document.getElementById('hd2ConfirmDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'hd2ConfirmDialog';
        dialog.className = 'hd2-dialog';
        document.body.appendChild(dialog);
      }

      dialog.innerHTML = `
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>${escapeHTML(title)}</h3>
          </div>
          <p class="dialog-message">${escapeHTML(message)}</p>
          <div class="dialog-actions">
            <button type="button" class="about cancel-btn">${escapeHTML(cancelText)}</button>
            <button type="button" class="hero-action-btn ${isDestructive ? 'destructive' : ''} confirm-btn">${escapeHTML(confirmText)}</button>
          </div>
        </div>
      `;

      let isSettled = false;
      const settle = (result) => {
        if (isSettled) return;
        isSettled = true;
        this.close();
        resolve(result);
      };

      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');

      confirmBtn.addEventListener('click', () => settle(true), { once: true });
      cancelBtn.addEventListener('click', () => settle(false), { once: true });

      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        settle(false);
      }, { once: true });

      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          settle(false);
        }
      });

      this.open(dialog);
    });
  }

  /**
   * Show a Backup Restore Preview Dialog with New / Duplicate / Invalid breakdown.
   * Guaranteed single Promise resolution.
   * @param {object} options
   * @param {number} options.totalCount
   * @param {number} options.validCount
   * @param {number} options.newCount
   * @param {number} options.duplicateCount
   * @param {number} options.invalidCount
   * @param {number} options.existingCount
   * @returns {Promise<'merge'|'replace'|'cancel'>}
   */
  showImportPreview({ totalCount, validCount, newCount, duplicateCount, invalidCount, existingCount }) {
    return new Promise((resolve) => {
      let dialog = document.getElementById('hd2ImportDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'hd2ImportDialog';
        dialog.className = 'hd2-dialog';
        document.body.appendChild(dialog);
      }

      dialog.innerHTML = `
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>데이터 복원 미리보기</h3>
          </div>
          <div class="import-preview-stats">
            <div class="preview-stat-item">
              <span class="preview-stat-label">신규 추가 가능</span>
              <span class="preview-stat-val accent">${newCount}개</span>
            </div>
            ${duplicateCount > 0 ? `
            <div class="preview-stat-item">
              <span class="preview-stat-label">기존과 중복된 항목</span>
              <span class="preview-stat-val muted">${duplicateCount}개</span>
            </div>` : ''}
            ${invalidCount > 0 ? `
            <div class="preview-stat-item">
              <span class="preview-stat-label">형식 불일치(제외)</span>
              <span class="preview-stat-val danger">${invalidCount}개</span>
            </div>` : ''}
            <div class="preview-stat-item">
              <span class="preview-stat-label">현재 저장된 항목</span>
              <span class="preview-stat-val">${existingCount}개</span>
            </div>
          </div>

          <div class="import-mode-selection">
            <label class="radio-label">
              <input type="radio" name="importMode" value="merge" checked>
              <span><strong>안전 병합 (권장)</strong>: 중복은 건너뛰고 신규 항목만 안전하게 추가</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="importMode" value="replace">
              <span><strong>전체 덮어쓰기</strong>: 기존 데이터를 지우고 백업 데이터로 완전 교체</span>
            </label>
          </div>

          <div class="dialog-actions">
            <button type="button" class="about cancel-btn">취소</button>
            <button type="button" class="hero-action-btn confirm-btn">복원 실행</button>
          </div>
        </div>
      `;

      let isSettled = false;
      const settle = (choice) => {
        if (isSettled) return;
        isSettled = true;
        this.close();
        resolve(choice);
      };

      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');

      confirmBtn.addEventListener('click', () => {
        const selected = dialog.querySelector('input[name="importMode"]:checked');
        settle(selected ? selected.value : 'merge');
      }, { once: true });

      cancelBtn.addEventListener('click', () => settle('cancel'), { once: true });

      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        settle('cancel');
      }, { once: true });

      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          settle('cancel');
        }
      });

      this.open(dialog);
    });
  }

  /**
   * Show Full Task Editing Modal (Phase 3 - 5.2).
   * Modifies: title, category, priority, dueDate, recurrence, subtasks.
   * @param {object} todo
   * @returns {Promise<object|null>}
   */
  showEditTaskModal(todo) {
    return new Promise((resolve) => {
      let dialog = document.getElementById('hd2EditTaskDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'hd2EditTaskDialog';
        dialog.className = 'hd2-dialog edit-task-dialog';
        document.body.appendChild(dialog);
      }

      // Clone subtasks for local modal editing
      let editingSubtasks = todo.subtasks ? todo.subtasks.map(s => ({ ...s })) : [];

      dialog.innerHTML = `
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>할 일 상세 수정</h3>
            <button type="button" class="close-dialog-btn" aria-label="닫기">&times;</button>
          </div>

          <form id="editTaskForm" class="edit-modal-form">
            <div class="form-group">
              <label for="editModalTitle">제목</label>
              <input type="text" id="editModalTitle" class="modal-input" value="${escapeHTML(todo.title)}" maxlength="300" required>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="editModalCategory">카테고리</label>
                <select id="editModalCategory" class="modal-select">
                  ${VALID_CATEGORIES.map(cat => `<option value="${cat}" ${todo.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
                </select>
              </div>

              <div class="form-group flex-1">
                <label for="editModalPriority">우선순위</label>
                <select id="editModalPriority" class="modal-select">
                  <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔥 높음</option>
                  <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>⚡ 보통</option>
                  <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>🌱 낮음</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label for="editModalRecurrence">반복 주기</label>
                <select id="editModalRecurrence" class="modal-select">
                  <option value="none" ${todo.recurrence === 'none' ? 'selected' : ''}>반복 없음</option>
                  <option value="daily" ${todo.recurrence === 'daily' ? 'selected' : ''}>🔁 매일</option>
                  <option value="weekly" ${todo.recurrence === 'weekly' ? 'selected' : ''}>🔁 매주</option>
                  <option value="monthly" ${todo.recurrence === 'monthly' ? 'selected' : ''}>🔁 매월</option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label for="editModalDueDate">마감일</label>
                <input type="date" id="editModalDueDate" class="modal-input" value="${todo.dueDate || ''}">
              </div>
            </div>

            <div class="form-group">
              <label>세부 항목 (Subtasks)</label>
              <ul id="editModalSubtaskList" class="edit-modal-subtasks"></ul>
              <div class="add-subtask-row">
                <input type="text" id="editModalNewSubtask" placeholder="+ 세부 항목 추가..." maxlength="200">
                <button type="button" id="editModalAddSubtaskBtn" class="about small-btn">추가</button>
              </div>
            </div>

            <div class="dialog-actions">
              <button type="button" class="about cancel-btn">취소</button>
              <button type="submit" class="hero-action-btn confirm-btn">변경사항 저장</button>
            </div>
          </form>
        </div>
      `;

      const subtaskListEl = dialog.querySelector('#editModalSubtaskList');
      const newSubtaskInput = dialog.querySelector('#editModalNewSubtask');
      const addSubtaskBtn = dialog.querySelector('#editModalAddSubtaskBtn');

      const renderModalSubtasks = () => {
        subtaskListEl.innerHTML = '';
        editingSubtasks.forEach((st, idx) => {
          const li = document.createElement('li');
          li.className = 'edit-subtask-item';
          li.innerHTML = `
            <input type="checkbox" ${st.completed ? 'checked' : ''}>
            <input type="text" class="subtask-edit-text" value="${escapeHTML(st.title)}" maxlength="200">
            <button type="button" class="subtask-remove-btn" title="삭제">&times;</button>
          `;
          li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            st.completed = e.target.checked;
          });
          li.querySelector('.subtask-edit-text').addEventListener('input', (e) => {
            st.title = e.target.value.trim();
          });
          li.querySelector('.subtask-remove-btn').addEventListener('click', () => {
            editingSubtasks.splice(idx, 1);
            renderModalSubtasks();
          });
          subtaskListEl.appendChild(li);
        });
      };
      renderModalSubtasks();

      const addSubtask = () => {
        const val = newSubtaskInput.value.trim();
        if (val) {
          editingSubtasks.push(createSubtask(val));
          newSubtaskInput.value = '';
          renderModalSubtasks();
        }
      };
      addSubtaskBtn.addEventListener('click', addSubtask);
      newSubtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtask();
        }
      });

      let isSettled = false;
      const settle = (result) => {
        if (isSettled) return;
        isSettled = true;
        this.close();
        resolve(result);
      };

      const form = dialog.querySelector('#editTaskForm');
      const cancelBtn = dialog.querySelector('.cancel-btn');
      const closeDialogBtn = dialog.querySelector('.close-dialog-btn');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = dialog.querySelector('#editModalTitle').value.trim();
        if (!titleInput) return;

        const category = dialog.querySelector('#editModalCategory').value;
        const priority = dialog.querySelector('#editModalPriority').value;
        const recurrence = dialog.querySelector('#editModalRecurrence').value;
        const dueDate = dialog.querySelector('#editModalDueDate').value;

        // Filter out empty subtasks
        const cleanSubtasks = editingSubtasks.filter(s => s.title && s.title.trim().length > 0);

        settle({
          title: titleInput,
          category,
          priority,
          recurrence,
          dueDate,
          subtasks: cleanSubtasks
        });
      }, { once: true });

      cancelBtn.addEventListener('click', () => settle(null), { once: true });
      closeDialogBtn.addEventListener('click', () => settle(null), { once: true });

      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        settle(null);
      }, { once: true });

      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          settle(null);
        }
      });

      this.open(dialog);
    });
  }
}
