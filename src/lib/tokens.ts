export const colors = {
  bg: '#000000',
  bgSecondary: '#111111',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#666666',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  purple: '#a855f7',
} as const

export type ColorToken = keyof typeof colors
