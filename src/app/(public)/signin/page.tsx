import type { Metadata } from 'next'
import { SignInButton } from '@/components/auth/sign-in-button'
import { authConfigProblems } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Sign in · Change Management System',
}

/**
 * Sign-in page.
 *
 * There is deliberately **no** password field, no registration link, and no
 * account-recovery flow. Identity comes from the organisation's Entra ID
 * directory; this application never handles credentials. See
 * docs/architecture/security.md.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const params = await searchParams
  const problems = authConfigProblems()
  const configured = problems.length === 0

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Change Management System</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your work account to raise and track change requests.
        </p>
      </div>

      {params.error === 'AccountInactive' ? (
        /*
         * Distinguished from a generic failure deliberately. A deactivated user
         * who saw only a sign-in form would sign in again, be refused again, and
         * bounce — with no idea why. Naming the cause is what stops that loop.
         * It reveals only that their own account is deactivated, which they are
         * entitled to know.
         */
        <div
          role="alert"
          data-testid="inactive-notice"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
        >
          <p className="font-medium">Your account is not active</p>
          <p className="mt-1 text-muted-foreground">
            This account has been deactivated, so it cannot access the system. Contact your
            administrator if you believe this is wrong.
          </p>
        </div>
      ) : params.error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
        >
          <p className="font-medium">Sign-in failed</p>
          <p className="mt-1 text-muted-foreground">
            Your account could not be signed in. If you believe you should have access, contact your
            administrator.
          </p>
        </div>
      ) : null}

      {configured ? (
        <SignInButton callbackUrl={params.callbackUrl ?? '/dashboard'} />
      ) : (
        /*
         * Rendered instead of the button when Entra is not configured. Without
         * this the button would redirect into an opaque provider error, and the
         * cause would only be visible in container logs. The problems listed are
         * variable names and validation messages — never values.
         */
        <div role="alert" className="space-y-3 rounded-md border border-border bg-card p-4 text-sm">
          <p className="font-medium">Sign-in is not configured yet</p>
          <p className="text-muted-foreground">
            Microsoft Entra ID credentials have not been supplied, so sign-in is unavailable. This
            is expected until the tenant is registered.
          </p>
          <ul className="list-inside list-disc space-y-1 font-mono text-xs text-muted-foreground">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Accounts are managed in your organisation&rsquo;s directory. There is no sign-up.
      </p>
    </main>
  )
}
