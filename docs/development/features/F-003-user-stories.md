# F-003 — Access control: role-aware gating and `isActive` enforcement

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-003.

## Story

**As an** administrator responsible for who can do what
**I want** each role to reach only the parts of the system it is entitled to, and deactivated accounts to be shut out
**So that** access follows the roles we assign rather than the fact that someone once signed in

## Context that shapes this feature

Two gaps exist in `main` today, both verified by inspection rather than assumption:

1. **Middleware performs no role check.** It tests only "is anyone signed in?", so **any signed-in
   user could reach `/admin/*`**. Not exploitable yet — nobody can sign in — but it is live.
2. **`isActive` is enforced nowhere.** It appears in exactly one place in `src/`: a comment. A
   deactivated user would retain full access, despite `security.md` naming deactivation as *the*
   lever for urgent access removal.

This feature closes both, and establishes the authorization pattern that F-005 … F-011 will copy.

**Scope boundary.** `listUsers()` belongs to F-011 (admin screen) and `listApproverOptions()` to
F-005/F-006 (the submit form). They arrive with the features that consume them, not here. F-003
delivers the **enforcement primitives and the pattern** — which matters more than its size, because
with no RLS backstop every later feature inherits whatever shape lands here.

## Acceptance criteria

### Verifiable locally

- [ ] **AC-1:** The session token carries `isActive`, and the session object exposes it.
- [ ] **AC-2:** A user whose token says inactive is refused every protected route and returned to `/signin` with an explanatory message.
- [ ] **AC-3:** `/admin/*` is reachable only by `ADMIN`. Any other role is redirected away rather than shown the page.
- [ ] **AC-4:** `/dashboard` and `/requests/*` remain reachable by every active signed-in user, regardless of role.
- [ ] **AC-5:** Authorization decisions live in **pure, exhaustively-tested functions**, not scattered through middleware or pages — so later features reuse the rules rather than re-implementing them.
- [ ] **AC-6:** The capability helpers match the role matrix in `overview.md` exactly: deciding requires `APPROVER`; reading all requests requires `MANAGER` or `ADMIN`; managing users requires `ADMIN`; creating and tracking one's own requests requires only an active session.
- [ ] **AC-7:** Access resolution **fails closed** — an unknown role, a missing role, or an absent `isActive` denies rather than permits.
- [ ] **AC-8:** `src/lib/data/users.ts` exists as the sole route to user records, performs its own `isActive` check, and is the only module besides `src/lib/db` that touches the Prisma client.
- [ ] **AC-9:** Middleware remains Edge-safe — the authorization helpers pull in no database code.

### ⛔ Blocked — require a database (FN-7)

- [ ] **AC-10:** ⛔ `getCurrentUser()` re-reads `isActive` from the database on every call, so deactivation takes effect immediately rather than at token expiry.
- [ ] **AC-11:** ⛔ Denied-caller integration tests for every data-access function, against a seeded test database.

> `overview.md` states: *"A data-layer function without a denied-caller test is not done."* That bar
> cannot be met without a database, so AC-10 and AC-11 stay open. The code is written; the proof is
> not available.

## Notes

- **Middleware is not the security boundary.** It is a coarse gate and a UX affordance. The same
  helpers are called by the data layer, which is what actually enforces access.
- **Wrong-role handling differs from wrong-record handling.** A non-admin visiting `/admin/*` is
  redirected to `/dashboard` — they know the route exists, and hiding it serves nothing. Records they
  may not read still return `NOT_FOUND`, per `security.md`, because there existence itself is
  sensitive.
- Role-based *data* filtering (which requests a manager may read) arrives with F-005, when there is
  data to filter.
