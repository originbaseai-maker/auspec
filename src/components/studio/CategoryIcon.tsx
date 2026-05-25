interface Props {
  icon: string
  size?: number
}

export function CategoryIcon({ icon, size = 36 }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 40 40',
    'aria-hidden': true as const,
  }

  switch (icon) {
    case 'bars':
      return (
        <svg {...props}>
          <rect x="6" y="14" width="3" height="12" fill="rgba(255,255,255,0.85)" rx="1" />
          <rect x="12" y="10" width="3" height="20" fill="rgba(255,255,255,0.85)" rx="1" />
          <rect x="18" y="16" width="3" height="8" fill="rgba(255,255,255,0.85)" rx="1" />
          <rect x="24" y="8" width="3" height="24" fill="rgba(255,255,255,0.85)" rx="1" />
          <rect x="30" y="12" width="3" height="16" fill="rgba(255,255,255,0.85)" rx="1" />
        </svg>
      )
    case 'circular':
      return (
        <svg {...props}>
          <circle
            cx="20"
            cy="20"
            r="8"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
          />
          <line x1="20" y1="2" x2="20" y2="8" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="36" y1="14" x2="32" y2="16" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="34" y1="32" x2="30" y2="28" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="32" x2="10" y2="28" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="14" x2="8" y2="16" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'wave':
      return (
        <svg {...props}>
          <path
            d="M 4 20 Q 9 8, 14 20 T 24 20 T 34 20"
            stroke="rgba(255,255,255,0.85)"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 4 24 Q 9 12, 14 24 T 24 24 T 34 24"
            stroke="rgba(255,255,255,0.4)"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'polygon':
      return (
        <svg {...props}>
          <polygon
            points="20,4 36,16 30,34 10,34 4,16"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
          />
        </svg>
      )
    case 'bloom':
      return (
        <svg {...props}>
          {/* Three nested organic blob lines hinting at echo rings */}
          <path
            d="M 20 6 Q 28 10 30 18 Q 32 26 25 30 Q 18 33 12 28 Q 6 22 10 14 Q 14 8 20 6 Z"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1.2"
          />
          <path
            d="M 20 10 Q 26 13 27 18 Q 28 24 23 27 Q 18 29 14 25 Q 10 21 13 16 Q 16 11 20 10 Z"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.2"
          />
          <path
            d="M 20 14 Q 23 16 24 19 Q 24 22 21 24 Q 18 25 16 22 Q 14 19 16 16 Q 18 14 20 14 Z"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />
        </svg>
      )
    case 'particles':
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.7)" />
          <circle cx="30" cy="14" r="1.5" fill="rgba(255,255,255,0.6)" />
          <circle cx="22" cy="22" r="2.5" fill="rgba(255,255,255,0.85)" />
          <circle cx="14" cy="28" r="1.5" fill="rgba(255,255,255,0.6)" />
          <circle cx="32" cy="32" r="2" fill="rgba(255,255,255,0.7)" />
        </svg>
      )
    case 'background':
      return (
        <svg {...props}>
          <rect
            x="6"
            y="6"
            width="28"
            height="28"
            rx="3"
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1"
          />
          <path
            d="M 6 28 L 14 18 L 20 24 L 28 12 L 34 18 L 34 34 L 6 34 Z"
            fill="rgba(255,255,255,0.35)"
          />
          <circle cx="14" cy="14" r="2" fill="rgba(255,255,255,0.8)" />
        </svg>
      )
    case 'logo':
      return (
        <svg {...props}>
          <circle
            cx="20"
            cy="20"
            r="9"
            fill="rgba(255,255,255,0.2)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.5"
          />
          <circle cx="20" cy="20" r="3" fill="rgba(255,255,255,0.6)" />
        </svg>
      )
    case 'text':
      return (
        <svg {...props}>
          <text
            x="20"
            y="28"
            textAnchor="middle"
            fontSize="24"
            fontWeight="900"
            fontFamily="Inter, sans-serif"
            fill="rgba(255,255,255,0.85)"
          >
            T
          </text>
          <line
            x1="6"
            y1="33"
            x2="34"
            y2="33"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'ai_style':
      return (
        <svg {...props}>
          <path
            d="M 20 6 L 22 14 L 30 16 L 22 18 L 20 26 L 18 18 L 10 16 L 18 14 Z"
            fill="rgba(245,158,11,0.85)"
            stroke="rgba(245,158,11,1)"
            strokeWidth="0.5"
          />
          <circle cx="32" cy="8" r="1.5" fill="rgba(236,72,153,0.85)" />
          <circle cx="8" cy="30" r="1" fill="rgba(139,92,246,0.85)" />
          <circle cx="33" cy="28" r="0.8" fill="rgba(245,158,11,0.7)" />
        </svg>
      )
    case 'frame':
      return (
        <svg {...props}>
          <rect
            x="4"
            y="6"
            width="32"
            height="28"
            rx="3"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
          />
          <rect
            x="9"
            y="11"
            width="22"
            height="18"
            rx="1"
            fill="rgba(255,255,255,0.15)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.8"
          />
        </svg>
      )
    default:
      return null
  }
}

export default CategoryIcon
