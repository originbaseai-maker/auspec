import { Download } from 'lucide-react';
import { PresetsSidebar } from '../components/studio/PresetsSidebar';
import { ControlsSidebar } from '../components/studio/ControlsSidebar';
import { CanvasPlaceholder } from '../components/studio/CanvasPlaceholder';
import { AudioPlayerBar } from '../components/studio/AudioPlayerBar';
import { AudioUploader, AudioPlayer } from '@/components/audio';
import { useAudioStore } from '@/store/useAudioStore';

function AuSpecLogo() {
  return (
    <a
      href="/"
      className="flex items-center gap-2 text-white"
      aria-label="AuSpec home"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="auspec-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle
          cx="11"
          cy="11"
          r="8"
          fill="none"
          stroke="url(#auspec-logo-grad)"
          strokeWidth="1.5"
        />
        <line x1="11" y1="5" x2="11" y2="9" stroke="url(#auspec-logo-grad)" strokeWidth="2" strokeLinecap="round" />
        <line x1="11" y1="13" x2="11" y2="17" stroke="url(#auspec-logo-grad)" strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="11" x2="9" y2="11" stroke="url(#auspec-logo-grad)" strokeWidth="2" strokeLinecap="round" />
        <line x1="13" y1="11" x2="17" y2="11" stroke="url(#auspec-logo-grad)" strokeWidth="2" strokeLinecap="round" />
      </svg>
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
  const hasAudio = audioFile !== null;

  return (
    <div className="flex h-screen w-screen flex-col bg-black text-white overflow-hidden">
      <TopBar hasAudio={hasAudio} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <PresetsSidebar />
        <main className="flex flex-1 min-w-0 min-h-0">
          {hasAudio ? <CanvasPlaceholder /> : <AudioUploader />}
        </main>
        <ControlsSidebar />
      </div>

      {hasAudio ? <AudioPlayer /> : <AudioPlayerBar />}
    </div>
  );
}

export default StudioPage;
