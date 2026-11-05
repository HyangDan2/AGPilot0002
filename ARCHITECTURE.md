# HD2Lab Todo Master — Architecture & System Design

## 1. Overview & Constraints

`HD2Lab Todo Master` is a production-grade, static single-page application (SPA) hosted on GitHub Pages. It strictly adheres to:
- **Zero Heavy Frameworks**: 100% Vanilla modern JavaScript (ES Modules), semantic HTML5, and CSS variables.
- **HD2Lab Visual Identity**: 1:1 alignment with [hd2lab.duckdns.org](https://hd2lab.duckdns.org) styling, colors (`#101110`, `#ff824f`, `#1b1d19`, `#30322d`, `#82916c`), and typography.
- **Full Static Hosting Compatibility**: Requires no build tool or server-side runtime to function in the browser.
- **Offline & PWA Capability**: Service Worker (`sw.js`) and Web App Manifest (`manifest.json`) support.
- **Deterministic Data Integrity**: Strict schema validation, automatic migrations, and quota recovery.

---

## 2. Directory Structure

```
├── index.html               # Main semantic HTML structure & meta tags
├── style.css                # HD2Lab design system, responsive styles & theme variables
├── app.js                   # Application bootstrap & coordinator (ES module entry)
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker for offline caching (Stale-While-Revalidate)
├── favicon.svg              # Scalable vector favicon
├── icon-192.png             # PWA app icon 192x192
├── icon-512.png             # PWA app icon 512x512
├── apple-touch-icon.png     # iOS bookmark icon
├── js/
│   ├── models/
│   │   └── todo.js          # Todo & Subtask models, sanitization & schema migration
│   ├── services/
│   │   ├── storage.js       # LocalStorage abstraction, quota checks & fallback
│   │   └── backup.js        # Version 2 export/import, schema validation & merge engine
│   ├── state/
│   │   └── store.js         # Reactive store, subscriber pattern, undo stack
│   ├── utils/
│   │   ├── date.js          # Timezone-safe local dates, D-day, & recurrence rules
│   │   └── security.js      # XSS escaping, safe JSON parse, ID generation
│   └── ui/
│       ├── components.js    # Task cards, subtasks, inline editing, contextual empty states
│       ├── dnd.js           # Drag & Drop reordering & accessible keyboard moves
│       ├── modal.js         # Accessible <dialog> controller (Confirm & Backup Preview)
│       └── toast.js         # ARIA live-region toast notifications with Undo action
└── tests/
    ├── unit/                # Node.js native test runner tests (models, date, storage, etc.)
    └── e2e/                 # Playwright browser end-to-end & responsive viewport tests
```

---

## 3. Data Model & Storage Schema (Version 2)

```typescript
interface Todo {
  id: string;               // e.g. "todo_m1234_abc"
  title: string;            // Sanitized text (1-300 characters)
  category: '개인' | '업무' | '공부' | '쇼핑' | '기타';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;          // "YYYY-MM-DD" or ""
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  completed: boolean;
  completedAt: string | null; // ISO timestamp e.g. "2026-11-06T01:45:00.000Z"
  order: number;            // For manual drag-and-drop & keyboard reordering
  subtasks: Subtask[];
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

interface Subtask {
  id: string;               // e.g. "sub_5678_xyz"
  title: string;            // Sanitized text (1-200 characters)
  completed: boolean;
}
```

### Backward Compatibility & Migration
- Key `todo_master_items_v1` in `localStorage` is maintained for 100% backward compatibility with existing users.
- `migrateTodoList` converts legacy items into the V2 schema, assigning default orders, empty subtask arrays, and collision-free unique IDs without losing any existing task properties.
- Corrupted storage data is automatically copied to a timestamped backup before recovery.

---

## 4. State Management (`Store`)

- Follows the **Observable / Subscriber** pattern.
- State mutation methods (`addTodo`, `toggleTodo`, `updateTodo`, `deleteTodo`, `reorderTodos`, `undoDelete`) automatically persist changes to storage and notify all active UI listeners.
- **Undo Stack**: Deleted tasks are stored in memory with their original index and subtasks, enabling 1-click restoration within a 6-second window.
- **Recurring Engine**: Completing a recurring task immediately schedules the next occurrence with an adjusted due date (`+1 day`, `+7 days`, or `+1 month`) while keeping the previous instance archived as completed.

---

## 5. Security & Accessibility (a11y)

- **XSS Prevention**: User inputs are strictly sanitized via `sanitizeText` and escaped via `escapeHTML`. Form inputs and text content avoid raw HTML interpolation.
- **Keyboard Access**:
  - `N`: Quick focus to task input.
  - `T`: Dark / Light theme toggle.
  - `?`: Open keyboard shortcuts dialog.
  - `Space / Enter`: Toggle checkbox states.
  - `Escape`: Cancel open dialogs or inline editing.
- **ARIA Compliance**:
  - Checkboxes use `role="checkbox"`, `tabindex="0"`, and `aria-checked="true|false"`.
  - Progress bar uses `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
  - Toast notifications use `role="status"` / `role="alert"` and `aria-live="polite|assertive"`.
- **Reduced Motion**: Respects `@media (prefers-reduced-motion: reduce)`.
