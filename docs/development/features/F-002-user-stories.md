# F-002 — Authentication (Microsoft Entra ID sign in / sign out)

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-002.

## Story

**As a** member of the organisation
**I want to** sign in with my existing work account
**So that** I can raise and track change requests without creating or remembering another password

## Context that shapes this feature

- **There is no sign-up.** Single-tenant Entra ID is the source of who exists; a `User` row is
  created just-in-time on first successful sign-in, defaulting to `role = REQUESTER`.
- **Sessions are JWT, not database-backed**, because middleware runs on the Edge runtime and cannot
  reach Prisma. The role travels in the token.
- **Middleware is not the security boundary** — it is a route gate and a UX affordance. The data
  layer re-checks everything (F-003 onward).

## Acceptance criteria

### Verifiable locally (no Azure tenant required)

- [ ] **AC-1:** An unauthenticated visitor to a protected route is redirected to `/signin`.
- [ ] **AC-2:** `/signin` offers a single "Sign in with Microsoft" action. There is **no** email/password form, no registration link, and no way to create an account.
- [ ] **AC-3:** A request carrying a valid session cookie reaches a protected route and sees their own identity (email and role).
- [ ] **AC-4:** Signing out clears the session; the user is returned to `/signin` and can no longer reach protected routes.
- [ ] **AC-5:** The session token carries `id`, `email` and `role`, and the session object exposes them to server components.
- [ ] **AC-6:** Session `maxAge` is 24 hours, as required by security.md.
- [ ] **AC-7:** The provider's `issuer` is read from configuration and pinned to a specific tenant. A configuration that would fall back to `/common` (allowing any Microsoft account) is rejected.
- [ ] **AC-8:** `middleware.ts` is Edge-safe — it does not import Prisma, the database, or the full auth config, directly or transitively.
- [ ] **AC-9:** `/` redirects to `/dashboard` when signed in and `/signin` when not.
- [ ] **AC-10:** The database schema is migrated, so the tables the adapter writes to exist.

### ⛔ Blocked — require a real Entra tenant

These **cannot** be verified without `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
`AUTH_MICROSOFT_ENTRA_ID_ISSUER` and a registered redirect URI. They stay open at the end of F-002.

- [ ] **AC-11:** ⛔ A user from the organisation's tenant can complete the full sign-in redirect flow and land on `/dashboard`.
- [ ] **AC-12:** ⛔ Entra ID claims map correctly onto `User.email` and `User.name`.
- [ ] **AC-13:** ⛔ First-time sign-in creates a `User` row with `role = REQUESTER` and a linked `Account` row.
- [ ] **AC-14:** ⛔ A Microsoft account from **outside** the tenant is refused — the actual proof that tenant pinning works.

> **Why these are blocked rather than mocked:** a mock identity provider would prove our own code
> calls itself correctly, not that Entra accepts our configuration. AC-14 in particular is the one
> that matters — the entire access model assumes only organisation members can sign in, and only a
> real tenant can demonstrate that. Mocking it would produce a false assurance.

## Notes

- **Redirect URI must match exactly:** `{origin}/api/auth/callback/microsoft-entra-id`. Register the
  local development origin as well as the deployed one — a mismatch is the most common failure.
- **The `issuer` default is dangerous.** Confirmed by reading the installed provider source: when
  `issuer` is omitted it defaults to `https://login.microsoftonline.com/common/v2.0/`, which permits
  **any** Microsoft account — personal, school or work. AC-7 exists to make that impossible to ship
  by accident.
- Out of scope (per the PRD): password reset, account creation, email verification, MFA enrolment.
  MFA and Conditional Access are enforced in Entra ID, not in application code.
- Role-based *authorization* (which role may do what) is F-003. F-002 establishes only identity and
  the coarse "is anyone signed in?" gate.
