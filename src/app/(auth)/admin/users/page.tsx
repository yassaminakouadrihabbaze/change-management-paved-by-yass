import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canManageUsers } from '@/lib/authz'

export const metadata: Metadata = {
  title: 'User administration · Change Management System',
}

/**
 * ADMIN-only placeholder (F-003).
 *
 * F-011 replaces the contents with real user and role management; the route and
 * its gate stay. It exists now because AC-3 requires proving /admin/* is
 * ADMIN-only, which needs a route to protect.
 *
 * The check here is NOT redundant with middleware. Middleware is a coarse gate
 * that a request could bypass; the page re-establishes authorization itself
 * using the same authz rules. See docs/architecture/security.md.
 */
export default async function AdminUsersPage() {
  const session = await auth()

  if (!canManageUsers(session?.user ?? null)) {
    redirect('/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Administration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Only administrators can see this page.</p>
      </div>

      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Not built yet
        </h2>
        <p className="text-sm text-muted-foreground">
          F-011 adds user listing and role assignment here. Note that a role change will not take
          effect until the affected user&rsquo;s session token refreshes (up to 24 hours) or they
          sign in again. Deactivation, by contrast, takes effect immediately.
        </p>
      </div>
    </main>
  )
}
