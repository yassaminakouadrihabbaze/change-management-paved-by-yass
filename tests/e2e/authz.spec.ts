import { expect, test } from '@playwright/test'
import { signInAs } from './helpers/session'

const ROLES = ['REQUESTER', 'APPROVER', 'MANAGER', 'ADMIN'] as const
const NON_ADMIN = ['REQUESTER', 'APPROVER', 'MANAGER'] as const

test.describe('role-aware route gating', () => {
  for (const role of NON_ADMIN) {
    test(`F-003 AC-3: ${role} is redirected away from /admin/users`, async ({
      context,
      page,
      baseURL,
    }) => {
      await signInAs(context, { id: `u-${role}`, email: `${role}@example.com`, role }, baseURL!)

      await page.goto('/admin/users')

      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0)
    })
  }

  test('F-003 AC-3: ADMIN reaches /admin/users', async ({ context, page, baseURL }) => {
    await signInAs(context, { id: 'u-admin', email: 'admin@example.com', role: 'ADMIN' }, baseURL!)

    await page.goto('/admin/users')

    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  for (const role of ROLES) {
    test(`F-003 AC-4: an active ${role} reaches /dashboard`, async ({ context, page, baseURL }) => {
      await signInAs(context, { id: `d-${role}`, email: `${role}@example.com`, role }, baseURL!)

      await page.goto('/dashboard')

      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByTestId('session-role')).toHaveText(role)
    })
  }
})

test.describe('deactivated accounts', () => {
  for (const role of ROLES) {
    test(`F-003 AC-2: a deactivated ${role} cannot reach /dashboard`, async ({
      context,
      page,
      baseURL,
    }) => {
      await signInAs(
        context,
        { id: `x-${role}`, email: `${role}@example.com`, role, isActive: false },
        baseURL!
      )

      await page.goto('/dashboard')

      await expect(page).toHaveURL(/\/signin/)
    })
  }

  test('F-003 AC-2: a deactivated ADMIN cannot reach /admin/users either', async ({
    context,
    page,
    baseURL,
  }) => {
    // Deactivation outranks role — the most important case in this file.
    await signInAs(
      context,
      { id: 'x-admin', email: 'admin@example.com', role: 'ADMIN', isActive: false },
      baseURL!
    )

    await page.goto('/admin/users')

    await expect(page).toHaveURL(/\/signin/)
    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0)
  })

  test('F-003 AC-2: the sign-in page explains that the account is deactivated', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(
      context,
      { id: 'x-req', email: 'requester@example.com', isActive: false },
      baseURL!
    )

    await page.goto('/dashboard')

    await expect(page).toHaveURL(/error=AccountInactive/)
    await expect(page.getByTestId('inactive-notice')).toBeVisible()
    await expect(page.getByText(/your account is not active/i)).toBeVisible()
  })

  test('F-003 AC-2: a deactivated user is not bounced off /signin', async ({
    context,
    page,
    baseURL,
  }) => {
    // Otherwise they would ping-pong between /signin and /dashboard forever and
    // never see why they were refused.
    await signInAs(
      context,
      { id: 'x-loop', email: 'requester@example.com', isActive: false },
      baseURL!
    )

    await page.goto('/signin')

    await expect(page).toHaveURL(/\/signin/)
  })

  test('F-003 AC-2: a deactivated user is redirected from / to /signin', async ({
    context,
    page,
    baseURL,
  }) => {
    await signInAs(
      context,
      { id: 'x-root', email: 'requester@example.com', isActive: false },
      baseURL!
    )

    await page.goto('/')

    await expect(page).toHaveURL(/\/signin/)
  })
})
