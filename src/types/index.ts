export type VisualType = 'bars' | 'circular' | 'wave' | 'particles'
export type CanvasRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9'
export type SidebarSide = 'left' | 'right'

export interface Preset {
  id: string
  name: string
  visualType: VisualType
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  sensitivity: number
  glowEnabled: boolean
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  settings: Partial<Preset>
}
