import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the Edge-runtime constraint.
 *
 * `src/middleware.ts` runs on the Edge runtime, which cannot run Prisma. If
 * anything in its import graph reaches `@prisma/client` — or `src/auth.ts`,
 * which pulls in the adapter — the app breaks at build or request time with an
 * error that does not obviously point back to the real cause.
 *
 * A comment saying "don't import Prisma here" is not enforcement. This is.
 */

const SRC = resolve(__dirname)
const FORBIDDEN = ['@prisma/client', '@auth/prisma-adapter', '@/lib/db', './lib/db', '@/auth']

function resolveImport(specifier: string, fromFile: string): string | null {
  let base: string
  if (specifier.startsWith('@/')) {
    base = resolve(SRC, specifier.slice(2))
  } else if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier)
  } else {
    return null // bare package — not a local file to walk into
  }

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) {
      try {
        readFileSync(candidate, 'utf8')
        return candidate
      } catch {
        /* directory — keep looking */
      }
    }
  }
  return null
}

function collectImports(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specifiers: string[] = []
  const pattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    if (match[1]) specifiers.push(match[1])
  }
  return specifiers
}

/** Walks the local import graph, returning every specifier reachable from entry. */
function transitiveSpecifiers(entry: string): Set<string> {
  const seen = new Set<string>()
  const found = new Set<string>()
  const queue = [entry]

  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)

    for (const specifier of collectImports(file)) {
      found.add(specifier)
      const resolved = resolveImport(specifier, file)
      if (resolved && !seen.has(resolved)) queue.push(resolved)
    }
  }

  return found
}

describe('Edge runtime safety', () => {
  const middleware = resolve(SRC, 'middleware.ts')

  it('F-002 AC-8: middleware exists', () => {
    expect(existsSync(middleware)).toBe(true)
  })

  it.each(FORBIDDEN)(
    'F-002 AC-8: middleware never reaches %s, directly or transitively',
    (forbidden) => {
      const reachable = transitiveSpecifiers(middleware)
      expect([...reachable]).not.toContain(forbidden)
    }
  )

  it('F-002 AC-8: middleware imports the Edge-safe config, not the full one', () => {
    const specifiers = collectImports(middleware)
    expect(specifiers).toContain('./auth.config')
    expect(specifiers).not.toContain('./auth')
  })

  it('F-002 AC-8: auth.config.ts itself stays free of database imports', () => {
    const reachable = transitiveSpecifiers(resolve(SRC, 'auth.config.ts'))
    for (const forbidden of ['@prisma/client', '@/lib/db', './lib/db', '@auth/prisma-adapter']) {
      expect([...reachable]).not.toContain(forbidden)
    }
  })

  it('F-002 AC-8: the full auth module DOES use the adapter (guard is not vacuous)', () => {
    // If this fails, the tests above are passing because nothing imports
    // anything — not because the boundary is correct.
    const specifiers = collectImports(resolve(SRC, 'auth.ts'))
    expect(specifiers).toContain('@auth/prisma-adapter')
  })

  it('F-003 AC-9: the authorization module reaches no database code', () => {
    // authz.ts is imported by middleware, so it inherits the Edge constraint.
    // It must also stay pure for its own sake — the exhaustive rule tests run
    // without any infrastructure precisely because it has no I/O.
    const reachable = transitiveSpecifiers(resolve(SRC, 'lib/authz.ts'))
    for (const forbidden of [...FORBIDDEN, 'next-auth', '@/auth', 'server-only']) {
      expect([...reachable]).not.toContain(forbidden)
    }
  })

  it('F-003 AC-9: the authorization module imports nothing at all', () => {
    // Strongest form of the guarantee: a module with no imports cannot acquire
    // a database dependency transitively, however the codebase evolves.
    expect(collectImports(resolve(SRC, 'lib/authz.ts'))).toEqual([])
  })

  it('F-003 AC-8: only src/lib/db and src/lib/data touch the Prisma client', () => {
    // data-access.md rule 1. src/auth.ts is the documented exception — it passes
    // the client to PrismaAdapter rather than querying with it.
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (!/\.tsx?$/.test(entry.name)) continue

        const rel = full.slice(SRC.length + 1).replace(/\\/g, '/')
        const allowed =
          rel.startsWith('lib/db/') || rel.startsWith('lib/data/') || rel === 'auth.ts'
        if (allowed) continue

        const specifiers = collectImports(full)
        if (specifiers.some((s) => s === '@prisma/client' || s.endsWith('/lib/db'))) {
          offenders.push(rel)
        }
      }
    }
    walk(SRC)

    expect(offenders).toEqual([])
  })
})
