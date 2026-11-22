/// <reference types="node" />
import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

test('create, edit and restore a project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('YOUR CONTENT. MULTIPLIED.')).toBeVisible();
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('Three filming tips');
  await page.getByText('Create starter outline', { exact: false }).click();
  await expect(page.getByText('Your content draft')).toBeVisible();
  await expect(page.getByText('Connect the video engine to render')).toBeVisible();
  await page.getByText('Projects', { exact: false }).first().click();
  await expect(page.getByText('Three filming tips')).toBeVisible();
  await page.reload();
  await page.getByText('Projects', { exact: false }).first().click();
  await expect(page.getByText('Three filming tips')).toBeVisible();
  await page.getByText('Open project', { exact: false }).click();
  await expect(page.getByText('Your content draft')).toBeVisible();
});

test('render confirmation is cancellable without calling an external API', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('Brand origin story');
  await page.getByText('Create starter outline', { exact: false }).click();
  await page.getByText('Settings', { exact: true }).click();
  await page.getByPlaceholder('https://video.yourdomain.com').fill('https://video.example.com');
  await page.getByPlaceholder('Stored securely on your device').fill('local-test-key-only');
  await page.getByText('Save secure connection').click();
  await page.getByText('Render 9:16 video', { exact: false }).click();
  await expect(page.getByText('Start rendering?')).toBeVisible();
  await expect(page.getByText('This sends your script', { exact: false })).toBeVisible();
  await page.getByText('Cancel', { exact: true }).click();
  await expect(page.getByText('Start rendering?')).toBeHidden();
});

test('deletion is confirmed before removing a locally saved project', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('Deletion safety test');
  await page.getByText('Create starter outline', { exact: false }).click();
  await page.getByText('Projects', { exact: false }).first().click();
  await page.getByText('Delete', { exact: true }).click();
  await expect(page.getByText('Delete this project?')).toBeVisible();
  await page.getByText('Cancel', { exact: true }).click();
  await expect(page.getByText('Deletion safety test')).toBeVisible();
  await page.getByText('Delete', { exact: true }).click();
  await page.getByText('Delete project', { exact: true }).click();
  await expect(page.getByText('No drafts yet. Create your first story.')).toBeVisible();
});

test('free video mode is available without backend credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('Making a simple original tip');
  await page.getByText('Create starter outline', { exact: false }).click();
  await expect(page.getByText('NO SERVER · FREE EXPORT')).toBeVisible();
  await expect(page.getByText('Make free silent video', { exact: false })).toBeVisible();
  await expect(page.getByText('Connect the video engine to render')).toBeVisible();
});

test('user can attach an audio file to a free video draft without uploading it', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('Song lyrics reel');
  await page.getByText('Create starter outline', { exact: false }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByText('Add my song or audio').click();
  await (await chooser).setFiles({
    name: 'my-own-song.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]),
  });
  await expect(page.getByText('Music attached: my-own-song.wav', { exact: false })).toBeVisible();
  await expect(page.getByText('Make free music video', { exact: false })).toBeVisible();
  await page.getByText('Remove music').click();
  await expect(page.getByText('Make free silent video', { exact: false })).toBeVisible();
});

test('free creator exports a real local video download', async ({ page }) => {
  test.setTimeout(80000);
  await page.goto('/');
  await page.getByPlaceholder('e.g. The untold story behind my latest song').fill('A hopeful message');
  await page.getByText('Create starter outline', { exact: false }).click();
  await page.getByLabel('Video script').fill('Keep going. Your next chapter can be better.');
  await page.getByText('Make free silent video', { exact: false }).click();
  await expect(page.getByText('Ready ·', { exact: false })).toBeVisible({ timeout: 60000 });
  const downloading = page.waitForEvent('download');
  await page.getByText(/Download (MP4|WEBM) video/).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toMatch(/pluteviral-.*\.(mp4|webm)$/);
  const fs = await import('node:fs');
  const downloadPath = await file.path();
  expect(downloadPath).not.toBeNull();
  expect(fs.statSync(downloadPath!).size).toBeGreaterThan(3000);
});
