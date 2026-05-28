import { type JSX } from 'react'
import { Film, Music } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useAudioCandidates } from '@/lib/masterClock'

/**
 * Two-state segmented control + optional video picker. Visibility
 * rules match the candidates contract:
 *
 *   0 candidates → hidden (no transport, no choice to make)
 *   1 candidate  → hidden (auto-picked by resolveActiveCandidate)
 *   2+           → visible
 *
 * "2+" almost always means one music file + one or more videos.
 * Selecting 'video' with multiple video candidates surfaces a small
 * <select> next to the toggle so the user picks which video supplies
 * the audio.
 *
 * The chosen source IS the master clock — the visualiser AnalyserNode
 * and the Timeline transport both bind to the same element via
 * resolveActiveCandidate(). useMasterClockSync handles the pause /
 * resume handover when the user flips the toggle mid-playback.
 */
export function AudioSourceToggle(): JSX.Element | null {
  const audioSource = useAudioStore((s) => s.audioSource)
  const videoAudioAssetId = useAudioStore((s) => s.videoAudioAssetId)
  const setAudioSource = useAudioStore((s) => s.setAudioSource)
  const candidates = useAudioCandidates()

  if (candidates.length < 2) return null

  const musicCandidate = candidates.find((c) => c.kind === 'music')
  const videoCandidates = candidates.filter((c) => c.kind === 'video')
  const hasMusic = musicCandidate !== undefined
  const hasVideo = videoCandidates.length > 0

  // Active video id — explicit pick if it maps to a live candidate;
  // otherwise the first video candidate (top of stack).
  const activeVideoId =
    videoAudioAssetId &&
    videoCandidates.some((c) => c.id === videoAudioAssetId)
      ? videoAudioAssetId
      : (videoCandidates[0]?.id ?? null)

  const handleClickMusic = () => {
    if (!hasMusic) return
    setAudioSource('music')
  }
  const handleClickVideo = () => {
    if (!activeVideoId) return
    setAudioSource('video', activeVideoId)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wider text-white/40">
        Audio
      </span>
      <div
        role="group"
        aria-label="Audio source"
        className="flex items-center overflow-hidden rounded-md border"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
      >
        <button
          type="button"
          onClick={handleClickMusic}
          aria-pressed={audioSource === 'music'}
          title="Use the uploaded music file"
          disabled={!hasMusic}
          className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              audioSource === 'music'
                ? 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                : 'transparent',
            color:
              audioSource === 'music'
                ? '#fff'
                : 'rgba(255,255,255,0.55)',
          }}
        >
          <Music className="h-3 w-3" aria-hidden="true" />
          Music
        </button>
        <div className="h-4 w-px" style={{ background: '#2a2a2a' }} />
        <button
          type="button"
          onClick={handleClickVideo}
          aria-pressed={audioSource === 'video'}
          title="Use the video layer's own audio"
          disabled={!hasVideo}
          className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background:
              audioSource === 'video'
                ? 'linear-gradient(90deg, rgba(59,130,246,0.18), rgba(139,92,246,0.18))'
                : 'transparent',
            color:
              audioSource === 'video' ? '#fff' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Film className="h-3 w-3" aria-hidden="true" />
          Video
        </button>
      </div>
      {audioSource === 'video' && videoCandidates.length > 1 && activeVideoId && (
        <select
          value={activeVideoId}
          onChange={(e) => setAudioSource('video', e.target.value)}
          aria-label="Audio source video"
          className="rounded-md border bg-[#1a1a1a] px-1 py-0.5 text-[10px] text-white/80"
          style={{ borderColor: '#2a2a2a' }}
        >
          {videoCandidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default AudioSourceToggle
