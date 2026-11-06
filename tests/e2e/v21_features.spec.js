import { test, expect } from '@playwright/test';

test.describe('HD2Lab Todo Master v2.1.0 Feature Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start clean
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Smart input live preview shows parsed chips and applies them on submit', async ({ page }) => {
    const input = page.locator('#todoInput');
    const preview = page.locator('#smartInputPreview');

    // Initially preview is hidden
    await expect(preview).toBeHidden();

    // Type Korean smart input
    await input.fill('내일 팀 회의 #업무 !높음');

    // Preview should appear with smart chips
    await expect(preview).toBeVisible();
    await expect(preview.locator('.smart-chip.due')).toBeVisible();
    await expect(preview.locator('.smart-chip.category')).toContainText('#업무');
    await expect(preview.locator('.smart-chip.priority-high')).toContainText('높음');

    // Submit form
    await page.locator('#todoForm button[type="submit"]').click();

    // Verify task is added with extracted attributes
    const firstTask = page.locator('.todo-item').first();
    await expect(firstTask.locator('.item-title')).toHaveText('팀 회의');
    await expect(firstTask.locator('.badge-category')).toHaveText('업무');
    await expect(firstTask.locator('.badge-priority')).toHaveText(/높음/);
    await expect(firstTask.locator('.badge-due')).toBeVisible();

    // Preview should reset and be hidden
    await expect(preview).toBeHidden();
  });

  test('Today Focus Mode filters items requiring immediate attention', async ({ page }) => {
    // Check initial active tasks
    const focusTab = page.locator('button[data-filter="focus"]');
    await expect(focusTab).toBeVisible();

    // Click Today Focus tab
    await focusTab.click();
    await expect(focusTab).toHaveClass(/active/);

    // List should display only focus-relevant tasks (today, overdue, high priority)
    const items = page.locator('.todo-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify each displayed task is either high priority, today/overdue due date, or completed today
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const isHigh = await item.locator('.badge-priority.high').count() > 0;
      const isDue = await item.locator('.badge-due').count() > 0;
      const isCompleted = await item.evaluate(el => el.classList.contains('completed'));
      expect(isHigh || isDue || isCompleted).toBe(true);
    }
  });

  test('Comprehensive Edit Modal updates task properties and subtasks', async ({ page }) => {
    const firstTask = page.locator('.todo-item').first();
    const editModalBtn = firstTask.locator('.edit-modal-btn');
    await editModalBtn.click();

    const dialog = page.locator('#hd2EditTaskDialog');
    await expect(dialog).toBeVisible();

    // Update title
    const modalTitle = dialog.locator('#editModalTitle');
    await modalTitle.fill('수정된 고급 프로젝트');

    // Update priority to high
    await dialog.locator('#editModalPriority').selectOption('high');

    // Add a new subtask inside modal
    const newSubInput = dialog.locator('#editModalNewSubtask');
    await newSubInput.fill('모달에서 추가한 세부작업');
    await dialog.locator('#editModalAddSubtaskBtn').click();

    // Save changes
    await dialog.locator('button.confirm-btn').click();
    await expect(dialog).toBeHidden();

    // Verify task updated
    await expect(firstTask.locator('.item-title')).toHaveText('수정된 고급 프로젝트');
    await expect(firstTask.locator('.badge-priority')).toHaveText(/높음/);

    // Open subtasks if collapsed and verify added subtask
    const subtaskToggle = firstTask.locator('.badge-subtask-toggle');
    if (await subtaskToggle.isVisible()) {
      await subtaskToggle.click();
    }
    await expect(firstTask.locator('.subtask-item', { hasText: '모달에서 추가한 세부작업' })).toBeVisible();
  });

  test('Multi-delete supports independent undo actions', async ({ page }) => {
    const initialCount = await page.locator('.todo-item').count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Delete first item
    const firstTitle = await page.locator('.todo-item').first().locator('.item-title').innerText();
    await page.locator('.todo-item').first().locator('.delete-btn').click();

    // Toast should offer undo
    const firstToast = page.locator('.toast').last();
    await expect(firstToast).toContainText('삭제되었습니다');
    const firstUndoBtn = firstToast.locator('.toast-action-btn');
    await expect(firstUndoBtn).toHaveText('실행 취소');

    // Delete another item
    await page.locator('.todo-item').first().locator('.delete-btn').click();
    const secondToast = page.locator('.toast').last();
    await expect(secondToast).toContainText('삭제되었습니다');

    // Click undo on second toast
    await secondToast.locator('.toast-action-btn').click();
    await expect(page.locator('.toast').last()).toContainText('삭제가 취소되었습니다');

    // Click undo on first toast
    if (await firstUndoBtn.isVisible()) {
      await firstUndoBtn.click();
      await expect(page.locator('.toast').last()).toContainText('삭제가 취소되었습니다');
      await expect(page.locator('.todo-item', { hasText: firstTitle })).toBeVisible();
    }
  });

  test('Progress bar aria-valuenow synchronizes with completion percentage', async ({ page }) => {
    const progressBarBg = page.locator('.progress-bar-bg');
    const percentEl = page.locator('#progressPercent');

    const initialPercentText = await percentEl.innerText();
    const initialPercentNum = parseInt(initialPercentText.replace('%', ''), 10);

    const valuenow = await progressBarBg.getAttribute('aria-valuenow');
    expect(parseInt(valuenow, 10)).toBe(initialPercentNum);

    // Toggle a task checkbox
    const firstTaskCheckbox = page.locator('.todo-item').first().locator('.custom-checkbox');
    await firstTaskCheckbox.click();

    const updatedPercentText = await percentEl.innerText();
    const updatedPercentNum = parseInt(updatedPercentText.replace('%', ''), 10);
    const updatedValuenow = await progressBarBg.getAttribute('aria-valuenow');
    expect(parseInt(updatedValuenow, 10)).toBe(updatedPercentNum);
  });
});
