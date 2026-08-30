import { z } from 'zod'

/**
 * Server-side environment validation.
 *
 * The important rule here is the issuer check. The Auth.js Microsoft Entra ID
 * provider defaults `issuer` to `https://login.microsoftonline.com/common/v2.0/`
 * when it is omitted — and `/common` permits **any** Microsoft account to sign
 * in, personal ones included. For a system whose entire access model assumes
 * "everyone signed in is a member of this organisation", that default is a
 * silent, total failure of the security model.
 *
 * So a `/common` issuer is rejected outright rather than warned about, and the
 * variable is required rather than optional. See docs/architecture/security.md.
 */

const COMMON_ISSUER_PATTERN = /login\.microsoftonline\.com\/(common|organizations|consumers)\//i

export const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required — generate one with `npx auth secret`'),

  AUTH_MICROSOFT_ENTRA_ID_ID: z.string().min(1, 'Entra application (client) ID is required'),

  AUTH_MICROSOFT_ENTRA_ID_SECRET: z.string().min(1, 'Entra client secret is required'),

  AUTH_MICROSOFT_ENTRA_ID_ISSUER: z
    .string()
    .url('Issuer must be a valid URL')
    .refine((value) => !COMMON_ISSUER_PATTERN.test(value), {
      message:
        'Issuer must be pinned to your Directory (tenant) ID, not /common, /organizations or ' +
        '/consumers. A multi-tenant issuer lets any Microsoft account sign in, which defeats ' +
        'single-tenant access control. Use https://login.microsoftonline.com/<tenant-id>/v2.0/',
    }),
})

export type AuthEnv = z.infer<typeof authEnvSchema>

/**
 * Parse auth configuration without throwing.
 *
 * Returns the issues rather than crashing, so the sign-in page can render a
 * useful "not configured" state instead of a 500. A misconfigured deployment
 * should be diagnosable from the browser, not only from container logs.
 */
export function parseAuthEnv(source: NodeJS.ProcessEnv = process.env) {
  return authEnvSchema.safeParse({
    AUTH_SECRET: source.AUTH_SECRET,
    AUTH_MICROSOFT_ENTRA_ID_ID: source.AUTH_MICROSOFT_ENTRA_ID_ID,
    AUTH_MICROSOFT_ENTRA_ID_SECRET: source.AUTH_MICROSOFT_ENTRA_ID_SECRET,
    AUTH_MICROSOFT_ENTRA_ID_ISSUER: source.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  })
}

/** True when every Entra variable is present and the issuer is tenant-pinned. */
export function isAuthConfigured(source: NodeJS.ProcessEnv = process.env): boolean {
  return parseAuthEnv(source).success
}

/** Human-readable reasons auth is not usable. Empty when configuration is valid. */
export function authConfigProblems(source: NodeJS.ProcessEnv = process.env): string[] {
  const result = parseAuthEnv(source)
  if (result.success) return []
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

/* ------------------------------------------------------------------ *
 * Application environment (F-004)
 *
 * Separate from the auth schema on purpose. The app can be usefully
 * misconfigured in two independent ways — no database, or no identity provider
 * — and collapsing them would mean a missing tenant id hid a broken connection
 * string. Callers ask the question they actually care about.
 * ------------------------------------------------------------------ */

/** Which deployment this process is serving. Drives nothing security-relevant. */
export const APP_ENVIRONMENTS = ['development', 'preview', 'production'] as const
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number]

export const appEnvSchema = z.object({
  /**
   * Validated as a shape, not tested as a connection. Catching
   * `postgres://…` (Prisma requires `postgresql://`) or an empty string at boot
   * is far cheaper than the opaque failure it otherwise produces at the first
   * query — which, given the data layer is lazily reached, could be well after
   * deployment.
   */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((value) => value.startsWith('postgresql://'), {
      message:
        'DATABASE_URL must start with postgresql:// — Prisma does not accept the postgres:// alias',
    }),

  APP_ENV: z.enum(APP_ENVIRONMENTS).default('development'),

  /**
   * `.url()` alone is not enough: Zod delegates to `new URL()`, which happily
   * parses `localhost:3000` as scheme `localhost:` with path `3000`. That is
   * exactly the typo someone makes when omitting the protocol, and it would
   * sail through, producing broken absolute links and OAuth redirects.
   */
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'NEXT_PUBLIC_APP_URL must start with http:// or https://',
    }),
})

export type AppEnv = z.infer<typeof appEnvSchema>

export function parseAppEnv(source: NodeJS.ProcessEnv = process.env) {
  return appEnvSchema.safeParse({
    DATABASE_URL: source.DATABASE_URL,
    // Falls back to Next's own NODE_ENV so a deployment that never sets APP_ENV
    // still reports something truthful rather than defaulting to "development"
    // while serving production traffic.
    APP_ENV: source.APP_ENV ?? (source.NODE_ENV === 'production' ? 'production' : 'development'),
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL,
  })
}

/** True when the application's non-auth configuration is usable. */
export function isAppConfigured(source: NodeJS.ProcessEnv = process.env): boolean {
  return parseAppEnv(source).success
}

/** Human-readable reasons the app is misconfigured. Empty when valid. */
export function appConfigProblems(source: NodeJS.ProcessEnv = process.env): string[] {
  const result = parseAppEnv(source)
  if (result.success) return []
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

/**
 * The current environment, defaulting closed to `production`.
 *
 * If configuration is unreadable we assume production, because that is the
 * setting with the strictest behaviour. Guessing "development" for an
 * unrecognised environment is how debug output ends up in front of real users.
 */
export function currentEnvironment(source: NodeJS.ProcessEnv = process.env): AppEnvironment {
  const result = parseAppEnv(source)
  return result.success ? result.data.APP_ENV : 'production'
}

/** Every configuration problem across both schemas, for diagnostics. */
export function allConfigProblems(source: NodeJS.ProcessEnv = process.env): string[] {
  return [...appConfigProblems(source), ...authConfigProblems(source)]
}
