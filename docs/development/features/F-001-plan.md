# F-001 — Plan

> Source: derived from docs/product/PRD.md + docs/architecture/ on 2026-08-28. Backlog: F-001.
> **Pure-infrastructure feature — no user story.** Per
> [features/README.md](README.md), scaffolding features have a plan only. Acceptance
> criteria below are stated here instead, and are verification-oriented rather than user-facing.

## Approach

Scaffold the `next-azure-postgres` stack as documented in
[tech-stack.md](../../architecture/tech-stack.md), fitting it around the infrastructure the template
already ships (`Dockerfile`, `azure-pipelines.yml`, `infra/`, `.env.example`, `.gitignore`) rather
than duplicating it.

Two constraints drive the shape:

1. **The existing `Dockerfile` expects `output: 'standalone'` and runs `npx prisma generate` before
   `npm run build`.** So `next.config.js` must set standalone output, and a valid `prisma/schema.prisma`
   must exist even though no models are defined yet.
2. **The directory structure in [overview.md](../../architecture/overview.md) is the target**, but
   F-001 creates only the skeleton — `src/lib/data/`, `src/lib/transitions.ts`, auth, and the domain
   models belong to later features. Creating empty placeholder files now would be noise.

**Explicitly out of scope for F-001:** authentication (F-002), the `User` model and `Role` enum
(F-003), environment/deployment config beyond `.env.example` (F-004), and every domain table
(F-005). This feature ends when the app runs, type-checks, lints, tests and builds.

## Acceptance criteria

- [x] **AC-1:** `npm install` completes and the dev server starts, serving a placeholder page at `/`.
- [x] **AC-2:** TypeScript is configured in **strict** mode and `npm run typecheck` passes with no errors.
- [x] **AC-3:** `npm run lint` passes (ESLint + Prettier, no warnings treated as acceptable).
- [x] **AC-4:** `npm run test` runs Vitest and passes, including a test proving the Tailwind `cn()` utility merges classes correctly.
- [x] **AC-5:** `npm run build` produces a **standalone** production build, so the shipped `Dockerfile` can build the image.
- [x] **AC-6:** Prisma is wired up — a valid `schema.prisma` targeting PostgreSQL exists, `npx prisma generate` succeeds, and the client is a **singleton** guarded against hot-reload duplication (per `.claude/rules/data-access.md` rule 2).
- [x] **AC-7:** Security headers from [security.md](../../architecture/security.md) are configured in `next.config.js`.
- [x] **AC-8:** Tailwind + shadcn/ui are initialised, with theme tokens in place and `components.json` configured for the `src/` layout.
- [x] **AC-9:** Playwright is configured and a smoke E2E test passes against the dev server.

## Files to create / change

| File | Why |
|------|-----|
| `package.json` | Dependencies + the exact scripts named in tech-stack.md **Key Commands** |
| `tsconfig.json` | Strict TypeScript, `@/*` path alias to `src/` |
| `next.config.js` | `output: 'standalone'` (Dockerfile depends on it) + security headers (AC-7) |
| `tailwind.config.ts` | Tailwind + shadcn/ui theme tokens |
| `postcss.config.js` | Tailwind/autoprefixer pipeline |
| `components.json` | shadcn/ui CLI config pointed at `src/` |
| `.eslintrc.json` | `next/core-web-vitals` + TypeScript + Prettier integration |
| `.prettierrc` | Formatting config |
| `.nvmrc` | Pin Node 20 to match the Dockerfile's `node:20-alpine` |
| `src/app/layout.tsx` | Root layout, font, global styles |
| `src/app/page.tsx` | Placeholder landing page (AC-1) |
| `src/app/globals.css` | Tailwind directives + shadcn/ui CSS custom properties |
| `src/lib/utils.ts` | `cn()` class-merge helper required by shadcn/ui components |
| `src/lib/utils.test.ts` | Unit test for `cn()` (AC-4) |
| `src/lib/db/index.ts` | Prisma client singleton with hot-reload guard (AC-6) |
| `prisma/schema.prisma` | Datasource + generator. **No models** — those arrive in F-003/F-005 |
| `vitest.config.ts` | Vitest + path alias resolution |
| `playwright.config.ts` | Playwright against the local dev server (AC-9) |
| `tests/e2e/smoke.spec.ts` | Smoke test: the app serves a page (AC-9) |
| `.dockerignore` | **Verify** it excludes `node_modules`/`.next` — already present, may need review |

## Tasks

- [x] Create `package.json` with dependencies and scripts (AC-1)
- [x] Create `tsconfig.json` in strict mode with the `@/*` alias (AC-2)
- [x] Run `npm install` (AC-1)
- [x] Create `next.config.js` with standalone output and security headers (AC-5, AC-7)
- [x] Configure Tailwind: `tailwind.config.ts`, `postcss.config.js`, `globals.css` (AC-8)
- [x] Create `components.json` and `src/lib/utils.ts` for shadcn/ui (AC-8)
- [x] Create `src/app/layout.tsx` and `src/app/page.tsx` (AC-1)
- [x] Create `prisma/schema.prisma` and `src/lib/db/index.ts` singleton (AC-6)
- [x] Configure ESLint + Prettier (AC-3)
- [x] Configure Vitest (`vitest.config.ts`) (AC-4)
- [x] Test: `cn()` merges and de-duplicates Tailwind classes (AC-4)
- [x] Test: security headers match security.md (AC-7)
- [x] Test: Prisma client is cached on globalThis (AC-6)
- [x] Configure Playwright (`playwright.config.ts`) (AC-9)
- [x] Test: E2E smoke test loads `/` and finds the app rendered (AC-9)
- [x] Add Playwright artifacts to `.gitignore`
- [x] Verify: `npm run typecheck` passes (AC-2)
- [x] Verify: `npm run lint` passes (AC-3)
- [x] Verify: `npx prisma generate` succeeds (AC-6)
- [x] Verify: `npm run build` emits `.next/standalone` (AC-5)

## Criterion → test coverage

| Criterion | Test | Status |
|-----------|------|--------|
| AC-1 | `tests/e2e/smoke.spec.ts` — "F-001 AC-1: serves the landing page" | ✅ |
| AC-2 | `npm run typecheck` (command verification) | ✅ |
| AC-3 | `npm run lint` (command verification) | ✅ |
| AC-4 | `src/lib/utils.test.ts` — 6 tests, all `F-001 AC-4:` | ✅ |
| AC-5 | `npm run build` + `.next/standalone/server.js` present; `security-headers.test.ts` pins `output: 'standalone'` | ✅ |
| AC-6 | `npx prisma generate` + `src/lib/db/index.test.ts` — 2 tests | ✅ |
| AC-7 | `src/lib/security-headers.test.ts` — 4 tests, plus E2E header assertion | ✅ |
| AC-8 | `npm run build` compiles Tailwind; E2E asserts computed font-size proves the pipeline ran | ✅ |
| AC-9 | `tests/e2e/smoke.spec.ts` — 3 tests | ✅ |

> **Honest note on coverage:** AC-2, AC-3 and AC-5 are verified by running commands, not by unit
> tests — asserting "the linter passes" inside a test the linter also checks is circular. Their
> evidence is the recorded output below.

## Verification results

Run on 2026-08-28, all from a clean `.next`:

| Check | Command | Result |
|-------|---------|--------|
| Type check | `npm run typecheck` | exit 0, no errors |
| Lint | `npm run lint` | exit 0 — "No ESLint warnings or errors", "All matched files use Prettier code style" |
| Unit tests | `npm run test` | exit 0 — **13 passed** across 3 files |
| Prisma client | `npx prisma generate` | exit 0 — Prisma Client v5.22.0 generated |
| Build | `npm run build` | exit 0 — compiled successfully, no config warnings |
| Standalone output | — | `.next/standalone/server.js` present (what the Dockerfile copies) |
| E2E | `npx playwright test` | exit 0 — **3 passed** |

## Deviations from PRD / architecture

### 1. Identity models moved from F-003 into F-001 — **architecture doc updated**

**What happened:** the plan called for a datasource-only `schema.prisma`, with `User`, `Account` and
the `Role` enum arriving in F-003. **Prisma refuses to generate a client when no models are
defined**, and the shipped `Dockerfile` runs `npx prisma generate` — so a model-free schema would
have left the container build broken and made the `src/lib/db` singleton unimportable.

**Resolution:** `User`, `Account` and `Role` are implemented in F-001, **exactly as specified in
[database.md](../../architecture/database.md)**. Nothing was designed here; the models were built
earlier than scheduled, not differently. Backlog F-003 has been narrowed to the access-control
policies and middleware gate that remain.

**Why this is defensible:** Phase 1's stated goal in the backlog is already "Project scaffolding,
auth, and core data model."

### 2. `vite-tsconfig-paths` removed

ESM-only, and cannot be loaded from a CJS `vitest.config.ts`. Replaced with a one-line manual alias.
Per `.claude/rules/dependencies.md` rule 6, a dependency for a single line was not worth a workaround.

### 3. Prettier does not format Markdown

The architecture docs and ADRs are hand-authored with deliberate table alignment and wrapping.
Prettier reflowed 19 of them. `*.md` is excluded in `.prettierignore` so formatting is enforced on
code but not prose.

### 4. E2E runs on port 3456, not 3000

**Ports 3000 and 3100 are occupied by other Next.js projects on this machine** — 3000 serves an
unrelated app from `C:\Users\kyassa251\.claude\change-management-system`. With
`reuseExistingServer` enabled, Playwright would have attached to it and reported results for the
wrong application. The suite now uses a dedicated port with `reuseExistingServer: false`, overridable
via `E2E_PORT`.

### 5. No migration created

`prisma migrate dev` requires a reachable database, which is not configured yet (F-004). The schema
is defined and the client generates; **the initial migration is created in F-003** when the database
connection exists. Recorded so `prisma/migrations/` being absent is understood as deliberate.
