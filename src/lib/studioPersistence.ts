import type { Layer } from '@/types/layer'
import type { VisualizerConfig, VisualType } from '@/lib/visualizerConfig'

/**
 * localStorage-backed autosave for the in-flight Studio state.
 *
 * Scope: **global, single slot**. Why not per-project: an active
 * Supabase project (`useProjectStore.activeProjectId`) is only one
 * state the user can be in — they can also be editing freely with no
 * project, or have just opened a project and started editing it.
 * The autosave's job is "bring the user back to whatever they were
 * looking at on reload," which is one canonical state regardless of
 * project. The Supabase project flow handles long-term persistence
 * via its own Save button; switching projects via the sidebar
 * replaces the autosaved state.
 *
 * What's persisted: anything that's a) editable in the Studio and
 * b) JSON-serializable. Blob URLs (uploaded videos, cover-art images)
 * are NOT persisted — they don't survive reload anyway, and a future
 * IndexedDB tier is out of scope. Layers that reference an uploaded
 * asset still load fine; the asset id just won't resolve and the
 * renderer falls back to its empty state.
 */
const STORAGE_KEY = 'auspec_studio_autosave'

/**
 * Bumped on incompatible shape changes so older payloads are dropped
 * instead of restored half-decoded. Bump aggressively; an unexpected
 * blank reload is much better than a partial-restore that leaves the
 * user confused about whether their work is gone.
 */
const SCHEMA_VERSION = 1

export interface StudioAutosave {
  version: number
  savedAt: number
  layers: Layer[]
  activeLayerId: string | null
  draftLayer: Layer | null
  draftIsDirty: boolean
  activePresetId: string | null
  visualizerConfig: VisualizerConfig
  visualType: VisualType
  backgroundColor: string
  sensitivity: number
  /**
   * Last-known active Supabase project id. Not used to scope the
   * autosave (we're global), but kept so the "Save" button knows
   * whether to update an existing project vs create a new one after
   * a refresh.
   */
  activeProjectId: string | null
}

export function saveStudioState(state: Omit<StudioAutosave, 'version' | 'savedAt'>): void {
  try {
    const payload: StudioAutosave = {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      ...state,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded / private mode / disabled storage — silently
    // skip. Persistence is best-effort; the user still has the
    // in-memory state.
  }
}

export function loadStudioState(): StudioAutosave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isValidAutosave(parsed)) return null
    if (parsed.version !== SCHEMA_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function clearStudioState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function isValidAutosave(v: unknown): v is StudioAutosave {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.version === 'number' &&
    Array.isArray(o.layers) &&
    typeof o.visualizerConfig === 'object' &&
    typeof o.backgroundColor === 'string'
  )
}
