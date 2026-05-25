import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import {
  initializeLayersFromVisualizerStore,
  useLayerStore,
} from '@/store/useLayerStore'
import { useFormatStore } from '@/store/useFormatStore'
import type { SocialFormat } from '@/lib/socialFormats'
import type { VisualizerConfig } from '@/lib/visualizerConfig'
import type { Layer } from '@/types/layer'

export interface Project {
  id: string
  name: string
  description?: string
  visualizerConfig: VisualizerConfig
  format: SocialFormat
  backgroundColor: string
  sensitivity: number
  createdAt: string
  updatedAt: string
}

interface DbRow {
  id: string
  name: string
  description: string | null
  visualizer_config: VisualizerConfig
  format: string
  background_color: string
  sensitivity: number
  created_at: string
  updated_at: string
}

function rowToProject(row: DbRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    visualizerConfig: row.visualizer_config,
    format: row.format as SocialFormat,
    backgroundColor: row.background_color,
    sensitivity: row.sensitivity,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  loading: boolean
  saveProject: (name: string) => Promise<{ error: string | null }>
  loadProjects: () => Promise<void>
  loadProject: (id: string) => void
  deleteProject: (id: string) => Promise<void>
  setActiveProjectId: (id: string | null) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  loading: false,

  saveProject: async (name) => {
    const user = useAuthStore.getState().user
    if (!user) return { error: 'Not logged in' }

    const vizStore = useVisualizerStore.getState()
    const formatStore = useFormatStore.getState()
    const layerStore = useLayerStore.getState()

    // Stash the layer stack inside visualizer_config (JSONB column).
    // Avoids a DB migration — the existing JSONB column accepts arbitrary
    // shape. Keys prefixed with `__` so they're clearly internal extras
    // alongside the typed VisualizerConfig fields. Loader strips them.
    const visualizerConfigWithLayers = {
      ...vizStore.visualizerConfig,
      __layers: layerStore.layers,
      __activeLayerId: layerStore.activeLayerId,
    }

    const payload = {
      user_id: user.id,
      name,
      visualizer_config: visualizerConfigWithLayers,
      format: formatStore.activeFormat,
      background_color: vizStore.backgroundColor,
      sensitivity: vizStore.sensitivity,
    }

    const activeId = get().activeProjectId
    if (activeId) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', activeId)
      if (error) return { error: error.message }
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single()
      if (error) return { error: error.message }
      set({ activeProjectId: data.id })
    }

    await get().loadProjects()
    return { error: null }
  },

  loadProjects: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ loading: true })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      set({ projects: data.map(rowToProject) })
    }
    set({ loading: false })
  },

  loadProject: (id) => {
    const project = get().projects.find((p) => p.id === id)
    if (!project) return

    const vizStore = useVisualizerStore.getState()
    // Extract stashed layer fields (see saveProject).
    const cfg = project.visualizerConfig as VisualizerConfig & {
      __layers?: Layer[]
      __activeLayerId?: string | null
    }
    const stashedLayers = cfg.__layers
    const stashedActiveId = cfg.__activeLayerId ?? null
    // Strip the stash before pushing to the visualizer store so the
    // typed config stays clean.
    const cleanConfig: VisualizerConfig = { ...cfg }
    delete (cleanConfig as unknown as Record<string, unknown>).__layers
    delete (cleanConfig as unknown as Record<string, unknown>).__activeLayerId

    vizStore.setVisualizerConfig(cleanConfig)
    vizStore.setVisualType(cleanConfig.visualType)
    vizStore.setBackgroundColor(project.backgroundColor)
    vizStore.setSensitivity(project.sensitivity)
    useFormatStore.getState().setFormat(project.format)

    if (stashedLayers && stashedLayers.length > 0) {
      // New-format project — restore the layer stack directly.
      useLayerStore.getState().replaceLayers(
        stashedLayers.map((l) => ({ ...l, config: { ...l.config } }) as Layer),
        stashedActiveId,
      )
    } else {
      // Legacy project saved before Part 2A — rebuild from visualizerConfig.
      initializeLayersFromVisualizerStore()
    }

    set({ activeProjectId: id })
  },

  deleteProject: async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (!error) {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProjectId:
          state.activeProjectId === id ? null : state.activeProjectId,
      }))
    }
  },

  setActiveProjectId: (id) => set({ activeProjectId: id }),
}))
