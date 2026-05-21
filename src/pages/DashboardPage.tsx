import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Trash2,
  FolderOpen,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useProjectStore } from '@/store/useProjectStore'
import { AuthModal } from '@/components/auth/AuthModal'
import type { Project } from '@/store/useProjectStore'

function ProjectCard({
  project,
  onLoad,
  onDelete,
}: {
  project: Project
  onLoad: (id: string) => void
  onDelete: (id: string) => void | Promise<void>
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${project.name}"?`)) return
    setDeleting(true)
    try {
      await onDelete(project.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onLoad(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onLoad(project.id)
        }
      }}
      className="group relative flex cursor-pointer flex-col rounded-xl border bg-[#111111] p-4 transition-all hover:border-[#3b82f6]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/60"
      style={{ borderColor: '#2a2a2a' }}
    >
      <div
        className="mb-3 h-20 w-full rounded-lg"
        style={{
          background: project.backgroundColor ?? '#000',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex h-full items-center justify-center">
          <span className="text-2xl opacity-30" aria-hidden="true">
            ♪
          </span>
        </div>
      </div>

      <h3 className="truncate text-sm font-medium text-white">
        {project.name}
      </h3>
      <p className="mt-0.5 text-[10px] text-white/40">
        {project.format.replace('_', ' ')} ·{' '}
        {new Date(project.updatedAt).toLocaleDateString()}
      </p>

      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete project ${project.name}`}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const projects = useProjectStore((s) => s.projects)
  const loading = useProjectStore((s) => s.loading)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const loadProject = useProjectStore((s) => s.loadProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    if (user) loadProjects()
  }, [user, loadProjects])

  const handleLoad = (id: string) => {
    loadProject(id)
    navigate('/studio')
  }

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2
          className="h-6 w-6 animate-spin text-white/40"
          aria-label="Loading"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <header
        className="border-b px-6 py-4"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="AuSpec home">
            <img
              src="/auspec-logo.png"
              alt=""
              className="h-7 w-7 rounded-full object-cover"
              style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.7))' }}
            />
            <span className="font-semibold">AuSpec</span>
          </a>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/studio')}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-white/80 transition-colors hover:text-white"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              Studio
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {!user && (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-full border border-white/10 p-5">
              <FolderOpen
                className="h-8 w-8 text-white/30"
                aria-hidden="true"
              />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Your Projects</h2>
            <p className="mb-6 text-sm text-white/50">
              Sign in to save and manage your audio visualizations
            </p>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white"
              style={{
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              }}
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">My Projects</h1>
                <p className="text-sm text-white/40">
                  {projects.length} saved project
                  {projects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/studio')}
                className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Project
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2
                  className="h-6 w-6 animate-spin text-white/40"
                  aria-label="Loading projects"
                />
              </div>
            ) : projects.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center"
                style={{ borderColor: '#2a2a2a' }}
              >
                <FolderOpen
                  className="mb-3 h-8 w-8 text-white/20"
                  aria-hidden="true"
                />
                <p className="text-sm text-white/40">No projects yet</p>
                <p className="mt-1 text-xs text-white/30">
                  Go to Studio and save your first project
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onLoad={handleLoad}
                    onDelete={deleteProject}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default DashboardPage
