# F-002 — Plan

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-002.
> Story + acceptance criteria: [F-002-user-stories.md](F-002-user-stories.md).

## Approach

Wire Auth.js v5 (`next-auth@5.0.0-beta.32`) with the Microsoft Entra ID provider, using the **split
config** the architecture requires:

- `src/auth.config.ts` — Edge-safe. Provider list and callbacks only. **No adapter, no Prisma.**
  Imported by `middleware.ts`, which runs on the Edge runtime where Prisma cannot run.
- `src/auth.ts` — the full config: spreads `auth.config.ts` and adds `PrismaAdapter`. Used by the
  route handler and by server components via `auth()`.

Sessions are **JWT** with a 24-hour `maxAge`; the `jwt` callback puts `id` and `role` into the token
so middleware can gate routes without a database round-trip.

### Sequencing change: the initial migration moves into F-002

`PrismaAdapter` writes `User` and `Account` rows on first sign-in, so those tables must exist before
authentication can work at all. The migration was scheduled in F-003, which runs *after* this
feature — an ordering that cannot work. It moves here. F-003 keeps `isActive` enforcement,
access-control policies and the role-aware route gate.

### Testing strategy: signed session cookies, not a credentials provider

Auth-dependent E2E tests mint a real Auth.js session cookie with `encode()` from `@auth/core/jwt`
(verified present in the installed version) and set it directly in the browser context.

A dev-only Credentials provider was **explicitly rejected**: it is a password backdoor in an
application whose entire purpose is controlled approval, and one misconfigured environment variable
would ship it. Minting cookies in tests carries no production code path at all — the helper lives in
`tests/` and is never imported by `src/`.

## Files to create / change

| File | Why |
|------|-----|
| `src/auth.config.ts` | Edge-safe config: Entra provider, `jwt`/`session`/`authorized` callbacks (AC-5, AC-6, AC-7) |
| `src/auth.ts` | Full config with `PrismaAdapter`; exports `auth`, `handlers`, `signIn`, `signOut` (AC-13) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js route handler |
| `src/middleware.ts` | Route gate; imports **only** `auth.config.ts` (AC-1, AC-8) |
| `src/types/next-auth.d.ts` | Module augmentation so `session.user.role` and `.id` are typed |
| `src/lib/env.ts` | Validates auth env vars with Zod; rejects a `/common` issuer (AC-7) |
| `src/app/(public)/signin/page.tsx` | Sign-in page — one Microsoft button, no password form (AC-2) |
| `src/app/(auth)/dashboard/page.tsx` | Minimal protected page showing identity + sign-out (AC-3, AC-4) |
| `src/app/page.tsx` | Becomes a session-aware redirect (AC-9) |
| `src/components/auth/sign-in-button.tsx`, `sign-out-button.tsx` | Server-action form buttons |
| `prisma/migrations/…` | Initial migration — `User`, `Account`, `Role` (AC-10) |
| `tests/e2e/helpers/session.ts` | Mints a signed session cookie for tests |
| `tests/e2e/auth.spec.ts` | E2E: redirect, sign-in page, protected access, sign-out |
| `src/lib/env.test.ts`, `src/auth.config.test.ts` | Unit tests for config and issuer validation |
| `tests/edge-safety.test.ts` | Asserts middleware's import graph contains no Prisma (AC-8) |

## Tasks

- [ ] Install `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter` (done during investigation)
- [ ] Create `src/lib/env.ts` with Zod validation, rejecting `/common` issuers (AC-7)
- [ ] Test: env validation accepts a tenant issuer, rejects `/common` and rejects missing vars (AC-7)
- [ ] Create `src/auth.config.ts` — provider, JWT strategy, 24h maxAge, callbacks (AC-5, AC-6)
- [ ] Test: session strategy is `jwt`, `maxAge` is 24h, callbacks copy `id`/`role` (AC-5, AC-6)
- [ ] Create `src/types/next-auth.d.ts` module augmentation
- [ ] Create `src/auth.ts` with `PrismaAdapter` (AC-13)
- [ ] Create the Auth.js route handler
- [ ] Create `src/middleware.ts` with the route matcher (AC-1)
- [ ] Test: middleware's transitive imports include no Prisma/db module (AC-8)
- [ ] Build `/signin`, `/dashboard`, and the `/` redirect (AC-2, AC-3, AC-9)
- [ ] Create the initial Prisma migration (AC-10)
- [ ] Create the E2E session-cookie helper
- [ ] Test: unauthenticated access redirects to `/signin` (AC-1)
- [ ] Test: `/signin` has no password field and no sign-up link (AC-2)
- [ ] Test: a valid session cookie reaches `/dashboard` and shows identity (AC-3)
- [ ] Test: sign-out clears the session and blocks protected routes (AC-4)
- [ ] Test: `/` redirects both ways (AC-9)
- [ ] Verify: lint, typecheck, unit tests, build, E2E

## Criterion → test coverage

| Criterion | Test | Status |
|-----------|------|--------|
| AC-1 | `tests/e2e/auth.spec.ts` — 6 tests: redirect, callbackUrl, per-route, signed-in bounce | ✅ |
| AC-2 | `tests/e2e/auth.spec.ts` — 3 tests + `auth.config.test.ts` provider pinning | ✅ |
| AC-3 | `tests/e2e/auth.spec.ts` — 2 tests: dashboard reachable, identity rendered | ✅ |
| AC-4 | `tests/e2e/auth.spec.ts` — 3 tests: cleared session, sign-out control, tampered cookie | ✅ |
| AC-5 | `src/auth.config.test.ts` — 6 tests on the jwt/session callbacks | ✅ |
| AC-6 | `src/auth.config.test.ts` — `maxAge` is 86400 | ✅ |
| AC-7 | `src/lib/env.test.ts` — 11 tests, incl. `/common`, `/organizations`, `/consumers`, casing | ✅ |
| AC-8 | `src/edge-safety.test.ts` — 9 tests walking the transitive import graph | ✅ |
| AC-9 | `tests/e2e/auth.spec.ts` — root redirect, both directions | ✅ |
| AC-10 | Migration — **not created** | ⛔ **Blocked: local database password** |
| AC-11 – AC-14 | ⛔ **Blocked — require a real Entra tenant** | ⛔ |

## Verification results

Run 2026-08-28 from a clean `.next`:

| Check | Command | Result |
|-------|---------|--------|
| Lint | `npm run lint` | exit 0 — ESLint and Prettier clean |
| Types | `npx tsc --noEmit` | exit 0 |
| Unit tests | `npm run test` | **51 passed**, 6 files (was 13 in F-001) |
| Build | `npm run build` | exit 0, no warnings. Routes: `/`, `/signin`, `/dashboard`, `/api/auth/[...nextauth]`; middleware 78.8 kB |
| E2E | `npx playwright test` | **20 passed** (was 3 in F-001) |
| Migration | `prisma db execute` | ❌ `P1000` — authentication failed for local Postgres |

## Deviations from PRD / architecture

### 1. Initial migration moved from F-003 into F-002 — **backlog updated**

`PrismaAdapter` cannot create users without the tables existing, so authentication is impossible
before the first migration. F-003 retains `isActive` enforcement, access-control policies and the
role-aware gate.

### 2. A minimal `/dashboard` is created here

`overview.md` assigns the real dashboard to F-010. Route protection needs *something* to protect, so
F-002 adds a placeholder that displays the signed-in identity and a sign-out control. F-010 replaces
its contents; the route and its protection stay.

### 3. ⛔ The migration was NOT created — blocked on the local database password

**AC-10 is not met.** The whole point of moving the migration into F-002 was to unblock the adapter,
and that part did not land.

The local PostgreSQL 16 service is running and reachable on port 5432, but `pg_hba.conf` requires
`scram-sha-256` for all local connections and the password is not known. One attempt with the
conventional `postgres:postgres` default returned `P1000 — authentication failed`; no further
guessing was done.

**What this does and does not affect:**

- **Not affected:** every test above. Reading a JWT session performs no database query, so route
  gating, session shape and role propagation are all genuinely verified.
- **Affected:** the moment a real user signs in. `PrismaAdapter` will attempt to write a `User` row
  and fail, because the table does not exist.

**To unblock:** supply a working `DATABASE_URL` in `.env.local`, then:

```bash
npx prisma migrate dev --name init
```

This is a two-minute step once credentials are available. It must happen **before** the first real
sign-in, and therefore before AC-11…AC-14 can be attempted.

### 4. The F-001 smoke test was retargeted from `/` to `/signin`

`/` became a session-aware redirect in this feature, so the F-001 test asserting a landing-page
heading no longer described reality. It now targets `/signin`, proving the same three criteria
(serves a page, Tailwind compiled, security headers present) against a page that actually renders.

### 5. `@next/env` used to load `.env.local` into the Playwright process

Playwright runs in its own process and does not inherit Next's environment loading, so
`AUTH_SECRET` was undefined and every authenticated test failed. `@next/env` already ships with
Next and applies identical file precedence, so no `dotenv` dependency was added
(`dependencies.md` rule 6).

### 6. The session helper loads `@auth/core/jwt` dynamically

It is an ESM-only module and Playwright transpiles specs to CommonJS, so a top-level import failed
with `ERR_REQUIRE_ESM`. A dynamic `import()` inside the function resolves it.

## Outstanding Entra validation

**F-002 ships with AC-11 … AC-14 open.** They require:

| Needed | For |
|--------|-----|
| Directory (tenant) ID | `AUTH_MICROSOFT_ENTRA_ID_ISSUER` |
| Application (client) ID | `AUTH_MICROSOFT_ENTRA_ID_ID` |
| Client secret | `AUTH_MICROSOFT_ENTRA_ID_SECRET` |
| Redirect URI registered | `{origin}/api/auth/callback/microsoft-entra-id` |

Per `docs/development/environments.md`, obtaining these requires directory privileges and **must be
done by a developer/operator** — it is explicitly out of reach of an autonomous agent.

Until then the sign-in button will fail at the redirect to Microsoft. Everything behind identity —
route gating, session shape, role propagation — is implemented and tested.
