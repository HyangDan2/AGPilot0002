import { test, expect } from '@playwright/test';

test.describe('HD2Lab Todo Master - Core E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Page loads properly with HD2Lab brand, initial sample tasks, and default dark theme', async ({ page }) => {
    // Check title and brand
    await expect(page).toHaveTitle(/HD2Lab \| Todo Master/);
    const brand = page.locator('.brand');
    await expect(brand).toContainText('HD2Lab');
    await expect(brand).toContainText('Todo Master');

    // Default theme should be dark
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('dark');

    // Sample tasks should be visible
    const items = page.locator('.todo-item');
    await expect(items).toHaveCount(3);
  });

  test('Add new task and toggle completion', async ({ page }) => {
    const input = page.locator('#todoInput');
    await input.fill('새로운 E2E 자동화 작업');
    await page.locator('#todoForm button[type="submit"]').click();

    // Check toast
    await expect(page.locator('.toast')).toContainText('할 일이 추가되었습니다');

    // Check task in list
    const firstItem = page.locator('.todo-item').first();
    await expect(firstItem).toContainText('새로운 E2E 자동화 작업');

    // Toggle completion
    const checkbox = firstItem.locator('.custom-checkbox');
    await checkbox.click();
    await expect(firstItem).toHaveClass(/completed/);
    await expect(page.locator('.toast').last()).toContainText('완료했습니다');
  });

  test('Inline task editing without browser prompt', async ({ page }) => {
    const firstItem = page.locator('.todo-item').first();
    const editBtn = firstItem.locator('.edit-btn');
    await editBtn.click();

    // Inline edit input should be visible and title hidden
    const inlineInput = firstItem.locator('.inline-edit-input');
    await expect(inlineInput).toBeVisible();

    await inlineInput.fill('인라인 수정 완료된 타이틀');
    await inlineInput.press('Enter');

    // Should update title
    await expect(firstItem.locator('.item-title')).toHaveText('인라인 수정 완료된 타이틀');
  });

  test('Subtasks: add, toggle, and display progress counter', async ({ page }) => {
    const firstItem = page.locator('.todo-item').first();
    const toggleSubBtn = firstItem.locator('.badge-subtask-toggle');

    if (await toggleSubBtn.isVisible()) {
      await toggleSubBtn.click();
    }

    const subInput = firstItem.locator('.subtask-input');
    await subInput.fill('신규 서브태스크 항목');
    await subInput.press('Enter');

    await expect(firstItem.locator('.subtask-list')).toContainText('신규 서브태스크 항목');

    // Toggle the subtask
    const subCheckbox = firstItem.locator('.subtask-item').last().locator('.subtask-checkbox');
    await subCheckbox.click();
    await expect(firstItem.locator('.subtask-item').last()).toHaveClass(/completed/);
  });

  test('Delete task and Undo via toast action', async ({ page }) => {
    const initialCount = await page.locator('.todo-item').count();
    const firstItem = page.locator('.todo-item').first();
    const itemTitle = await firstItem.locator('.item-title').textContent();

    // Delete
    await firstItem.locator('.delete-btn').click();

    // Toast with Undo button
    const toast = page.locator('.toast');
    await expect(toast).toContainText('삭제되었습니다');
    const undoBtn = toast.locator('.toast-action-btn');
    await expect(undoBtn).toBeVisible();

    // Click undo
    await undoBtn.click();

    // Verify task is restored
    const afterCount = await page.locator('.todo-item').count();
    expect(afterCount).toBe(initialCount);
    await expect(page.locator('.todo-item').first()).toContainText(itemTitle);
  });

  test('Theme toggle switches between dark and light smoothly', async ({ page }) => {
    const themeBtn = page.locator('#themeToggleBtn');
    await themeBtn.click();

    let theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');

    // Reload page to verify persistence
    await page.reload();
    theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');

    // Switch back to dark
    await page.locator('#themeToggleBtn').click();
    theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');
  });

  test('View tabs filter tasks properly (Active vs Completed)', async ({ page }) => {
    // Click '완료됨' tab
    await page.locator('.tab-btn[data-filter="completed"]').click();
    const completedItems = page.locator('.todo-item');
    const count = await completedItems.count();

    for (let i = 0; i < count; i++) {
      await expect(completedItems.nth(i)).toHaveClass(/completed/);
    }

    // Click '진행 중' tab
    await page.locator('.tab-btn[data-filter="active"]').click();
    const activeItems = page.locator('.todo-item');
    const activeCount = await activeItems.count();

    for (let i = 0; i < activeCount; i++) {
      await expect(activeItems.nth(i)).not.toHaveClass(/completed/);
    }
  });

  test('Clear completed tasks shows confirmation modal', async ({ page }) => {
    const clearBtn = page.locator('#clearCompletedBtn');
    await clearBtn.click();

    // Accessible Dialog should appear
    const dialog = page.locator('#hd2ConfirmDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('완료 항목 일괄 삭제');

    // Confirm
    await dialog.locator('.confirm-btn').click();

    // Verify all remaining items are active
    const remaining = page.locator('.todo-item');
    const count = await remaining.count();
    for (let i = 0; i < count; i++) {
      await expect(remaining.nth(i)).not.toHaveClass(/completed/);
    }
  });
});
