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
