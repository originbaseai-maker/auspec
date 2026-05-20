import { LayoutGrid } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-bg-secondary">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <span className="text-sm text-text-muted">Your saved visualizers</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-surface p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-bg-secondary text-text-muted">
              <LayoutGrid className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-medium">No visualizers yet</h2>
            <p className="max-w-md text-sm text-text-muted">
              Create your first visualizer in the Studio and it will appear here.
              You can revisit, duplicate, or export any saved project.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
