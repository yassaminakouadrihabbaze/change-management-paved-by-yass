# API Contracts

> **Status:** Draft — populated during `/init-architecture`.
> Define endpoints/actions BEFORE implementing them. Stack: **Next.js + Prisma + Postgres (Azure)**.

## Conventions

- **Next.js Server Actions** are preferred for internal mutations; add API routes under `/api/` for
  external integrations or anything that needs an HTTP endpoint.
- All responses use a consistent shape: `{ data, error }`.
- **Authentication:** Auth.js session (HTTP-only cookie). The Auth.js handler lives at
  `/api/auth/[...nextauth]`. Read the session server-side via the `auth()` helper from `src/auth.ts`.
- **Authorization:** check it explicitly — `src/middleware.ts` gates routes; data-access functions in
  `src/lib/data/` perform per-record ownership/role checks. There is no database RLS backstop, so
  **every mutation and sensitive read must check access in code.**
- Data-access functions are `async` (Prisma is async-native).
- Validate all inputs with Zod before they reach the data layer.

## Response Shape

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: { message: string, code: string } }
```

## Authentication

Handled by Auth.js (NextAuth v5) with the Microsoft Entra ID provider — no custom endpoints needed
for sign in / sign out / callback (all under `/api/auth/*`). Document protected-route rules during
`/init-architecture`.

## Server Actions

> Document each action as it's designed:

#### `createExample(formData: FormData)`
**Purpose:** [What this action does]
**Auth required:** Yes — `auth()` must return a session
**Authorization:** [Which role / ownership check applies]
**Input:** [Expected form fields]
**Validation:** [Zod schema applied]
**Data layer:** calls `src/lib/data/example.ts` (async, performs the record-level check)
**Returns:** `{ data, error }`

---

## API Routes (only if needed)

#### `GET /api/example`
**Purpose:** [What this endpoint does]
**Auth required:** Yes / No
**Request:** [Query params, headers]
**Response:**
```json
{ "data": {}, "error": null }
```
**Error cases:**
- 401: Not authenticated
- 403: Authenticated but not authorized (failed the middleware/data-layer check)
- 404: Resource not found
- 400: Invalid input
- 500: Server error
