import { test, expect } from '@playwright/test';

test.describe('HD2Lab Todo Master v2.2 — Productivity Workspace Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1 & 2: Client-side pagination defaults to 10 and switches to 20 and 50', async ({ page }) => {
    // Add 25 tasks to test pagination
    await page.evaluate(() => {
      const todos = [];
      for (let i = 1; i <= 25; i++) {
        todos.push({
          id: `p_task_${i}`,
          title: `Pagination Task ${i}`,
          category: i % 2 === 0 ? '업무' : '개인',
          priority: 'medium',
          dueDate: '2026-11-20',
          completed: false,
          order: i,
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('todo_master_items_v1', JSON.stringify(todos));
    });

    await page.reload();

    const pagination = page.locator('#paginationContainer');
    await expect(pagination).toBeVisible();

    // Default size is 10: 10 items on page 1
    const items = page.locator('.todo-item');
    await expect(items).toHaveCount(10);
    await expect(pagination).toContainText('총 25개 중 1–10개 표시');

    // Go to page 2
    await pagination.locator('.page-num-btn[data-page="2"]').click();
    await expect(items).toHaveCount(10);
    await expect(pagination).toContainText('총 25개 중 11–20개 표시');

    // Go to page 3
    await pagination.locator('.page-num-btn[data-page="3"]').click();
    await expect(items).toHaveCount(5);
    await expect(pagination).toContainText('총 25개 중 21–25개 표시');

    // Switch page size to 20
    const sizeSelect = page.locator('#pageSizeSelect');
    await sizeSelect.selectOption('20');
    await expect(items).toHaveCount(20);
    await expect(pagination).toContainText('총 25개 중 1–20개 표시');

    // Switch page size to 50
    await sizeSelect.selectOption('50');
    await expect(items).toHaveCount(25);
    await expect(pagination).toContainText('총 25개 중 1–25개 표시');
  });

  test('Scenario 3: Filter and search combined with pagination', async ({ page }) => {
    // Setup 25 tasks
    await page.evaluate(() => {
      const todos = [];
      for (let i = 1; i <= 25; i++) {
        todos.push({
          id: `f_task_${i}`,
          title: i <= 5 ? `Special Report ${i}` : `General Task ${i}`,
          category: i <= 5 ? '업무' : '개인',
          priority: 'high',
          dueDate: '',
          completed: false,
          order: i,
          subtasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('todo_master_items_v1', JSON.stringify(todos));
    });

    await page.reload();

    // Search for "Special Report"
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('Special Report');

    const items = page.locator('.todo-item');
    await expect(items).toHaveCount(5);
    const pagination = page.locator('#paginationContainer');
    await expect(pagination).toContainText('총 5개 중 1–5개 표시');
  });

  test('Scenario 6: Desktop three-panel workspace rendering at 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const sidebar = page.locator('#workspaceSidebar');
    const center = page.locator('.workspace-center');
    const rightPanel = page.locator('#workspaceRightPanel');

    await expect(sidebar).toBeVisible();
    await expect(center).toBeVisible();
    await expect(rightPanel).toBeVisible();

    // Verify right panel shows Date Schedule by default
    await expect(rightPanel).toContainText('DATE SCHEDULE');
    await expect(rightPanel).toContainText('임박한 마감일');
  });

  test('Scenario 7: Tablet responsive layout at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const sidebar = page.locator('#workspaceSidebar');
    const center = page.locator('.workspace-center');
    const rightPanel = page.locator('#workspaceRightPanel');

    await expect(sidebar).toBeVisible();
    await expect(center).toBeVisible();
    // On tablet <= 1200px, right panel is hidden to maintain clean 2-panel ratio
    await expect(rightPanel).toBeHidden();
  });

  test('Scenario 8: Mobile bottom navigation layout at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const sidebar = page.locator('#workspaceSidebar');
    const rightPanel = page.locator('#workspaceRightPanel');
    const bottomNav = page.locator('#mobileBottomNav');

    await expect(sidebar).toBeHidden();
    await expect(rightPanel).toBeHidden();
    await expect(bottomNav).toBeVisible();

    // Verify mobile navigation buttons
    await expect(bottomNav.locator('.mobile-nav-btn[data-view="dashboard"]')).toBeVisible();
    await expect(bottomNav.locator('.mobile-nav-btn[data-view="list"]')).toBeVisible();
    await expect(bottomNav.locator('.mobile-nav-btn[data-view="calendar"]')).toBeVisible();
    await expect(bottomNav.locator('#mobileAddTriggerBtn')).toBeVisible();

    // Switch to Dashboard via bottom nav
    await bottomNav.locator('.mobile-nav-btn[data-view="dashboard"]').click();
    await expect(page.locator('#dashboardView')).toBeVisible();
    await expect(page.locator('#listView')).toBeHidden();

    // Switch back to List
    await bottomNav.locator('.mobile-nav-btn[data-view="list"]').click();
    await expect(page.locator('#listView')).toBeVisible();
  });

  test('Scenario 9, 10 & 12: Interactive Calendar workspace navigation, date selection, and quick add', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Switch to Calendar view from sidebar
    const calNavBtn = page.locator('.sidebar-nav-item[data-view="calendar"]');
    await calNavBtn.click();

    const calView = page.locator('#calendarView');
    await expect(calView).toBeVisible();
    await expect(page.locator('#listView')).toBeHidden();

    // Verify calendar header and month view
    await expect(calView.locator('.cal-title')).toBeVisible();
    await expect(calView.locator('.calendar-grid-month')).toBeVisible();

    // Switch to Week view
    await calView.locator('.view-mode-btn[data-mode="week"]').click();
    await expect(calView.locator('.calendar-grid-week')).toBeVisible();

    // Switch back to Month view
    await calView.locator('.view-mode-btn[data-mode="month"]').click();
    await expect(calView.locator('.calendar-grid-month')).toBeVisible();

    // Click on a date cell in calendar (e.g. 10th)
    const dateCell = calView.locator('.cal-day-cell[data-date$="-10"]').first();
    await dateCell.click();

    // Right panel should reflect selected date schedule
    const rightPanel = page.locator('#workspaceRightPanel');
    await expect(rightPanel).toBeVisible();
    await expect(rightPanel.locator('.date-schedule-title')).toBeVisible();

    // Quick add task from right panel
    const quickInput = rightPanel.locator('#dateQuickInput');
    await quickInput.fill('캘린더 직속 추가 작업');
    await rightPanel.locator('.date-quick-submit').click();

    await expect(page.locator('.toast').last()).toContainText('추가되었습니다');
  });

  test('Scenario 11: Unscheduled Tasks (Inbox View)', async ({ page }) => {
    // Add unscheduled task
    await page.locator('#todoInput').fill('마감일 없는 인박스 아이템');
    await page.locator('#todoForm button[type="submit"]').click();

    // Click Inbox in sidebar
    const inboxNav = page.locator('.sidebar-nav-item[data-view="inbox"]');
    await inboxNav.click();

    // Should display only unscheduled tasks
    const items = page.locator('.todo-item');
    await expect(items.first()).toContainText('마감일 없는 인박스 아이템');
  });

  test('Scenario 13: Task detail & subtask interaction in Right Context Panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Click first task title
    const firstTask = page.locator('.todo-item').first();
    const taskTitle = await firstTask.locator('.item-title').innerText();
    await firstTask.locator('.item-title').click();

    // Right panel should enter Task Details Mode
    const rightPanel = page.locator('#workspaceRightPanel');
    await expect(rightPanel.locator('.context-eyebrow')).toHaveText('TASK DETAILS');
    await expect(rightPanel.locator('.context-task-title')).toHaveText(taskTitle);

    // Add subtask from context panel
    const stInput = rightPanel.locator('#contextSubtaskInput');
    await stInput.fill('새로운 세부 서브태스크');
    await rightPanel.locator('.st-add-submit-btn').click();

    await expect(rightPanel.locator('.context-subtask-item', { hasText: '새로운 세부 서브태스크' })).toBeVisible();
  });

  test('Scenario 19 & 20: Display density toggle and task grouping', async ({ page }) => {
    // Test density toggle
    const densityBtn = page.locator('#densityToggleBtn');
    await expect(densityBtn).toHaveText('기본');

    await densityBtn.click();
    await expect(densityBtn).toHaveText('조밀하게');
    await expect(page.locator('body')).toHaveClass(/density-compact/);

    // Test grouping by category
    const groupSelect = page.locator('#groupSelect');
    await groupSelect.selectOption('category');

    const groupHeaders = page.locator('.todo-group-header');
    await expect(groupHeaders.first()).toBeVisible();
    await expect(groupHeaders.first()).toContainText('📁');
  });

  test('Visual Inspection: Viewport screenshots capture for desktop, tablet, and mobile', async ({ page }) => {
    // Desktop 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'test-results/v22_desktop_1440.png', fullPage: true });

    // Tablet 1024px
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: 'test-results/v22_tablet_1024.png', fullPage: true });

    // Mobile 390px (iPhone 14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'test-results/v22_mobile_390.png', fullPage: true });

    // Calendar view on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.sidebar-nav-item[data-view="calendar"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/v22_desktop_calendar.png', fullPage: true });

    // Dashboard view on desktop
    await page.locator('.sidebar-nav-item[data-view="dashboard"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/v22_desktop_dashboard.png', fullPage: true });
  });

});
