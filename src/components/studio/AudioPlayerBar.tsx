import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ArrowRight, ChevronUp, Music, Sparkles, Upload } from 'lucide-react';
import { useAudioStore } from '@/store/useAudioStore';
import { useAIStore } from '@/store/useAIStore';
import { useStudioUIStore } from '@/store/useStudioUIStore';
import type { AudioFile } from '@/types/audio';
import { DemoSongsLibrary } from '@/components/audio/DemoSongsLibrary';

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
  const [showDemos, setShowDemos] = useState(false);
  // One-shot dismiss: once the user has interacted with the "Or
  // generate with AI" hint we hide it for the rest of the session.
  // useState (not persisted) is intentional — a fresh tab gets the
  // discovery prompt again.
  const [hintDismissed, setHintDismissed] = useState(false);
  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory);
  const requestOpenTools = useStudioUIStore((s) => s.requestOpenTools);
  const requestAIFocus = useAIStore((s) => s.requestFocus);

  const handleHintClick = () => {
    setHintDismissed(true);
    // Inline expansion pattern — same as clicking a tool tile.
    // 1. setActiveCategory drives CategoryDetailPanel to mount
    //    <AIStylePanel /> in the fine-tune slot
    // 2. requestOpenTools flips the mobile tab to 'tools' so the
    //    sheet is visible (no-op on desktop where the Tools panel
    //    is always mounted)
    // 3. requestFocus bumps useAIStore.focusToken; AIStylePanel's
    //    useEffect runs on the next rAF, focuses the textarea, and
    //    scrolls it into view smoothly — works on both viewports
    setActiveCategory('ai_style');
    requestOpenTools();
    requestAIFocus();
  };

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

  const showHint = !hintDismissed;

  return (
    <footer
      className="shrink-0 border-t bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Audio player"
    >
      <div className="flex h-[72px] items-center gap-4 px-4">
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

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowDemos((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={showDemos}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all hover:border-white/30"
            style={{
              borderColor: showDemos ? 'rgba(59,130,246,0.5)' : '#2a2a2a',
              background: showDemos
                ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))'
                : '#1a1a1a',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <Music className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">Demo Songs</span>
            <ChevronUp
              className="h-3.5 w-3.5 transition-transform"
              style={{
                transform: showDemos ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              aria-hidden="true"
            />
          </button>

          {showDemos && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDemos(false)}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Demo songs"
                className="absolute bottom-full right-0 z-50 mb-3 w-[420px] max-h-[60vh] overflow-y-auto rounded-xl border p-4 shadow-2xl"
                style={{
                  borderColor: '#2a2a2a',
                  background: 'linear-gradient(180deg, #131313, #0a0a0a)',
                }}
              >
                <DemoSongsLibrary onSongLoaded={() => setShowDemos(false)} />
              </div>
            </>
          )}
        </div>
      </div>
      {showHint && (
        <div
          className="flex justify-center border-t px-4 py-2"
          style={{ borderColor: '#1a1a1a' }}
        >
          <button
            type="button"
            onClick={handleHintClick}
            aria-label="Open AI Style and focus prompt"
            className="ai-gradient-text inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-80"
            // Fallback color in case ai-gradient-text utility isn't
            // loaded; bg-clip:text drops `color: transparent` cleanly
            // on top.
            style={{ color: '#ec4899' }}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Or generate a vibe with AI
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </footer>
  );
}

export default AudioPlayerBar;
