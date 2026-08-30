import { describe, expect, it } from 'vitest'
import {
  APP_ENVIRONMENTS,
  allConfigProblems,
  appConfigProblems,
  authConfigProblems,
  currentEnvironment,
  isAppConfigured,
  isAuthConfigured,
  parseAppEnv,
  parseAuthEnv,
} from './env'

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

/* ------------------------------------------------------------------ *
 * Application environment (F-004)
 * ------------------------------------------------------------------ */

const validApp = {
  DATABASE_URL: 'postgresql://user:pw@localhost:5432/appdb?schema=public',
  APP_ENV: 'production',
  NEXT_PUBLIC_APP_URL: 'https://change.example.com',
} as unknown as NodeJS.ProcessEnv

describe('application environment validation', () => {
  it('F-004 AC-6: accepts a complete, valid configuration', () => {
    expect(parseAppEnv(validApp).success).toBe(true)
    expect(isAppConfigured(validApp)).toBe(true)
    expect(appConfigProblems(validApp)).toEqual([])
  })

  it.each(APP_ENVIRONMENTS)('F-004 AC-6: accepts APP_ENV=%s', (environment) => {
    expect(parseAppEnv({ ...validApp, APP_ENV: environment }).success).toBe(true)
  })

  it.each(['staging', 'prod', 'Production', 'live', ''])(
    'F-004 AC-7: rejects APP_ENV=%o',
    (value) => {
      expect(parseAppEnv({ ...validApp, APP_ENV: value } as NodeJS.ProcessEnv).success).toBe(false)
    }
  )

  it('F-004 AC-7: rejects the postgres:// alias, which Prisma does not accept', () => {
    // The failure this catches is otherwise opaque and arrives at the first
    // query, potentially long after deployment.
    const result = parseAppEnv({
      ...validApp,
      DATABASE_URL: 'postgres://user:pw@localhost:5432/appdb',
    })

    expect(result.success).toBe(false)
    expect(
      appConfigProblems({ ...validApp, DATABASE_URL: 'postgres://x@y:5432/z' }).join(' ')
    ).toMatch(/postgresql:\/\//)
  })

  it.each(['', 'not-a-url', 'mysql://user@host/db'])(
    'F-004 AC-7: rejects DATABASE_URL=%o',
    (value) => {
      expect(parseAppEnv({ ...validApp, DATABASE_URL: value } as NodeJS.ProcessEnv).success).toBe(
        false
      )
    }
  )

  it.each(['', 'localhost:3000', 'not a url'])(
    'F-004 AC-7: rejects NEXT_PUBLIC_APP_URL=%o',
    (value) => {
      expect(
        parseAppEnv({ ...validApp, NEXT_PUBLIC_APP_URL: value } as NodeJS.ProcessEnv).success
      ).toBe(false)
    }
  )

  it('F-004 AC-7: reports every problem at once, not just the first', () => {
    expect(appConfigProblems({} as NodeJS.ProcessEnv).length).toBeGreaterThanOrEqual(2)
  })

  it('F-004 AC-6: falls back to NODE_ENV when APP_ENV is unset', () => {
    const production = parseAppEnv({
      DATABASE_URL: validApp.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: validApp.NEXT_PUBLIC_APP_URL,
      NODE_ENV: 'production',
    } as NodeJS.ProcessEnv)

    expect(production.success && production.data.APP_ENV).toBe('production')
  })
})

describe('currentEnvironment', () => {
  it.each(APP_ENVIRONMENTS)('F-004 AC-6: reports %s', (environment) => {
    expect(currentEnvironment({ ...validApp, APP_ENV: environment })).toBe(environment)
  })

  it('F-004 AC-7: defaults to production when configuration is unreadable', () => {
    // Guessing "development" for an unrecognised environment is how debug
    // output ends up in front of real users. Assume the strictest setting.
    expect(currentEnvironment({} as NodeJS.ProcessEnv)).toBe('production')
    expect(currentEnvironment({ ...validApp, APP_ENV: 'nonsense' } as NodeJS.ProcessEnv)).toBe(
      'production'
    )
  })
})

describe('allConfigProblems', () => {
  it('F-004 AC-6: combines app and auth problems', () => {
    const problems = allConfigProblems({} as NodeJS.ProcessEnv)

    expect(problems.join(' ')).toContain('DATABASE_URL')
    expect(problems.join(' ')).toContain('AUTH_SECRET')
  })

  it('F-004 AC-6: is empty when everything is configured', () => {
    const complete = {
      ...validApp,
      AUTH_SECRET: 'a-generated-secret-value',
      AUTH_MICROSOFT_ENTRA_ID_ID: 'client-id',
      AUTH_MICROSOFT_ENTRA_ID_SECRET: 'client-secret',
      AUTH_MICROSOFT_ENTRA_ID_ISSUER: 'https://login.microsoftonline.com/tenant-id/v2.0/',
    } as unknown as NodeJS.ProcessEnv

    expect(allConfigProblems(complete)).toEqual([])
  })
})
