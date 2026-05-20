import { Play, Upload } from 'lucide-react';

const FORMATS = ['mp3', 'wav', 'm4a', 'flac'];

export function AudioPlayerBar() {
  return (
    <footer
      className="h-[72px] shrink-0 border-t bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Audio player"
    >
      <div className="flex h-full items-center gap-4 px-4">
        <div
          className="flex h-12 flex-1 min-w-0 items-center gap-3 rounded-md border border-dashed bg-[#0a0a0a] px-4 opacity-50 cursor-not-allowed select-none"
          style={{ borderColor: '#2a2a2a' }}
          aria-disabled="true"
        >
          <Upload className="h-4 w-4 text-white/70 shrink-0" aria-hidden="true" />
          <p className="truncate text-sm text-white/80">
            Drop audio file here or click to upload
          </p>
          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            {FORMATS.map((f) => (
              <span
                key={f}
                className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60"
                style={{ borderColor: '#2a2a2a' }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label="Play"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-[#1a1a1a] text-white/80 opacity-50 cursor-not-allowed"
          style={{ borderColor: '#2a2a2a' }}
        >
          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        </button>

        <div
          className="hidden md:flex flex-1 max-w-[280px] items-center gap-3 opacity-50"
          aria-disabled="true"
        >
          <div
            className="relative h-1.5 flex-1 rounded-full bg-[#1a1a1a] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <div className="h-full w-0 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]" />
          </div>
          <span className="text-xs tabular-nums text-white/70 whitespace-nowrap">
            0:00 / 0:00
          </span>
        </div>
      </div>
    </footer>
  );
}

export default AudioPlayerBar;
