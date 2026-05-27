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
 * sections in the Tools panel. Clicking sets the studio's
 * activeCategory to 'ai_style', which expands AIStylePanel inline
 * in the fine-tune slot below — same pattern as tool tiles. Uses
 * the existing .ai-gradient-border utility for the animated purple
 * → pink → orange ring.
 */
export function AIStyleButton({ variant = 'desktop' }: Props): JSX.Element {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const isDesktop = variant === 'desktop'
  const isActive = activeCategory === 'ai_style'

  return (
    <button
      type="button"
      onClick={() => setActiveCategory(isActive ? null : 'ai_style')}
      aria-pressed={isActive}
      aria-label={isActive ? 'Close AI Style' : 'Open AI Style'}
      className="ai-gradient-border ai-style-button group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl"
      // Height is the only variant-dependent value; the rest of the
      // visual styling lives on the .ai-style-button CSS class so
      // :hover can actually override the box-shadow without losing
      // specificity to an inline style object.
      style={{ height: isDesktop ? 56 : 52 }}
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
