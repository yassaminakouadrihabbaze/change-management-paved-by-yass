/** @type {import('next').NextConfig} */

// Security headers required by docs/architecture/security.md.
// Exported below so they can be asserted in tests (F-001 AC-7) rather than
// living only in config nobody verifies.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    // 'unsafe-inline'/'unsafe-eval' on script-src are required by the Next.js dev
    // overlay and by inline bootstrap scripts in production. Tighten with a nonce
    // once auth (F-002) and the real UI exist — tracked in security.md.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://login.microsoftonline.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://login.microsoftonline.com",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

const nextConfig = {
  reactStrictMode: true,

  // Required by the shipped Dockerfile, which copies .next/standalone.
  // Changing this breaks the container build.
  output: 'standalone',

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// Note: only the config object is exported. Attaching `securityHeaders` as an
// extra export makes Next.js warn about an unrecognised config key on every
// build — tests read the headers through `nextConfig.headers()` instead, which
// asserts the real behaviour rather than a parallel copy of the list.
module.exports = nextConfig
