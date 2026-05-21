import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U'
  const emailDisplay = user.email ?? ''

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border py-1 shadow-xl"
          style={{ background: '#111', borderColor: '#2a2a2a' }}
        >
          <div
            className="border-b px-3 py-2"
            style={{ borderColor: '#2a2a2a' }}
          >
            <p className="truncate text-[11px] text-white/50">{emailDisplay}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
