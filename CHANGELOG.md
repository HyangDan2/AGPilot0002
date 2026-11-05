# Changelog — HD2Lab Todo Master

All notable changes to this project are documented in this file.

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
