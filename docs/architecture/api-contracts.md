# API Contracts

> **Status:** Approved — designed during `/init-architecture` on 2026-08-28.
> Define endpoints/actions BEFORE implementing them. Stack: **Next.js + Prisma + Postgres (Azure)**.

## Conventions

- **Next.js Server Actions** are used for all mutations. **There are no custom API routes** — nothing
  external consumes this system, so no public HTTP surface is built. The only route under `/api/` is
  the Auth.js handler.
- All actions return a consistent shape: `{ data, error }`. Actions never throw to the client.
- **Authentication:** Auth.js session (HTTP-only cookie, JWT strategy). Read server-side via the
  `auth()` helper from `src/auth.ts`.
- **Authorization:** checked explicitly, every time. `src/middleware.ts` gates routes;
  `src/lib/data/` performs per-record checks; `src/lib/transitions.ts` governs status changes. There
  is no database RLS backstop, so **every mutation and sensitive read must check access in code.**
- Data-access functions are `async` (Prisma is async-native).
- All inputs validated with Zod before reaching the data layer.

## Response Shape

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

### Error codes

| Code | Meaning | Client behaviour |
|------|---------|------------------|
| `UNAUTHENTICATED` | No valid session | Redirect to `/signin` |
| `FORBIDDEN` | Authenticated but not permitted | Show "you do not have access" |
| `NOT_FOUND` | Record missing, **or** readable-check failed | Show not-found |
| `INVALID_INPUT` | Zod validation failed | Show field errors |
| `INVALID_TRANSITION` | State machine rejected the change | Refresh — the request moved under them |
| `SERVER_ERROR` | Unexpected | Generic error, detail logged not returned |

> **`NOT_FOUND` is returned for records the caller may not read** — not `FORBIDDEN`. Distinguishing
> them would leak the existence of requests the user has no business knowing about.

## Authentication

Handled by Auth.js (NextAuth v5) with the Microsoft Entra ID provider — no custom endpoints for sign
in / sign out / callback (all under `/api/auth/*`). **No sign-up endpoint exists**; users are
provisioned just-in-time from the org directory on first sign-in.

### Protected-route rules (`src/middleware.ts`)

| Path pattern | Requirement |
|---|---|
| `/signin`, `/api/auth/*` | Public |
| `/dashboard`, `/requests/*` | Valid session **and** `isActive` |
| `/admin/*` | Valid session, `isActive`, **and** `role = ADMIN` |
| everything else | Valid session |

Middleware reads role and active status from the JWT (it runs on Edge and cannot reach the
database). It is a **coarse gate and a UX affordance — not the security boundary.** The data layer
re-checks everything.

---

## Shared preconditions

Every action below performs these before anything else. They are not repeated per action:

1. `auth()` returns a session — else `UNAUTHENTICATED`.
2. The session user is `isActive` (re-read from the database, not trusted from the token) — else
   `FORBIDDEN`.
3. Input parses against the named Zod schema — else `INVALID_INPUT`.

---

## Server Actions

### Change requests

#### `createDraft(input)`
**Purpose:** Create a new change request in `DRAFT`.
**Authorization:** Any authenticated active user. Creating is a baseline capability, not role-gated.
**Input:** `title`, `description`, `category`, `priority`, `targetDate?`
**Validation:** `createDraftSchema` — title 1–200 chars, description 1–5000, category/priority must be valid enum members, `targetDate` optional but must be today or later if present.
**Data layer:** `createChangeRequest()` in `src/lib/data/change-requests.ts`. Sets `requesterId` from the session — **never from input**.
**Side effects:** Writes the creation `StatusHistory` row (`fromStatus: null`, `toStatus: DRAFT`) in the same transaction.
**Returns:** `{ data: { id }, error: null }`

#### `updateDraft(id, input)`
**Purpose:** Edit an unsubmitted request.
**Authorization:** Requester (owner) only, **and** `status = DRAFT`. Both checked in the data layer.
**Validation:** `updateDraftSchema` (same fields as create, all optional).
**Data layer:** `updateChangeRequest()` — reloads the record and re-checks ownership and status inside the transaction, so a concurrent submit cannot be edited around.
**Side effects:** None. Content edits do not write history; only transitions do.
**Returns:** `{ data: { id }, error: null }`

#### `deleteDraft(id)`
**Purpose:** Discard a draft.
**Authorization:** Requester (owner) only, **and** `status = DRAFT`.
**Data layer:** `deleteChangeRequest()`. Cascades to the single creation history row.
**Note:** The only delete in the system. Anything submitted is never deletable, by anyone, including Admin.
**Returns:** `{ data: { id }, error: null }`

#### `submitRequest(id, input)`
**Purpose:** `DRAFT` → `SUBMITTED`, assigning an approver.
**Authorization:** Requester (owner). Transition checked by `canTransition()`.
**Input:** `approverId`
**Validation:** `submitSchema`. `targetDate` must now be present on the record. `approverId` must reference an **active user holding `APPROVER`** — validated against the database, not trusted from the form.
**Data layer:** `submitChangeRequest()`
**Side effects:** History row `DRAFT → SUBMITTED`.
**Returns:** `{ data: { id, status }, error: null }`

#### `startReview(id)`
**Purpose:** `SUBMITTED` → `UNDER_REVIEW`.
**Authorization:** The **assigned** approver only — `request.approverId === session.user.id`. Holding the `APPROVER` role is not sufficient.
**Data layer:** `transitionChangeRequest()`
**Side effects:** History row.
**Returns:** `{ data: { id, status }, error: null }`

#### `approveRequest(id, input)`
**Purpose:** `UNDER_REVIEW` → `APPROVED`.
**Authorization:** Assigned approver only.
**Input:** `note?` — optional on approve.
**Data layer:** `transitionChangeRequest()`
**Side effects:** History row carrying the note.
**Returns:** `{ data: { id, status }, error: null }`

#### `rejectRequest(id, input)`
**Purpose:** `UNDER_REVIEW` → `REJECTED`. **Terminal.**
**Authorization:** Assigned approver only.
**Input:** `note` — **required**. A rejection without a reason is useless to the requester and to the audit trail.
**Validation:** `decisionSchema` — note 1–2000 chars.
**Side effects:** History row carrying the reason.
**Returns:** `{ data: { id, status }, error: null }`

#### `requestChanges(id, input)`
**Purpose:** `UNDER_REVIEW` → `CHANGES_REQUESTED`.
**Authorization:** Assigned approver only.
**Input:** `note` — **required**, same reasoning as reject.
**Side effects:** History row carrying the reason.
**Returns:** `{ data: { id, status }, error: null }`

#### `resumeEditing(id)`
**Purpose:** `CHANGES_REQUESTED` → `DRAFT`, returning the request to the requester for edit and resubmit.
**Authorization:** Requester (owner) only.
**Side effects:** History row. The approver assignment is **retained**, so resubmission returns it to the same person unless the requester changes it.
**Returns:** `{ data: { id, status }, error: null }`

#### `startImplementation(id)`
**Purpose:** `APPROVED` → `IN_PROGRESS`.
**Authorization:** Requester (owner) only — the person who raised the change drives the work, not the approver.
**Returns:** `{ data: { id, status }, error: null }`

#### `completeRequest(id)`
**Purpose:** `IN_PROGRESS` → `COMPLETED`. **Terminal.**
**Authorization:** Requester (owner) only.
**Returns:** `{ data: { id, status }, error: null }`

---

### Comments

#### `addComment(changeRequestId, input)`
**Purpose:** Post a comment on a request.
**Authorization:** Anyone who can **read** the parent request — delegates to the same read check, no separate permission.
**Input:** `body`
**Validation:** `commentSchema` — body 1–5000 chars, trimmed, non-empty after trim.
**Data layer:** `createComment()` in `src/lib/data/comments.ts`
**Note:** Comments are **immutable** — there is no `updateComment` or `deleteComment` action, by design.
**Returns:** `{ data: { id }, error: null }`

---

### Users (admin)

#### `setUserRole(userId, input)`
**Purpose:** Change a user's role.
**Authorization:** `ADMIN` only, checked in the data layer as well as middleware.
**Input:** `role`
**Validation:** `setRoleSchema` — must be a valid `Role`.
**Guard:** An Admin **cannot change their own role** — this prevents the last Admin locking everyone out of administration. The data layer rejects `userId === session.user.id` with `FORBIDDEN`.
**Latency note:** Because sessions are JWT, the change takes effect on the target user's next token refresh (up to 24h) or next sign-in. The UI must say so rather than implying it is instant.
**Returns:** `{ data: { id, role }, error: null }`

#### `setUserActive(userId, input)`
**Purpose:** Activate or deactivate a user. **Deactivation replaces deletion** — user records are never deleted, so attribution on historic requests survives.
**Authorization:** `ADMIN` only.
**Input:** `isActive`
**Guard:** An Admin cannot deactivate themselves.
**Effect:** Takes effect **immediately** for all reads and mutations — the data layer re-reads `isActive` on every call. Only route-level middleware gating lags until token refresh.
**Returns:** `{ data: { id, isActive }, error: null }`

---

## Read functions (`src/lib/data/`)

Not server actions — called directly by server components. Each still performs its own access check.

| Function | Access check |
|---|---|
| `getChangeRequestById(id, user)` | Requester, assigned approver, `MANAGER`, or `ADMIN`. Otherwise `NOT_FOUND` |
| `listMyRequests(user, filters)` | Scoped to `requesterId = user.id` |
| `listAwaitingMyDecision(user, filters)` | Requires `APPROVER`. Scoped to `approverId = user.id` and status in (`SUBMITTED`, `UNDER_REVIEW`) |
| `listAllRequests(user, filters)` | Requires `MANAGER` or `ADMIN` |
| `listCommentsFor(requestId, user)` | Delegates to `getChangeRequestById` |
| `listHistoryFor(requestId, user)` | Delegates to `getChangeRequestById` |
| `listApproverOptions(user)` | Any authenticated user. Returns **only** `{ id, name }` for active `APPROVER` users — a deliberately narrow projection so the picker cannot leak the user directory |
| `listUsers(user, filters)` | Requires `ADMIN` |

**Scoping is applied in the query, not after it.** `listMyRequests` filters by `requesterId` in the
`where` clause — it never fetches broadly and filters in memory.

---

## API Routes

**None**, other than `/api/auth/[...nextauth]` (Auth.js, not hand-written).

If an external consumer is ever needed, add routes under `/api/` following the standard error codes
above, with token-based auth — do not expose server actions.
