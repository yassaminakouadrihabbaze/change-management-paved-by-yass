import type { NextAuthConfig } from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

/**
 * Edge-safe Auth.js configuration.
 *
 * ⚠️ This file is imported by `src/middleware.ts`, which runs on the **Edge
 * runtime**. It must never import Prisma, the database client, or anything that
 * transitively pulls them in — the Edge runtime cannot run Prisma, and the
 * failure surfaces as an opaque build or runtime error.
 *
 * The adapter lives in `src/auth.ts`, which spreads this config and is used only
 * by the route handler and by server components. See ADR-001 and
 * docs/architecture/security.md.
 */

/** 24 hours, per docs/architecture/security.md. */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

// Route classification deliberately lives in src/lib/authz.ts, not here.
// Keeping a second copy in this file is precisely the drift that module exists
// to prevent — see routeRequirement() and resolveRouteAccess().

export const authConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // Pinned to a single tenant. If this is omitted the provider defaults to
      // `.../common/v2.0/`, which allows ANY Microsoft account — see
      // src/lib/env.ts, which refuses to accept such a value.
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],

  session: {
    // JWT, not database sessions: middleware needs the role on the Edge runtime,
    // where it cannot query Postgres. The cost is that a role change does not
    // take effect until the token refreshes — mitigated by the 24h maxAge, and
    // documented in security.md. `isActive` is re-read per request by the data
    // layer, so deactivation stays immediate.
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  pages: {
    signIn: '/signin',
  },

  callbacks: {
    /**
     * Copies identity onto the token at sign-in. `user` is only present on the
     * first call; subsequent calls receive the existing token.
     */
    jwt({ token, user }) {
      if (user) {
        const record = user as { role?: string; isActive?: boolean }
        token.id = user.id
        // `role` comes from the adapter-created User row. Falls back to the
        // least-privileged role rather than leaving it undefined — an absent
        // role must never read as "unrestricted".
        token.role = record.role ?? 'REQUESTER'
        // `isActive` FAILS CLOSED: an explicitly true value is required. If the
        // adapter does not supply it, the user is treated as inactive and
        // refused — a loud, immediate failure rather than a silent grant that
        // would persist for the token's full 24h lifetime. See F-003-plan.md.
        token.isActive = record.isActive === true
      }
      return token
    },

    /** Projects the token onto the session object server components read. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? ''
        session.user.role = (token.role as string) ?? 'REQUESTER'
        session.user.isActive = token.isActive === true
      }
      return session
    },
  },

  trustHost: true,
} satisfies NextAuthConfig
