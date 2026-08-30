import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Verifies the hot-reload guard required by .claude/rules/data-access.md rule 2.
 *
 * Asserting "two imports return the same object" would prove nothing — ES module
 * caching guarantees that regardless of the guard. What actually matters is that
 * the client is cached on globalThis, because that is what survives Next.js
 * clearing the module registry on hot reload. So that is what is asserted.
 */
describe('Prisma client singleton', () => {
  beforeAll(() => {
    // PrismaClient validates its datasource URL at construction, so this must be
    // set before the module is imported. It is never connected to.
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?sslmode=require'
  })

  it('F-001 AC-6: caches the client on globalThis outside production', async () => {
    const { db } = await import('./index')
    const cached = (globalThis as unknown as { prisma?: unknown }).prisma

    expect(db).toBeDefined()
    expect(cached).toBe(db)
  })

  it('F-001 AC-6: exposes a usable Prisma client', async () => {
    const { db } = await import('./index')

    // $connect/$disconnect exist on every generated client; checking for them
    // confirms `prisma generate` ran and produced a real client, not a stub.
    expect(typeof db.$connect).toBe('function')
    expect(typeof db.$disconnect).toBe('function')
  })
})
