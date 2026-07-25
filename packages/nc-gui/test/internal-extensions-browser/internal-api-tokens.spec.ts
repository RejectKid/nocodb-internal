import { expect, test } from '@playwright/test'

test('unauthorized users see no token mutations and direct creation is denied', async ({ page, request }) => {
  await page.goto('/?screen=tokens&scenario=token-unauthorized')

  await expect(page.getByRole('alert')).toContainText('do not have permission')
  await expect(page.getByTestId('create-internal-token')).toHaveCount(0)

  const response = await request.post('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens', {
    headers: { 'x-internal-browser-scenario': 'token-unauthorized-direct' },
    data: {
      displayName: 'Forbidden',
      allowedWorkspaceIds: ['workspace-1'],
      allowedBaseIds: ['base-1'],
      scopes: [],
    },
  })
  expect(response.status()).toBe(403)
})

test('token creation displays the secret once and sends tenant restrictions', async ({ page }) => {
  const scenario = `token-create-${Date.now()}`
  await page.goto(`/?screen=tokens&scenario=${scenario}`)
  await page.getByTestId('internal-token-name').fill('Browser automation')
  await page.getByTestId('create-internal-token').click()

  await expect(page.getByTestId('internal-token-secret')).toContainText('shown-once-secret')
  await expect
    .poll(() => page.evaluate(() => window.__internalBrowserRequests.find(({ method }) => method === 'POST')))
    .toMatchObject({
      method: 'POST',
      body: {
        displayName: 'Browser automation',
        allowedWorkspaceIds: ['workspace-1'],
        allowedBaseIds: ['base-1'],
      },
    })

  await page.getByRole('button', { name: 'I stored it' }).click()
  await expect(page.getByTestId('internal-token-secret')).toHaveCount(0)
})

test('revocation removes the active action immediately', async ({ page }) => {
  const scenario = `token-revoke-${Date.now()}`
  await page.goto(`/?screen=tokens&scenario=${scenario}`)
  await page.getByTestId('revoke-internal-token-token-existing').click()

  await expect(page.getByTestId('revoke-internal-token-token-existing')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => window.__internalBrowserRequests.find(({ method }) => method === 'DELETE')))
    .toMatchObject({ method: 'DELETE' })
})

test('capability-disabled base settings do not expose token navigation', async ({ page }) => {
  await page.goto('/?screen=settings&scenario=token-capability-off')
  await expect(page.getByTestId('internal-api-tokens-tab')).toHaveCount(0)
  await expect(page.getByTestId('token-editor-mounted')).toHaveCount(0)

  await page.goto('/?screen=settings&scenario=token-capability-on')
  await expect(page.getByTestId('internal-api-tokens-tab')).toBeVisible()
})
