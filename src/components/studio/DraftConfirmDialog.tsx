import { useEffect, type JSX } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useLayerStore } from '@/store/useLayerStore'

interface Props {
  open: boolean
  onAction: (action: 'save' | 'discard' | 'cancel') => void
}

/**
 * Three-button confirm shown when the user tries to switch off an
 * unsaved draft. Buttons map to the callback's three actions. Escape
 * and backdrop click both resolve as 'cancel'.
 */
export function DraftConfirmDialog({
  open,
  onAction,
}: Props): JSX.Element | null {
  const draft = useLayerStore((s) => s.draftLayer)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAction('cancel')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onAction])

  if (!open || !draft) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={() => onAction('cancel')}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save your draft?"
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-[#0a0a0a] shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: '#1a1a1a' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              }}
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              Save your draft?
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onAction('cancel')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[12px] text-white/70">
            You have an unsaved{' '}
            <strong className="text-white">{draft.name}</strong> draft. What
            would you like to do?
          </p>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4"
          style={{ borderColor: '#1a1a1a' }}
        >
          <button
            type="button"
            onClick={() => onAction('discard')}
            className="rounded-md border px-3 py-1.5 text-[11px] text-white/60 hover:border-red-400/40 hover:text-red-400"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onAction('cancel')}
            className="rounded-md border px-3 py-1.5 text-[11px] text-white/80 hover:text-white"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onAction('save')}
            className="rounded-md px-4 py-1.5 text-[11px] font-medium text-white"
            style={{
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            Save as Layer
          </button>
        </div>
      </div>
    </>
  )
}

export default DraftConfirmDialog
