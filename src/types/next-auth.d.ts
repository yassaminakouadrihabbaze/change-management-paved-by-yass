import type { DefaultSession } from 'next-auth'

/**
 * Module augmentation so `session.user.id`, `.role` and `.isActive` are typed.
 * Without this they are `any` at every call site, and the role checks in
 * src/lib/authz.ts would silently accept typos.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      isActive: boolean
    } & DefaultSession['user']
  }

  interface User {
    role?: string
    isActive?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    isActive?: boolean
  }
}

export {}
