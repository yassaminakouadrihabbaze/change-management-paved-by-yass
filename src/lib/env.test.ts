import { describe, expect, it } from 'vitest'
import { authConfigProblems, isAuthConfigured, parseAuthEnv } from './env'

const valid = {
  AUTH_SECRET: 'a-generated-secret-value',
  AUTH_MICROSOFT_ENTRA_ID_ID: '11111111-2222-3333-4444-555555555555',
  AUTH_MICROSOFT_ENTRA_ID_SECRET: 'a-client-secret',
  AUTH_MICROSOFT_ENTRA_ID_ISSUER:
    'https://login.microsoftonline.com/99999999-8888-7777-6666-555555555555/v2.0/',
} as unknown as NodeJS.ProcessEnv

describe('auth environment validation', () => {
  it('F-002 AC-7: accepts a tenant-pinned issuer', () => {
    expect(parseAuthEnv(valid).success).toBe(true)
    expect(isAuthConfigured(valid)).toBe(true)
    expect(authConfigProblems(valid)).toEqual([])
  })

  // The reason this file exists. Omitting `issuer` makes the Auth.js provider
  // default to /common, which lets ANY Microsoft account sign in — including
  // personal ones. That is a total bypass of single-tenant access control, and
  // it fails open and silently, so it must be impossible to configure.
  it.each([
    ['common', 'https://login.microsoftonline.com/common/v2.0/'],
    ['organizations', 'https://login.microsoftonline.com/organizations/v2.0/'],
    ['consumers', 'https://login.microsoftonline.com/consumers/v2.0/'],
  ])('F-002 AC-7: rejects the multi-tenant /%s issuer', (_name, issuer) => {
    const result = parseAuthEnv({ ...valid, AUTH_MICROSOFT_ENTRA_ID_ISSUER: issuer })

    expect(result.success).toBe(false)
    expect(
      authConfigProblems({ ...valid, AUTH_MICROSOFT_ENTRA_ID_ISSUER: issuer }).join(' ')
    ).toMatch(/tenant/i)
  })

  it('F-002 AC-7: rejects a /common issuer regardless of casing', () => {
    const issuer = 'https://LOGIN.MICROSOFTONLINE.COM/Common/v2.0/'
    expect(parseAuthEnv({ ...valid, AUTH_MICROSOFT_ENTRA_ID_ISSUER: issuer }).success).toBe(false)
  })

  it('F-002 AC-7: rejects a malformed issuer URL', () => {
    expect(parseAuthEnv({ ...valid, AUTH_MICROSOFT_ENTRA_ID_ISSUER: 'not-a-url' }).success).toBe(
      false
    )
  })

  it.each([
    'AUTH_SECRET',
    'AUTH_MICROSOFT_ENTRA_ID_ID',
    'AUTH_MICROSOFT_ENTRA_ID_SECRET',
    'AUTH_MICROSOFT_ENTRA_ID_ISSUER',
  ])('F-002 AC-7: reports %s when it is missing', (key) => {
    const incomplete = { ...valid, [key]: undefined } as unknown as NodeJS.ProcessEnv

    expect(isAuthConfigured(incomplete)).toBe(false)
    expect(authConfigProblems(incomplete).join(' ')).toContain(key)
  })

  it('F-002 AC-7: reports every problem at once, not just the first', () => {
    const empty = {} as NodeJS.ProcessEnv
    expect(authConfigProblems(empty)).toHaveLength(4)
  })
})
