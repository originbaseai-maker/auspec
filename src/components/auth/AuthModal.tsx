import { useEffect, useState } from 'react'
import { X, Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
}

export function AuthModal({ onClose, defaultTab = 'signin' }: Props) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (tab === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
      else onClose()
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error)
      else setSuccess('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tab === 'signin' ? 'Sign in' : 'Create account'}
    >
      <div
        className="w-80 rounded-xl border bg-[#111111] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: '#2a2a2a' }}
        >
          <div
            className="flex gap-1 rounded-md border p-0.5"
            style={{ borderColor: '#2a2a2a' }}
          >
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t)
                  setError(null)
                  setSuccess(null)
                }}
                className="rounded px-3 py-1 text-xs font-medium transition-all"
                style={{
                  background:
                    tab === t
                      ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                      : 'transparent',
                  color: tab === t ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            type="button"
            onClick={async () => {
              const { error } = await signInWithGoogle()
              if (error) setError(error)
            }}
            className="flex w-full items-center justify-center gap-3 rounded-md border py-2.5 text-sm text-white transition-colors hover:bg-white/5"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div
              className="flex-1 border-t"
              style={{ borderColor: '#2a2a2a' }}
            />
            <span className="text-[10px] uppercase tracking-wider text-white/30">
              or
            </span>
            <div
              className="flex-1 border-t"
              style={{ borderColor: '#2a2a2a' }}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">
              Email
            </label>
            <div
              className="flex items-center gap-2 rounded-md border bg-[#0a0a0a] px-3 py-2"
              style={{ borderColor: '#2a2a2a' }}
            >
              <Mail className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSubmit()
                }}
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/50">
              Password
            </label>
            <div
              className="flex items-center gap-2 rounded-md border bg-[#0a0a0a] px-3 py-2"
              style={{ borderColor: '#2a2a2a' }}
            >
              <Lock className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSubmit()
                }}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                autoComplete={
                  tab === 'signin' ? 'current-password' : 'new-password'
                }
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
              <p className="text-xs text-green-400">{success}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
          >
            {loading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : tab === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
