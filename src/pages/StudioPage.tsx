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
import { useAnalyzer } from '@/contexts/AnalyzerContext';
import { useFormatStore } from '@/store/useFormatStore';
import { getFormat, type SocialFormat } from '@/lib/socialFormats';

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

function TopBar({ hasAudio }: { hasAudio: boolean }) {
  return (
    <header
      className="h-12 shrink-0 border-b bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
    >
      <div className="flex h-full items-center justify-between px-4">
        <AuSpecLogo />

        <nav className="flex items-center gap-2">
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

function FormatFlashOverlay({ format }: { format: SocialFormat }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
      style={{ animation: 'auspec-format-flash 1.5s ease-in-out forwards' }}
    >
      <div
        className="rounded-lg px-4 py-2 text-center"
        style={{
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <p className="text-xs text-white/60">{format.platform}</p>
        <p className="text-sm font-semibold text-white">{format.label}</p>
        <p className="text-xs text-white/40">
          {format.aspectRatio} · {format.width}×{format.height}
        </p>
      </div>
    </div>
  );
}

export function StudioPage() {
  const audioFile = useAudioStore((s) => s.audioFile);
  useAnalyzer();
  const hasAudio = audioFile !== null;
  const showVisualizer = hasAudio;

  const activeFormat = useFormatStore((s) => s.activeFormat);
  const format = getFormat(activeFormat);

  const [showFormatFlash, setShowFormatFlash] = useState(false);
  const prevFormat = useRef(activeFormat);

  useEffect(() => {
    if (prevFormat.current === activeFormat) return;
    prevFormat.current = activeFormat;
    setShowFormatFlash(true);
    const t = window.setTimeout(() => setShowFormatFlash(false), 1500);
    return () => window.clearTimeout(t);
  }, [activeFormat]);

  return (
    <GlobalDropZone>
      <div className="flex h-screen w-screen flex-col bg-black text-white overflow-hidden">
        <TopBar hasAudio={hasAudio} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <PresetsSidebar />
          <main
            className="relative flex flex-1 min-w-0 min-h-0 items-center justify-center overflow-hidden bg-[#0a0a0a] p-4"
            style={{ containerType: 'size' }}
          >
            {hasAudio ? (
              <div
                className="relative flex overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]"
                style={{
                  aspectRatio: `${format.width} / ${format.height}`,
                  width: `min(100cqw, calc(100cqh * ${format.width} / ${format.height}))`,
                  height: `min(100cqh, calc(100cqw * ${format.height} / ${format.width}))`,
                }}
              >
                {showVisualizer ? <VisualizerCanvas /> : <CanvasPlaceholder />}
                {showFormatFlash && <FormatFlashOverlay format={format} />}
              </div>
            ) : (
              <AudioUploader />
            )}
          </main>
          <ControlsSidebar />
        </div>

        {hasAudio ? <AudioPlayer /> : <AudioPlayerBar />}
      </div>

      <style>{`
        @keyframes auspec-format-flash {
          0%   { opacity: 0; transform: scale(0.95); }
          20%  { opacity: 1; transform: scale(1); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
    </GlobalDropZone>
  );
}

export default StudioPage;
