import {
  BarChart3,
  CircleDot,
  Waves,
  Sparkles,
  Download,
} from 'lucide-react';

const VISUAL_TYPES = [
  { id: 'bars', label: 'Bars', Icon: BarChart3 },
  { id: 'circular', label: 'Circular', Icon: CircleDot },
  { id: 'wave', label: 'Wave', Icon: Waves },
  { id: 'particles', label: 'Particles', Icon: Sparkles },
] as const;

const COLOR_SWATCHES = [
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#a855f7',
  '#ffffff',
];

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/80">
        {title}
      </h3>
      <span
        className="text-[10px] font-medium uppercase tracking-wider text-white/40"
        aria-label="Phase 1 — Coming soon"
      >
        Coming soon
      </span>
    </div>
  );
}

function DisabledSlider() {
  return (
    <div
      className="relative h-1.5 w-full rounded-full bg-[#1a1a1a]"
      role="presentation"
    >
      <div
        className="absolute left-0 top-0 h-full w-1/3 rounded-full"
        style={{
          background:
            'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow"
        style={{ left: 'calc(33% - 6px)' }}
      />
    </div>
  );
}

export function ControlsSidebar() {
  return (
    <aside
      className="hidden lg:flex w-[240px] shrink-0 flex-col border-l bg-[#111111] overflow-y-auto"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Visualizer controls"
    >
      <div className="flex flex-col divide-y" style={{ color: '#2a2a2a' }}>
        <section
          className="p-4 opacity-50 cursor-not-allowed pointer-events-none"
          style={{ borderColor: '#2a2a2a' }}
        >
          <SectionHeader title="Visual Type" />
          <div className="grid grid-cols-2 gap-2">
            {VISUAL_TYPES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                disabled
                aria-disabled="true"
                className="flex flex-col items-center justify-center gap-1 rounded-md border bg-[#1a1a1a] py-3 text-xs text-white/90 cursor-not-allowed"
                style={{ borderColor: '#2a2a2a' }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="border-t p-4 opacity-50 cursor-not-allowed pointer-events-none"
          style={{ borderColor: '#2a2a2a' }}
        >
          <SectionHeader title="Colors" />
          <div className="flex items-center gap-2">
            {COLOR_SWATCHES.map((c) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full border"
                style={{ background: c, borderColor: '#2a2a2a' }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </section>

        <section
          className="border-t p-4 opacity-50 cursor-not-allowed pointer-events-none"
          style={{ borderColor: '#2a2a2a' }}
        >
          <SectionHeader title="Sensitivity" />
          <DisabledSlider />
          <div className="mt-2 flex justify-between text-[10px] text-white/40">
            <span>Low</span>
            <span>High</span>
          </div>
        </section>

        <section
          className="border-t p-4 opacity-50 cursor-not-allowed pointer-events-none"
          style={{ borderColor: '#2a2a2a' }}
        >
          <SectionHeader title="Effects" />

          <div className="mb-4 flex items-center justify-between">
            <label className="text-sm text-white/90">Glow</label>
            <span
              className="inline-flex h-5 w-9 items-center rounded-full bg-[#1a1a1a] p-0.5 border"
              style={{ borderColor: '#2a2a2a' }}
              aria-label="Glow toggle (disabled)"
            >
              <span className="h-4 w-4 rounded-full bg-white/60" />
            </span>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/90">Radius</label>
            <DisabledSlider />
          </div>
        </section>

        <section
          className="border-t p-4 opacity-50 cursor-not-allowed pointer-events-none"
          style={{ borderColor: '#2a2a2a' }}
        >
          <SectionHeader title="Export" />
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Upload audio first"
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-[#1a1a1a] py-2 text-sm text-white/90 cursor-not-allowed"
            style={{ borderColor: '#2a2a2a' }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Video
          </button>
        </section>
      </div>
    </aside>
  );
}

export default ControlsSidebar;
