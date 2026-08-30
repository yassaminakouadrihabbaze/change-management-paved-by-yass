import { readFileSync, existsSync } from 'node:fs'
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
})
