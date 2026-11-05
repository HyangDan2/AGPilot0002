/**
 * Todo Master - Static SPA Application Logic
 */

// Key Constants
const STORAGE_KEY = 'todo_master_items_v1';
const THEME_KEY = 'todo_master_theme_v1';

// State
let todos = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'created-desc';

// DOM Elements
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const categorySelect = document.getElementById('categorySelect');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statDone = document.getElementById('statDone');
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

/**
 * Initialize Application
 */
function init() {
  loadTheme();
  loadTodos();
  setupEventListeners();
  render();
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // Form submission
  todoForm.addEventListener('submit', handleAddTodo);

  // Filter Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  // Category filter
  categoryFilter.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    render();
  });

  // Sort
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // Batch actions
  toggleAllBtn.addEventListener('click', handleToggleAll);
  clearCompletedBtn.addEventListener('click', handleClearCompleted);

  // Theme toggle
  themeToggleBtn.addEventListener('click', handleToggleTheme);

  // Backup & Restore
  exportBtn.addEventListener('click', handleExportJSON);
  importInput.addEventListener('change', handleImportJSON);
}

/**
 * Storage Helpers
 */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      todos = JSON.parse(raw);
    } else {
      // Default Sample Data for first-time visitors
      todos = [
        {
          id: generateId(),
          title: 'HD2Lab Server HQ 아키텍처 점검 및 서비스 배포',
          category: '업무',
          priority: 'high',
          dueDate: getTodayString(),
          completed: false,
          createdAt: new Date().toISOString()
        },
        {
          id: generateId(),
          title: '데일리 할 일 목록 정리 및 우선순위 분배',
          category: '개인',
          priority: 'medium',
          dueDate: '',
          completed: true,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: generateId(),
          title: 'AI 에이전트 실험 워크스페이스 구축',
          category: '공부',
          priority: 'high',
          dueDate: '',
          completed: false,
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      saveTodos();
    }
  } catch (e) {
    console.error('Failed to load todos from localStorage', e);
    todos = [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error('Failed to save todos to localStorage', e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Handlers
 */
function handleAddTodo(e) {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  const newTodo = {
    id: generateId(),
    title,
    category: categorySelect.value,
    priority: prioritySelect.value,
    dueDate: dueDateInput.value,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.unshift(newTodo);
  saveTodos();
  render();

  // Reset input form
  todoInput.value = '';
  dueDateInput.value = '';
  todoInput.focus();
}

function handleToggleTodo(id) {
  todos = todos.map(todo => {
    if (todo.id === id) {
      return { ...todo, completed: !todo.completed };
    }
    return todo;
  });
  saveTodos();
  render();
}

function handleDeleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  render();
}

function handleEditTodo(id) {
  const target = todos.find(t => t.id === id);
  if (!target) return;

  const newTitle = prompt('할 일 수정:', target.title);
  if (newTitle !== null) {
    const trimmed = newTitle.trim();
    if (trimmed) {
      target.title = trimmed;
      saveTodos();
      render();
    }
  }
}

function handleToggleAll() {
  if (todos.length === 0) return;
  const hasActive = todos.some(t => !t.completed);
  todos = todos.map(t => ({ ...t, completed: hasActive }));
  saveTodos();
  render();
}

function handleClearCompleted() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount === 0) return;

  if (confirm(`완료된 할 일 ${completedCount}개를 삭제하시겠습니까?`)) {
    todos = todos.filter(t => !t.completed);
    saveTodos();
    render();
  }
}

/**
 * Theme
 */
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function handleToggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const labelSpan = themeToggleBtn.querySelector('.theme-label') || themeToggleBtn.querySelector('.theme-icon');
  if (labelSpan) {
    labelSpan.textContent = theme === 'dark' ? 'LIGHT' : 'DARK';
  }
}

/**
 * Backup (Export & Import)
 */
function handleExportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `todo_backup_${getTodayString()}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`불러온 데이터(${imported.length}개)로 교체하시겠습니까?`)) {
          todos = imported;
          saveTodos();
          render();
        }
      } else {
        alert('올바른 투두 백업 파일 형식이 아닙니다.');
      }
    } catch (err) {
      alert('파일을 읽는 중 오류가 발생했습니다.');
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset input
}

/**
 * Format Helpers
 */
function formatDueDate(dueDateStr) {
  if (!dueDateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: '오늘 마감', urgent: true };
  } else if (diffDays === 1) {
    return { text: '내일 마감', urgent: false };
  } else if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}일 지남`, urgent: true };
  } else {
    return { text: `D-${diffDays}`, urgent: false };
  }
}

/**
 * Render
 */
function render() {
  // 1. Filter
  let filtered = todos.filter(todo => {
    // Status
    if (currentFilter === 'active' && todo.completed) return false;
    if (currentFilter === 'completed' && !todo.completed) return false;

    // Category
    if (currentCategory !== 'all' && todo.category !== currentCategory) return false;

    // Search
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery)) return false;

    return true;
  });

  // 2. Sort
  filtered.sort((a, b) => {
    if (currentSort === 'created-asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (currentSort === 'created-desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (currentSort === 'due-date') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (currentSort === 'priority') {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[b.priority] - weight[a.priority];
    }
    return 0;
  });

  // 3. Render Items
  todoList.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(todo => {
      const li = createTodoElement(todo);
      todoList.appendChild(li);
    });
  }

  // 4. Update Stats
  updateStats();
}

function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  li.dataset.id = todo.id;

  const dueInfo = formatDueDate(todo.dueDate);
  const priorityLabels = { high: '높음', medium: '보통', low: '낮음' };

  li.innerHTML = `
    <div class="item-left">
      <div class="custom-checkbox" role="checkbox" aria-checked="${todo.completed}"></div>
      <div class="item-content">
        <span class="item-title">${escapeHTML(todo.title)}</span>
        <div class="item-meta">
          <span class="badge badge-category">${escapeHTML(todo.category)}</span>
          <span class="badge badge-priority ${todo.priority}">🚩 ${priorityLabels[todo.priority] || '보통'}</span>
          ${dueInfo ? `<span class="badge badge-due ${dueInfo.urgent ? 'urgent' : ''}">📅 ${dueInfo.text}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="item-actions">
      <button class="action-btn edit-btn" title="수정">✏️</button>
      <button class="action-btn delete-btn" title="삭제">🗑️</button>
    </div>
  `;

  // Attach Item Events
  const checkbox = li.querySelector('.custom-checkbox');
  checkbox.addEventListener('click', () => handleToggleTodo(todo.id));

  const editBtn = li.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => handleEditTodo(todo.id));

  const deleteBtn = li.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => handleDeleteTodo(todo.id));

  return li;
}

function updateStats() {
  const total = todos.length;
  const done = todos.filter(t => t.completed).length;
  const active = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  statTotal.textContent = total;
  statActive.textContent = active;
  statDone.textContent = done;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Start
init();
