import { JSX } from 'react'

type LogoSize = 'sm' | 'md' | 'lg'

interface AuSpecLogoProps {
  size?: LogoSize
  showText?: boolean
  className?: string
}

const SIZE_MAP: Record<LogoSize, { icon: number; text: string; gap: string }> = {
  sm: { icon: 24, text: 'text-base', gap: 'gap-2' },
  md: { icon: 36, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 56, text: 'text-3xl', gap: 'gap-3' },
}

const BAR_COUNT = 24

export default function AuSpecLogo({
  size = 'md',
  showText = true,
  className = '',
}: AuSpecLogoProps): JSX.Element {
  const { icon, text, gap } = SIZE_MAP[size]
  const center = 50
  const innerRadius = 22
  const maxOuterRadius = 46

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const angle = (i / BAR_COUNT) * Math.PI * 2
    // Pseudo-spectrum: taller bars at top/bottom (audio-like silhouette)
    const t = Math.abs(Math.sin(angle * 2 + i * 0.6))
    const outerRadius = innerRadius + (maxOuterRadius - innerRadius) * (0.35 + t * 0.65)
    const x1 = center + Math.cos(angle) * innerRadius
    const y1 = center + Math.sin(angle) * innerRadius
    const x2 = center + Math.cos(angle) * outerRadius
    const y2 = center + Math.sin(angle) * outerRadius
    return { x1, y1, x2, y2, key: i }
  })

  return (
    <div className={`inline-flex items-center ${gap} ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AuSpec logo"
        role="img"
      >
        <defs>
          <linearGradient id="auspec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {bars.map((b) => (
          <line
            key={b.key}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke="url(#auspec-grad)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </svg>
      {showText && (
        <span
          className={`${text} font-semibold tracking-tight text-white`}
          style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
        >
          AuSpec
        </span>
      )}
    </div>
  )
}
