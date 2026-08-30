import { redirect } from 'next/navigation'
import { auth } from '@/auth'

/**
 * Root route. Session-aware redirect, per docs/architecture/overview.md:
 * signed in → /dashboard, otherwise → /signin.
 *
 * Replaces the F-001 placeholder landing page.
 */
export default async function HomePage() {
  const session = await auth()
  redirect(session?.user ? '/dashboard' : '/signin')
}
