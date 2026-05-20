import { Download } from 'lucide-react';
import { PresetsSidebar } from '../components/studio/PresetsSidebar';
import { ControlsSidebar } from '../components/studio/ControlsSidebar';
import { CanvasPlaceholder } from '../components/studio/CanvasPlaceholder';
import VisualizerCanvas from '../components/studio/VisualizerCanvas';
import { AudioPlayerBar } from '../components/studio/AudioPlayerBar';
import { AudioUploader, AudioPlayer } from '@/components/audio';
import { useAudioStore } from '@/store/useAudioStore';
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
        className="h-9 w-9 rounded-full object-cover"
        style={{
          filter:
            'drop-shadow(0 0 8px rgba(59,130,246,0.8)) drop-shadow(0 0 16px rgba(139,92,246,0.4))',
          border: '1.5px solid rgba(59,130,246,0.4)',
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

export function StudioPage() {
  const audioFile = useAudioStore((s) => s.audioFile);
  useAnalyzer();
  const hasAudio = audioFile !== null;
  // Mount VisualizerCanvas whenever audio is loaded. Its rAF loop runs
  // continuously and renders cover art independently of frequencyData,
  // so cover art remains visible while paused.
  const showVisualizer = hasAudio;

  return (
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
  );
}

export default StudioPage;
