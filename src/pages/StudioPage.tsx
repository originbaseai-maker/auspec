import { useEffect, useRef, useState } from 'react';
import { Download, Menu, Palette, Upload, Sparkles } from 'lucide-react';
import { BrandKitModal } from '@/components/studio/BrandKitModal';
import { detectFormat, isValidAudioFile, MAX_FILE_SIZE } from '@/types/audio';
import { PresetsSidebar } from '../components/studio/PresetsSidebar';
import { CategoryGrid } from '../components/studio/CategoryGrid';
import { CategoryDetailPanel } from '../components/studio/CategoryDetailPanel';
import { Timeline } from '../components/studio/Timeline';
import { AudioElement } from '../components/studio/AudioElement';
import { FrameWrapper } from '../components/studio/FrameWrapper';
import { TextInteractive } from '../components/studio/TextInteractive';
import { CanvasInteractiveOverlay } from '../components/studio/CanvasInteractiveOverlay';
import { FpsCounter } from '../components/studio/FpsCounter';
import VisualizerCanvas from '../components/studio/VisualizerCanvas';
import { AudioPlayerBar } from '../components/studio/AudioPlayerBar';
import { AudioUploader } from '@/components/audio';
import { GlobalDropZone } from '@/components/studio/GlobalDropZone';
import { MobileBottomSheet } from '@/components/studio/MobileBottomSheet';
import {
  MobileBottomTabs,
  type MobileTabId,
} from '@/components/studio/MobileBottomTabs';
import { useAudioStore } from '@/store/useAudioStore';
import { useAnalyzer } from '@/contexts/AnalyzerContext';
import { useFormatStore } from '@/store/useFormatStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useStudioUIStore } from '@/store/useStudioUIStore';
import { initializeLayersFromVisualizerStore } from '@/store/useLayerStore';
import { useViewport } from '@/hooks/useViewport';
import { STUDIO_CATEGORIES } from '@/types/studio';
import {
  SOCIAL_FORMATS,
  getFormat,
  type FormatConfig,
} from '@/lib/socialFormats';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthModal, UserMenu } from '@/components/auth';
import { ExportModal } from '@/components/studio/ExportModal';
import { useExportStore } from '@/store/useExportStore';

function AuSpecLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <a
        href="/"
        className="flex items-center gap-1.5 text-white"
        aria-label="AuSpec home"
      >
        <span className="text-sm font-bold">AuSpec</span>
        <span
          className="rounded-md border px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: '#8b5cf6',
            color: '#8b5cf6',
            background: 'rgba(139,92,246,0.08)',
          }}
        >
          PRO
        </span>
      </a>
    );
  }
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
      <span
        className="ml-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
        style={{
          borderColor: '#8b5cf6',
          color: '#8b5cf6',
          background: 'rgba(139,92,246,0.08)',
        }}
      >
        PRO
      </span>
    </a>
  );
}

function FormatSelector({ compact = false }: { compact?: boolean }) {
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
        className={
          compact
            ? 'flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors hover:border-white/20'
            : 'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:border-white/20'
        }
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a', color: 'white' }}
      >
        <span aria-hidden="true">{format.icon}</span>
        <span className="font-medium">{format.aspectRatio}</span>
        {!compact && (
          <span className="hidden sm:inline text-white/50 text-xs">{format.platform}</span>
        )}
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

function SaveProjectControl() {
  const user = useAuthStore((s) => s.user);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const saveProject = useProjectStore((s) => s.saveProject);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      await saveProject(saveName.trim());
      setSaveModalOpen(false);
      setSaveName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSaveModalOpen(true)}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors"
        style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
      >
        {activeProjectId ? 'Update' : 'Save'}
      </button>

      {saveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Save project"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSaveModalOpen(false);
          }}
        >
          <div
            className="w-72 rounded-xl border bg-[#111] p-5 shadow-2xl"
            style={{ borderColor: '#2a2a2a' }}
          >
            <h3 className="mb-3 text-sm font-semibold text-white">
              {activeProjectId ? 'Update Project' : 'Save Project'}
            </h3>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
                else if (e.key === 'Escape') setSaveModalOpen(false);
              }}
              placeholder="Project name..."
              className="mb-4 w-full rounded-md border bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
              style={{ borderColor: '#2a2a2a' }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !saveName.trim()}
                className="flex-1 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="flex-1 rounded-md border py-2 text-sm text-white/70"
                style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TopBar({ hasAudio }: { hasAudio: boolean }) {
  const user = useAuthStore((s) => s.user);
  const [showAuth, setShowAuth] = useState(false);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const openExport = useExportStore((s) => s.open);
  const isExportOpen = useExportStore((s) => s.isOpen);

  return (
    <header
      className="h-12 shrink-0 border-b bg-[#111111]"
      style={{ borderColor: '#2a2a2a' }}
    >
      <div className="flex h-full items-center justify-between px-4">
        <AuSpecLogo />

        <nav className="flex items-center gap-2">
          <SaveProjectControl />
          <FormatSelector />
          <button
            type="button"
            onClick={() => setShowBrandKit(true)}
            aria-label="Brand Kit"
            title="Brand Kit"
            className="inline-flex items-center gap-1.5 rounded-md border bg-[#1a1a1a] px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors"
            style={{ borderColor: '#2a2a2a' }}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Brand</span>
          </button>
          <a
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          >
            Dashboard
          </a>
          <button
            type="button"
            onClick={openExport}
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
          {user ? (
            <UserMenu />
          ) : (
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="rounded-md border px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors"
              style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {isExportOpen && <ExportModal />}
      <BrandKitModal
        open={showBrandKit}
        onClose={() => setShowBrandKit(false)}
      />
    </header>
  );
}

function MobileTopBar({ hasAudio }: { hasAudio: boolean }) {
  const user = useAuthStore((s) => s.user);
  const [showAuth, setShowAuth] = useState(false);
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openExport = useExportStore((s) => s.open);
  const isExportOpen = useExportStore((s) => s.isOpen);

  return (
    <header
      className="relative flex shrink-0 items-center justify-between border-b bg-[#111111] px-3 py-2"
      style={{
        borderColor: '#2a2a2a',
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <AuSpecLogo compact />

      <div className="flex items-center gap-1.5">
        <FormatSelector compact />
        <button
          type="button"
          onClick={() => setShowBrandKit(true)}
          aria-label="Brand Kit"
          className="flex h-8 w-8 items-center justify-center rounded-md border text-white/80"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          <Palette className="h-4 w-4" aria-hidden="true" />
        </button>
        {hasAudio && (
          <button
            type="button"
            onClick={openExport}
            aria-label="Export"
            className="flex h-8 w-8 items-center justify-center rounded-md border text-white/80"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-white/80"
          style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-2 top-12 z-50 w-48 rounded-lg border p-1 shadow-2xl"
            style={{ borderColor: '#2a2a2a', background: '#131313' }}
          >
            <a
              href="/dashboard"
              role="menuitem"
              className="block rounded px-3 py-2 text-[12px] text-white/80 hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </a>
            <a
              href="/"
              role="menuitem"
              className="block rounded px-3 py-2 text-[12px] text-white/80 hover:bg-white/5 hover:text-white"
            >
              Home
            </a>
            {user ? (
              <div className="border-t mt-1 pt-1" style={{ borderColor: '#2a2a2a' }}>
                <UserMenu />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowAuth(true);
                }}
                role="menuitem"
                className="block w-full rounded px-3 py-2 text-left text-[12px] text-white/80 hover:bg-white/5 hover:text-white"
              >
                Sign In
              </button>
            )}
          </div>
        </>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {isExportOpen && <ExportModal />}
      <BrandKitModal
        open={showBrandKit}
        onClose={() => setShowBrandKit(false)}
      />
    </header>
  );
}

function FormatFlashOverlay({ format }: { format: FormatConfig }) {
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

function PreviewUploadButton() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setAudioFile = useAudioStore((s) => s.setAudioFile);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isValidAudioFile(file)) return;
    if (file.size > MAX_FILE_SIZE) return;
    const objectUrl = URL.createObjectURL(file);
    const duration = await new Promise<number>((resolve) => {
      const audio = new Audio(objectUrl);
      audio.onloadedmetadata = () => resolve(audio.duration || 0);
      audio.onerror = () => resolve(0);
    });
    setAudioFile({
      file,
      name: file.name,
      duration,
      size: file.size,
      format: detectFormat(file),
      objectUrl,
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/flac,audio/x-flac,.mp3,.wav,.m4a,.flac"
        onChange={onChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-[1.02]"
        style={{
          borderColor: 'rgba(255,255,255,0.12)',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(139,92,246,0.9))',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload Audio
      </button>
    </>
  );
}

function PreviewBadge() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full px-3 py-1"
      style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/60">
        <Sparkles className="h-3 w-3 text-[#8b5cf6]" aria-hidden="true" />
        Preview Mode
      </span>
    </div>
  );
}

interface CanvasAreaProps {
  showCanvas: boolean;
  hasAudio: boolean;
  previewMode: boolean;
  showFormatFlash: boolean;
  format: FormatConfig;
}

/**
 * The canvas + overlays — identical across viewports. The container
 * around it (padding, sidebars) differs; this just renders the canvas
 * pyramid: FrameWrapper → VisualizerCanvas → TextInteractive → FpsCounter →
 * preview chrome.
 */
function CanvasArea({
  showCanvas,
  hasAudio,
  previewMode,
  showFormatFlash,
  format,
}: CanvasAreaProps) {
  if (!showCanvas) return <AudioUploader />;
  return (
    <FrameWrapper
      style={{
        aspectRatio: `${format.width} / ${format.height}`,
        width: `min(100cqw, calc(100cqh * ${format.width} / ${format.height}))`,
        height: `min(100cqh, calc(100cqw * ${format.height} / ${format.width}))`,
      }}
    >
      <VisualizerCanvas />
      {/* Visualizer drag/resize overlay sits BELOW TextInteractive so
          text remains the primary tap target when both are present. */}
      <CanvasInteractiveOverlay />
      <TextInteractive />
      <FpsCounter />
      {showFormatFlash && <FormatFlashOverlay format={format} />}
      {!hasAudio && previewMode && (
        <>
          <PreviewBadge />
          <PreviewUploadButton />
        </>
      )}
    </FrameWrapper>
  );
}

export function StudioPage() {
  const audioFile = useAudioStore((s) => s.audioFile);
  const previewMode = useAudioStore((s) => s.previewMode);
  useAnalyzer();
  const hasAudio = audioFile !== null;
  const showCanvas = hasAudio || previewMode;

  const activeFormat = useFormatStore((s) => s.activeFormat);
  const format = getFormat(activeFormat);
  const viewport = useViewport();

  const [showFormatFlash, setShowFormatFlash] = useState(false);
  const prevFormat = useRef(activeFormat);

  const [mobileTab, setMobileTab] = useState<MobileTabId | null>(null);
  const activeCategory = useStudioUIStore((s) => s.activeCategory);
  const layersInitialized = useRef(false);

  // One-time migration: copy the existing visualizerStore state into the
  // new layer store on first mount. Subsequent mounts are no-ops thanks
  // to the ref guard.
  useEffect(() => {
    if (layersInitialized.current) return;
    layersInitialized.current = true;
    initializeLayersFromVisualizerStore();
  }, []);

  const setActiveCategory = useStudioUIStore((s) => s.setActiveCategory);
  const activeCategoryLabel = activeCategory
    ? STUDIO_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? 'Tools'
    : 'Tools';

  useEffect(() => {
    if (prevFormat.current === activeFormat) return;
    prevFormat.current = activeFormat;
    setShowFormatFlash(true);
    const t = window.setTimeout(() => setShowFormatFlash(false), 1500);
    return () => window.clearTimeout(t);
  }, [activeFormat]);

  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';

  const formatFlashStyles = (
    <style>{`
      @keyframes auspec-format-flash {
        0%   { opacity: 0; transform: scale(0.95); }
        20%  { opacity: 1; transform: scale(1); }
        70%  { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.05); }
      }
    `}</style>
  );

  if (isMobile) {
    return (
      <GlobalDropZone>
        <div className="flex h-screen w-screen flex-col bg-black text-white overflow-hidden">
          <MobileTopBar hasAudio={hasAudio} />

          <main
            className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden bg-[#0a0a0a] p-2"
            style={{ containerType: 'size' }}
          >
            <CanvasArea
              showCanvas={showCanvas}
              hasAudio={hasAudio}
              previewMode={previewMode}
              showFormatFlash={showFormatFlash}
              format={format}
            />
          </main>

          {hasAudio && <AudioElement />}
          {hasAudio ? <Timeline /> : <AudioPlayerBar />}

          <MobileBottomTabs
            activeTab={mobileTab}
            onTabChange={setMobileTab}
          />

          <MobileBottomSheet
            open={mobileTab === 'presets'}
            onClose={() => setMobileTab(null)}
            title="Presets"
            height="70%"
          >
            <PresetsSidebar variant="mobile" />
          </MobileBottomSheet>

          <MobileBottomSheet
            open={mobileTab === 'tools'}
            onClose={() => setMobileTab(null)}
            onBack={
              activeCategory ? () => setActiveCategory(null) : undefined
            }
            title={activeCategoryLabel}
            // 50% when adjusting a category so the canvas stays visible
            // above; 70% when picking a category so the full grid fits.
            height={activeCategory ? '50%' : '70%'}
          >
            <div className="pb-4">
              {activeCategory ? (
                <CategoryDetailPanel hideHeader />
              ) : (
                <CategoryGrid />
              )}
            </div>
          </MobileBottomSheet>
        </div>
        {formatFlashStyles}
      </GlobalDropZone>
    );
  }

  // Tablet and desktop share the same DOM shape; only sidebar widths differ.
  const presetsWidth = isTablet ? 180 : 220;
  const toolsWidth = isTablet ? 260 : 320;

  return (
    <GlobalDropZone>
      <div className="flex h-screen w-screen flex-col bg-black text-white overflow-hidden">
        <TopBar hasAudio={hasAudio} />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <PresetsSidebar widthPx={presetsWidth} />
          <main
            className="relative flex flex-1 min-w-0 min-h-0 items-center justify-center overflow-hidden bg-[#0a0a0a] p-4"
            style={{ containerType: 'size' }}
          >
            <CanvasArea
              showCanvas={showCanvas}
              hasAudio={hasAudio}
              previewMode={previewMode}
              showFormatFlash={showFormatFlash}
              format={format}
            />
          </main>
          <aside
            className="shrink-0 border-l overflow-y-auto"
            style={{
              width: toolsWidth,
              borderColor: '#1a1a1a',
              background: '#0a0a0a',
            }}
          >
            <CategoryGrid />
            <CategoryDetailPanel />
          </aside>
        </div>

        {hasAudio && <AudioElement />}
        {hasAudio ? <Timeline /> : <AudioPlayerBar />}
      </div>
      {formatFlashStyles}
    </GlobalDropZone>
  );
}

export default StudioPage;
