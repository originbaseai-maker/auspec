import type { JSX } from 'react'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import { useStudioUIStore } from '@/store/useStudioUIStore'

interface Props {
  /**
   * Mobile is slightly shorter (52 px) and tighter on horizontal
   * spacing; desktop gets 56 px and a touch more breathing room.
   */
  variant?: 'mobile' | 'desktop'
  /**
   * Called instead of setActiveCategory('ai_style') when the user
   * clicks the button while AI is INACTIVE. Lets the parent route
   * the activation through the dirty-draft confirmation dialog
   * (same flow tool tiles use). When omitted, the button falls
   * back to setting activeCategory directly — useful for tests or
   * any future placement that doesn't need the draft check.
   *
   * The deactivate path (clicking while AI is already active) is
   * NOT routed through this callback — collapsing AI doesn't touch
   * any draft, so it's a direct setActiveCategory(null).
   */
  onRequestActivate?: () => void
}

/**
 * Wide horizontal call-to-action rendered AFTER the four tool
 * sections in the Tools panel. Clicking sets the studio's
 * activeCategory to 'ai_style', which expands AIStylePanel inline
 * in the fine-tune slot below — same pattern as tool tiles. Uses
 * the existing .ai-gradient-border utility for the animated purple
 * → pink → orange ring.
 */
export function AIStyleButton({
  variant = 'desktop',
  onRequestActivate,
}: Props): JSX.Element {
  const activeCategory = useStudioUIStore((s) => s.activeCategory)
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory)
  const isDesktop = variant === 'desktop'
  const isActive = activeCategory === 'ai_style'

  const handleClick = (): void => {
    if (isActive) {
      // Collapse — no draft check needed.
      setActiveCategory(null)
      return
    }
    // Activate — let the parent intercept for a dirty-draft confirm,
    // or just route directly when no parent handler is wired.
    if (onRequestActivate) {
      onRequestActivate()
    } else {
      setActiveCategory('ai_style')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isActive}
      aria-label={isActive ? 'Close AI Style' : 'Open AI Style'}
      className="ai-gradient-border ai-style-button group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl"
      data-active={isActive ? 'true' : undefined}
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
      {isActive ? (
        // Chevron points DOWN toward the now-expanded fine-tune panel
        // (which renders directly below this button in the Tools
        // aside). Signals "content is below, click here to collapse."
        <ChevronDown className="h-4 w-4 text-white/70" aria-hidden="true" />
      ) : (
        <ArrowRight
          className="h-4 w-4 text-white/55 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

export default AIStyleButton
