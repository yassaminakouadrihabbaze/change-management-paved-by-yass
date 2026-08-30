import { PrismaAdapter } from '@auth/prisma-adapter'
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { db } from './lib/db'

/**
 * Full Auth.js configuration.
 *
 * ⚠️ Imports Prisma, so this module runs on the **Node runtime only**. Never
 * import it from `src/middleware.ts` — use `auth.config.ts` there instead.
 *
 * The adapter creates a `User` row (and a linked `Account`) on first successful
 * sign-in. There is no sign-up flow: the organisation's directory is the source
 * of who exists, and `role` defaults to REQUESTER at the database level.
 *
 * Adapter + JWT sessions is a deliberate combination: the adapter provisions and
 * persists users, while sessions stay stateless so Edge middleware can read the
 * role without a database round-trip.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
})
