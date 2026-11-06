/**
 * HD2Lab Todo Master - UI Components (Task Card, Subtasks, Inline Edit & Empty States)
 */

import { escapeHTML } from '../utils/security.js';
import { calculateDDay, formatDateTime } from '../utils/date.js';

const PRIORITY_LABELS = {
  high: '🔥 높음',
  medium: '⚡ 보통',
  low: '🌱 낮음'
};

const RECURRENCE_LABELS = {
  daily: '🔁 매일',
  weekly: '🔁 매주',
  monthly: '🔁 매월'
};

/**
 * Creates the DOM element for a single Todo item card.
 * @param {object} todo
 * @param {object} handlers
 * @param {Date} [baseDate=new Date()]
 * @returns {HTMLLIElement}
 */
export function createTodoCardElement(todo, handlers, isSubtasksExpanded = false, baseDate = new Date()) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  li.dataset.id = todo.id;
  li.setAttribute('draggable', 'true');

  const dday = calculateDDay(todo.dueDate, baseDate);
  const priorityText = PRIORITY_LABELS[todo.priority] || '보통';
  const recurrenceText = todo.recurrence && todo.recurrence !== 'none'
    ? RECURRENCE_LABELS[todo.recurrence] || ''
    : '';

  const completedSubtasks = todo.subtasks.filter(st => st.completed).length;
  const totalSubtasks = todo.subtasks.length;
  const hasSubtasks = totalSubtasks > 0;
  const isExpanded = isSubtasksExpanded || false;

  // Header row of task
  li.innerHTML = `
    <div class="item-row">
      <div class="drag-handle" title="드래그하여 순서 변경" aria-label="드래그 손잡이">⋮⋮</div>
      <div class="custom-checkbox" role="checkbox" tabindex="0" aria-checked="${todo.completed}" aria-label="완료 여부 선택"></div>
      
      <div class="item-body">
        <div class="item-title-wrapper">
          <span class="item-title" title="더블 클릭하여 수정">${escapeHTML(todo.title)}</span>
          <form class="inline-edit-form hidden">
            <input type="text" class="inline-edit-input" value="${escapeHTML(todo.title)}" maxlength="300" required>
            <div class="inline-edit-actions">
              <button type="submit" class="hero-action-btn small-btn">저장</button>
              <button type="button" class="about small-btn cancel-inline-btn">취소</button>
            </div>
          </form>
        </div>

        <div class="item-meta">
          <span class="badge badge-category">${escapeHTML(todo.category)}</span>
          <span class="badge badge-priority ${todo.priority}">${priorityText}</span>
          ${recurrenceText ? `<span class="badge badge-recurrence">${recurrenceText}</span>` : ''}
          ${dday ? `<span class="badge badge-due ${dday.isUrgent ? 'urgent' : ''}">📅 ${dday.text}</span>` : ''}
          ${hasSubtasks ? `<button type="button" class="badge badge-subtask-toggle" aria-expanded="${isExpanded}">세부 항목 (${completedSubtasks}/${totalSubtasks}) ${isExpanded ? '▴' : '▾'}</button>` : ''}
          ${todo.completed && todo.completedAt ? `<span class="badge badge-completed-time">✓ ${formatDateTime(todo.completedAt)} 완료</span>` : ''}
        </div>
      </div>

      <div class="item-actions">
        <button type="button" class="action-btn move-up-btn" title="위로 이동" aria-label="위로 이동">↑</button>
        <button type="button" class="action-btn move-down-btn" title="아래로 이동" aria-label="아래로 이동">↓</button>
        <button type="button" class="action-btn edit-modal-btn" title="상세 정보 수정" aria-label="상세 정보 수정">⚙️</button>
        <button type="button" class="action-btn edit-btn" title="수정" aria-label="할 일 수정">✏️</button>
        <button type="button" class="action-btn delete-btn" title="삭제" aria-label="할 일 삭제">🗑️</button>
      </div>
    </div>

    <!-- Subtasks Section -->
    <div class="subtasks-container ${isExpanded ? '' : (hasSubtasks ? 'collapsed' : 'hidden')}">
      <ul class="subtask-list"></ul>
      <form class="subtask-add-form">
        <input type="text" class="subtask-input" placeholder="+ 새로운 세부 항목 입력... (Enter)" maxlength="200">
      </form>
    </div>
  `;

  // Render Subtasks
  const subtaskList = li.querySelector('.subtask-list');
  const subtasksContainer = li.querySelector('.subtasks-container');
  const subtaskToggleBtn = li.querySelector('.badge-subtask-toggle');

  if (todo.subtasks.length > 0) {
    todo.subtasks.forEach(st => {
      const stLi = document.createElement('li');
      stLi.className = `subtask-item ${st.completed ? 'completed' : ''}`;
      stLi.innerHTML = `
        <div class="subtask-checkbox" role="checkbox" tabindex="0" aria-checked="${st.completed}"></div>
        <span class="subtask-title">${escapeHTML(st.title)}</span>
        <button type="button" class="action-btn subtask-delete-btn" title="세부 항목 삭제" aria-label="세부 항목 삭제">×</button>
      `;

      // Subtask events
      const stCheck = stLi.querySelector('.subtask-checkbox');
      const toggleSub = () => handlers.onToggleSubtask(todo.id, st.id);
      stCheck.addEventListener('click', toggleSub);
      stCheck.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          toggleSub();
        }
      });

      const stDel = stLi.querySelector('.subtask-delete-btn');
      stDel.addEventListener('click', () => handlers.onDeleteSubtask(todo.id, st.id));

      subtaskList.appendChild(stLi);
    });
  }

  // Subtask Toggle Button
  if (subtaskToggleBtn) {
    subtaskToggleBtn.addEventListener('click', () => {
      handlers.onToggleSubtasksExpand(todo.id);
    });
  }

  // Quick Add Subtask Form
  const subtaskAddForm = li.querySelector('.subtask-add-form');
  const subtaskInput = li.querySelector('.subtask-input');
  subtaskAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = subtaskInput.value.trim();
    if (val) {
      handlers.onAddSubtask(todo.id, val);
      subtaskInput.value = '';
    }
  });

  // Checkbox Event
  const checkbox = li.querySelector('.custom-checkbox');
  const toggleTodo = () => handlers.onToggle(todo.id);
  checkbox.addEventListener('click', toggleTodo);
  checkbox.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      toggleTodo();
    }
  });

  // Inline Editing
  const titleSpan = li.querySelector('.item-title');
  const inlineForm = li.querySelector('.inline-edit-form');
  const inlineInput = li.querySelector('.inline-edit-input');
  const editBtn = li.querySelector('.edit-btn');
  const cancelInlineBtn = li.querySelector('.cancel-inline-btn');

  const startEdit = () => {
    titleSpan.classList.add('hidden');
    inlineForm.classList.remove('hidden');
    subtasksContainer.classList.remove('collapsed');
    subtasksContainer.classList.remove('hidden');
    inlineInput.focus();
    inlineInput.select();
  };

  const cancelEdit = () => {
    inlineInput.value = todo.title;
    inlineForm.classList.add('hidden');
    titleSpan.classList.remove('hidden');
  };

  titleSpan.addEventListener('dblclick', startEdit);
  editBtn.addEventListener('click', startEdit);
  cancelInlineBtn.addEventListener('click', cancelEdit);

  const editModalBtn = li.querySelector('.edit-modal-btn');
  if (editModalBtn && handlers.onEditFull) {
    editModalBtn.addEventListener('click', () => handlers.onEditFull(todo));
  }

  inlineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newTitle = inlineInput.value.trim();
    if (newTitle && newTitle !== todo.title) {
      handlers.onUpdateTitle(todo.id, newTitle);
    }
    cancelEdit();
  });

  inlineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cancelEdit();
    }
  });

  // Move buttons
  const moveUpBtn = li.querySelector('.move-up-btn');
  const moveDownBtn = li.querySelector('.move-down-btn');
  moveUpBtn.addEventListener('click', () => handlers.onMove(todo.id, 'up'));
  moveDownBtn.addEventListener('click', () => handlers.onMove(todo.id, 'down'));

  // Delete button
  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => handlers.onDelete(todo.id));

  // Drag and Drop attributes & events
  handlers.setupDragAndDrop(li, todo.id);

  return li;
}

/**
 * Contextual empty state message based on active filter.
 * @param {string} filter
 * @param {string} searchQuery
 * @returns {{ title: string, desc: string, icon: string }}
 */
export function getContextualEmptyState(filter, searchQuery) {
  if (searchQuery) {
    return {
      icon: '🔍',
      title: '검색 결과가 없습니다',
      desc: `"${searchQuery}" 키워드와 일치하는 할 일을 찾을 수 없습니다.`
    };
  }

  switch (filter) {
    case 'focus':
      return {
        icon: '🎯',
        title: '오늘 집중할 항목이 없습니다',
        desc: '오늘 마감인 작업이나 지연된 항목, 높은 우선순위 작업이 없습니다. 여유로운 하루를 보내세요!'
      };
    case 'today':
      return {
        icon: '☀️',
        title: '오늘 예정된 할 일이 없습니다',
        desc: '오늘 해야 할 일을 추가하거나 여유로운 휴식을 즐겨보세요.'
      };
    case 'upcoming':
      return {
        icon: '📅',
        title: '예정된 일정이 없습니다',
        desc: '다가오는 마감일이 설정된 할 일이 아직 등록되지 않았습니다.'
      };
    case 'overdue':
      return {
        icon: '🎉',
        title: '지연된 할 일이 없습니다',
        desc: '모든 마감 기한을 성실히 지키셨습니다. 훌륭합니다!'
      };
    case 'completed':
      return {
        icon: '🎯',
        title: '완료된 할 일이 없습니다',
        desc: '목표를 달성하고 체크박스를 눌러 완료 상태로 변경해 보세요.'
      };
    case 'active':
      return {
        icon: '✨',
        title: '진행 중인 할 일이 없습니다',
        desc: '새로운 작업을 등록하여 하루를 생산적으로 시작해 보세요.'
      };
    default:
      return {
        icon: '📋',
        title: '등록된 할 일이 없습니다',
        desc: '위 입력창에 새로운 목표를 입력하여 시작해 보세요.'
      };
  }
}
