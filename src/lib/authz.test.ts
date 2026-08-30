import { describe, expect, it } from 'vitest'
import {
  ROLES,
  type Principal,
  type Role,
  canDecide,
  canManageUsers,
  canRaiseRequests,
  canReadAllRequests,
  isRole,
  isUsablePrincipal,
  resolveRouteAccess,
  roleOf,
  routeRequirement,
} from './authz'

/** An active principal holding `role`. */
const active = (role: Role): Principal => ({ id: 'u-1', role, isActive: true })
const inactive = (role: Role): Principal => ({ id: 'u-1', role, isActive: false })

describe('role recognition', () => {
  it.each(ROLES)('F-003 AC-6: recognises %s', (role) => {
    expect(isRole(role)).toBe(true)
  })

  it.each([
    'admin',
    'Admin',
    'SUPERUSER',
    'ROOT',
    '',
    'REQUESTER ',
    null,
    undefined,
    42,
    {},
    ['ADMIN'],
  ])('F-003 AC-7: rejects %o as a role', (value) => {
    expect(isRole(value)).toBe(false)
  })

  it('F-003 AC-6: knows exactly four roles — no more', () => {
    // Pinned so adding a role forces a deliberate review of every rule below.
    expect([...ROLES]).toEqual(['REQUESTER', 'APPROVER', 'MANAGER', 'ADMIN'])
  })
})

describe('principal usability — fails closed', () => {
  it.each(ROLES)('F-003 AC-6: an active %s is usable', (role) => {
    expect(isUsablePrincipal(active(role))).toBe(true)
  })

  it.each(ROLES)('F-003 AC-2: a deactivated %s is NOT usable', (role) => {
    // Deactivation outranks role: a deactivated ADMIN can do nothing.
    expect(isUsablePrincipal(inactive(role))).toBe(false)
  })

  it.each([
    ['null principal', null],
    ['undefined principal', undefined],
    ['no id', { role: 'ADMIN', isActive: true }],
    ['empty id', { id: '', role: 'ADMIN', isActive: true }],
    ['no role', { id: 'u-1', isActive: true }],
    ['null role', { id: 'u-1', role: null, isActive: true }],
    ['unknown role', { id: 'u-1', role: 'SUPERUSER', isActive: true }],
    ['isActive absent', { id: 'u-1', role: 'ADMIN' }],
    ['isActive null', { id: 'u-1', role: 'ADMIN', isActive: null }],
    ['isActive false', { id: 'u-1', role: 'ADMIN', isActive: false }],
  ])('F-003 AC-7: %s is not usable', (_label, principal) => {
    expect(isUsablePrincipal(principal as Principal)).toBe(false)
  })

  it('F-003 AC-7: requires isActive to be exactly true, not merely truthy', () => {
    // A JWT is external input. A stringified "true" or a 1 must not pass.
    expect(isUsablePrincipal({ id: 'u-1', role: 'ADMIN', isActive: 'true' as never })).toBe(false)
    expect(isUsablePrincipal({ id: 'u-1', role: 'ADMIN', isActive: 1 as never })).toBe(false)
  })
})

describe('roleOf', () => {
  it.each(ROLES)('F-003 AC-6: returns %s', (role) => {
    expect(roleOf(active(role))).toBe(role)
  })

  it('F-003 AC-7: returns null for unknown or missing roles', () => {
    expect(roleOf({ id: 'u-1', role: 'SUPERUSER', isActive: true })).toBeNull()
    expect(roleOf({ id: 'u-1', isActive: true })).toBeNull()
    expect(roleOf(null)).toBeNull()
  })
})

/**
 * The full capability matrix from docs/architecture/overview.md, asserted
 * exhaustively rather than by example. If a rule changes, this table is where
 * the change must be made consciously.
 */
describe('capability matrix', () => {
  const matrix: Array<{
    role: Role
    raise: boolean
    decide: boolean
    readAll: boolean
    manageUsers: boolean
  }> = [
    { role: 'REQUESTER', raise: true, decide: false, readAll: false, manageUsers: false },
    { role: 'APPROVER', raise: true, decide: true, readAll: false, manageUsers: false },
    { role: 'MANAGER', raise: true, decide: false, readAll: true, manageUsers: false },
    { role: 'ADMIN', raise: true, decide: false, readAll: true, manageUsers: true },
  ]

  it.each(matrix)(
    'F-003 AC-6: $role — raise:$raise decide:$decide readAll:$readAll manageUsers:$manageUsers',
    ({ role, raise, decide, readAll, manageUsers }) => {
      const principal = active(role)
      expect(canRaiseRequests(principal)).toBe(raise)
      expect(canDecide(principal)).toBe(decide)
      expect(canReadAllRequests(principal)).toBe(readAll)
      expect(canManageUsers(principal)).toBe(manageUsers)
    }
  )

  it('F-003 AC-6: every role can raise requests — it is not role-gated', () => {
    // A Manager or Approver must be able to raise a change without a second
    // role. This is the rule most likely to be "tidied" into a role check.
    for (const role of ROLES) {
      expect(canRaiseRequests(active(role))).toBe(true)
    }
  })

  it('F-003 AC-6: only ADMIN manages users', () => {
    const admins = ROLES.filter((role) => canManageUsers(active(role)))
    expect(admins).toEqual(['ADMIN'])
  })

  it('F-003 AC-6: only APPROVER can decide', () => {
    const deciders = ROLES.filter((role) => canDecide(active(role)))
    expect(deciders).toEqual(['APPROVER'])
  })

  it('F-003 AC-6: MANAGER and ADMIN read org-wide', () => {
    const readers = ROLES.filter((role) => canReadAllRequests(active(role)))
    expect(readers).toEqual(['MANAGER', 'ADMIN'])
  })

  it.each(ROLES)('F-003 AC-2: a deactivated %s has NO capabilities at all', (role) => {
    const principal = inactive(role)
    expect(canRaiseRequests(principal)).toBe(false)
    expect(canDecide(principal)).toBe(false)
    expect(canReadAllRequests(principal)).toBe(false)
    expect(canManageUsers(principal)).toBe(false)
  })

  it.each([null, undefined])('F-003 AC-7: %o has no capabilities', (principal) => {
    expect(canRaiseRequests(principal)).toBe(false)
    expect(canDecide(principal)).toBe(false)
    expect(canReadAllRequests(principal)).toBe(false)
    expect(canManageUsers(principal)).toBe(false)
  })
})

describe('route classification', () => {
  it.each(['/', '/signin', '/api/auth/session', '/api/auth/callback/microsoft-entra-id'])(
    'F-003 AC-4: %s is public',
    (path) => {
      expect(routeRequirement(path)).toBe('public')
    }
  )

  it.each(['/admin', '/admin/users', '/admin/users/123', '/admin/settings'])(
    'F-003 AC-3: %s requires admin',
    (path) => {
      expect(routeRequirement(path)).toBe('admin')
    }
  )

  it.each(['/dashboard', '/requests', '/requests/new', '/requests/abc-123'])(
    'F-003 AC-4: %s requires an active session',
    (path) => {
      expect(routeRequirement(path)).toBe('active-session')
    }
  )

  it('F-003 AC-3: prefix matching respects path boundaries', () => {
    // '/administration' must not be gated as admin by a naive startsWith,
    // and '/signin-as-admin' must not inherit '/signin' being public.
    expect(routeRequirement('/administration')).toBe('active-session')
    expect(routeRequirement('/admin-tools')).toBe('active-session')
    expect(routeRequirement('/signin-as-admin')).toBe('active-session')
  })

  it('F-003 AC-7: unknown routes default to requiring a session, not public', () => {
    expect(routeRequirement('/something/not/yet/built')).toBe('active-session')
  })
})

describe('route access resolution', () => {
  it.each(['/dashboard', '/requests/new', '/admin/users'])(
    'F-003 AC-2: an unauthenticated visitor to %s is sent to sign in',
    (path) => {
      expect(resolveRouteAccess(path, null)).toEqual({
        outcome: 'redirect-signin',
        reason: 'unauthenticated',
      })
    }
  )

  it('F-003 AC-3: an anonymous visitor to /admin is told to sign in, not that they lack the role', () => {
    // Reporting 'wrong-role' would confirm the route exists to an anonymous
    // caller. Authentication is resolved before role.
    const decision = resolveRouteAccess('/admin/users', null)
    expect(decision.outcome).toBe('redirect-signin')
  })

  it.each(ROLES)('F-003 AC-2: a deactivated %s is refused /dashboard', (role) => {
    expect(resolveRouteAccess('/dashboard', inactive(role))).toEqual({
      outcome: 'redirect-signin',
      reason: 'inactive',
    })
  })

  it('F-003 AC-2: a deactivated ADMIN is refused /admin/*', () => {
    const decision = resolveRouteAccess('/admin/users', inactive('ADMIN'))
    expect(decision).toEqual({ outcome: 'redirect-signin', reason: 'inactive' })
  })

  it.each(ROLES)('F-003 AC-4: an active %s may reach /dashboard', (role) => {
    expect(resolveRouteAccess('/dashboard', active(role))).toEqual({ outcome: 'allow' })
  })

  it.each(ROLES)('F-003 AC-4: an active %s may reach /requests/new', (role) => {
    expect(resolveRouteAccess('/requests/new', active(role))).toEqual({ outcome: 'allow' })
  })

  it('F-003 AC-3: only ADMIN may reach /admin/users', () => {
    const allowed = ROLES.filter(
      (role) => resolveRouteAccess('/admin/users', active(role)).outcome === 'allow'
    )
    expect(allowed).toEqual(['ADMIN'])
  })

  it.each(['REQUESTER', 'APPROVER', 'MANAGER'] as const)(
    'F-003 AC-3: %s is redirected away from /admin/users',
    (role) => {
      expect(resolveRouteAccess('/admin/users', active(role))).toEqual({
        outcome: 'redirect-dashboard',
        reason: 'wrong-role',
      })
    }
  )

  it('F-003 AC-4: public routes stay reachable when signed out', () => {
    expect(resolveRouteAccess('/signin', null)).toEqual({ outcome: 'allow' })
    expect(resolveRouteAccess('/api/auth/session', null)).toEqual({ outcome: 'allow' })
  })

  it('F-003 AC-4: a signed-in user is bounced off /signin', () => {
    expect(resolveRouteAccess('/signin', active('REQUESTER'))).toEqual({
      outcome: 'redirect-dashboard',
      reason: 'already-signed-in',
    })
  })

  it('F-003 AC-2: a deactivated user is NOT bounced off /signin', () => {
    // They must be able to see the page explaining why they were refused,
    // otherwise they would ping-pong between routes.
    expect(resolveRouteAccess('/signin', inactive('ADMIN'))).toEqual({ outcome: 'allow' })
  })

  it('F-003 AC-7: an authenticated principal with an unknown role is refused everywhere', () => {
    const impostor: Principal = { id: 'u-9', role: 'SUPERUSER', isActive: true }
    expect(resolveRouteAccess('/dashboard', impostor).outcome).toBe('redirect-signin')
    expect(resolveRouteAccess('/admin/users', impostor).outcome).toBe('redirect-signin')
  })

  it('F-003 AC-7: no route is reachable by a principal missing isActive', () => {
    const stale: Principal = { id: 'u-9', role: 'ADMIN' }
    expect(resolveRouteAccess('/dashboard', stale).outcome).toBe('redirect-signin')
    expect(resolveRouteAccess('/admin/users', stale).outcome).toBe('redirect-signin')
  })
})
