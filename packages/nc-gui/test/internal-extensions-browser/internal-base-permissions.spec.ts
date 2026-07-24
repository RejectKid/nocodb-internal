import { expect, test } from '@playwright/test'

test('unauthorized users see no mutation controls and direct requests remain denied', async ({ page, request }) => {
  await page.goto('/?screen=editor&scenario=unauthorized')

  await expect(page.getByRole('alert')).toContainText('do not have permission')
  await expect(page.getByTestId('internal-base-permissions-save')).toHaveCount(0)
  await expect(page.getByTestId('internal-base-permissions-enabled')).toHaveCount(0)

  const response = await request.get('/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions', {
    headers: { 'x-internal-browser-scenario': 'unauthorized-direct' },
  })
  expect(response.status()).toBe(403)
})

test('authorized administrators can submit revision-bound assignments', async ({ page }) => {
  await page.goto('/?screen=editor&scenario=authorized')

  await expect(page.getByTestId('internal-base-permissions-save')).toBeVisible()
  await page.getByTestId('internal-base-permissions-save').click()

  await expect
    .poll(() => page.evaluate(() => window.__internalBrowserRequests.find(({ method }) => method === 'PUT')))
    .toMatchObject({
      method: 'PUT',
      body: {
        expectedRevision: 'editor-revision',
      },
    })
})

test('capability-disabled base settings do not expose the editor entry', async ({ page }) => {
  await page.goto('/?screen=settings&scenario=capability-off')
  await expect(page.getByTestId('internal-base-permissions-tab')).toHaveCount(0)
  await expect(page.getByTestId('permission-editor-mounted')).toHaveCount(0)

  await page.goto('/?screen=settings&scenario=capability-on')
  await expect(page.getByTestId('internal-base-permissions-tab')).toBeVisible()
})

test('stale assignment writes reload state and require review', async ({ page }) => {
  const scenario = `stale-${Date.now()}`
  await page.goto(`/?screen=editor&scenario=${scenario}`)

  await page.getByTestId('internal-base-permissions-save').click()

  await expect(page.getByRole('alert')).toContainText('latest values were reloaded')
  await expect
    .poll(() => page.evaluate(() => window.__internalBrowserRequests.filter(({ method }) => method === 'GET').length))
    .toBeGreaterThanOrEqual(2)
})
