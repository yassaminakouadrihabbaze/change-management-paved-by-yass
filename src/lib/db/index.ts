import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * Required by .claude/rules/data-access.md rule 2. In development Next.js clears
 * the module registry on hot reload, so a plain `new PrismaClient()` would create
 * a fresh client — and a fresh connection pool — on every edit until the database
 * refuses new connections. Caching on `globalThis` survives hot reload.
 *
 * This module is the ONLY place that instantiates PrismaClient. Everything else
 * imports `db` from here, and only `src/lib/data/` may do so.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
