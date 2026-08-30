/**
 * Authorization rules — the single source of truth for who may do what.
 *
 * Every function here is **pure**: no I/O, no Prisma, no session lookup. That is
 * deliberate on three counts.
 *
 * 1. `src/middleware.ts` runs on the Edge runtime and imports this module, so it
 *    must not reach a database.
 * 2. The same rules are needed by middleware, by the data layer, and (later) by
 *    the UI deciding which actions to offer. Duplicating them guarantees drift,
 *    and with no RLS backstop a drifted rule is a data leak rather than a
 *    cosmetic inconsistency.
 * 3. Purity makes the rules exhaustively testable without infrastructure —
 *    which matters here, because the database is blocked (FN-7).
 *
 * **This module decides; it never enforces.** Callers act on its answers.
 * Middleware is a coarse gate and a UX affordance — the data layer is the actual
 * security boundary. See docs/architecture/security.md.
 */

export const ROLES = ['REQUESTER', 'APPROVER', 'MANAGER', 'ADMIN'] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * The caller's identity, as far as authorization is concerned.
 *
 * Fields are deliberately loose (`unknown`-ish) because this is fed from a JWT,
 * which is external input. Validation happens here rather than being assumed by
 * every call site.
 */
export interface Principal {
  id?: string | null
  role?: string | null
  isActive?: boolean | null
}

/**
 * A principal is usable only when it has an id, a *recognised* role, and is
 * explicitly active.
 *
 * **Fails closed.** An unknown role, a missing role, or an `isActive` that is
 * anything other than exactly `true` denies. An absent value must never read as
 * permission — see the trade-off recorded in F-003-plan.md.
 */
export function isUsablePrincipal(principal: Principal | null | undefined): boolean {
  if (!principal) return false
  if (!principal.id) return false
  if (!isRole(principal.role)) return false
  return principal.isActive === true
}

/** Normalises a principal's role, or null when it is missing or unrecognised. */
export function roleOf(principal: Principal | null | undefined): Role | null {
  if (!principal || !isRole(principal.role)) return null
  return principal.role
}

/* ------------------------------------------------------------------ *
 * Capabilities — mirrors the role matrix in docs/architecture/overview.md.
 * Each requires a usable principal first, so a deactivated ADMIN can do
 * nothing at all.
 * ------------------------------------------------------------------ */

/**
 * Raising and tracking your own requests is a baseline capability of being
 * signed in, NOT a role. That is why a Manager or Approver can also raise a
 * change without needing a second role — see overview.md.
 */
export function canRaiseRequests(principal: Principal | null | undefined): boolean {
  return isUsablePrincipal(principal)
}

/**
 * Deciding on a request requires APPROVER — but holding the role is not
 * sufficient on its own. The request must also be *assigned* to them, which is
 * a per-record check the data layer performs in F-006/F-007. This answers only
 * "could this person ever decide anything?".
 */
export function canDecide(principal: Principal | null | undefined): boolean {
  return isUsablePrincipal(principal) && roleOf(principal) === 'APPROVER'
}

/** Org-wide read access: MANAGER (oversight) and ADMIN. */
export function canReadAllRequests(principal: Principal | null | undefined): boolean {
  if (!isUsablePrincipal(principal)) return false
  const role = roleOf(principal)
  return role === 'MANAGER' || role === 'ADMIN'
}

/** Managing users and role assignment: ADMIN only. */
export function canManageUsers(principal: Principal | null | undefined): boolean {
  return isUsablePrincipal(principal) && roleOf(principal) === 'ADMIN'
}

/* ------------------------------------------------------------------ *
 * Route access
 * ------------------------------------------------------------------ */

/** What a route demands of its visitor. */
export type RouteRequirement = 'public' | 'active-session' | 'admin'

/** The outcome of evaluating a route for a principal. */
export type AccessDecision =
  | { outcome: 'allow' }
  | { outcome: 'redirect-signin'; reason: 'unauthenticated' | 'inactive' }
  | { outcome: 'redirect-dashboard'; reason: 'wrong-role' | 'already-signed-in' }

const ADMIN_PREFIX = '/admin'
const PUBLIC_EXACT = new Set(['/', '/signin'])

/**
 * Classifies a path. Matches the table in docs/architecture/api-contracts.md.
 *
 * Prefix matching is boundary-aware: `/admin-tools` must NOT be treated as an
 * admin route by accident, and `/signin-as-admin` must not inherit `/signin`
 * being public.
 */
export function routeRequirement(pathname: string): RouteRequirement {
  if (pathname.startsWith('/api/auth')) return 'public'
  if (PUBLIC_EXACT.has(pathname)) return 'public'

  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return 'admin'
  }

  return 'active-session'
}

/**
 * Resolves whether `principal` may visit `pathname`.
 *
 * Ordering matters: authentication before activity before role. A signed-out
 * visitor to `/admin` is told to sign in — not that they hold the wrong role,
 * which would confirm the route exists to an anonymous caller.
 *
 * A wrong-role visitor IS redirected to the dashboard rather than hidden,
 * because they are authenticated and already know the route exists. Records
 * they may not read still return NOT_FOUND — see security.md; existence is
 * sensitive there, but not here.
 */
export function resolveRouteAccess(
  pathname: string,
  principal: Principal | null | undefined
): AccessDecision {
  const requirement = routeRequirement(pathname)
  const authenticated = Boolean(principal?.id)
  const usable = isUsablePrincipal(principal)

  if (requirement === 'public') {
    // Someone already signed in has no business on the sign-in form.
    if (pathname === '/signin' && usable) {
      return { outcome: 'redirect-dashboard', reason: 'already-signed-in' }
    }
    return { outcome: 'allow' }
  }

  if (!authenticated) {
    return { outcome: 'redirect-signin', reason: 'unauthenticated' }
  }

  // Authenticated but deactivated (or carrying an unrecognised role) — refused
  // everywhere, including routes their role would otherwise permit.
  if (!usable) {
    return { outcome: 'redirect-signin', reason: 'inactive' }
  }

  if (requirement === 'admin' && !canManageUsers(principal)) {
    return { outcome: 'redirect-dashboard', reason: 'wrong-role' }
  }

  return { outcome: 'allow' }
}
