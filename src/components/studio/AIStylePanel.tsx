import { useEffect, useRef, type JSX } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAIStore } from '@/store/useAIStore'

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

/**
 * Inline fine-tune content for AI Style. Rendered by
 * CategoryDetailPanel when activeCategory === 'ai_style' — same
 * slot as every tool fine-tune (Bars, Wave, Video, …). The chrome
 * (rounded-xl border, header row with "AI Style — Generate" + X
 * close button, scrollable body) is provided by the parent
 * CategoryDetailPanel; this component just renders the inner UI.
 *
 * Prompt text persists across collapse/expand because it lives in
 * useAIStore (not local component state) — closing the panel and
 * reopening it preserves whatever the user typed.
 */
export function AIStylePanel(): JSX.Element {
  const prompt = useAIStore((s) => s.prompt)
  const setPrompt = useAIStore((s) => s.setPrompt)
  const isLoading = useAIStore((s) => s.isLoading)
  const setLoading = useAIStore((s) => s.setLoading)
  const addHistoryEntry = useAIStore((s) => s.addHistoryEntry)
  const focusToken = useAIStore((s) => s.focusToken)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // External focus signal — discovery hint calls
  // useAIStore.requestFocus() after setting activeCategory, this
  // listener wakes up the textarea on the next paint so the user
  // lands ready to type. Skip the initial token (0) so we don't
  // grab focus on every mount.
  const lastTokenRef = useRef(focusToken)
  useEffect(() => {
    if (focusToken === lastTokenRef.current) return
    lastTokenRef.current = focusToken
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
    setLoading(true)
    // eslint-disable-next-line no-console
    console.info('[AI Style] prompt submitted:', trimmed)
    window.setTimeout(() => {
      addHistoryEntry({ prompt: trimmed, result: null })
      setPrompt('')
      setLoading(false)
    }, 600)
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-white/55">
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
        className="w-full resize-none rounded-lg border bg-[#0f0f0f] px-3 py-2 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/30 focus:border-purple-400/60"
        style={{ borderColor: 'rgba(139,92,246,0.18)' }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[9px] uppercase tracking-wider text-white/40">
          Try:
        </span>
        {VIBE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-label={`${chip.label} vibe — fill prompt`}
            onClick={() => setPrompt(chip.prompt)}
            className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-white/80 transition-colors hover:text-white"
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
        className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold text-white transition-all disabled:opacity-40"
        style={{
          background:
            'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
          boxShadow: canGenerate
            ? '0 6px 18px -4px rgba(236, 72, 153, 0.5)'
            : 'none',
        }}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{isLoading ? 'Generating…' : 'Generate'}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <p className="pt-1 text-center text-[10px] text-white/30">
        ✨ Coming in Phase 13
      </p>
    </div>
  )
}

export default AIStylePanel
