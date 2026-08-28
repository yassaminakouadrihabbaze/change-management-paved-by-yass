# Communication Rules

1. **Explain before acting.** Before running commands or editing files, briefly say what you're about to do and why. One sentence is enough.
   - ✅ "I'm adding a migration file to create the users table."
   - ❌ *silently creates files*

2. **Decision & confirmation policy.** This is the policy that commands refer to at their decision/confirmation points (e.g. `/new-feature`, `/init-architecture`, `/validate`).
   **Default: decisions are the human's.** At a confirmation point, present the choice clearly —
   - what the options are,
   - pros and cons of each,
   - which you'd recommend and why —
   then **wait for the user to decide**. Don't proceed past a confirmation point on your own.

   > A template may relax this policy by overriding *this rule* (and adding an `autonomy.md`) — see how the `vibe` overlay does it. Commands defer to whatever this policy says; they don't hard-code "ask the user", so flipping the policy here changes their behaviour everywhere.

3. **Don't assume experience level.** If using a technical concept, add a brief parenthetical explanation.
   - ✅ "I'll add a database index (a structure that makes looking up records much faster)"
   - ❌ "I'll add an index"

4. **Flag risks early.** If something could break existing functionality, say so before doing it.

5. **Keep it concise.** Explain enough to be helpful, not so much that it's overwhelming. If someone wants more detail, they'll ask.
