---
description: Testing rules. Apply when writing tests, adding features, or during validation.
globs: ["src/**", "tests/**", "**/*.test.*", "**/*.spec.*"]
---

# Testing Rules

1. Every **acceptance criterion** in the feature's `docs/development/features/F-XXX-user-stories.md` must have at least one test that verifies it. Reference the criterion ID in the test name (e.g. `'F-XXX AC-1: shows error for invalid email'`) so coverage is traceable — `/validate` confirms every criterion has a passing test. Cover the happy path at minimum, plus the error/edge cases the criteria imply.
2. Bug fixes must include a test that would have caught the bug.
3. Colocate unit tests next to the file they test: `component.tsx` → `component.test.tsx`.
4. End-to-end tests go in `tests/e2e/` and test real user flows, not implementation details.
5. Test behaviour, not implementation — test what the user sees and does, not internal state.
6. Use descriptive test names: "should show error message when email is invalid" not "test1".
7. Don't mock what you don't own — prefer testing against real (or seeded) data where practical.
8. Aim for meaningful coverage, not a percentage target. Cover: happy paths, error states, edge cases, and access control.

See @docs/architecture/tech-stack.md for current testing frameworks and configuration.
