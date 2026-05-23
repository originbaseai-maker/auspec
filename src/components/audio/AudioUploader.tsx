import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { useAudioStore } from '@/store/useAudioStore';
import { isValidAudioFile, detectFormat, MAX_FILE_SIZE } from '@/types/audio';
import { DemoSongsLibrary } from './DemoSongsLibrary';

type UploaderState =
  | { kind: 'idle' }
  | { kind: 'dragover' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string };

const FORMATS = ['MP3', 'WAV', 'M4A', 'FLAC'] as const;
const MAX_SIZE_LABEL = 'Up to 200MB';
const ACCEPT_ATTR = 'audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/flac,audio/x-flac,.mp3,.wav,.m4a,.flac';

const readDuration = (objectUrl: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error('Could not read audio metadata'));
    audio.src = objectUrl;
  });

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`;
  return `${(bytes / 1024).toFixed(0)}KB`;
};

export function AudioUploader() {
  const audioFile = useAudioStore((s) => s.audioFile);
  const setAudioFile = useAudioStore((s) => s.setAudioFile);

  const [state, setState] = useState<UploaderState>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const errorTimer = useRef<number | null>(null);

  const setError = useCallback((message: string) => {
    setState({ kind: 'error', message });
    if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => {
      setState({ kind: 'idle' });
      errorTimer.current = null;
    }, 4000);
  }, []);

  useEffect(
    () => () => {
      if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
    },
    []
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!isValidAudioFile(file)) {
        setError('Unsupported format. Use MP3, WAV, M4A, or FLAC.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (${formatBytes(file.size)}). Max ${MAX_SIZE_LABEL}.`);
        return;
      }

      setState({ kind: 'loading' });
      const objectUrl = URL.createObjectURL(file);

      try {
        const duration = await readDuration(objectUrl);
        const format = detectFormat(file);
        setAudioFile({
          file,
          name: file.name,
          duration,
          size: file.size,
          format,
          objectUrl,
        });
      } catch {
        URL.revokeObjectURL(objectUrl);
        setError('Could not read this audio file. Try another.');
      }
    },
    [setAudioFile, setError]
  );

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (state.kind === 'idle' || state.kind === 'error') {
      setState({ kind: 'dragover' });
    }
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0 && state.kind === 'dragover') {
      setState({ kind: 'idle' });
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleFile(file);
    else setState({ kind: 'idle' });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const openPicker = () => inputRef.current?.click();
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  };

  if (audioFile !== null) return null;

  const isDragOver = state.kind === 'dragover';
  const isLoading = state.kind === 'loading';
  const isError = state.kind === 'error';

  const baseBorder = '#2a2a2a';
  const activeBorder = '#3b82f6';
  const errorBorder = '#ef4444';
  const borderColor = isError ? errorBorder : isDragOver ? activeBorder : baseBorder;

  return (
    <div className="flex h-full w-full flex-col items-center gap-8 overflow-y-auto p-6 sm:p-8">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={onInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label="Upload audio file"
        aria-disabled={isLoading}
        onClick={isLoading ? undefined : openPicker}
        onKeyDown={isLoading ? undefined : onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'group relative flex min-h-[280px] w-full max-w-3xl shrink-0 flex-col items-center justify-center',
          'rounded-2xl border-2 border-dashed bg-[#0a0a0a] px-8 py-12 text-center',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          isDragOver && 'scale-[1.015] bg-[rgba(59,130,246,0.05)]',
          !isDragOver && !isError && !isLoading && 'hover:border-[#3a3a3a] hover:bg-[#0f0f0f]',
          isLoading && 'cursor-wait',
          !isLoading && 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          borderColor,
          boxShadow:
            isDragOver
              ? '0 0 60px rgba(59,130,246,0.28), inset 0 0 0 1px rgba(59,130,246,0.18)'
              : isError
              ? '0 0 40px rgba(239,68,68,0.18)'
              : 'none',
        }}
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={state.message} />
        ) : (
          <IdleState isDragOver={isDragOver} />
        )}
      </div>

      <div className="flex w-full max-w-2xl items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] uppercase tracking-wider text-white/30">
          or
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <DemoSongsLibrary />
    </div>
  );
}

function IdleState({ isDragOver }: { isDragOver: boolean }) {
  return (
    <>
      <div
        className={[
          'mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-300',
          isDragOver
            ? 'scale-110 border-[#3b82f6]/40 bg-[#3b82f6]/10'
            : 'border-[#2a2a2a] bg-[#1a1a1a] group-hover:border-[#3a3a3a]',
        ].join(' ')}
        aria-hidden="true"
      >
        <Upload
          className={[
            'h-7 w-7 transition-colors duration-300',
            isDragOver ? 'text-[#3b82f6]' : 'text-white/70',
          ].join(' ')}
          strokeWidth={1.75}
        />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {isDragOver ? 'Drop to load' : 'Drop your audio file here'}
      </h2>
      <p className="mt-2 text-sm text-white/50">
        {isDragOver ? 'Release to upload' : 'or click to browse'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {FORMATS.map((f, i) => (
          <span
            key={f}
            className="rounded-full border border-[#2a2a2a] bg-[#111111] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/60"
          >
            {f}
            {i < FORMATS.length - 1 && (
              <span className="ml-2 text-white/20" aria-hidden="true">
                ·
              </span>
            )}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/40">{MAX_SIZE_LABEL}</p>
    </>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/5">
        <Loader2 className="h-7 w-7 animate-spin text-[#3b82f6]" strokeWidth={1.75} />
      </div>
      <p className="text-base font-medium text-white">Loading audio...</p>
      <p className="mt-1 text-xs text-white/50">Reading metadata</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/5">
        <AlertCircle className="h-7 w-7 text-[#ef4444]" strokeWidth={1.75} />
      </div>
      <p className="text-base font-semibold text-white">Upload failed</p>
      <p className="mt-2 max-w-sm text-sm text-white/60">{message}</p>
      <p className="mt-4 text-xs text-white/40">Returning in a moment...</p>
    </div>
  );
}

export default AudioUploader;
