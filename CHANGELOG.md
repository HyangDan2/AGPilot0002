# Changelog — HD2Lab Todo Master

All notable changes to this project are documented in this file.

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
