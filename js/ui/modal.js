/**
 * HD2Lab Todo Master - Accessible Modal Dialog Controller
 */

export class ModalController {
  constructor() {
    this.activeDialog = null;
    this.previousFocusedElement = null;
    this.setupGlobalListeners();
  }

  setupGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeDialog) {
        this.close();
      }
    });
  }

  /**
   * Open an existing <dialog> element.
   * @param {HTMLDialogElement} dialog
   */
  open(dialog) {
    if (!dialog) return;
    this.previousFocusedElement = document.activeElement;
    this.activeDialog = dialog;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    // Focus first focusable element
    const focusable = dialog.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
      focusable.focus();
    }
  }

  /**
   * Close the currently active dialog.
   */
  close() {
    if (!this.activeDialog) return;
    const dialog = this.activeDialog;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    this.activeDialog = null;
    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
      this.previousFocusedElement.focus();
    }
  }

  /**
   * Show an accessible confirmation dialog.
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
            <h3>${title}</h3>
          </div>
          <p class="dialog-message">${message}</p>
          <div class="dialog-actions">
            <button type="button" class="about cancel-btn">${cancelText}</button>
            <button type="button" class="hero-action-btn ${isDestructive ? 'destructive' : ''} confirm-btn">${confirmText}</button>
          </div>
        </div>
      `;

      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');

      const cleanup = (result) => {
        this.close();
        resolve(result);
      };

      confirmBtn.addEventListener('click', () => cleanup(true), { once: true });
      cancelBtn.addEventListener('click', () => cleanup(false), { once: true });

      // Click outside to cancel
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          cleanup(false);
        }
      }, { once: true });

      this.open(dialog);
    });
  }

  /**
   * Show a Backup Restore Preview Dialog with Merge vs Replace options.
   * @param {object} options
   * @param {number} options.totalCount
   * @param {number} options.validCount
   * @param {number} options.invalidCount
   * @param {number} options.existingCount
   * @returns {Promise<'merge'|'replace'|'cancel'>}
   */
  showImportPreview({ totalCount, validCount, invalidCount, existingCount }) {
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
              <span class="preview-stat-label">불러올 항목</span>
              <span class="preview-stat-val accent">${validCount}개</span>
            </div>
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
              <span><strong>병합 (권장)</strong>: 기존 데이터 유지 후 새로운 항목 추가</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="importMode" value="replace">
              <span><strong>덮어쓰기</strong>: 기존 데이터를 지우고 백업 데이터로 완전 교체</span>
            </label>
          </div>

          <div class="dialog-actions">
            <button type="button" class="about cancel-btn">취소</button>
            <button type="button" class="hero-action-btn confirm-btn">복원 실행</button>
          </div>
        </div>
      `;

      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');

      const cleanup = (choice) => {
        this.close();
        resolve(choice);
      };

      confirmBtn.addEventListener('click', () => {
        const selected = dialog.querySelector('input[name="importMode"]:checked');
        cleanup(selected ? selected.value : 'merge');
      }, { once: true });

      cancelBtn.addEventListener('click', () => cleanup('cancel'), { once: true });

      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) cleanup('cancel');
      }, { once: true });

      this.open(dialog);
    });
  }
}
