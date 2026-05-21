export type SocialFormat =
  | 'youtube'
  | 'tiktok'
  | 'instagram_sq'
  | 'instagram_pt'
  | 'twitter'
  | 'cinematic'

export interface FormatConfig {
  id: SocialFormat
  label: string
  width: number
  height: number
  aspectRatio: string
  platform: string
  icon: string
}

export const SOCIAL_FORMATS: FormatConfig[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    platform: 'YouTube',
    icon: '▶',
  },
  {
    id: 'tiktok',
    label: 'TikTok / Reels',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    platform: 'TikTok',
    icon: '♪',
  },
  {
    id: 'instagram_sq',
    label: 'Instagram Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    platform: 'Instagram',
    icon: '⬛',
  },
  {
    id: 'instagram_pt',
    label: 'Instagram Portrait',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    platform: 'Instagram',
    icon: '▬',
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    platform: 'Twitter',
    icon: '✕',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    width: 2560,
    height: 1080,
    aspectRatio: '21:9',
    platform: 'Cinema',
    icon: '🎬',
  },
]

export function getFormat(id: SocialFormat): FormatConfig {
  return SOCIAL_FORMATS.find((f) => f.id === id) ?? SOCIAL_FORMATS[0]
}

// Contract alias — Phase9-Contracts.md spec name. Same behavior as getFormat.
export const getFormatConfig = getFormat
