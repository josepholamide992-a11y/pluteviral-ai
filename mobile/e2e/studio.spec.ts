import { test, expect } from '@playwright/test';

test('create an editable video outline on a mobile-sized screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('YOUR CONTENT. MULTIPLIED.')).toBeVisible();
  await page.getByPlaceholder('e.g. The untold story behind my latest song')
    .fill('Three useful filming tips for small business owners');
  await page.getByText('Create starter outline', { exact: false }).click();
  await expect(page.getByText('Your content draft')).toBeVisible();
  await expect(page.getByText('Render 9:16 video', { exact: false })).toBeVisible();
});

test('projects survive a browser refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song')
    .fill('Explaining sustainable product packaging');
  await page.getByText('Create starter outline', { exact: false }).click();

  await page.getByText('Projects', { exact: false }).first().click();
  await expect(page.getByText('Explaining sustainable product packaging')).toBeVisible();
  await page.reload();
  await page.getByText('Projects', { exact: false }).first().click();
  await expect(page.getByText('Explaining sustainable product packaging')).toBeVisible();
  await page.getByText('Open project', { exact: false }).click();
  await expect(page.getByText('Your content draft')).toBeVisible();
});
