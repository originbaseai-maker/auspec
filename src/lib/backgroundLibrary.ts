import { supabase } from '@/lib/supabase'

/**
 * Canonical category list. Extensible — add new strings as new
 * categories are needed, but keep this in sync with the modal's
 * pretty-label map. Categories that have NO active videos are
 * filtered out of the UI automatically, so listing one here ahead
 * of time is harmless.
 */
export const BACKGROUND_CATEGORIES = [
  'cyberpunk',
  'synthwave',
  'nature',
  'fire',
  'glacier',
  'abstract',
  'space',
  'lofi',
  'neon',
  'minimal',
] as const

export type BackgroundCategory = (typeof BACKGROUND_CATEGORIES)[number]

/** Display labels for the category tabs. */
export const CATEGORY_LABELS: Record<string, string> = {
  cyberpunk: 'Cyberpunk',
  synthwave: 'Synthwave',
  nature: 'Nature',
  fire: 'Fire',
  glacier: 'Glacier',
  abstract: 'Abstract',
  space: 'Space',
  lofi: 'Lo-Fi',
  neon: 'Neon',
  minimal: 'Minimal',
}

/**
 * Row as stored in the `background_videos` table. Mirrors the SQL
 * schema; downstream code uses the resolved-URLs view (BackgroundVideo)
 * not this raw shape.
 */
interface BackgroundVideoRow {
  id: string
  title: string
  category: string
  video_path: string
  thumbnail_path: string | null
  duration_sec: number | null
  sort_order: number | null
}

export interface BackgroundVideo {
  id: string
  title: string
  category: string
  videoUrl: string
  thumbnailUrl: string | null
  durationSec: number | null
  sortOrder: number
}

export interface BackgroundLibrary {
  /** category id → ordered list of videos in that category */
  byCategory: Map<string, BackgroundVideo[]>
  /** flat list, ordered by category then sort_order */
  all: BackgroundVideo[]
  /** snapshot timestamp; used for cache freshness if needed */
  fetchedAt: number
}

const BUCKET = 'background-videos'

let cache: BackgroundLibrary | null = null
let inflight: Promise<BackgroundLibrary> | null = null

/**
 * Resolve a storage path under the background-videos bucket to a
 * public URL. supabase.storage.getPublicUrl is synchronous and never
 * throws — it just builds the URL string from the project URL.
 */
function publicUrl(path: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Fetch the active video catalog. Light client-side cache: once a
 * session has seen the list, subsequent calls return the cached copy
 * without hitting the network. The catalog only changes when the
 * owner inserts/deactivates a row, which is rare within a session.
 *
 * Graceful failures:
 *   - Network error → returns an empty library + logs to console.
 *     The UI shows the "No backgrounds yet" empty state rather than
 *     a hard error, so a flaky connection doesn't break the studio.
 *   - Supabase not configured (no env vars) → same fallback.
 *   - Empty table → returns an empty library; the UI handles it.
 *
 * `force: true` skips the cache, used by an explicit refresh action.
 */
export async function fetchBackgroundVideos(
  force = false,
): Promise<BackgroundLibrary> {
  if (!force && cache) return cache
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('background_videos')
        .select('id, title, category, video_path, thumbnail_path, duration_sec, sort_order')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true })

      if (error) {
        console.warn('[backgroundLibrary] fetch failed:', error.message)
        cache = makeEmptyLibrary()
        return cache
      }

      const rows: BackgroundVideoRow[] = data ?? []
      const all: BackgroundVideo[] = []
      const byCategory = new Map<string, BackgroundVideo[]>()
      for (const row of rows) {
        const videoUrl = publicUrl(row.video_path)
        if (!videoUrl) continue // misconfigured row
        const entry: BackgroundVideo = {
          id: row.id,
          title: row.title,
          category: row.category,
          videoUrl,
          thumbnailUrl: publicUrl(row.thumbnail_path),
          durationSec: row.duration_sec ?? null,
          sortOrder: row.sort_order ?? 0,
        }
        all.push(entry)
        const bucket = byCategory.get(row.category) ?? []
        bucket.push(entry)
        byCategory.set(row.category, bucket)
      }

      cache = { byCategory, all, fetchedAt: Date.now() }
      return cache
    } catch (err) {
      console.warn('[backgroundLibrary] unexpected error:', err)
      cache = makeEmptyLibrary()
      return cache
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Reset the in-memory cache. Useful for a "Refresh" button. */
export function clearBackgroundLibraryCache(): void {
  cache = null
}

function makeEmptyLibrary(): BackgroundLibrary {
  return {
    byCategory: new Map(),
    all: [],
    fetchedAt: Date.now(),
  }
}
