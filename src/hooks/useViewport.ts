import { useEffect, useState } from 'react'

export type Viewport = 'mobile' | 'tablet' | 'desktop'

/**
 * Breakpoints chosen to match the visual layout breakpoints used in
 * StudioPage, not Tailwind's md/lg defaults (those are content-driven,
 * not layout-driven):
 *   - mobile:  <768   — bottom-sheet pattern, no sidebars
 *   - tablet:  <1024  — narrow sidebars
 *   - desktop: ≥1024  — full sidebars
 */
function classifyWidth(width: number): Viewport {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() => {
    if (typeof window === 'undefined') return 'desktop'
    return classifyWidth(window.innerWidth)
  })

  useEffect(() => {
    const handleResize = () => {
      setViewport(classifyWidth(window.innerWidth))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return viewport
}
