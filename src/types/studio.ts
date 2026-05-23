export type StudioCategory =
  | 'visualizer_bars'
  | 'visualizer_circular'
  | 'visualizer_wave'
  | 'visualizer_polygon'
  | 'particles'
  | 'background'
  | 'logo'
  | 'colors'

export interface CategoryConfig {
  id: StudioCategory
  label: string
  icon:
    | 'bars'
    | 'circular'
    | 'wave'
    | 'polygon'
    | 'particles'
    | 'background'
    | 'logo'
    | 'colors'
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
  { id: 'particles', label: 'Particles', icon: 'particles', hasAI: true },
  { id: 'background', label: 'Background', icon: 'background', hasAI: false },
  { id: 'logo', label: 'Logo', icon: 'logo', hasAI: false },
  { id: 'colors', label: 'Colors', icon: 'colors', hasAI: true },
]
