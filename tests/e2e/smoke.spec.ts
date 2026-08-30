import { expect, test } from '@playwright/test'

/**
 * F-001 smoke tests: the scaffold serves a working page.
 *
 * These are deliberately thin. Real user-journey specs (the three flows in the
 * PRD) arrive with the features that implement them — there is nothing to
 * journey through yet.
 */
test.describe('scaffolding smoke', () => {
  test('F-001 AC-1: serves the landing page', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Change Management System/)
    await expect(page.getByRole('heading', { name: 'Change Management System' })).toBeVisible()
  })

  test('F-001 AC-9: renders styled content, proving the Tailwind pipeline works', async ({
    page,
  }) => {
    await page.goto('/')

    const heading = page.getByRole('heading', { name: 'Change Management System' })
    await expect(heading).toBeVisible()

    // If Tailwind had not compiled, this would fall back to the browser default
    // (~32px for an h1) rather than the text-4xl the page asks for.
    const fontSize = await heading.evaluate((el) => window.getComputedStyle(el).fontSize)
    expect(parseFloat(fontSize)).toBeGreaterThan(32)
  })

  test('F-001 AC-7: sends the configured security headers', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})
