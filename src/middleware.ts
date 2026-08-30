import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig, isPublicRoute } from './auth.config'

/**
 * Route gate.
 *
 * ⚠️ Runs on the **Edge runtime**. It imports `auth.config.ts`, NOT `auth.ts` —
 * the latter pulls in Prisma, which cannot run here. `tests/edge-safety.test.ts`
 * asserts this stays true.
 *
 * ⚠️ **This is not the security boundary.** It is a coarse gate and a UX
 * affordance: it decides whether to show a page or bounce to sign-in. Every
 * data-access function performs its own ownership and role check, and a request
 * that somehow bypasses this must still be refused there. Never implement an
 * access rule here alone. See docs/architecture/security.md.
 *
 * Role-based route gating (which role may reach which route) is F-003. This
 * establishes only "is anyone signed in?".
 */
const { auth: withAuth } = NextAuth(authConfig)

export default withAuth((request) => {
  const { pathname } = request.nextUrl
  const isSignedIn = Boolean(request.auth)

  if (isPublicRoute(pathname)) {
    // Bounce signed-in users away from the sign-in page rather than showing
    // them a form they have already satisfied.
    if (pathname === '/signin' && isSignedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
    }
    return NextResponse.next()
  }

  if (!isSignedIn) {
    const signInUrl = new URL('/signin', request.nextUrl)
    // Preserve where they were heading so sign-in can return them there.
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Skip Next internals and static assets — matching them wastes work on every
  // image request and can break asset delivery.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
