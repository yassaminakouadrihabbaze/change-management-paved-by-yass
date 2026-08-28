# Security Requirements

> **Status:** Draft — reviewed during `/init-architecture`.
> Aligned with ISO 27001 controls relevant to a web application MVP.
> Stack: **Azure Container Apps + PostgreSQL Flexible Server + Microsoft Entra ID + Auth.js**.

## Authentication

- **Identity provider:** Microsoft Entra ID (workforce / **single tenant**).
- **Library:** Auth.js (NextAuth v5) with the Entra ID provider (OIDC). Config in `src/auth.ts`.
- **Session management:** HTTP-only, secure cookies (Auth.js default).
- **Tenant restriction:** set the `issuer` to your tenant
  (`https://login.microsoftonline.com/<tenant-id>/v2.0`), not `/common`, so only your org's users can
  sign in.
- **MFA / Conditional Access:** enforced in Entra ID (Conditional Access policies), not in app code —
  document the required policies with your Entra admin.
- **Note:** if the app later needs to call Microsoft Graph or downstream APIs on the user's behalf,
  revisit MSAL (see [tech-stack.md](tech-stack.md)); Auth.js alone is for sign-in + sessions.

## Authorization

- **Model:** **application-level authorization — NOT database Row-Level Security.** This is the key
  difference from the Supabase stack (which relies on Postgres RLS). With Prisma over a pooled
  connection, RLS would require setting per-request session variables on each connection, which is
  awkward and error-prone — so authorization is enforced in the application instead.
- **Enforcement — two layers (both required):**
  1. **`src/middleware.ts`** — coarse route protection: is there a valid session? does the user hold
     the required role for this route group?
  2. **`src/lib/data/`** — fine-grained, per-record checks: ownership and role checks inside every
     data-access function before reading or mutating.
- **Principle:** least privilege — a user can only access their own data unless their role permits
  more. **Because there is no DB backstop, every sensitive read and every mutation MUST check access
  in code.** A missing check is a vulnerability, not a defaulted-deny.
- **Optional defence-in-depth:** Postgres RLS may be added on the most sensitive tables in addition
  to the app checks. If added, document the policies in [database.md](database.md).
- **Verification:** every new data-access function and protected route documents its access check in
  [api-contracts.md](api-contracts.md).

## Data Protection

### Data Classification
| Classification | Examples | Handling |
|---------------|----------|----------|
| Public | Marketing content, public pages | No restrictions |
| Internal | User-generated content | Auth required, app-level checks |
| Confidential | Email addresses, personal data | Auth + role/ownership check, encrypted at rest |
| Restricted | Secrets, connection strings, keys | Key Vault only; never in code or images |

### Encryption
- **At rest:** Azure Database for PostgreSQL Flexible Server encrypts data at rest (AES-256,
  service-managed keys; customer-managed keys optional).
- **In transit:** HTTPS enforced by ACA ingress; database connections use TLS (`sslmode=require`).
- **Secrets:** stored in **Azure Key Vault**, referenced by the Container App via its **managed
  identity** — never committed to git, never baked into the image. `DATABASE_URL`, `AUTH_SECRET`, and
  the Entra client secret all live in Key Vault.

## Input Validation

- All user inputs validated server-side with **Zod** (never trust client-only validation).
- Prisma parameterizes queries; avoid `$queryRawUnsafe` / string-built SQL.

## Security Headers

Configure in `next.config.js`:
- Content-Security-Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)

## Audit Logging

For MVP, log:
- Authentication events (sign in / out, failures) — available in Entra ID sign-in logs.
- Authorization failures (denied access) — log from middleware / data layer.
- Data mutations on sensitive tables.
- Use **Azure Monitor / Log Analytics** (ACA streams container logs) + Entra sign-in logs.

## Network & Platform

- Container App ingress is HTTPS-only; restrict to required ports.
- Prefer **VNet integration** + a private endpoint / firewall rules for the PostgreSQL server so the
  database is not publicly reachable. Document the chosen network posture during `/init-architecture`.
- Use **managed identity** for ACA → Key Vault and ACA → ACR; avoid stored credentials.

## Incident Response (Lightweight for MVP)

1. **Detect:** Azure Monitor alerts + Entra sign-in anomalies.
2. **Contain:** disable the user in Entra ID; roll back to a previous ACA revision; rotate secrets in
   Key Vault.
3. **Document:** log incidents in a dedicated doc (create when needed).
4. **Review:** post-incident review to update controls.

## ISO 27001 Control Mapping

| Control | Area | MVP Status | Notes |
|---------|------|------------|-------|
| A.8.1 | Asset inventory | ✅ Documented | Tech stack + data in architecture docs |
| A.8.2 | Data classification | ✅ Documented | See table above |
| A.9.1 | Access control policy | ✅ Implemented | App middleware + data-layer checks |
| A.9.2 | User access management | ✅ Implemented | Microsoft Entra ID |
| A.9.4 | System access control | ✅ Implemented | Auth.js session + app authorization |
| A.10.1 | Cryptographic controls | ✅ Default | Azure encryption at rest + TLS in transit |
| A.12.4 | Logging and monitoring | 🔶 Partial | Entra sign-in logs + Azure Monitor; app audit logs Phase 2 |
| A.13.1 | Network security | 🔶 Partial | HTTPS ingress; VNet/private DB to be configured |
| A.14.1 | Security requirements | ✅ Documented | This document |
| A.14.2 | Secure development | ✅ Process | Validation workflow, security skill |
| A.14.3 | Test data | 🔶 Partial | No production data in non-prod environments |

## Future Enhancements (Post-MVP)

- [ ] Postgres RLS as defence-in-depth on sensitive tables
- [ ] Conditional Access / MFA enforcement for admin roles
- [ ] Rate limiting on API endpoints
- [ ] Customer-managed encryption keys (CMK)
- [ ] Centralized logging / SIEM integration
- [ ] Penetration testing
