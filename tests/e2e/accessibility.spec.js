import { test, expect } from '@playwright/test';

test.describe('Accessibility & Keyboard Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Global shortcut N focuses new task input', async ({ page }) => {
    // Click outside to defocus
    await page.locator('.brand').click();
    await page.keyboard.press('n');

    const focusedId = await page.evaluate(() => document.activeElement.id);
    expect(focusedId).toBe('todoInput');
  });

  test('Global shortcut ? opens shortcuts dialog and Esc closes it', async ({ page }) => {
    await page.locator('.brand').click();
    await page.keyboard.press('?');

    const dialog = page.locator('#shortcutsDialog');
    await expect(dialog).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Checkboxes have proper ARIA attributes and Spacebar toggle', async ({ page }) => {
    // Add a specific non-recurring test task
    await page.locator('#todoInput').fill('접근성 스페이스바 토글 테스트');
    await page.locator('#todoForm button[type="submit"]').click();

    const targetItem = page.locator('.todo-item', { hasText: '접근성 스페이스바 토글 테스트' });
    const checkbox = targetItem.locator('.custom-checkbox');

    await expect(checkbox).toHaveAttribute('role', 'checkbox');
    await expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // Focus and press Space
    await checkbox.focus();
    await page.keyboard.press('Space');

    await expect(targetItem.locator('.custom-checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  test('PWA manifest is valid and linked properly', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', 'manifest.json');

    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);

    const manifestJson = await response.json();
    expect(manifestJson.name).toBe('HD2Lab Todo Master');
    expect(manifestJson.display).toBe('standalone');
    expect(manifestJson.icons.length).toBeGreaterThanOrEqual(3);
  });
});
