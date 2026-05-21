import { colors } from './tokens'

export const theme = {
  colors: { ...colors },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    sidebar: '200px',
    controlPanel: '240px',
    playerBar: '72px',
    topBar: '48px',
  },
  animation: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  blur: {
    sm: '8px',
    md: '16px',
    lg: '32px',
  },
} as const

export type Theme = typeof theme
