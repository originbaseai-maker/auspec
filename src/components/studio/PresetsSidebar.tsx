import { FolderOpen } from 'lucide-react';

const PRESETS = [
  'Dark Neon Circle',
  'Minimal White Wave',
  'Cyberpunk Pulse',
  'Golden Yoga Flow',
  'Podcast Clean',
  'Tropical Bars',
];

export function PresetsSidebar() {
  return (
    <aside
      className="hidden md:flex w-[200px] shrink-0 flex-col border-r bg-[#111111] overflow-y-auto"
      style={{ borderColor: '#2a2a2a' }}
      aria-label="Presets and projects"
    >
      <div className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
          Presets
        </h2>
        <ul className="space-y-2">
          {PRESETS.map((name) => (
            <li key={name}>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full text-left rounded-md border px-3 py-2 text-sm text-white/90 bg-[#1a1a1a] opacity-50 cursor-not-allowed select-none"
                style={{ borderColor: '#2a2a2a' }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="mt-2 border-t p-4"
        style={{ borderColor: '#2a2a2a' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
          Projects
        </h2>
        <div
          className="flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-6 text-center opacity-50 cursor-not-allowed select-none"
          style={{ borderColor: '#2a2a2a' }}
          aria-disabled="true"
        >
          <FolderOpen className="h-5 w-5 text-white/60 mb-2" aria-hidden="true" />
          <p className="text-xs text-white/70 leading-snug">
            Save your first project
          </p>
        </div>
      </div>
    </aside>
  );
}

export default PresetsSidebar;
