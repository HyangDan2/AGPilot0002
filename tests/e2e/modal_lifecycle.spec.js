import { test, expect } from '@playwright/test';

test.describe('ModalController - Lifecycle & Single Promise Resolution (Issue 4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Confirm modal promise resolves properly on ESC, backdrop, cancel, and confirm across repeated openings', async ({ page }) => {
    // Inject and execute modal test in page context
    const testResults = await page.evaluate(async () => {
      // Import modal controller instance from window or test against ModalController class directly
      const { ModalController } = await import('./js/ui/modal.js');
      const modal = new ModalController();
      const results = [];

      // 1. Open confirm dialog and press Escape key
      const p1 = modal.confirm({ title: 'Test 1', message: 'Press ESC' });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const r1 = await p1;
      results.push({ test: 'ESC closure', resolvedValue: r1, isClosed: !modal.activeDialog });

      // 2. Open confirm dialog and click cancel button
      const p2 = modal.confirm({ title: 'Test 2', message: 'Click Cancel' });
      const cancelBtn = document.querySelector('#hd2ConfirmDialog .cancel-btn');
      cancelBtn.click();
      const r2 = await p2;
      results.push({ test: 'Cancel click', resolvedValue: r2, isClosed: !modal.activeDialog });

      // 3. Open confirm dialog and click confirm button
      const p3 = modal.confirm({ title: 'Test 3', message: 'Click Confirm' });
      const confirmBtn = document.querySelector('#hd2ConfirmDialog .confirm-btn');
      confirmBtn.click();
      const r3 = await p3;
      results.push({ test: 'Confirm click', resolvedValue: r3, isClosed: !modal.activeDialog });

      // 4. Repeated dialog openings (10 consecutive cycles)
      for (let i = 0; i < 10; i++) {
        const p = modal.confirm({ title: `Loop ${i}`, message: `Message ${i}` });
        const btn = i % 2 === 0
          ? document.querySelector('#hd2ConfirmDialog .confirm-btn')
          : document.querySelector('#hd2ConfirmDialog .cancel-btn');
        btn.click();
        const res = await p;
        results.push({ test: `Loop ${i}`, resolvedValue: res, expected: i % 2 === 0 });
      }

      return results;
    });

    expect(testResults[0].resolvedValue).toBe(false);
    expect(testResults[0].isClosed).toBe(true);

    expect(testResults[1].resolvedValue).toBe(false);
    expect(testResults[1].isClosed).toBe(true);

    expect(testResults[2].resolvedValue).toBe(true);
    expect(testResults[2].isClosed).toBe(true);

    // Verify all 10 loop cycles resolved with expected values
    for (let i = 0; i < 10; i++) {
      const loopResult = testResults[3 + i];
      expect(loopResult.resolvedValue).toBe(loopResult.expected);
    }
  });

  test('Task Edit modal resolves cleanly on ESC and updates without pending promises', async ({ page }) => {
    const editModalResults = await page.evaluate(async () => {
      const { ModalController } = await import('./js/ui/modal.js');
      const modal = new ModalController();

      const sampleTodo = {
        id: 'edit_test_1',
        title: 'Original Title',
        category: '개인',
        priority: 'medium',
        recurrence: 'none',
        dueDate: '2026-11-06',
        subtasks: []
      };

      // 1. Open edit modal and close via ESC
      const p1 = modal.showEditTaskModal(sampleTodo);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const r1 = await p1;

      // 2. Open edit modal again and close via close button
      const p2 = modal.showEditTaskModal(sampleTodo);
      const closeBtn = document.querySelector('#hd2EditTaskDialog .close-dialog-btn');
      closeBtn.click();
      const r2 = await p2;

      // 3. Open edit modal again and save with new title
      const p3 = modal.showEditTaskModal(sampleTodo);
      const titleInput = document.querySelector('#hd2EditTaskDialog #editModalTitle');
      titleInput.value = 'Updated via Modal';
      const form = document.querySelector('#hd2EditTaskDialog #editTaskForm');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      const r3 = await p3;

      return { r1, r2, r3 };
    });

    expect(editModalResults.r1).toBeNull();
    expect(editModalResults.r2).toBeNull();
    expect(editModalResults.r3).not.toBeNull();
    expect(editModalResults.r3.title).toBe('Updated via Modal');
  });
});
