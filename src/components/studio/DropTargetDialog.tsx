import { useEffect } from 'react'
import { Film, Image as ImageIcon, Star, X } from 'lucide-react'

export type DropTargetChoice =
  | 'background'
  | 'logo'
  | 'video_layer'
  | 'video_background'

export interface DropTargetOption {
  choice: DropTargetChoice
  label: string
  hint?: string
  icon: 'background' | 'logo' | 'video' | 'film'
}

interface Props {
  fileName: string
  options: DropTargetOption[]
  onPick: (choice: DropTargetChoice) => void
  onCancel: () => void
}

/**
 * Lightweight centered modal shown when a dropped image / video could
 * land in more than one place (Background / Logo / Video layer). The
 * old behaviour silently routed images into the cover-art store,
 * which the renderer interprets as BG + centred image — looked like
 * the dropped image was being placed twice. This dialog forces the
 * choice up-front so there's no ambiguity.
 *
 * Visual style mirrors the SavePresetModal and DraftConfirmDialog
 * patterns elsewhere in the studio (centred card, dark border,
 * blurred backdrop, Escape to cancel). Kept intentionally
 * keyboard-friendly: each option is a button, Escape cancels.
 */
export function DropTargetDialog({
  fileName,
  options,
  onPick,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const renderIcon = (icon: DropTargetOption['icon']) => {
    if (icon === 'background') {
      // Re-uses the iconography vocabulary from CategoryIcon's
      // 'background' tile (rect + small accent) for visual consistency.
      return <ImageIcon className="h-5 w-5" aria-hidden="true" />
    }
    if (icon === 'logo') return <Star className="h-5 w-5" aria-hidden="true" />
    return <Film className="h-5 w-5" aria-hidden="true" />
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose drop target"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="w-80 rounded-xl border bg-[#111111] p-5 shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add as…</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-1 text-white/40 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mb-4 truncate text-[11px] text-white/50">{fileName}</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.choice}
              type="button"
              onClick={() => onPick(opt.choice)}
              className="flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-white/90 transition-colors hover:border-[#3b82f6]/40 hover:bg-white/[0.03]"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))',
                  color: '#bfdbfe',
                }}
              >
                {renderIcon(opt.icon)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium">{opt.label}</p>
                {opt.hint && (
                  <p className="truncate text-[10px] text-white/40">
                    {opt.hint}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-md border py-2 text-[12px] text-white/60 hover:text-white"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DropTargetDialog
