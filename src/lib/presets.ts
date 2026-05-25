import type { VisualizerConfig, VisualType } from '@/lib/visualizerConfig'
import type { FrameConfig } from '@/store/useFrameStore'
import type { Layer } from '@/types/layer'

export interface Preset {
  id: string
  name: string
  /**
   * Legacy single-visualizer field. Still required on built-in presets
   * shipped with the app; applyPreset wraps it into a single-layer stack
   * when `layers` is absent.
   */
  visualType: VisualType
  config: Partial<VisualizerConfig>
  backgroundColor?: string
  description?: string
  sensitivity?: number
  /**
   * Optional full snapshot of frame state. Undefined on legacy presets;
   * applyPreset treats that as "reset the frame to defaults".
   */
  frameConfig?: FrameConfig
  /**
   * Full multi-layer stack. When present, applyPreset uses it as the
   * source of truth and ignores `visualType` / `config`. User-saved
   * presets from Part 2A onward include this field.
   */
  layers?: Layer[]
  /** Which layer of the stack should be active after apply. */
  activeLayerId?: string | null
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'dark-neon-circle',
    name: 'Dark Neon Circle',
    visualType: 'circular',
    description: 'Cyan + purple radial pulse',
    backgroundColor: '#000000',
    sensitivity: 75,
    config: {
      visualType: 'circular',
      circularSpectrum: {
        radius: 180,
        innerRadius: 60,
        barCount: 128,
        colorStart: '#06b6d4',
        colorEnd: '#a855f7',
        glowEnabled: true,
        glowIntensity: 16,
        rotation: 0,
        smoothing: 0.15,
        bassPulse: true,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
        sideMode: 'both',
      },
      framePulse: {
        enabled: true,
        baseColor: '#06b6d4',
        beatColor: '#a855f7',
        intensity: 0.8,
        thickness: 2,
        beatThreshold: 0.65,
      },
    },
  },
  {
    id: 'minimal-white-wave',
    name: 'Minimal White Wave',
    visualType: 'wave',
    description: 'Clean white waveform',
    backgroundColor: '#000000',
    sensitivity: 55,
    config: {
      visualType: 'wave',
      wave: {
        colorStart: '#ffffff',
        colorEnd: '#e5e7eb',
        lineThickness: 2,
        glowEnabled: false,
        glowIntensity: 0,
        filled: false,
        smoothing: 0.3,
        mirrorMode: false,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
      },
      framePulse: {
        enabled: false,
        baseColor: '#ffffff',
        beatColor: '#ffffff',
        intensity: 0.3,
        thickness: 1,
        beatThreshold: 0.7,
      },
    },
  },
  {
    id: 'cyberpunk-pulse',
    name: 'Cyberpunk Pulse',
    visualType: 'bars',
    description: 'Pink + cyan mirror bars',
    backgroundColor: '#0a0a0f',
    sensitivity: 85,
    config: {
      visualType: 'bars',
      linearBars: {
        barCount: 96,
        barGap: 2,
        minBarHeight: 2,
        colorStart: '#ec4899',
        colorEnd: '#06b6d4',
        glowEnabled: true,
        glowIntensity: 14,
        mirrorMode: true,
        smoothing: 0.18,
        displayMode: 'digital',
        dotSize: 4,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
        sideMode: 'both',
      },
      framePulse: {
        enabled: true,
        baseColor: '#ec4899',
        beatColor: '#06b6d4',
        intensity: 0.9,
        thickness: 3,
        beatThreshold: 0.6,
      },
    },
  },
  {
    id: 'golden-yoga-flow',
    name: 'Golden Yoga Flow',
    visualType: 'circular',
    description: 'Warm gold + amber slow pulse',
    backgroundColor: '#100805',
    sensitivity: 60,
    config: {
      visualType: 'circular',
      circularSpectrum: {
        radius: 200,
        innerRadius: 80,
        barCount: 96,
        colorStart: '#f59e0b',
        colorEnd: '#fde68a',
        glowEnabled: true,
        glowIntensity: 12,
        rotation: 0,
        smoothing: 0.1,
        bassPulse: true,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
        sideMode: 'both',
      },
      framePulse: {
        enabled: false,
        baseColor: '#f59e0b',
        beatColor: '#fde68a',
        intensity: 0.4,
        thickness: 1,
        beatThreshold: 0.8,
      },
    },
  },
  {
    id: 'podcast-clean',
    name: 'Podcast Clean',
    visualType: 'wave',
    description: 'Soft blue waveform for voice',
    backgroundColor: '#0f172a',
    sensitivity: 50,
    config: {
      visualType: 'wave',
      wave: {
        colorStart: '#3b82f6',
        colorEnd: '#60a5fa',
        lineThickness: 3,
        glowEnabled: true,
        glowIntensity: 6,
        filled: true,
        smoothing: 0.35,
        mirrorMode: false,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
      },
      framePulse: {
        enabled: false,
        baseColor: '#3b82f6',
        beatColor: '#60a5fa',
        intensity: 0.3,
        thickness: 1,
        beatThreshold: 0.8,
      },
    },
  },
  {
    id: 'tropical-bars',
    name: 'Tropical Bars',
    visualType: 'bars',
    description: 'Teal + lime energetic bars',
    backgroundColor: '#052e2b',
    sensitivity: 70,
    config: {
      visualType: 'bars',
      linearBars: {
        barCount: 64,
        barGap: 4,
        minBarHeight: 2,
        colorStart: '#14b8a6',
        colorEnd: '#a3e635',
        glowEnabled: true,
        glowIntensity: 10,
        mirrorMode: false,
        smoothing: 0.18,
        displayMode: 'digital',
        dotSize: 4,
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
        sideMode: 'both',
      },
      framePulse: {
        enabled: true,
        baseColor: '#14b8a6',
        beatColor: '#a3e635',
        intensity: 0.6,
        thickness: 2,
        beatThreshold: 0.65,
      },
    },
  },
  {
    id: 'neon-hexagon',
    name: 'Neon Hexagon',
    visualType: 'polygon',
    description: 'Blue + violet hexagon pulse',
    backgroundColor: '#000000',
    sensitivity: 75,
    config: {
      visualType: 'polygon',
      polygon: {
        shape: 'hexagon',
        radius: 160,
        barCount: 120,
        colorStart: '#3b82f6',
        colorEnd: '#8b5cf6',
        glowEnabled: true,
        glowIntensity: 12,
        rotation: 0,
        smoothing: 0.15,
        fillShape: true,
        fillOpacity: 0.08,
        barDirection: 'outward',
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
      },
      framePulse: {
        enabled: true,
        baseColor: '#3b82f6',
        beatColor: '#8b5cf6',
        intensity: 0.7,
        thickness: 2,
        beatThreshold: 0.65,
      },
    },
  },
  {
    id: 'fire-triangle',
    name: 'Fire Triangle',
    visualType: 'polygon',
    description: 'Orange + red triangle energy',
    backgroundColor: '#0a0000',
    sensitivity: 80,
    config: {
      visualType: 'polygon',
      polygon: {
        shape: 'triangle',
        radius: 180,
        barCount: 90,
        colorStart: '#f59e0b',
        colorEnd: '#ef4444',
        glowEnabled: true,
        glowIntensity: 14,
        rotation: 0,
        smoothing: 0.12,
        fillShape: true,
        fillOpacity: 0.06,
        barDirection: 'outward',
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
      },
      framePulse: {
        enabled: true,
        baseColor: '#f59e0b',
        beatColor: '#ef4444',
        intensity: 0.9,
        thickness: 3,
        beatThreshold: 0.6,
      },
    },
  },
  {
    id: 'crystal-star',
    name: 'Crystal Star',
    visualType: 'polygon',
    description: 'Cyan star with both-direction bars',
    backgroundColor: '#000510',
    sensitivity: 70,
    config: {
      visualType: 'polygon',
      polygon: {
        shape: 'star',
        radius: 150,
        barCount: 96,
        colorStart: '#06b6d4',
        colorEnd: '#a855f7',
        glowEnabled: true,
        glowIntensity: 16,
        rotation: 0,
        smoothing: 0.18,
        fillShape: false,
        fillOpacity: 0.1,
        barDirection: 'both',
        hueInterpolation: 0,
        startFrequency: 20,
        endFrequency: 20000,
      },
      framePulse: {
        enabled: true,
        baseColor: '#06b6d4',
        beatColor: '#a855f7',
        intensity: 0.8,
        thickness: 2,
        beatThreshold: 0.7,
      },
    },
  },
]
