---
name: product-validator
description: Validate work against product requirements. Use when checking if a feature meets its acceptance criteria, when the user asks if something is done, or during the validate workflow.
allowed-tools: Read, Grep, Glob
---

# Product Validation Skill

Compare implemented features against the Product Requirements Document and backlog.

## Process
1. Read @docs/product/PRD.md for overall product vision and scope
2. Read the feature's `docs/development/features/F-XXX-user-stories.md` for its acceptance criteria (`AC-1`, `AC-2`, …); `docs/development/backlog.md` is the feature index, not the criteria source
3. Check the actual implementation against each criterion (a criterion is met only when a passing test covers it — see the plan's coverage table)
4. Report clearly per criterion: what's met ✅, what's not ❌, what's partially done 🔶

## Rules
- Be honest. If something doesn't meet the criteria, say so clearly.
- Distinguish between "not built yet" and "built wrong."
- If acceptance criteria are vague, flag this: "The criteria for X could be more specific. Suggest refining it to: [suggestion]"
- Don't move goalposts. Only validate against documented criteria, not your own ideas of what it should do.
