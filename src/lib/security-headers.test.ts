import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config.js'

/**
 * Asserts the real next.config.js — not a copy of the header list — so this test
 * fails if the config is edited but security.md's requirements are not met.
 */
describe('security headers', () => {
  it('F-001 AC-7: configures every header required by security.md', async () => {
    const rules = await nextConfig.headers()
    const applied = rules[0]
    expect(applied).toBeDefined()

    const keys = applied!.headers.map((h: { key: string }) => h.key)

    expect(keys).toContain('Content-Security-Policy')
    expect(keys).toContain('X-Content-Type-Options')
    expect(keys).toContain('X-Frame-Options')
    expect(keys).toContain('Strict-Transport-Security')
    expect(keys).toContain('Referrer-Policy')
  })

  it('F-001 AC-7: applies the headers to every route', async () => {
    const rules = await nextConfig.headers()
    expect(rules[0]?.source).toBe('/:path*')
  })

  it('F-001 AC-7: sets the documented header values', async () => {
    const rules = await nextConfig.headers()
    const byKey = Object.fromEntries(
      rules[0]!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )

    expect(byKey['X-Content-Type-Options']).toBe('nosniff')
    expect(byKey['X-Frame-Options']).toBe('DENY')
    expect(byKey['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(byKey['Strict-Transport-Security']).toContain('max-age=')
  })

  it("F-001 AC-7: CSP denies framing and does not fall back to default-src '*'", async () => {
    const rules = await nextConfig.headers()
    const csp = rules[0]!.headers.find(
      (h: { key: string }) => h.key === 'Content-Security-Policy'
    )!.value

    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("default-src 'self'")
    expect(csp).not.toContain('default-src *')
  })

  it('F-001 AC-5: keeps standalone output, which the shipped Dockerfile depends on', () => {
    // Not a security header, but the same config file — and a silent change here
    // breaks the container build in CI rather than locally.
    expect(nextConfig.output).toBe('standalone')
  })
})
