import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { PresetsSidebar } from '../components/studio/PresetsSidebar';
import { ControlsSidebar } from '../components/studio/ControlsSidebar';
import { CanvasPlaceholder } from '../components/studio/CanvasPlaceholder';
import VisualizerCanvas from '../components/studio/VisualizerCanvas';
import { AudioPlayerBar } from '../components/studio/AudioPlayerBar';
import { AudioUploader, AudioPlayer } from '@/components/audio';
import { GlobalDropZone } from '@/components/studio/GlobalDropZone';
import { useAudioStore } from '@/store/useAudioStore';
import { useFormatStore } from '@/store/useFormatStore';
import { SOCIAL_FORMATS, getFormat } from '@/lib/socialFormats';
import { useAnalyzer } from '@/contexts/AnalyzerContext';

function AuSpecLogo() {
  return (
    <a
      href="/"
      className="flex items-center gap-2.5 text-white"
      aria-label="AuSpec home"
    >
      <img
        src="/auspec-logo.png"
        alt="AuSpec"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
          filter:
            'drop-shadow(0 0 8px rgba(59,130,246,0.9)) drop-shadow(0 0 16px rgba(139,92,246,0.5))',
        }}
      />
      <span className="text-sm font-semibold tracking-tight">AuSpec</span>
    </a>
  );
}

function FormatSelector() {
  const activeFormat = useFormatStore((s) => s.activeFormat);
  const setFormat = useFormatStore((s) => s.setFormat);
  const format = getFormat(activeFormat);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:border-white/20"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a', color: 'white' }}
      >
        <span aria-hidden="true">{format.icon}</span>
        <span className="font-medium">{format.aspectRatio}</span>
        <span className="hidden sm:inline text-white/50 text-xs">{format.platform}</span>
        <svg
          className="h-3 w-3 text-white/40"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {dropdownOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border py-1 shadow-xl"
          style={{ background: '#111', borderColor: '#2a2a2a' }}
        >
          {SOCIAL_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={activeFormat === f.id}
              onClick={() => {
                setFormat(f.id);
                setDropdownOpen(false);
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
              style={{
                background:
                  activeFormat === f.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              }}
            >
              <span className="text-base" aria-hidden="true">
                {f.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-white">{f.label}</p>
                <p className="text-[10px] text-white/40">
                  {f.aspectRatio} · {f.width}×{f.height}
                </p>
              </div>
              {activeFormat === f.id && (
                <svg
                  className="ml-auto h-3 w-3 text-[#3b82f6]"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopBar({ hasAudio }: { hasAudio: boolean }) {
  return (
    <header
      className="h-12 shrink-0 border-b bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
    >
      <div className="flex h-full items-center justify-between px-4">
        <AuSpecLogo />

        <nav className="flex items-center gap-2">
          <FormatSelector />
          <a
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            Dashboard
          </a>
          <button
            type="button"
            disabled={!hasAudio}
            aria-disabled={!hasAudio}
            title={hasAudio ? 'Export visualization' : 'Upload audio first'}
            className={
              hasAudio
                ? 'inline-flex items-center gap-1.5 rounded-md border bg-[#1a1a1a] px-3 py-1.5 text-sm text-white hover:bg-white/5 transition-colors'
                : 'inline-flex items-center gap-1.5 rounded-md border bg-[#1a1a1a] px-3 py-1.5 text-sm text-white/80 opacity-50 cursor-not-allowed'
            }
            style={{ borderColor: '#2a2a2a' }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export
          </button>
        </nav>
      </div>
    </header>
  );
}

export function StudioPage() {
  const audioFile = useAudioStore((s) => s.audioFile);
  useAnalyzer();
  const hasAudio = audioFile !== null;
  // Mount VisualizerCanvas whenever audio is loaded. Its rAF loop runs
  // continuously and renders cover art independently of frequencyData,
  // so cover art remains visible while paused.
  const showVisualizer = hasAudio;

  return (
    <GlobalDropZone>
      <div className="flex h-screen w-screen flex-col bg-black text-white overflow-hidden">
        <TopBar hasAudio={hasAudio} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <PresetsSidebar />
          <main className="flex flex-1 min-w-0 min-h-0">
            {showVisualizer ? (
              <VisualizerCanvas />
            ) : hasAudio ? (
              <CanvasPlaceholder />
            ) : (
              <AudioUploader />
            )}
          </main>
          <ControlsSidebar />
        </div>

        {hasAudio ? <AudioPlayer /> : <AudioPlayerBar />}
      </div>
    </GlobalDropZone>
  );
}

export default StudioPage;
