import {
  useEffect,
  useRef,
  type JSX,
} from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'

/**
 * Quick-prompt chips. Each fills the textarea with a fully-formed
 * prompt for that vibe — no editing required, but the user can still
 * tweak before generating.
 */
const VIBE_CHIPS: ReadonlyArray<{ id: string; emoji: string; label: string; prompt: string }> = [
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

interface Props {
  /**
   * When 'desktop', sizes and spacing scale up slightly. Mobile is
   * tighter so the card doesn't dominate the bottom sheet.
   */
  variant?: 'mobile' | 'desktop'
}

/**
 * Hero card promoting AI Style. Renders ABOVE the Tools grid on both
 * mobile (inside the Tools bottom sheet) and desktop (in the right
 * panel). Backed by the same useAIStore as the legacy AIPanel, so
 * prompt state survives the swap when (eventually) the AI generation
 * backend lands.
 */
export function AIHeroCard({ variant = 'mobile' }: Props): JSX.Element {
  const prompt = useAIStore((s) => s.prompt)
  const setPrompt = useAIStore((s) => s.setPrompt)
  const isLoading = useAIStore((s) => s.isLoading)
  const setLoading = useAIStore((s) => s.setLoading)
  const addHistoryEntry = useAIStore((s) => s.addHistoryEntry)
  const focusToken = useAIStore((s) => s.focusToken)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // External focus signal: when something (e.g. the discovery hint
  // under the audio upload) calls useAIStore.requestFocus(), focus
  // the textarea on the next paint. Skip the initial render (token
  // starts at 0) so the card doesn't grab focus on first mount.
  const lastTokenRef = useRef(focusToken)
  useEffect(() => {
    if (focusToken === lastTokenRef.current) return
    lastTokenRef.current = focusToken
    // requestAnimationFrame: ensures the bottom sheet has finished
    // animating / mounting before we steal focus (avoids scroll jump).
    const id = requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [focusToken])

  const trimmed = prompt.trim()
  const canGenerate = trimmed.length > 0 && !isLoading

  const handleGenerate = (): void => {
    if (!canGenerate) return
    // Backend lands in Phase 13. Record the attempt in history so we
    // can replay it later, and clear the input to give the user the
    // "I sent it" feedback.
    setLoading(true)
    // eslint-disable-next-line no-console
    console.info('[AI Style] prompt submitted:', trimmed)
    window.setTimeout(() => {
      addHistoryEntry({ prompt: trimmed, result: null })
      setPrompt('')
      setLoading(false)
    }, 600)
  }

  const isDesktop = variant === 'desktop'

  return (
    <div
      className={
        'ai-gradient-border relative overflow-hidden rounded-2xl ' +
        (isDesktop ? 'p-7' : 'p-5')
      }
      style={{
        background:
          'radial-gradient(circle at 50% 0%, #0a0a14 0%, #050507 100%)',
        boxShadow:
          '0 12px 40px -8px rgba(139, 92, 246, 0.35), 0 0 0 1px rgba(139, 92, 246, 0.10)',
      }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <Sparkles
          className={
            'ai-gradient-text shrink-0 ' + (isDesktop ? 'h-6 w-6' : 'h-5 w-5')
          }
          aria-hidden="true"
          // lucide icons render via SVG `currentColor`; the gradient
          // text class doesn't apply through. Use inline color stops.
          style={{ color: '#ec4899' }}
        />
        <h2
          className={
            'ai-gradient-text font-bold leading-none ' +
            (isDesktop ? 'text-[28px]' : 'text-[24px]')
          }
        >
          AI Style
        </h2>
      </div>

      <p
        className={
          'text-white/55 ' + (isDesktop ? 'mb-4 text-[15px]' : 'mb-3 text-[13px]')
        }
      >
        Describe your vibe in plain English. AI builds the visualizer for you.
      </p>

      {/* Textarea */}
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
        className="w-full resize-none rounded-xl border bg-black/40 text-white outline-none transition-colors placeholder:text-white/30 focus:border-purple-400/60"
        style={{
          borderColor: 'rgba(139,92,246,0.18)',
          padding: isDesktop ? '12px 14px' : '10px 12px',
          fontSize: isDesktop ? 14 : 13,
          lineHeight: 1.45,
        }}
      />

      {/* Vibe chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wider text-white/40">
          Try:
        </span>
        {VIBE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="button"
            aria-label={`${chip.label} vibe — fill prompt`}
            onClick={() => setPrompt(chip.prompt)}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] text-white/80 transition-all hover:text-white"
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

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        aria-label="Generate AI style"
        className={
          'mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-40 ' +
          (isDesktop ? 'w-auto' : 'w-full')
        }
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

      {/* Footer */}
      <p className="mt-3 text-center text-[10px] text-white/30">
        ✨ Preview — full release in Phase 13
      </p>
    </div>
  )
}

export default AIHeroCard
