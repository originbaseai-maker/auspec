import { useAudioStore } from '@/store/useAudioStore';
import { useAnalyzer } from '@/contexts/AnalyzerContext';
import { AnalyzerDebugOverlay } from '@/components/debug/AnalyzerDebugOverlay';

const PREVIEW_BARS = 32;

function MiniPreview({ raw }: { raw: Uint8Array }) {
  const step = Math.max(1, Math.floor(raw.length / PREVIEW_BARS));
  return (
    <div
      className="flex items-end justify-center gap-[2px]"
      style={{ height: 120 }}
      aria-hidden="true"
    >
      {Array.from({ length: PREVIEW_BARS }).map((_, i) => {
        const v = raw[i * step] ?? 0;
        const h = Math.max(2, (v / 255) * 120);
        return (
          <div
            key={i}
            className="w-[2px] rounded-full bg-gradient-to-t from-[#3b82f6] to-[#8b5cf6]"
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

export function CanvasPlaceholder() {
  const audioFile = useAudioStore((s) => s.audioFile);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const { frequencyData } = useAnalyzer();
  const hasAudio = audioFile !== null;
  const showLive = isPlaying && frequencyData !== null;

  return (
    <div className="relative flex-1 min-w-0 min-h-0 bg-[#0a0a0a] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-2xl auspec-canvas-glow"
        style={{
          boxShadow:
            '0 0 0 1px rgba(59,130,246,0.15), 0 0 80px 0 rgba(139,92,246,0.18) inset',
        }}
      />

      <div className="relative flex h-full w-full items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          {showLive ? (
            <>
              <MiniPreview raw={frequencyData!.raw} />
              <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/40">
                Live preview · Phase 4 brings full visualizers
              </p>
            </>
          ) : (
            <>
              <div className="relative mb-8 flex items-center justify-center">
                <img
                  src="/auspec-logo.png"
                  alt="AuSpec"
                  className="auspec-logo-spin"
                  style={{ width: 220, height: 220, objectFit: 'contain' }}
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                    filter: 'blur(8px)',
                  }}
                  aria-hidden="true"
                />
              </div>

              {hasAudio ? (
                <h2 className="text-2xl md:text-3xl font-semibold text-white auspec-canvas-pulse">
                  Ready to visualize
                </h2>
              ) : (
                <>
                  <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">
                    Upload audio to start
                  </h2>
                  <p className="text-sm md:text-base text-white/60">
                    Drag &amp; drop or click below
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <AnalyzerDebugOverlay />

      <style>{`
        @keyframes auspec-glow-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(59,130,246,0.15),
              0 0 80px 0 rgba(139,92,246,0.18) inset;
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(139,92,246,0.25),
              0 0 120px 0 rgba(59,130,246,0.22) inset;
          }
        }
        .auspec-canvas-glow {
          animation: auspec-glow-pulse 6s ease-in-out infinite;
        }
        @keyframes auspec-spin-slow {
          to { transform: rotate(360deg); }
        }
        .auspec-canvas-spin {
          animation: auspec-spin-slow 60s linear infinite;
          transform-origin: 50% 50%;
        }
        @keyframes auspec-logo-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .auspec-logo-spin {
          animation: auspec-logo-rotate 20s linear infinite;
          transform-origin: center center;
        }
        @keyframes auspec-text-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .auspec-canvas-pulse {
          animation: auspec-text-pulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default CanvasPlaceholder;
