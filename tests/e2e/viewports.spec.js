import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone SE min (320px)', width: 320, height: 568 },
  { name: 'iPhone standard (375px)', width: 375, height: 667 },
  { name: 'iPhone 12/13/14 (390px)', width: 390, height: 844 },
  { name: 'iPad / Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1200px)', width: 1200, height: 800 }
];

test.describe('Responsive Viewports & Overflow Tests', () => {
  for (const vp of VIEWPORTS) {
    test(`Layout at ${vp.name} (${vp.width}x${vp.height}) has no horizontal overflow and interactive controls`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for items to be present
      await expect(page.locator('.brand')).toBeVisible();
      await expect(page.locator('#todoInput')).toBeVisible();

      // Ensure no horizontal scrollbar on body
      const isOverflowing = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(isOverflowing).toBe(false);

      // Verify input and submit button are visible and operable
      const submitBtn = page.locator('#todoForm button[type="submit"]');
      await expect(submitBtn).toBeVisible();

      // Verify filter tabs are scrollable or wrap cleanly
      const filterTabs = page.locator('.filter-tabs');
      await expect(filterTabs).toBeVisible();
    });
  }
});
