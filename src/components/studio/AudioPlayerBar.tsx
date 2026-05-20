import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Play, Upload } from 'lucide-react';
import { useAudioStore } from '@/store/useAudioStore';
import type { AudioFile } from '@/types/audio';

const FORMATS = ['mp3', 'wav', 'm4a', 'flac'] as const;
const ACCEPT = '.mp3,.wav,.m4a,.flac,audio/mpeg,audio/wav,audio/mp4,audio/flac';
const MAX_BYTES = 200 * 1024 * 1024;

type Format = AudioFile['format'];

function detectFormat(name: string): Format {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'mp3' || ext === 'wav' || ext === 'm4a' || ext === 'flac') return ext;
  return 'unknown';
}

function loadDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement('audio');
    el.preload = 'metadata';
    el.src = objectUrl;
    el.onloadedmetadata = () => resolve(el.duration || 0);
    el.onerror = () => resolve(0);
  });
}

export function AudioPlayerBar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setAudioFile = useAudioStore((s) => s.setAudioFile);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    setError(null);
    inputRef.current?.click();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const format = detectFormat(file.name);
    if (format === 'unknown') {
      setError('Unsupported format. Use MP3, WAV, M4A, or FLAC.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File too large (max 200 MB).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const duration = await loadDuration(objectUrl);

    setAudioFile({
      file,
      name: file.name,
      duration,
      size: file.size,
      format,
      objectUrl,
    });
  };

  return (
    <footer
      className="h-[72px] shrink-0 border-t bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Audio player"
    >
      <div className="flex h-full items-center gap-4 px-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={onKeyDown}
          aria-label="Upload audio file"
          className="group flex h-12 flex-1 min-w-0 items-center gap-3 rounded-md border border-dashed bg-[#0a0a0a] px-4 cursor-pointer select-none transition-colors hover:bg-[#141414] hover:border-[#3b3b3b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          style={{ borderColor: '#2a2a2a' }}
        >
          <Upload
            className="h-4 w-4 text-white/70 shrink-0 transition-colors group-hover:text-white"
            aria-hidden="true"
          />
          <p className="truncate text-sm text-white/80 group-hover:text-white">
            {error ?? 'Drop audio file here or click to upload'}
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
