import { expect, test } from '@playwright/test'

/**
 * Scaffolding smoke tests (F-001): the app serves a working, styled page with
 * the configured security headers.
 *
 * Retargeted from `/` to `/signin` in F-002. The root route is now a
 * session-aware redirect rather than a landing page, so `/signin` is the public
 * page that actually renders. The criteria being proven are unchanged.
 */
test.describe('scaffolding smoke', () => {
  test('F-001 AC-1: serves a page', async ({ page }) => {
    const response = await page.goto('/signin')

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Change Management System/)
    await expect(page.getByRole('heading', { name: 'Change Management System' })).toBeVisible()
  })

  test('F-001 AC-9: renders styled content, proving the Tailwind pipeline works', async ({
    page,
  }) => {
    await page.goto('/signin')

    const heading = page.getByRole('heading', { name: 'Change Management System' })
    await expect(heading).toBeVisible()

    // The heading carries `text-2xl` (24px). A browser's default h1 is 2em =
    // 32px, so seeing exactly 24px proves Tailwind compiled and applied — an
    // unstyled page would report 32.
    const fontSize = await heading.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(parseFloat(fontSize)).toBe(24)
  })

  test('F-001 AC-7: sends the configured security headers', async ({ page }) => {
    const response = await page.goto('/signin')
    const headers = response?.headers() ?? {}

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})
