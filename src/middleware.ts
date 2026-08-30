import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from './auth.config'
import { type Principal, resolveRouteAccess } from './lib/authz'

/**
 * Route gate.
 *
 * ⚠️ Runs on the **Edge runtime**. It imports `auth.config.ts` and `lib/authz.ts`,
 * NOT `auth.ts` — the latter pulls in Prisma, which cannot run here.
 * `src/edge-safety.test.ts` asserts this stays true for both.
 *
 * ⚠️ **This is not the security boundary.** It decides whether to render a page
 * or redirect. Every data-access function performs its own check, and a request
 * that somehow bypasses this must still be refused there. See security.md.
 *
 * No authorization logic lives in this file — it translates the decision made by
 * `resolveRouteAccess()` into a redirect. Rules belong in one place so
 * middleware, the data layer and the UI cannot drift apart.
 */
const { auth: withAuth } = NextAuth(authConfig)

export default withAuth((request) => {
  const { pathname } = request.nextUrl

  const principal: Principal | null = request.auth?.user
    ? {
        id: request.auth.user.id,
        role: request.auth.user.role,
        isActive: request.auth.user.isActive,
      }
    : null

  const decision = resolveRouteAccess(pathname, principal)

  switch (decision.outcome) {
    case 'allow':
      return NextResponse.next()

    case 'redirect-signin': {
      const url = new URL('/signin', request.nextUrl)
      if (decision.reason === 'inactive') {
        // Distinguished from a plain sign-out so the page can explain that the
        // account exists but has been deactivated — otherwise a deactivated
        // user sees a sign-in form, signs in again, and bounces straight back.
        url.searchParams.set('error', 'AccountInactive')
      } else {
        url.searchParams.set('callbackUrl', pathname)
      }
      return NextResponse.redirect(url)
    }

    case 'redirect-dashboard':
      return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
  }
})

export const config = {
  // Skip Next internals and static assets — matching them wastes work on every
  // image request and can break asset delivery.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
