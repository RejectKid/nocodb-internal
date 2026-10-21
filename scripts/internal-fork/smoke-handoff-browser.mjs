import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const requireGui = createRequire(new URL('../../packages/nc-gui/package.json', import.meta.url));

// Only called against the freshly created disposable handoff stack. Never log
// the transient QA token, browser storage or request headers.
export async function smokeHandoffBrowser(origin, fixture, evidenceDirectory) {
  assert.equal(new URL(origin).hostname, '127.0.0.1');
  const { chromium, expect } = requireGui('@playwright/test');
  if (evidenceDirectory) await mkdir(evidenceDirectory, { recursive: true });
  const browser = await chromium.launch({ ...(process.env.CI ? {} : { channel: 'chrome' }), headless: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((token) => localStorage.setItem('nocodb-gui-v2', JSON.stringify({ token })), fixture.token);
  try {
    // Standard self-profile endpoint: finish disposable account onboarding.
    const response = await fetch(`${origin}/api/v2/meta/user/profile`, {
      method: 'PATCH', headers: { 'content-type': 'application/json', 'xc-auth': fixture.token },
      body: JSON.stringify({ is_new_user: false }),
    });
    assert.equal(response.status, 200);
    await page.goto(`${origin}/nc/${fixture.baseId}/${fixture.tableId}/${fixture.viewId}`);
    await page.getByTestId('internal-cell-colors').waitFor();
    await expect(page.getByText('Try NocoDB Cloud', { exact: true })).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Workspace documents' });
    await expect(nav.getByRole('link', { name: 'Team-only document', exact: true })).toBeVisible();
    // Save through the real toolbar and inspect the rendered canvas, not a mock.
    await page.getByTestId('internal-cell-colors').click();
    await expect(page.getByLabel('Color comparison', { exact: true })).toHaveValue('Done');
    await page.getByLabel('Cell color', { exact: true }).fill('#d1fae5');
    await page.getByTestId('internal-color-save').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const coloredPixels = () => page.locator('canvas').evaluateAll((canvases) => canvases.reduce((total, canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return total;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 209 && pixels[i + 1] === 250 && pixels[i + 2] === 229 && pixels[i + 3] === 255) count++;
      }
      return total + count;
    }, 0));
    await expect.poll(coloredPixels, { timeout: 15000 }).toBeGreaterThan(100);
    await page.reload();
    await page.getByTestId('internal-cell-colors').waitFor();
    await expect.poll(coloredPixels, { timeout: 15000 }).toBeGreaterThan(100);
    if (evidenceDirectory) await page.screenshot({ path: path.join(evidenceDirectory, 'cell-colors-desktop.png'), timeout: 10000 });
    await page.getByRole('navigation', { name: 'Workspace documents' }).getByRole('link', { name: 'Team-only document', exact: true }).click();
    await page.getByTestId('internal-documents-page').waitFor();
    await expect(page.locator('input.max-w-lg')).toHaveValue('Team-only document');
    await expect(page).toHaveURL(new RegExp(`documentId=${fixture.documentId}`));
    await expect(page.getByRole('navigation', { name: 'Workspace documents' })).toBeVisible();
    if (evidenceDirectory) {
      await page.screenshot({ path: path.join(evidenceDirectory, 'documents-sidebar-desktop.png'), timeout: 10000 });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('navigation', { name: 'Workspace documents' }).getByRole('link', { name: 'Team-only document', exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Workspace documents' })).not.toBeVisible();
      await page.screenshot({ path: path.join(evidenceDirectory, 'documents-mobile.png'), timeout: 10000 });
    }
    await page.reload();
    await page.getByTestId('internal-documents-page').waitFor();
    await expect(page.locator('input.max-w-lg')).toHaveValue('Team-only document');
    await expect(page.getByRole('navigation', { name: 'Workspace documents' })).toBeVisible();
    await expect(page.locator('[class*="vite-error-overlay"]')).toHaveCount(0);
    assert.deepEqual(errors, [], 'Production browser must not have uncaught application errors');
    console.log('PASS: compiled GUI coloring save/reload/canvas, document sidebar/deep link/reload, no cloud promotion or runtime errors');
  } catch (error) {
    if (evidenceDirectory) await page.screenshot({ path: path.join(evidenceDirectory, 'failure.png'), timeout: 10000 }).catch(() => undefined);
    throw error;
  } finally {
    await browser.close();
  }
}
