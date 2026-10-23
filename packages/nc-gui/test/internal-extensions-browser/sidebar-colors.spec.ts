import { expect, test } from '@playwright/test'

test('color editor saves independent rules, preserves metadata, and paints matching cells', async ({ page }) => {
  await page.goto('/?screen=colors&scenario=colors-enabled')
  await page.getByTestId('internal-cell-colors').click()
  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByLabel('Color comparison').fill('Done')
  await page.getByTestId('internal-color-save').click()
  await expect(page.getByTestId('colored-example')).toHaveCSS('background-color', 'rgb(254, 243, 199)')
  const change = await page.evaluate(() => window.__internalBrowserRequests.find((request) => request.method === 'PATCH'))
  expect(change?.body).toMatchObject({ meta: { icon: 'star', internalCellColorsV1: [{ fieldId: 'status', value: 'Done' }] } })
  await page.getByTestId('internal-cell-colors').click()
  await expect(page.getByLabel('Color comparison')).toHaveValue('Done')
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByTestId('internal-color-save').click()
  await expect(page.getByTestId('colored-example')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})

test('disabled coloring stays hidden and read-only users cannot save', async ({ page }) => {
  await page.goto('/?screen=colors&scenario=colors-off')
  await expect(page.getByTestId('internal-cell-colors')).toHaveCount(0)
  await page.goto('/?screen=colors&scenario=colors-readonly')
  await page.getByTestId('internal-cell-colors').click()
  await expect(page.getByText('Read-only:', { exact: false })).toBeVisible()
  await expect(page.getByTestId('internal-color-save')).toHaveCount(0)
})

test('workspace sidebar lists authorized documents and links to the exact document', async ({ page }) => {
  await page.goto('/?screen=documents-sidebar&scenario=documents-enabled')
  const nav = page.getByRole('navigation', { name: 'Workspace documents' })
  await expect(nav.getByRole('link', { name: 'Team handbook', exact: true })).toHaveAttribute(
    'href',
    '/internal/documents?baseId=base-1&documentId=doc-visible',
  )
  await expect(nav).not.toContainText('Secondary Base')
  await nav.getByRole('button', { name: 'Refresh documents' }).click()
  await expect(nav.getByText('Team handbook', { exact: true })).toBeVisible()
})
