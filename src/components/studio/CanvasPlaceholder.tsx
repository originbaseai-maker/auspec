import { useAudioStore } from '@/store/useAudioStore';
import { useAnalyzer } from '@/contexts/AnalyzerContext';
import { AnalyzerDebugOverlay } from '@/components/debug/AnalyzerDebugOverlay';

const RING_BARS = 48;
const RING_INNER = 100;
const RING_MAX_LIVE_HEIGHT = 28;

function SpectrumRing({
  raw,
  isPlaying,
}: {
  raw: Uint8Array | null;
  isPlaying: boolean;
}) {
  return (
    <svg
      width="220"
      height="220"
      viewBox="0 0 220 220"
      className="absolute inset-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {Array.from({ length: RING_BARS }).map((_, i) => {
        const angle = (i / RING_BARS) * Math.PI * 2;
        const rawValue = raw
          ? (raw[Math.floor((i * raw.length) / RING_BARS)] ?? 0)
          : 0;
        const staticH = i % 3 === 0 ? 22 : i % 2 === 0 ? 14 : 8;
        const barH =
          isPlaying && raw
            ? Math.max(4, (rawValue / 255) * RING_MAX_LIVE_HEIGHT)
            : staticH;
        const outer = RING_INNER + barH;
        const x1 = 110 + Math.cos(angle) * RING_INNER;
        const y1 = 110 + Math.sin(angle) * RING_INNER;
        const x2 = 110 + Math.cos(angle) * outer;
        const y2 = 110 + Math.sin(angle) * outer;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#ring-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.6 + (i % 5) * 0.08}
          />
        );
      })}
    </svg>
  );
}

export function CanvasPlaceholder() {
  const audioFile = useAudioStore((s) => s.audioFile);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const { frequencyData } = useAnalyzer();
  const hasAudio = audioFile !== null;

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
          <div className="relative mb-8" style={{ width: 220, height: 220 }}>
            <SpectrumRing
              raw={frequencyData?.raw ?? null}
              isPlaying={isPlaying}
            />

            <div
              className="absolute auspec-logo-spin"
              style={{
                top: '50%',
                left: '50%',
                width: 80,
                height: 80,
              }}
            >
              <img
                src="/auspec-logo.png"
                alt="AuSpec"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.6))',
                }}
              />
            </div>
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
        @keyframes auspec-logo-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .auspec-logo-spin {
          animation: auspec-logo-rotate 20s linear infinite;
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
