import type { DefaultSession } from 'next-auth'

/**
 * Module augmentation so `session.user.id` and `session.user.role` are typed.
 * Without this they are `any` at every call site, and the role checks that
 * F-003 builds on would silently accept typos.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }

  interface User {
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}

export {}
