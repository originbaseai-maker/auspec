import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { useAudioStore } from '@/store/useAudioStore'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'

function getFormatBadge(file: { name: string; type?: string }): string {
  if (file.type) {
    const sub = file.type.split('/')[1]
    if (sub) {
      if (sub === 'mpeg') return 'MP3'
      if (sub === 'x-m4a' || sub === 'mp4') return 'M4A'
      return sub.toUpperCase()
    }
  }
  const ext = file.name.split('.').pop()
  return ext ? ext.toUpperCase() : 'AUDIO'
}

export function AudioPlayer() {
  const audioFile = useAudioStore((s) => s.audioFile)
  const cleanup = useAudioStore((s) => s.cleanup)
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    formatTime,
  } = useAudioPlayer()

  if (!audioFile) return null

  const progressPct =
    duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0
  const volumePct = Math.max(0, Math.min(1, volume)) * 100

  const seekBg = `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${progressPct}%, #2a2a2a ${progressPct}%, #2a2a2a 100%)`
  const volumeBg = `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePct}%, #2a2a2a ${volumePct}%, #2a2a2a 100%)`

  return (
    <footer
      className="h-[72px] shrink-0 border-t bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Audio player"
    >
      <audio ref={audioRef} preload="metadata" className="hidden" />

      <div className="flex h-full items-center gap-3 px-4 sm:gap-4">
        <div className="flex min-w-0 max-w-[180px] items-center gap-2 sm:max-w-[240px]">
          <p className="truncate text-sm font-medium text-white" title={audioFile.name}>
            {audioFile.name}
          </p>
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70"
            style={{ borderColor: '#2a2a2a' }}
          >
            {getFormatBadge(audioFile)}
          </span>
        </div>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#1a1a1a] text-white transition-colors hover:bg-[#222]"
          style={{ borderColor: '#2a2a2a' }}
        >
          <span className="relative block h-4 w-4">
            <Pause
              className={`absolute inset-0 h-4 w-4 transition-all duration-200 ${
                isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
              aria-hidden="true"
            />
            <Play
              className={`absolute inset-0 h-4 w-4 fill-current transition-all duration-200 ${
                isPlaying ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        <div className="flex flex-1 min-w-0 items-center gap-3">
          <span className="hidden tabular-nums text-xs text-white/70 sm:inline whitespace-nowrap">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration > 0 && isFinite(duration) ? duration : 0}
            step={0.01}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            className="auspec-range flex-1"
            style={{ background: seekBg }}
          />
          <span className="hidden tabular-nums text-xs text-white/70 sm:inline whitespace-nowrap">
            {formatTime(duration)}
          </span>
          <span className="tabular-nums text-xs text-white/70 sm:hidden whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="hidden md:flex w-[140px] shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
            className="text-white/70 transition-colors hover:text-white"
          >
            {volume > 0 ? (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="auspec-range auspec-range--mono flex-1"
            style={{ background: volumeBg }}
          />
        </div>

        <button
          type="button"
          onClick={cleanup}
          aria-label="Remove audio"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[#1a1a1a] text-white/70 transition-colors hover:bg-[#222] hover:text-white"
          style={{ borderColor: '#2a2a2a' }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <style>{`
        .auspec-range {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          transition: opacity 150ms ease;
        }
        .auspec-range:hover { opacity: 0.95; }
        .auspec-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.0);
          transition: box-shadow 150ms ease, transform 100ms ease;
        }
        .auspec-range:hover::-webkit-slider-thumb,
        .auspec-range:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(59,130,246,0.25);
        }
        .auspec-range::-webkit-slider-thumb:active { transform: scale(1.1); }
        .auspec-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
        }
        .auspec-range::-moz-range-track {
          background: transparent;
        }
        .auspec-range--mono::-webkit-slider-thumb {
          border-color: #ffffff;
        }
        .auspec-range--mono::-moz-range-thumb {
          border-color: #ffffff;
        }
      `}</style>
    </footer>
  )
}

export default AudioPlayer
