/**
 * Placeholder landing page (F-001 scaffolding).
 *
 * Replaced in F-002, when `/` redirects to `/dashboard` for signed-in users and
 * to `/signin` otherwise. It exists now so the scaffold is demonstrably running.
 */
export default function HomePage() {
  const nextUp = [
    { id: 'F-002', label: 'Authentication — Entra ID sign in / sign out' },
    { id: 'F-003', label: 'User model, Role enum, middleware route gate' },
    { id: 'F-005', label: 'Change request data model + create/edit draft' },
  ]

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          F-001 · Project scaffolding
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Change Management System</h1>
        <p className="text-lg text-muted-foreground">
          Create, review, approve and track change requests — with role-based actions, comments, a
          full status history, and a filterable dashboard.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Next up
        </h2>
        <ul className="space-y-3">
          {nextUp.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              <span className="font-mono font-medium text-foreground">{item.id}</span>
              <span className="text-muted-foreground">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        The scaffold is running. See <code className="font-mono">docs/architecture/</code> for the
        design these features are built from.
      </p>
    </main>
  )
}
