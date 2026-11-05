/**
 * HD2Lab Todo Master - Drag & Drop / Reordering Controller
 */

export class DragDropController {
  /**
   * @param {object} options
   * @param {Function} options.onReorder - (sourceId, targetId) => void
   */
  constructor({ onReorder }) {
    this.onReorder = onReorder;
    this.draggedId = null;
  }

  /**
   * Attach drag & drop listeners to a todo item element.
   * @param {HTMLLIElement} el
   * @param {string} id
   */
  attach(el, id) {
    el.addEventListener('dragstart', (e) => {
      this.draggedId = id;
      el.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    });

    el.addEventListener('dragend', () => {
      this.draggedId = null;
      el.classList.remove('is-dragging');
      document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedId || this.draggedId === id) return;
      e.dataTransfer.dropEffect = 'move';

      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        el.classList.add('drag-over-top');
        el.classList.remove('drag-over-bottom');
      } else {
        el.classList.add('drag-over-bottom');
        el.classList.remove('drag-over-top');
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-over-top', 'drag-over-bottom');
      if (!this.draggedId || this.draggedId === id) return;

      this.onReorder(this.draggedId, id);
      this.draggedId = null;
    });
  }
}
