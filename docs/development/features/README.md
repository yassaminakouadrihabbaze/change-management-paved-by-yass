# Feature Specs

Each feature gets its own spec + plan here, **created just-in-time** when `/new-feature` starts it —
derived from the durable source docs (`docs/product/PRD.md` and `docs/architecture/`), not written
all upfront. This keeps each feature's detail fresh and lets work deviate without rewriting a pile
of stale stories.

## Files per feature (`F-XXX` matches the backlog ID)

- **`F-XXX-user-stories.md`** — the *what*: user story + acceptance criteria, each criterion ID'd.
  Written for any **user-facing** feature. Pure-infrastructure items (e.g. scaffolding, env config)
  may skip the story and have a plan only.
- **`F-XXX-plan.md`** — the *how*: approach, files to touch, an ordered task checklist, the
  criterion→test coverage table, and a note of any deviations from the PRD/architecture.

These complete the traceability chain: `backlog F-XXX` → these files → branch `feature/…` →
commit `Refs: F-XXX`.

> Completed features keep their files (they're the record). `backlog.md` tracks status;
> `current-phase.md` tracks where we are now.

---

## Format: `F-XXX-user-stories.md`

```markdown
# F-XXX — [Feature name]

> Source: derived from docs/product/PRD.md + docs/architecture/ on [date]. Backlog: F-XXX.

## Story
**As a** [persona]
**I want to** [action]
**So that** [benefit]

## Acceptance criteria
- [ ] **AC-1:** [specific, testable criterion]
- [ ] **AC-2:** [specific, testable criterion]
- [ ] **AC-3:** [specific, testable criterion]

## Notes
[edge cases, design considerations, anything the build should know]
```

Criterion IDs are **feature-scoped** (`AC-1` within `F-XXX`). If you want machine-verified
coverage, reference them as `F-XXX AC-1` in the test name so a check can confirm every criterion
has a passing test.

---

## Format: `F-XXX-plan.md`

```markdown
# F-XXX — Plan

> Source: derived from docs/product/PRD.md + docs/architecture/ on [date].

## Approach
[1-3 sentences: how this will be built, key decisions taken from the architecture docs]

## Files to create / change
- `path/to/file` — [why]

## Tasks
- [ ] [implementation task] (AC-1)
- [ ] Test: [what it verifies] (AC-1)
- [ ] [implementation task] (AC-2)
- [ ] Test: [what it verifies] (AC-2)

## Criterion → test coverage
| Criterion | Test | Status |
|-----------|------|--------|
| AC-1 | [test name/location] | ⬜ |
| AC-2 | [test name/location] | ⬜ |

## Deviations from PRD / architecture
[None — or: what changed and why. Material deviations must be written back into the PRD/architecture
docs during /commit-feature so the source of truth stays accurate.]
```
