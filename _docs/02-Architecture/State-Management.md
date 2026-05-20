# State Management

## Tool: Zustand

## Store: `useVisualizerStore`

### State Shape
```ts
interface VisualizerStore {
  // Visual type
  visualType: 'bars' | 'circular' | 'wave' | 'particles'
  
  // Colors
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  gradientEnabled: boolean
  
  // Behavior
  sensitivity: number      // 0–100
  smoothing: number        // 0–1
  barCount: number         // 32–256
  
  // Circular
  radius: number
  innerRadius: number
  
  // Effects
  glowEnabled: boolean
  glowIntensity: number
  mirrorMode: boolean
  rotation: number
  lineThickness: number
  
  // Canvas
  canvasRatio: '16:9' | '9:16' | '1:1' | '4:5' | '21:9'
  
  // Actions
  setVisualType: (type: string) => void
  applyPreset: (preset: Preset) => void
  reset: () => void
}
```

## Rule
Never use React state for animation loop data.
Canvas reads directly from analyzer. Zustand only stores user settings.
