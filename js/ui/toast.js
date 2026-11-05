/**
 * HD2Lab Todo Master - Accessible Toast Notification System
 */

export class ToastManager {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.activeToasts = new Set();
  }

  /**
   * Show a toast message.
   * @param {object} options
   * @param {string} options.message
   * @param {'info'|'success'|'warning'|'error'} [options.type='info']
   * @param {number} [options.duration=4000] - Duration in ms (0 = permanent until clicked)
   * @param {{ label: string, onClick: Function }} [options.action]
   * @returns {HTMLElement}
   */
  show({ message, type = 'info', duration = 4000, action = null }) {
    if (!this.container) return null;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const msgSpan = document.createElement('span');
    msgSpan.className = 'toast-message';
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if (action && typeof action.onClick === 'function') {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'toast-action-btn';
      actionBtn.textContent = action.label || '실행';
      actionBtn.addEventListener('click', () => {
        try {
          action.onClick();
        } finally {
          this.dismiss(toast);
        }
      });
      toast.appendChild(actionBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', '알림 닫기');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.dismiss(toast));
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);
    this.activeToasts.add(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Dismiss a specific toast.
   * @param {HTMLElement} toast
   */
  dismiss(toast) {
    if (!toast || !this.activeToasts.has(toast)) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToasts.delete(toast);
    });
  }

  /**
   * Clear all active toasts.
   */
  clearAll() {
    this.activeToasts.forEach(toast => this.dismiss(toast));
  }
}
