# Architecture Decision Records (ADRs)

This directory holds **Architecture Decision Records** — short documents capturing a significant
technical decision, the options weighed, and why one was chosen. They're the durable "why" behind
the architecture, so a developer or AI agent arriving later can understand the reasoning instead of
guessing or re-litigating it.

## Files

- **`000-template.md`** — the blank form. **Copy it** to start a new ADR; don't edit it in place.
- **`NNN-short-title.md`** — one file per decision, numbered in the order taken
  (e.g. `001-initial-stack.md`, `002-auth-approach.md`). The `000-` prefix keeps the template
  sorted first.

## When to write one

Write an ADR when a decision is **significant and hard to reverse** — the stack, the data-access
pattern, an auth model, a major dependency, a boundary between systems. Small, easily-changed
choices don't need one (a line in the backlog's decisions log or a code comment is enough).

`/init-architecture` creates the first ADR (`001-initial-stack.md`) from the chosen stack. After
that, the `architect` skill proposes a new ADR whenever a decision clears the "significant" bar.

## How to add one

1. Copy `000-template.md` to the next number: `NNN-short-title.md`.
2. Fill in context, options considered, the decision, and its consequences + migration path.
3. Set **Status** (`Proposed` → `Accepted`; later `Deprecated` / `Superseded by ADR-XXX`).
4. Leave accepted ADRs in place as the record — supersede rather than delete, so the history of
   *why things changed* stays intact.

> Smaller decisions that don't warrant a full ADR can go in the **Decisions Log** table at the
> bottom of `docs/development/backlog.md`.
