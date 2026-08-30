import { handlers } from '@/auth'

// Auth.js route handler — sign in, sign out, callback and session endpoints all
// live under /api/auth/*. Runs on the Node runtime because src/auth.ts pulls in
// the Prisma adapter.
export const { GET, POST } = handlers
