import type { JSX } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useStudioUIStore } from '@/store/useStudioUIStore'

interface Props {
  /**
   * Mobile is slightly shorter (52 px) and tighter on horizontal
   * spacing; desktop gets 56 px and a touch more breathing room.
   */
  variant?: 'mobile' | 'desktop'
}

/**
 * Wide horizontal call-to-action rendered AFTER the four tool
 * sections in the Tools panel. Opens AIStyleModal on click. Uses the
 * existing .ai-gradient-border utility for the animated purple →
 * pink → orange ring, and .ai-gradient-text for the title glyph
 * fill.
 *
 * The button itself is a host for the gradient ring — its inner
 * background is opaque dark so the ring sits in a slot around it,
 * not behind it.
 */
export function AIStyleButton({ variant = 'desktop' }: Props): JSX.Element {
  const openAIModal = useStudioUIStore((s) => s.openAIModal)
  const isDesktop = variant === 'desktop'

  return (
    <button
      type="button"
      onClick={openAIModal}
      aria-label="Open AI Style"
      className="ai-gradient-border ai-style-button group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl"
      style={{
        height: isDesktop ? 56 : 52,
        // Solid inner background so the ::before gradient only shows
        // through in the 2px ring slot (mask-composite trick in the
        // .ai-gradient-border CSS).
        background:
          'radial-gradient(circle at 50% 50%, #0a0a14 0%, #050507 100%)',
        // Gentle purple drop shadow at rest; the .ai-style-button
        // hover rule (in index.css) intensifies it.
        boxShadow: '0 4px 16px -4px rgba(168, 85, 247, 0.25)',
      }}
    >
      <Sparkles
        className={isDesktop ? 'h-4 w-4' : 'h-4 w-4'}
        aria-hidden="true"
        // Lucide SVGs paint via currentColor; the gradient text
        // class doesn't reach SVG fills, so inline-color to the
        // pink mid-stop as a visual proxy.
        style={{ color: '#ec4899' }}
      />
      <span
        className={
          'ai-gradient-text font-semibold ' +
          (isDesktop ? 'text-[15px]' : 'text-[14px]')
        }
      >
        AI Style
      </span>
      <ArrowRight
        className="h-4 w-4 text-white/55 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  )
}

export default AIStyleButton
