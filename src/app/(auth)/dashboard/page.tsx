import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { SignOutButton } from '@/components/auth/sign-out-button'

export const metadata: Metadata = {
  title: 'Dashboard · Change Management System',
}

/**
 * Placeholder dashboard (F-002).
 *
 * F-010 replaces the contents with the real role-aware, filterable request list.
 * The route and its protection stay. It exists now because route protection
 * needs something to protect, and because it is the visible proof that identity
 * flows all the way through to a server component.
 *
 * The `auth()` check here is not redundant with middleware: middleware is a
 * coarse gate that can be bypassed, so the page re-establishes identity itself.
 */
export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/signin')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">You are signed in.</p>
        </div>
        <SignOutButton />
      </div>

      <dl className="grid gap-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Name
          </dt>
          <dd className="text-sm" data-testid="session-name">
            {session.user.name ?? '—'}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Email
          </dt>
          <dd className="text-sm" data-testid="session-email">
            {session.user.email ?? '—'}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Role
          </dt>
          <dd className="text-sm font-medium" data-testid="session-role">
            {session.user.role}
          </dd>
        </div>
      </dl>

      <div className="rounded-lg border border-border p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Next up
        </h2>
        <p className="text-sm text-muted-foreground">
          F-003 adds role-based route gating and access-control policies. F-005 introduces change
          requests, and F-010 replaces this page with the real filterable dashboard.
        </p>
      </div>
    </main>
  )
}
