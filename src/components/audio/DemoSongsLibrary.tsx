import { useState } from 'react'
import { Loader2, Music, Play } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import {
  DEMO_GENRES,
  formatDuration,
  getSongsByGenre,
  type DemoGenre,
  type DemoSong,
} from '@/lib/demoSongs'
import type { AudioFile } from '@/types/audio'

export function DemoSongsLibrary() {
  const [activeGenre, setActiveGenre] = useState<DemoGenre>('rock_pop')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const setAudioFile = useAudioStore((s) => s.setAudioFile)

  const handleLoad = async (song: DemoSong) => {
    setLoadingId(song.id)
    try {
      const response = await fetch(song.url)
      if (!response.ok) throw new Error('Demo not available')

      const blob = await response.blob()
      const file = new File([blob], `${song.title}.mp3`, {
        type: 'audio/mpeg',
      })

      const audioFile: AudioFile = {
        file,
        name: song.title,
        size: blob.size,
        format: 'mp3',
        duration: song.duration,
        objectUrl: URL.createObjectURL(blob),
      }

      setAudioFile(audioFile)
    } catch {
      // Placeholder UX while Suno-generated MP3s aren't in /public/demos/ yet.
      // Replace with a toast once a proper notification system lands.
      alert(
        `Demo songs coming soon! ${song.title} will be available once Suno-generated tracks are added to /public/demos/.`,
      )
    } finally {
      setLoadingId(null)
    }
  }

  const songs = getSongsByGenre(activeGenre)
  const activeConfig = DEMO_GENRES.find((g) => g.id === activeGenre)!

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Music className="h-4 w-4 text-white/50" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Or try a demo
        </p>
      </div>

      {/* Genre tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {DEMO_GENRES.map((genre) => {
          const active = activeGenre === genre.id
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => setActiveGenre(genre.id)}
              aria-pressed={active}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all"
              style={{
                borderColor: active ? genre.color : '#2a2a2a',
                background: active
                  ? `linear-gradient(135deg, ${genre.color}25, ${genre.color}10)`
                  : '#1a1a1a',
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
              }}
            >
              <span aria-hidden="true">{genre.emoji}</span>
              <span className="font-medium">{genre.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active genre description */}
      <p className="mb-3 text-[10px] text-white/40">
        {activeConfig.description}
      </p>

      {/* Song list */}
      <div className="space-y-1.5">
        {songs.map((song) => {
          const isLoading = loadingId === song.id
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => handleLoad(song)}
              disabled={isLoading}
              className="group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all hover:border-white/20 disabled:opacity-60"
              style={{ borderColor: '#2a2a2a', background: '#131313' }}
            >
              {/* Album-art placeholder — genre gradient + emoji */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base"
                style={{
                  background: `linear-gradient(135deg, ${activeConfig.color}40, ${activeConfig.color}15)`,
                  border: `1px solid ${activeConfig.color}30`,
                }}
                aria-hidden="true"
              >
                {activeConfig.emoji}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white">
                  {song.title}
                </p>
                <p className="truncate text-[10px] text-white/40">
                  {song.artist} · {formatDuration(song.duration)}
                </p>
              </div>

              {/* Play button */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${activeConfig.color}, ${activeConfig.color}cc)`,
                }}
              >
                {isLoading ? (
                  <Loader2
                    className="h-3 w-3 animate-spin text-white"
                    aria-hidden="true"
                  />
                ) : (
                  <Play
                    className="ml-0.5 h-3 w-3 fill-current text-white"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Coming-soon hint */}
      <p className="mt-3 text-center text-[9px] text-white/30">
        ✨ Demo tracks coming soon — Suno-generated audio
      </p>
    </div>
  )
}

export default DemoSongsLibrary
