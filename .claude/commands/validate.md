---
description: Validate current work against the feature's acceptance criteria, architecture, and code quality standards.
---

# Validate Current Work

Run all validation checks and report results. Explain each step briefly. Where a check finds
fixable problems, handle them per the **decision policy** in `.claude/rules/communication.md`
(default: show the problems and ask before fixing; if an `autonomy.md` policy is in effect: fix and
re-run, escalating per `.claude/rules/escalation.md` if it can't be resolved after a couple of
genuine attempts).

## Step 1: Code Quality
"🔍 Running code quality checks..."
Run the project's quality gates in order, reporting pass/fail for each: **lint, type-check, tests, build**. The concrete commands are under **Key Commands** in @docs/architecture/tech-stack.md (default Next.js stack: `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`).

If any fail, handle per the decision policy above.

## Step 2: Acceptance-criteria coverage
"📋 Checking the feature against its acceptance criteria..."
Find the feature being worked on (from the branch name / current-phase). Read its spec and plan:
- `docs/development/features/F-XXX-user-stories.md` — the acceptance criteria (`AC-1`, `AC-2`, …)
- `docs/development/features/F-XXX-plan.md` — the criterion → test coverage table

For **each** acceptance criterion, verify there is a test that exercises it **and that the test passes**. Treat a criterion as met only when a passing test covers it — not by inspection alone. Update the plan's coverage table to reflect reality.

Report per criterion: ✅ covered by a passing test, 🔶 implemented but no/failing test, ❌ not met.

(Pure-infrastructure features may have no story; in that case validate against the plan's tasks and skip the criteria coverage.) Also skim @docs/product/PRD.md for relevant out-of-scope items.

## Step 3: Architecture Compliance
"🏗️ Checking architecture compliance..."
Read @docs/architecture/overview.md and verify:
- New code follows the documented component boundaries
- Database changes have migration files
- API changes match documented contracts
- Data access stays within the documented data-access layer (see the data-access rule in `.claude/rules/` and @docs/architecture/overview.md)

Report findings.

## Step 4: Security Quick Check
"🔒 Running security check..."
Read @docs/architecture/security.md and verify:
- No secrets or API keys in committed code
- Authentication/authorization on new endpoints
- Input validation on new forms or API inputs
- SQL injection prevention (parameterized queries)

Report findings.

## Step 5: Summary
Present a summary table:
| Check | Status |
|-------|--------|
| Lint | ✅/❌ |
| Types | ✅/❌ |
| Tests | ✅/❌ |
| Build | ✅/❌ |
| Criteria coverage | ✅ N/N / ❌ |
| Architecture | ✅/❌ |
| Security | ✅/❌ |

If all pass: "✅ All checks passed (every acceptance criterion has a passing test). Ready to commit with `/commit-feature`."
If any fail: "❌ Some checks need attention. [handle per the decision policy], then run `/validate` again."
