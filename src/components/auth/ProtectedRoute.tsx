import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { AuthModal } from '@/components/auth/AuthModal'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)
  const [waitingForOAuth, setWaitingForOAuth] = useState(false)

  // OAuth callback detection: when we land on this route via an OAuth
  // redirect the URL carries `#access_token=...` (implicit grant) or
  // `?code=...` / `?error=...` (PKCE). Supabase's auth listener processes
  // these asynchronously — give it ~2 s before falling back to the sign-in
  // prompt so we don't flash the prompt over an in-flight session.
  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)
    const hasOAuthCallback =
      hash.includes('access_token') ||
      params.has('error') ||
      params.has('code')

    if (hasOAuthCallback) {
      setWaitingForOAuth(true)
      const timer = window.setTimeout(() => setWaitingForOAuth(false), 2000)
      return () => window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!loading && !user && !waitingForOAuth) {
      setShowAuth(true)
    }
    if (user) {
      setShowAuth(false)
    }
  }, [loading, user, waitingForOAuth])

  if (loading || waitingForOAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" aria-hidden="true" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        {showAuth && (
          <AuthModal
            onClose={() => {
              setShowAuth(false)
              // If still not logged in after closing, redirect home.
              if (!useAuthStore.getState().user) {
                navigate('/')
              }
            }}
          />
        )}
        <p className="text-sm text-white/50">Sign in to access the Studio</p>
        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white"
          style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-xs text-white/30 transition-colors hover:text-white/60"
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
