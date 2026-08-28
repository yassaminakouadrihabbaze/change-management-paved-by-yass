# Git Workflow

## Overview

This project uses **trunk-based development** with short-lived feature branches. `main` is always deployable.

```
main (always deployable → auto-deploys to production)
 ├── feature/user-auth      (short-lived, merged via PR)
 ├── feature/dashboard       (short-lived, merged via PR)
 └── hotfix/login-fix        (urgent, fast-tracked)
```

## Environments

The branch → environment model below is stack-agnostic. The concrete hosting and database
backing each environment are defined by the project's stack — see @docs/development/environments.md.

| Environment | Branch/Trigger | Notes |
|-------------|---------------|-------|
| **Production** | `main` (auto-deploy) | Live users; deploys on merge to `main` |
| **Preview** | Any PR or branch push | Auto-generated per PR for QA / demos |
| **Local dev** | Your machine | Points at the shared preview/dev backend |

## Daily Workflow

### Starting work
```bash
# Use the Claude command (recommended):
/new-feature feature-name

# Or manually:
git checkout main
git pull origin main
git checkout -b feature/feature-name
```

### During work
- Commit frequently with clear messages
- Run `/validate` before considering work "done"
- If Claude goes off track, use `git diff` to review changes or `git stash` to set them aside

### Finishing work
```bash
# Use the Claude command (recommended):
/commit-feature

# Or manually:
# (run the project's lint, type-check and test commands — see tech-stack.md Key Commands)
git add -A
git commit -m "feat(scope): description"
git push origin feature/feature-name
# → Create PR in GitHub → CI creates a preview deployment → Review → Merge
```

### Hotfixes
```bash
/hotfix brief-description
```

## Commit Message Format

```
type(scope): short description

Longer description if needed.

Refs: F-001
```

**Types:** feat, fix, docs, refactor, test, chore
**Scope:** area of code (auth, dashboard, db, api, etc.)

## Rollback

If something breaks in production:
```bash
# Option A: Revert the commit
git revert [commit-hash]
git push origin main

# Option B: Host instant rollback (if your platform supports it)
# Re-promote the previous successful deployment from your host's dashboard (see environments.md)
```

## Branch Protection (set up in GitHub)

Recommended settings for `main`:
- [ ] Require pull request before merging
- [ ] Require status checks to pass (CI build + tests)
- [ ] Do not allow force pushes
- [ ] Do not allow deletions
