# Security Requirements

> **Status:** Approved — reviewed during `/init-architecture` on 2026-08-28.
> Stack: **Azure Container Apps + PostgreSQL Flexible Server + Microsoft Entra ID + Auth.js**.

> **No compliance framework applies to this project.** Product discovery established no compliance
> requirement, so this document makes no certification claim. Everything below is here because it is
> sound practice for an application that gates access by role — not to satisfy an external standard.
> If a compliance obligation is adopted later, map it against these controls then.

## Authentication

- **Identity provider:** Microsoft Entra ID (workforce / **single tenant**).
- **Library:** Auth.js (NextAuth v5) with the Entra ID provider (OIDC). Config in `src/auth.ts`.
- **No sign-up.** Users are provisioned just-in-time from the org directory on first successful
  sign-in, with `role = REQUESTER`. There is no registration form, no password, and no credential
  handling anywhere in this application.
- **Session management:** HTTP-only, secure cookies. **JWT strategy**, not database sessions.
- **Session lifetime:** `maxAge` 24 hours.
- **Tenant restriction:** set the `issuer` to your tenant
  (`https://login.microsoftonline.com/<tenant-id>/v2.0`), not `/common`, so only your org's users can
  sign in. **This is a required configuration step, not a default.**
- **MFA / Conditional Access:** enforced in Entra ID, not in app code — agree the required policies
  with your Entra admin.

### Why JWT sessions, and what it costs

Next.js middleware runs on the Edge runtime, which cannot reach Postgres via Prisma. Middleware needs
the user's role to gate routes, so the role travels in the token.

**The consequence, stated plainly: a role change is not immediate.** An Admin demoting a user does
not take effect until that user's token refreshes (up to 24 hours) or they sign in again. This is an
accepted trade-off, not an oversight.

**Where it does *not* apply:** `isActive` is re-read from the database on **every data-layer call**,
so deactivating a user blocks all reads and mutations immediately. Only route-level middleware
gating lags. **Deactivation is therefore the correct lever for urgent access removal** — not a role
downgrade.

If immediate role revocation becomes a requirement, the options are database sessions (moving
middleware off Edge), a short token `maxAge`, or a revocation check in the data layer. See
[decisions/001-initial-stack.md](decisions/001-initial-stack.md).

## Authorization

- **Model:** **application-level authorization — NOT database Row-Level Security.** With Prisma over
  a pooled connection, RLS would require setting per-request session variables on each connection,
  which is awkward and error-prone — so authorization is enforced in the application instead.
- **Enforcement — three layers:**
  1. **`src/middleware.ts`** — coarse route protection from the JWT: valid session, `isActive`, and
     role permitted for the route group.
  2. **`src/lib/data/`** — per-record ownership and role checks inside every data-access function,
     before reading or mutating.
  3. **`src/lib/transitions.ts`** — the state machine: may *this actor* move *this request* from
     *this status* to *that one*?

> **Layer 1 is not the security boundary.** It is a convenience and a UX affordance. Layers 2 and 3
> are the boundary — a request that somehow bypasses middleware must still be rejected. Never
> implement an access rule in middleware alone.

- **Principle:** least privilege. A user sees only their own requests unless their role permits more.
  **Because there is no DB backstop, every sensitive read and every mutation MUST check access in
  code.** A missing check is a vulnerability, not a defaulted-deny.
- **Scope in the query, not after it.** List functions apply their ownership filter in the Prisma
  `where` clause. Fetching broadly and filtering in application memory is prohibited — it turns one
  forgotten filter into a full data leak.
- **Assignment beats role for decisions.** Holding `APPROVER` does not permit deciding on an
  arbitrary request; only `request.approverId === user.id` does.
- **Existence is not leaked.** A record the caller may not read returns `NOT_FOUND`, never
  `FORBIDDEN`.
- **Narrow projections for cross-user reads.** The approver picker is available to every user but
  returns only `{ id, name }` for active approvers — it is not a route into the user directory.
- **Verification:** every data-access function documents its check in
  [api-contracts.md](api-contracts.md), and **has a test asserting a denied caller is refused**. A
  function with only a happy-path test is not finished.

### Known weakness, accepted

**Requesters choose their own approver** at submit time. This permits approver-shopping — picking a
lenient colleague. It was chosen deliberately for MVP simplicity with no compliance driver. If
approval integrity becomes a real concern, the fix is a category→approver mapping owned by Admin
(see [database.md](database.md)). Recorded here so it is a known accepted risk rather than a
discovered surprise.

### Administrative safeguards

- An Admin **cannot change their own role** or deactivate themselves — prevents locking the
  organisation out of administration.
- Submitted requests are **never deletable by anyone**, including Admin. Only the owner of a `DRAFT`
  may delete it.
- `StatusHistory` is **append-only**. No application code path updates or deletes a history row.

## Data Protection

### Data Classification

| Classification | Examples in this system | Handling |
|---------------|------------------------|----------|
| Public | Sign-in page | No restrictions |
| Internal | Change request titles, descriptions, comments | Auth required, app-level ownership/role checks |
| Confidential | User names and email addresses; who decided what | Auth + role/ownership check; encrypted at rest |
| Restricted | `DATABASE_URL`, `AUTH_SECRET`, Entra client secret | Key Vault only; never in code, image, or git |

> **Change request descriptions are free text and users will paste whatever they like into them** —
> system names, account identifiers, occasionally things that should not be there. Treat the
> `description` and `body` columns as potentially sensitive, and do not log their contents.

### Encryption
- **At rest:** Azure Database for PostgreSQL Flexible Server encrypts data at rest (AES-256,
  service-managed keys; customer-managed keys optional).
- **In transit:** HTTPS enforced by ACA ingress; database connections use TLS (`sslmode=require`).
- **Secrets:** stored in **Azure Key Vault**, referenced by the Container App via its **managed
  identity** — never committed to git, never baked into the image.

## Input Validation

- All inputs validated server-side with **Zod** before reaching the data layer. Client-side
  validation is a UX nicety and is never trusted.
- **Server-derived values are never taken from input.** `requesterId` and `actorId` come from the
  session; a `requesterId` field in submitted form data is ignored, not honoured.
- **Referenced identities are re-validated.** `approverId` is checked against the database as an
  active user holding `APPROVER` — not trusted because it appeared in a dropdown.
- Prisma parameterizes queries; avoid `$queryRawUnsafe` / string-built SQL.
- Rendering: React escapes by default. Do not introduce `dangerouslySetInnerHTML` for comment or
  description bodies — they are user-controlled text and must stay text.

## Security Headers

Configure in `next.config.js`:
- Content-Security-Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- Referrer-Policy: strict-origin-when-cross-origin

## Audit Logging

This system has **two distinct kinds of record**, and conflating them is a mistake:

1. **`StatusHistory` — a product feature.** The user-visible, append-only trail of who moved a
   request to which status, when, and why. Specified in the PRD, rendered on the detail page,
   retained for the life of the request.
2. **Operational logs — infrastructure.** Authentication events (Entra ID sign-in logs),
   authorization failures, and unhandled errors, via Azure Monitor / Log Analytics.

**Do not log request or comment bodies** to operational logs — log identifiers and outcomes. Log
authorization denials with the actor id, the target record id, and the attempted action; a cluster
of them is the clearest signal of either a bug or probing.

## Network & Platform

- Container App ingress is HTTPS-only.
- **Recommended posture:** VNet integration with a private endpoint or firewall rules for the
  PostgreSQL server, so the database is not publicly reachable. **This is not the default and must be
  configured in Terraform** — confirm it during F-001/F-004 rather than assuming it.
- Use **managed identity** for ACA → Key Vault and ACA → ACR; avoid stored credentials.

## Incident Response (lightweight)

1. **Detect:** Azure Monitor alerts + Entra sign-in anomalies + authorization-denial clusters.
2. **Contain:** deactivate the user in-app (`isActive = false` — takes effect immediately) *and*
   disable them in Entra ID; roll back to a previous ACA revision; rotate secrets in Key Vault.
3. **Document:** log incidents in a dedicated doc (create when needed).
4. **Review:** post-incident review to update controls.

## Pre-Launch Checklist

Verify before the first production deployment:

- [ ] Entra `issuer` pinned to the specific tenant, not `/common`
- [ ] `AUTH_SECRET` generated fresh for production, sourced from Key Vault
- [ ] Database not publicly reachable (private endpoint or firewall rules confirmed)
- [ ] Security headers present on responses
- [ ] Every data-access function has a denied-caller test that passes
- [ ] `sslmode=require` on the production connection string
- [ ] At least two Admin accounts exist (no single point of administrative failure)
- [ ] No secrets in the container image, the repo, or pipeline logs

## Future Enhancements (Post-MVP)

- [ ] Postgres RLS as defence-in-depth on sensitive tables
- [ ] Entra ID app roles instead of an in-app role column — removes the JWT staleness trade-off
- [ ] Category→approver mapping to close the approver-shopping weakness
- [ ] Conditional Access / MFA enforcement for the Admin role
- [ ] Rate limiting
- [ ] Customer-managed encryption keys (CMK)
- [ ] Penetration testing
