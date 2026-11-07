# Changelog — HD2Lab Todo Master

All notable changes to this project are documented in this file.

## [2.2.0] - 2026-11-06

### 🚀 Productivity Workspace Transformation
- **Desktop 3-Panel Composition (Max width 1560px)**:
  - Transformed the narrow 720px centered layout into a responsive three-panel productivity workspace.
  - **Left Navigation Panel (240px)**: Dashboard, Task List, Interactive Calendar, Today Focus, Inbox (unscheduled), Completed Tasks, Category shortcuts with live counters, display density controls, grouping selector, and utility actions.
  - **Central Workspace (Flexible)**: View headers, KPI cards, interactive calendar grids, quick-add input form with smart parser, task card listings, and pagination controls.
  - **Right Context Panel (340px)**: Context-aware sidebar showing Task Details (meta grid, subtasks checklist, inline subtask addition, actions) when a task is selected, or Date Schedule (date task list with fast completion checkboxes, quick-add form, and upcoming 3-day deadlines preview) when inspecting dates.
  - **Tablet Adaptive Layout (768px – 1200px)**: Automatically transitions to a 2-panel ratio, cleanly hiding the right context panel to prevent cramped columns.
  - **Mobile-First Layout (< 768px)**: Dedicated thumb-friendly bottom navigation bar with 4 primary destinations (🏠 홈, 📋 목록, 📅 달력, ➕ 추가), safe-area insets, and zero horizontal overflow.

### 📄 Client-Side Pagination (Phase A)
- Default page size: 10 tasks, with selectable page sizes: 20개 / 50개.
- Page navigation: Previous, Next, direct page buttons with ellipsis for long lists.
- Real-time matched task counter and range indicators (`총 N개 중 A–B개 표시`).
- Strict pagination pipeline: filters, search, and sorting apply before slicing.
- Page clamping: current page automatically clamps to valid range upon filter or deletion changes.
- Safe persistence: User's preferred page size stored locally in `todo_master_ui_prefs_v1`.
- Off-page tasks remain safely in memory, localStorage, and backups.

### 📅 Interactive Calendar Workspace (Phase C)
- Pure date calculations isolated in `js/utils/calendar-date.js` (month grids, week ranges, leap-year calculations).
- Month and Week responsive views with period navigation (`<`, `>`, `오늘`).
- Date cells display task preview pills with priority dots (red/yellow/olive), completion strikethrough, and `+N개 더보기` pills.
- Date cell click activates that date's schedule in the Right Context Panel.
- Fast quick-add form pre-filling the selected date directly from the right panel.
- Direct task completion checkbox toggling within date schedule views.

### 📥 Inbox for Unscheduled Tasks (Phase E)
- Dedicated Inbox view for tasks without assigned `dueDate`.
- Quick date assignment workflows.

### 🏷️ Task Grouping & Display Density (Phase E)
- Flexible task grouping: Group by Category, Priority, Status, or Due Date with structured group headers and count pills.
- Display Density switcher: Comfortable (기본) vs Compact (조밀하게) with tightened padding, persisted in UI preferences.
- Safe local persistence for UI preferences (`todo_master_ui_prefs_v1`) without touching task store.

### 🧪 Automated Testing & QA Expansion (Phase H)
- Extended unit test suite from 58 to 61 tests (including calendar-date arithmetic, pagination state, grouping, and UI preference persistence).
- Created dedicated Playwright E2E suite (`tests/e2e/v22_workspace.spec.js`) covering pagination, desktop 3-panel layout, tablet transitions, mobile bottom navigation, interactive calendar, right context panel, inbox, density, grouping, and automated screenshot capture across viewports.
- Total test count: 95 automated tests passing with 100% success rate.


## [2.1.0] - 2026-11-06

### 🛡️ Critical Reliability & Data Integrity (P0)
- **Explicit Storage Failure Propagation & Auto-Rollback**:
  - `Store.persist()` captures storage failure codes (`QUOTA_EXCEEDED`, `STORAGE_UNAVAILABLE`, `STORAGE_ERROR`) and dispatches notifications via `onStorageError`.
  - Added automatic in-memory rollback (`autoRollback: true`) on persist failure so unsaved mutations are never left in memory or displayed in the UI.
  - UI mutation handlers prevent false success toasts when storage writes fail.
  - Added failure-injection unit tests ensuring user data is never silently lost.
- **Multi-Delete Undo Integrity & Expired ID Isolation**:
  - Replaced single `lastDeletedItem` with operation-specific `undoRegistry` (Map).
  - A missing, expired, or previously consumed undo ID strictly returns `null` and never triggers a fallback undo on other items.
  - Supports multiple consecutive deletions with independent undo actions without race conditions.
  - Supports undoing batch operations (`clearCompleted`) and completing recurring tasks.
  - Guaranteed deduplication on restoration.
- **Modal Lifecycle Single-Resolution Guarantee & Leak Prevention**:
  - Refactored `ModalController` to ensure every dialog promise resolves exactly once across Confirm, Cancel, ESC key, native `cancel`/`close` events, and backdrop click.
  - Integrated `AbortController` signal cleanup on every opening, eliminating duplicate event listeners and memory leaks across repeated openings.
  - Added comprehensive `showEditTaskModal(todo)` for editing title, category, priority, recurrence, due date, and subtasks.
- **Strict Backup Validation & Composite Signature Deduplication**:
  - Formalized `BACKUP_VERSION = 2.1` with full backward compatibility for v1/v2 payloads and rejection of unsupported future versions.
  - Implemented composite signature matching (`getTodoContentSignature`) covering title, dueDate, category, priority, recurrence, and subtasks, ensuring distinct tasks sharing title and due date are never mistakenly discarded during import.
- **Service Worker Cache Origin Isolation**:
  - Scoped cache key cleanup in `sw.js` with `CACHE_PREFIX = 'hd2lab-todo-'` so other applications sharing the same GitHub Pages origin are never evicted.
- **Timezone-Safe Today Focus Completion Comparison**:
  - Evaluates completion timestamps (`todo.completedAt`) against local calendar date strings (`getLocalDateString`) instead of raw UTC string prefixes.

### ⚙️ Logic Consistency (P1)
- **Recurring Task Engine**:
  - Unified individual and batch (`toggleAll()`) recurring task completion behavior.
  - Accurate date calculation handling month-end (e.g. Jan 31 -> Feb 28) and leap years.
  - Overdue recurring task calculation relative to current date to avoid cascading overdue cycles.
  - Explicit undo support reverting completion and deleting the auto-scheduled occurrence.
- **Filtering & Reordering Stability**:
  - Stable deterministic sorting with fractional order calculation.
  - Order preserved across filter switches and page reloads.
- **Accessibility & Focus**:
  - Progress bar `aria-valuenow` synchronization with completion percentages.
  - WCAG 2.2 AA touch target compliance (>= 38px–44px hit areas on mobile).

### ⚡ Productivity UX Enhancements
- **Rule-Based Korean Smart Task Input Parser (`js/utils/parser.js`)**:
  - Parses Korean relative dates (`오늘`, `내일`, `모레`), weekdays (`금요일`, `다음주 월요일`), categories (`#업무`, `#개인`, `#쇼핑`), priorities (`!높음`, `!보통`, `!낮음`), and recurrence (`매일`, `매주`, `매월`).
  - Zero external API dependencies; 100% deterministic local regex/date calculations.
  - Real-time preview chip banner beneath the input field.
- **Today Focus Mode (🎯 오늘 포커스)**:
  - Contextual daily focus view prioritizing overdue items, today's due tasks, and active high-priority items.
- **Performance Benchmarks**:
  - Verified < 50ms performance threshold for 1,000 tasks creation, filtering, stats calculation, and backup validation.
- **Continuous Integration (CI)**:
  - Added `.github/workflows/ci.yml` running unit tests and Playwright E2E tests automatically.

## [2.0.0] - 2026-11-06

### 🚀 Major Architectural Refactoring (Phase 1)
- Modularized application into ES modules under `/js`:
  - `models/todo.js`: Data structures, subtasks, schema migrations.
  - `services/storage.js`: LocalStorage layer with QuotaExceeded protection.
  - `services/backup.js`: Versioned backup export/import engine.
  - `state/store.js`: Centralized reactive state management.
  - `utils/date.js`: Timezone-safe local date & D-Day calculations.
  - `utils/security.js`: XSS prevention, HTML escaping, safe ID generation.
  - `ui/components.js`: Task cards, subtasks, inline edit, empty states.
  - `ui/toast.js`: Accessible live-region notifications with Undo action.
  - `ui/modal.js`: Accessible modal dialogs replacing native browser modals.
  - `ui/dnd.js`: Drag-and-drop & keyboard reordering controller.

### 🛡️ Reliability & Security (Phase 2)
- Added strict JSON schema validation for backup imports.
- Added backup import preview modal with **Merge (병합)** vs **Replace (덮어쓰기)** options.
- Added automatic ID collision resolution for duplicate IDs.
- Added non-blocking Toast notification system with 6-second **Undo (실행 취소)** for task deletions.
- Replaced native `confirm()` with accessible custom dialogs for destructive batch operations.
- Added safe error recovery and backup retention when localStorage data is corrupt or full.
- 100% backward compatibility maintained with legacy `todo_master_items_v1`.

### 🎨 UI/UX Improvements (Phase 3)
- Replaced blocking browser `prompt()` with inline editing (double-click or ✏️ button, Enter to save, Esc to cancel).
- Added contextual views: **전체 (All)**, **오늘 (Today)**, **예정 (Upcoming)**, **지연 (Overdue)**, **진행 중 (Active)**, **완료됨 (Completed)**.
- Added contextual empty state illustrations and messages tailored to each view.
- Added responsive layouts optimized for 320px, 375px, 390px, 768px, and desktop screens with zero horizontal overflow.
- Added keyboard shortcuts (`N`, `T`, `?`, `Space/Enter`, `Esc`) and dedicated shortcuts help dialog.
- Added support for `prefers-reduced-motion: reduce`.

### ⚡ Feature Expansion (Phase 4)
- **Subtasks (세부 항목)**: Multi-level task breakdown with completion checkboxes, quick-add input, and progress indicators `(1/3)`.
- **Recurring Tasks (반복 주기)**: Support for daily (`매일`), weekly (`매주`), and monthly (`매월`) recurring tasks that auto-schedule upon completion.
- **Manual Task Reordering**: HTML5 drag-and-drop reordering with visual drag handles (`⋮⋮`) plus accessible keyboard Up/Down buttons (`↑`, `↓`).
- **Completion Timestamps**: Automatic capture and display of completion date and time.
- **PWA & Offline Support**: Added `manifest.json` with icons and `sw.js` Service Worker with Stale-While-Revalidate caching.

### 🧪 Automated QA Suite (Phase 5)
- Added Node.js native unit testing suite (27 unit tests across models, date, security, storage, backup, and store).
- Added Playwright browser end-to-end testing suite (17 E2E tests covering CRUD, responsive viewports 320px-1200px, accessibility, theme switching, and PWA).
- 100% pass rate achieved with 0 regressions.
