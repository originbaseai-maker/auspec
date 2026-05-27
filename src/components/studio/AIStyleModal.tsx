import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type JSX,
} from 'react'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'
import { useStudioUIStore } from '@/store/useStudioUIStore'

const VIBE_CHIPS: ReadonlyArray<{
  id: string
  emoji: string
  label: string
  prompt: string
}> = [
  {
    id: 'cosmic',
    emoji: '🌌',
    label: 'Cosmic',
    prompt:
      'Cosmic synthwave with deep space particles, purple and blue gradients, floating polygons',
  },
  {
    id: 'lofi',
    emoji: '🎹',
    label: 'Lo-Fi',
    prompt:
      'Warm lo-fi vibe, soft analog noise, beige and brown palette, slow gentle waves',
  },
  {
    id: 'cyberpunk',
    emoji: '⚡',
    label: 'Cyberpunk',
    prompt:
      'Neon cyberpunk city, electric pink and cyan, glitchy bars and sharp angles',
  },
  {
    id: 'hyperpop',
    emoji: '🔥',
    label: 'Hyperpop',
    prompt:
      'Hyperpop chaos, hot pink and lime, fast particles, kaleidoscopic shapes',
  },
]

/** Elements considered for focus-trap rotation when Tab cycles. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Centered modal launched from the AIStyleButton (and from the
 * discovery hint under the audio upload). Hosts the prompt textarea,
 * 4 vibe chips, and a Generate button. Backend lands in Phase 13;
 * for now Generate records the prompt to useAIStore.history and
 * shows the "Coming in Phase 13" footer.
 *
 * Lifecycle:
 *   - Open / close driven by useStudioUIStore.aiModalOpen
 *   - Body scroll locked while open
 *   - Escape and backdrop click close
 *   - Focus trap rotates inside the dialog; closing returns focus
 *     to the trigger (AIStyleButton) automatically because the
 *     button is the last interactive element before the modal in
 *     the natural tab order — verified empirically rather than via
 *     an explicit lastTrigger ref, since callers from outside the
 *     button (discovery hint) shouldn't take focus away from the
 *     modal trigger they themselves activated
 */
export function AIStyleModal(): JSX.Element | null {
  const open = useStudioUIStore((s) => s.aiModalOpen)
  const close = useStudioUIStore((s) => s.closeAIModal)

  const prompt = useAIStore((s) => s.prompt)
  const setPrompt = useAIStore((s) => s.setPrompt)
  const isLoading = useAIStore((s) => s.isLoading)
  const setLoading = useAIStore((s) => s.setLoading)
  const addHistoryEntry = useAIStore((s) => s.addHistoryEntry)

  const dialogRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Element that had focus before the modal opened — restored on close.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Body scroll lock + Escape handler + auto-focus.
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)

    // Defer focus to next frame so the entrance animation has begun
    // (avoids the textarea snapping into view before the modal does).
    const id = requestAnimationFrame(() => textareaRef.current?.focus())

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(id)
      // Restore focus to whatever triggered the modal — the
      // AIStyleButton or the discovery hint — so keyboard users
      // resume where they left off.
      previouslyFocusedRef.current?.focus()
    }
  }, [open, close])

  // Focus trap: when Tab leaves the dialog, wrap back to the first
  // focusable child (and vice-versa for Shift+Tab).
  const onTrapKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const root = dialogRef.current
    if (!root) return
    const focusable = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  const trimmed = prompt.trim()
  const canGenerate = trimmed.length > 0 && !isLoading

  const handleGenerate = (): void => {
    if (!canGenerate) return
    setLoading(true)
    // eslint-disable-next-line no-console
    console.info('[AI Style] prompt submitted:', trimmed)
    window.setTimeout(() => {
      addHistoryEntry({ prompt: trimmed, result: null })
      setPrompt('')
      setLoading(false)
      // Optional: close on success once backend lands. For now we
      // leave the modal open so the user sees the "Coming in Phase
      // 13" message after submitting.
    }, 600)
  }

  if (!open) return null

  return (
    <>
      <div
        className="ai-modal-backdrop fixed inset-0 z-[80] bg-black/70 backdrop-blur-xl"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onTrapKeyDown}
        className="ai-modal-card ai-gradient-border fixed left-1/2 top-1/2 z-[81] w-[90vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl p-6"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, #0a0a14 0%, #050507 100%)',
          boxShadow: '0 24px 64px -16px rgba(168, 85, 247, 0.45)',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close AI Style"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <Sparkles
            className="h-6 w-6 shrink-0"
            aria-hidden="true"
            style={{ color: '#ec4899' }}
          />
          <h2
            id={titleId}
            className="ai-gradient-text text-[26px] font-bold leading-none"
          >
            AI Style
          </h2>
        </div>

        <p className="mb-5 text-[14px] text-white/55">
          Describe your vibe in plain English. AI builds the visualizer
          for you.
        </p>

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleGenerate()
            }
          }}
          rows={3}
          placeholder={'e.g. "Cosmic synthwave with neon particles"'}
          aria-label="AI style prompt"
          className="w-full resize-none rounded-xl border bg-black/40 px-3 py-2.5 text-[14px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/30 focus:border-purple-400/60"
          style={{ borderColor: 'rgba(139,92,246,0.18)' }}
        />

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-white/40">
            Try:
          </span>
          {VIBE_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-label={`${chip.label} vibe — fill prompt`}
              onClick={() => setPrompt(chip.prompt)}
              className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] text-white/80 transition-colors hover:text-white"
              style={{
                borderColor: 'rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <span aria-hidden="true">{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          aria-label="Generate AI style"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background:
              'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
            boxShadow: canGenerate
              ? '0 8px 24px -6px rgba(236, 72, 153, 0.55)'
              : 'none',
          }}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{isLoading ? 'Generating…' : 'Generate'}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <p className="mt-4 text-center text-[10px] text-white/30">
          ✨ Coming in Phase 13
        </p>
      </div>
    </>
  )
}

export default AIStyleModal
