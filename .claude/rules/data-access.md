---
description: Data access rules. Apply when working with database, Prisma, auth, or API code.
globs: ["src/lib/data/**", "src/lib/db/**", "src/app/api/**", "prisma/**", "src/middleware.ts", "src/auth.ts"]
---

# Data Access Rules (Azure + Postgres + Prisma stack)

1. **All database access lives in `src/lib/data/`.** Components, pages, and server actions import functions from there — they never import the Prisma client or write queries directly.
2. The Prisma client is a **singleton** in `src/lib/db/` (avoid creating a new client per request; in dev, guard against hot-reload duplicates). The data layer imports it.
3. Data-access functions are **async** (Prisma is async-native). Validate inputs with Zod before they reach the data layer.
4. **Schema is defined in `prisma/schema.prisma`; migrations are Prisma-generated** (`npx prisma migrate dev` locally, `npx prisma migrate deploy` in the pipeline). Every new model or field must also be documented in `docs/architecture/database.md`.
5. **Authorization is enforced in the application, NOT the database — there is no RLS backstop.** Every data-access function performs the ownership/role check for the current user, and `src/middleware.ts` gates protected routes. A missing check is a security bug. (See `docs/architecture/security.md`.)
6. **Never interpolate user input into raw SQL.** Use Prisma's query API; avoid `$queryRawUnsafe`. Prisma parameterizes by default.
7. **Secrets are never committed.** `DATABASE_URL`, `AUTH_SECRET`, and the Entra client secret come from `.env.local` locally and from **Azure Key Vault** (via managed identity) in Azure. `.env*` is gitignored.
8. Destructive migrations (drop column/table, type changes that lose data) are **high-risk and not reversible by `git revert`** — back up first (point-in-time restore) and treat them as a deliberate, reviewed step.
