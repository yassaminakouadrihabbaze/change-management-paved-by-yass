import { signIn } from '@/auth'

/**
 * Server-action sign-in. Rendered as a form rather than an onClick handler so it
 * works without client-side JavaScript, and so no client bundle needs the auth
 * module.
 */
export function SignInButton({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await signIn('microsoft-entra-id', { redirectTo: callbackUrl })
      }}
    >
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-3 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Sign in with Microsoft
      </button>
    </form>
  )
}
