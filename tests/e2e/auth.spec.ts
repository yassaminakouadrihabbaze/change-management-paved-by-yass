import { expect, test } from '@playwright/test'
import { signInAs } from './helpers/session'

const PROTECTED_ROUTES = ['/dashboard', '/requests/new', '/admin/users']

test.describe('unauthenticated access', () => {
  test('F-002 AC-1: redirects a protected route to /signin', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/signin/)
  })

  test('F-002 AC-1: preserves the intended destination as callbackUrl', async ({ page }) => {
    await page.goto('/requests/new')
    await expect(page).toHaveURL(/callbackUrl=%2Frequests%2Fnew|callbackUrl=\/requests\/new/)
  })

  for (const route of PROTECTED_ROUTES) {
    test(`F-002 AC-1: ${route} is not reachable without a session`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/signin/)
    })
  }

  test('F-002 AC-9: / redirects to /signin', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/signin/)
  })
})

test.describe('sign-in page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin')
  })

  test('F-002 AC-2: offers no password field and no sign-up link', async ({ page }) => {
    // The application must never handle credentials — identity comes from the
    // directory. A password input appearing here means that changed.
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
    await expect(page.getByRole('link', { name: /sign ?up|register|create account/i })).toHaveCount(
      0
    )
  })

  test('F-002 AC-2: states that accounts come from the directory', async ({ page }) => {
    await expect(page.getByText(/there is no sign-up/i)).toBeVisible()
  })

  test('F-002 AC-2: shows the Microsoft sign-in action, or explains it is unconfigured', async ({
    page,
  }) => {
    // Without Entra credentials the page renders a configuration notice instead
    // of the button. Both are valid states; a blank page is not.
    const button = page.getByRole('button', { name: /sign in with microsoft/i })
    const notice = page.getByText(/sign-in is not configured yet/i)

    await expect(button.or(notice)).toBeVisible()
  })
})

test.describe('authenticated access', () => {
  test('F-002 AC-3: a valid session cookie reaches the dashboard', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(
      context,
      { id: 'u-1', email: 'requester@example.com', name: 'Ada Requester' },
      baseURL!
    )

    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('F-002 AC-3 / AC-5: the session identity reaches the server component', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(
      context,
      { id: 'u-2', email: 'manager@example.com', name: 'Grace Manager', role: 'MANAGER' },
      baseURL!
    )

    await page.goto('/dashboard')

    await expect(page.getByTestId('session-email')).toHaveText('manager@example.com')
    await expect(page.getByTestId('session-name')).toHaveText('Grace Manager')
    await expect(page.getByTestId('session-role')).toHaveText('MANAGER')
  })

  test('F-002 AC-5: the role from the token is the role rendered', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, { id: 'u-3', email: 'admin@example.com', role: 'ADMIN' }, baseURL!)

    await page.goto('/dashboard')
    await expect(page.getByTestId('session-role')).toHaveText('ADMIN')
  })

  test('F-002 AC-9: / redirects a signed-in user to /dashboard', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, { id: 'u-4', email: 'requester@example.com' }, baseURL!)

    await page.goto('/')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('F-002 AC-1: a signed-in user visiting /signin is sent to the dashboard', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, { id: 'u-5', email: 'requester@example.com' }, baseURL!)

    await page.goto('/signin')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('sign out', () => {
  test('F-002 AC-4: clearing the session blocks protected routes again', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, { id: 'u-6', email: 'requester@example.com' }, baseURL!)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

    await context.clearCookies()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/signin/)
  })

  test('F-002 AC-4: the dashboard offers a sign-out control', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(context, { id: 'u-7', email: 'requester@example.com' }, baseURL!)
    await page.goto('/dashboard')

    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
  })

  test('F-002 AC-4: a tampered session cookie is rejected', async ({ context, page, baseURL }) => {
    // Proves the cookie is actually verified rather than merely present.
    const { hostname } = new URL(baseURL!)
    await context.addCookies([
      {
        name: 'authjs.session-token',
        value: 'not-a-valid-token',
        domain: hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ])

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/signin/)
  })
})
