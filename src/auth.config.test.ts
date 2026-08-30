import { beforeAll, describe, expect, it } from 'vitest'
import { SESSION_MAX_AGE_SECONDS, authConfig } from './auth.config'

beforeAll(() => {
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID ??= 'test-client-id'
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ??= 'test-client-secret'
  process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ??=
    'https://login.microsoftonline.com/test-tenant/v2.0/'
})

describe('auth configuration', () => {
  it('F-002 AC-6: uses JWT sessions, not database sessions', () => {
    // Not a style preference: middleware runs on the Edge runtime and cannot
    // reach Prisma, so the role must travel in the token.
    expect(authConfig.session.strategy).toBe('jwt')
  })

  it('F-002 AC-6: expires sessions after 24 hours', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(86_400)
    expect(authConfig.session.maxAge).toBe(86_400)
  })

  it('F-002 AC-2: configures exactly one provider, and it is Entra ID', () => {
    // A second provider appearing here — especially a credentials provider —
    // would mean a password path had been introduced. Pinned deliberately.
    expect(authConfig.providers).toHaveLength(1)
    expect(authConfig.providers[0]?.id).toBe('microsoft-entra-id')
  })

  it('F-002 AC-2: routes sign-in through our own page', () => {
    expect(authConfig.pages.signIn).toBe('/signin')
  })
})

describe('jwt callback', () => {
  it('F-002 AC-5: copies id and role onto the token at sign-in', async () => {
    const token = await authConfig.callbacks.jwt({
      token: {},
      user: { id: 'user-1', role: 'APPROVER' },
    } as never)

    expect(token).toMatchObject({ id: 'user-1', role: 'APPROVER' })
  })

  it('F-002 AC-5: defaults a missing role to REQUESTER, the least privileged', async () => {
    // An absent role must never read as "unrestricted".
    const token = await authConfig.callbacks.jwt({
      token: {},
      user: { id: 'user-2' },
    } as never)

    expect(token).toMatchObject({ role: 'REQUESTER' })
  })

  it('F-002 AC-5: leaves an existing token untouched on later calls', async () => {
    const existing = { id: 'user-3', role: 'MANAGER' }
    const token = await authConfig.callbacks.jwt({ token: existing } as never)

    expect(token).toMatchObject(existing)
  })
})

describe('session callback', () => {
  it('F-002 AC-5: exposes id and role on the session', async () => {
    const session = await authConfig.callbacks.session({
      session: { user: { email: 'someone@example.com' } },
      token: { id: 'user-4', role: 'ADMIN' },
    } as never)

    expect(session.user).toMatchObject({
      id: 'user-4',
      role: 'ADMIN',
      email: 'someone@example.com',
    })
  })

  it('F-002 AC-5: falls back to REQUESTER when the token carries no role', async () => {
    const session = await authConfig.callbacks.session({
      session: { user: { email: 'someone@example.com' } },
      token: {},
    } as never)

    expect(session.user.role).toBe('REQUESTER')
  })
})

// Route classification moved to src/lib/authz.ts in F-003 and is covered
// exhaustively in src/lib/authz.test.ts. Keeping a copy here would recreate the
// duplicate source of truth that module exists to eliminate.

describe('isActive propagation (F-003)', () => {
  it('F-003 AC-1: copies isActive onto the token when the user is active', async () => {
    const token = await authConfig.callbacks.jwt({
      token: {},
      user: { id: 'u-1', role: 'ADMIN', isActive: true },
    } as never)

    expect(token).toMatchObject({ isActive: true })
  })

  it('F-003 AC-7: an absent isActive resolves to false, not true', async () => {
    // Fails closed. If the adapter does not supply isActive, the user is
    // refused rather than silently granted access for the token's 24h life.
    const token = await authConfig.callbacks.jwt({
      token: {},
      user: { id: 'u-2', role: 'ADMIN' },
    } as never)

    expect(token.isActive).toBe(false)
  })

  it.each([false, null, undefined, 'true', 1, {}])(
    'F-003 AC-7: isActive of %o resolves to false',
    async (value) => {
      const token = await authConfig.callbacks.jwt({
        token: {},
        user: { id: 'u-3', role: 'ADMIN', isActive: value },
      } as never)

      expect(token.isActive).toBe(false)
    }
  )

  it('F-003 AC-1: exposes isActive on the session', async () => {
    const session = await authConfig.callbacks.session({
      session: { user: { email: 'someone@example.com' } },
      token: { id: 'u-4', role: 'MANAGER', isActive: true },
    } as never)

    expect(session.user.isActive).toBe(true)
  })

  it('F-003 AC-7: a token without isActive yields an inactive session', async () => {
    const session = await authConfig.callbacks.session({
      session: { user: { email: 'someone@example.com' } },
      token: { id: 'u-5', role: 'ADMIN' },
    } as never)

    expect(session.user.isActive).toBe(false)
  })
})
