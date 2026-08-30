import type { BrowserContext } from '@playwright/test'

/**
 * Mints a real Auth.js session cookie for tests.
 *
 * This is how authenticated E2E coverage works without a live Entra tenant. It
 * was chosen over a dev-only Credentials provider deliberately: a credentials
 * path is a password backdoor living in application code, and in a system whose
 * whole purpose is controlled approval, one misconfigured environment variable
 * would ship it to production.
 *
 * This helper lives in tests/ and is never imported by src/, so there is no
 * production code path to misconfigure. It produces a genuine encrypted Auth.js
 * token — the app validates it exactly as it would a real one, so the session
 * plumbing under test is the real plumbing.
 *
 * What it does NOT prove: that Entra accepts our configuration, that claims map
 * correctly, or that non-tenant accounts are refused. Those are AC-11…AC-14 and
 * remain open until a real tenant exists.
 */

/** Auth.js derives its encryption key from a salt equal to the cookie name. */
const COOKIE_NAME = 'authjs.session-token'
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

export interface TestUser {
  id: string
  email: string
  name?: string
  role?: 'REQUESTER' | 'APPROVER' | 'MANAGER' | 'ADMIN'
}

export async function createSessionCookieValue(user: TestUser): Promise<string> {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET must be set for authenticated E2E tests (see .env.local)')
  }

  // Loaded dynamically: @auth/core is ESM-only, and Playwright transpiles specs
  // to CommonJS, so a top-level import fails with ERR_REQUIRE_ESM.
  const { encode } = await import('@auth/core/jwt')

  return encode({
    salt: COOKIE_NAME,
    secret,
    maxAge: SESSION_MAX_AGE_SECONDS,
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? 'Test User',
      role: user.role ?? 'REQUESTER',
    },
  })
}

/** Signs the browser context in as `user` by installing the session cookie. */
export async function signInAs(
  context: BrowserContext,
  user: TestUser,
  baseURL: string
): Promise<void> {
  const value = await createSessionCookieValue(user)
  const { hostname } = new URL(baseURL)

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value,
      domain: hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    },
  ])
}
