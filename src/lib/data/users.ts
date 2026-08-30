import 'server-only'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { type Principal, isUsablePrincipal } from '@/lib/authz'

/**
 * User data access.
 *
 * Per `.claude/rules/data-access.md`, this is the only place besides
 * `src/lib/db` that touches the Prisma client for user records. Pages, server
 * actions and components call these functions; they never query directly.
 *
 * `server-only` is imported so that accidentally pulling this into a client
 * component fails at build time rather than leaking the database client into a
 * browser bundle.
 *
 * ⚠️ **This module is written but NOT integration-tested — see FN-7.**
 * `docs/architecture/overview.md` states a data-access function without a
 * denied-caller test is not done. That bar needs a seeded database, which does
 * not exist yet. Treat the access checks below as implemented-but-unproven.
 */

/** The user record shape the application cares about. */
export interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: string
  isActive: boolean
}

/**
 * Loads the signed-in user **from the database**, not from the token.
 *
 * This is the point of the function. The JWT carries `role` and `isActive` as a
 * snapshot taken at sign-in, and it is not refreshed for up to 24 hours. Reading
 * the row here is what makes deactivation take effect immediately, which
 * `security.md` names as the correct lever for urgent access removal.
 *
 * Returns `null` when there is no session, the row has been deleted, or the
 * account is deactivated — callers cannot distinguish these, and should not.
 *
 * ⛔ Unverified: needs a database (FN-7).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (!user) return null

  // Authoritative check. The token said what it said at sign-in; the row is the
  // truth now.
  if (!user.isActive) return null

  return user
}

/**
 * Loads the signed-in user, or throws.
 *
 * For call sites where absence is a programming error rather than an expected
 * state — a server action reached through a protected route, for example.
 * Throwing beats returning null there, because an ignored null becomes an
 * unauthenticated write.
 *
 * ⛔ Unverified: needs a database (FN-7).
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('FORBIDDEN: no active signed-in user')
  }
  return user
}

/**
 * Reduces a user record to the shape the authorization rules consume.
 *
 * Pure, so it is unit-testable without a database — the database-dependent part
 * is only the read above.
 */
export function toPrincipal(user: CurrentUser | null): Principal | null {
  if (!user) return null
  return { id: user.id, role: user.role, isActive: user.isActive }
}

/**
 * True when the loaded user is genuinely permitted to act.
 *
 * Re-applies the same `authz` rules used by middleware rather than
 * reimplementing them, so the two layers cannot disagree.
 */
export function isActiveUser(user: CurrentUser | null): boolean {
  return isUsablePrincipal(toPrincipal(user))
}
