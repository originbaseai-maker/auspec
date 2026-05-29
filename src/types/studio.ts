export type StudioCategory =
  | 'visualizer_bars'
  | 'visualizer_circular'
  | 'visualizer_wave'
  | 'visualizer_polygon'
  | 'visualizer_bloom'
  | 'visualizer_shape'
  | 'visualizer_video'
  | 'visualizer_halo'
  | 'particles'
  | 'background'
  | 'logo'
  | 'text'
  | 'lyrics'
  | 'ai_style'
  | 'frame'
  | 'cinematic'

export interface CategoryConfig {
  id: StudioCategory
  label: string
  icon:
    | 'bars'
    | 'circular'
    | 'wave'
    | 'polygon'
    | 'bloom'
    | 'shape'
    | 'video'
    | 'halo'
    | 'particles'
    | 'background'
    | 'logo'
    | 'text'
    | 'lyrics'
    | 'ai_style'
    | 'frame'
    | 'cinematic'
  hasAI: boolean
}

export const STUDIO_CATEGORIES: CategoryConfig[] = [
  { id: 'visualizer_bars', label: 'Bars', icon: 'bars', hasAI: false },
  {
    id: 'visualizer_circular',
    label: 'Circular',
    icon: 'circular',
    hasAI: false,
  },
  { id: 'visualizer_wave', label: 'Wave', icon: 'wave', hasAI: false },
  {
    id: 'visualizer_polygon',
    label: 'Polygon',
    icon: 'polygon',
    hasAI: false,
  },
  { id: 'visualizer_bloom', label: 'Bloom', icon: 'bloom', hasAI: false },
  {
    id: 'visualizer_shape',
    label: 'Shape',
    icon: 'shape',
    hasAI: false,
  },
  { id: 'visualizer_video', label: 'Video', icon: 'video', hasAI: false },
  { id: 'particles', label: 'Particles', icon: 'particles', hasAI: false },
  { id: 'background', label: 'Background', icon: 'background', hasAI: false },
  { id: 'logo', label: 'Logo', icon: 'logo', hasAI: false },
  { id: 'text', label: 'Text', icon: 'text', hasAI: false },
  { id: 'lyrics', label: 'Lyrics', icon: 'lyrics', hasAI: false },
  { id: 'ai_style', label: 'AI Style', icon: 'ai_style', hasAI: true },
  { id: 'frame', label: 'Frame', icon: 'frame', hasAI: false },
  { id: 'visualizer_halo', label: 'Halo', icon: 'halo', hasAI: false },
  {
    id: 'cinematic',
    label: 'Cinematic',
    icon: 'cinematic',
    hasAI: false,
  },
]
