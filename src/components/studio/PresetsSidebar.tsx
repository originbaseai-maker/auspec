import { useRef, useState, type JSX } from 'react'
import { Check, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { BUILT_IN_PRESETS, type Preset } from '@/lib/presets'
import { usePresetStore } from '@/store/usePresetStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'

function PresetDot({ preset }: { preset: Preset }): JSX.Element {
  const cfg = preset.config
  let start = '#3b82f6'
  let end = '#8b5cf6'
  if (preset.visualType === 'bars' && cfg.linearBars) {
    start = cfg.linearBars.colorStart
    end = cfg.linearBars.colorEnd
  } else if (preset.visualType === 'circular' && cfg.circularSpectrum) {
    start = cfg.circularSpectrum.colorStart
    end = cfg.circularSpectrum.colorEnd
  } else if (preset.visualType === 'wave' && cfg.wave) {
    start = cfg.wave.colorStart
    end = cfg.wave.colorEnd
  } else if (preset.visualType === 'polygon' && cfg.polygon) {
    start = cfg.polygon.colorStart
    end = cfg.polygon.colorEnd
  }
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full"
      style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
      aria-hidden="true"
    />
  )
}

interface PresetItemProps {
  preset: Preset
  isActive: boolean
  isBuiltIn: boolean
  onApply: (p: Preset) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function PresetItem({
  preset,
  isActive,
  isBuiltIn,
  onApply,
  onRename,
  onDelete,
}: PresetItemProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(preset.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    if (isBuiltIn) return
    e.stopPropagation()
    setDraft(preset.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== preset.name) onRename(preset.id, trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setDraft(preset.name)
    setEditing(false)
  }

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-md border px-2 py-2 cursor-pointer transition-all"
        style={{
          background: isActive
            ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))'
            : '#1a1a1a',
          borderColor: isActive ? '#8b5cf6' : '#2a2a2a',
        }}
        onClick={() => !editing && onApply(preset)}
      >
        <PresetDot preset={preset} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelEdit()
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded border border-[#3b82f6] bg-[#0a0a0a] px-1 text-[12px] text-white outline-none"
              autoFocus
            />
          ) : (
            <>
              <p className="truncate text-[12px] text-white/90">{preset.name}</p>
              {preset.description && (
                <p className="truncate text-[9px] text-white/40">
                  {preset.description}
                </p>
              )}
            </>
          )}
        </div>
        {!isBuiltIn && !editing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={startEdit}
              aria-label={`Rename ${preset.name}`}
              className="flex h-5 w-5 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(preset.id)
              }}
              aria-label={`Delete ${preset.name}`}
              className="flex h-5 w-5 items-center justify-center rounded text-white/50 hover:bg-red-500/20 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
        {isActive && !editing && (
          <Check className="h-3 w-3 shrink-0 text-[#3b82f6]" aria-hidden="true" />
        )}
      </div>
    </li>
  )
}

interface SavePresetModalProps {
  onSave: (name: string) => void
  onCancel: () => void
}

function SavePresetModal({ onSave, onCancel }: SavePresetModalProps): JSX.Element {
  const [name, setName] = useState('My Preset')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-72 rounded-xl border bg-[#111111] p-5 shadow-2xl"
        style={{ borderColor: '#2a2a2a' }}
      >
        <h3 className="mb-3 text-sm font-semibold text-white">Save Preset</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onSave(name.trim())
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Preset name..."
          className="mb-4 w-full rounded-md border bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-[#3b82f6]"
          style={{ borderColor: '#2a2a2a' }}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => name.trim() && onSave(name.trim())}
            className="flex-1 rounded-md py-2 text-sm font-medium text-white"
            style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border py-2 text-sm text-white/70 hover:text-white"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function PresetsSidebar(): JSX.Element {
  const [showSaveModal, setShowSaveModal] = useState(false)

  // User preset CRUD lives in usePresetStore; active highlight + apply
  // continue to live in useVisualizerStore so the existing auto-clear-on-
  // mutation logic keeps working.
  const userPresets = usePresetStore((s) => s.userPresets)
  const saveCurrentAsPreset = usePresetStore((s) => s.saveCurrentAsPreset)
  const renamePreset = usePresetStore((s) => s.renamePreset)
  const deletePreset = usePresetStore((s) => s.deletePreset)

  const activePresetId = useVisualizerStore((s) => s.activePresetId)
  const applyPreset = useVisualizerStore((s) => s.applyPreset)
  const visualizerConfig = useVisualizerStore((s) => s.visualizerConfig)
  const visualType = useVisualizerStore((s) => s.visualType)
  const backgroundColor = useVisualizerStore((s) => s.backgroundColor)

  const handleApply = (preset: Preset) => {
    applyPreset(preset)
  }

  const handleSave = (name: string) => {
    const newPreset = saveCurrentAsPreset(
      name,
      visualType,
      visualizerConfig,
      backgroundColor,
    )
    // Round-trip through applyPreset so activePresetId picks up the new one.
    applyPreset(newPreset)
    setShowSaveModal(false)
  }

  return (
    <>
      {showSaveModal && (
        <SavePresetModal
          onSave={handleSave}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col border-r bg-[#111111] overflow-hidden"
        style={{ borderColor: '#2a2a2a' }}
        aria-label="Presets and projects"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: '#2a2a2a' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Presets
          </h2>
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            title="Save current as preset"
            aria-label="Save current as preset"
            className="flex h-6 w-6 items-center justify-center rounded-md border text-white/60 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
            style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 text-[9px] uppercase tracking-widest text-white/30">
            Built-in
          </p>
          <ul className="space-y-1.5 mb-4">
            {BUILT_IN_PRESETS.map((preset) => (
              <PresetItem
                key={preset.id}
                preset={preset}
                isActive={activePresetId === preset.id}
                isBuiltIn={true}
                onApply={handleApply}
                onRename={renamePreset}
                onDelete={deletePreset}
              />
            ))}
          </ul>

          {userPresets.length > 0 ? (
            <>
              <div
                className="mb-2 border-t pt-3"
                style={{ borderColor: '#2a2a2a' }}
              >
                <p className="mb-2 text-[9px] uppercase tracking-widest text-white/30">
                  My Presets
                </p>
              </div>
              <ul className="space-y-1.5">
                {userPresets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    preset={preset}
                    isActive={activePresetId === preset.id}
                    isBuiltIn={false}
                    onApply={handleApply}
                    onRename={renamePreset}
                    onDelete={deletePreset}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div
              className="mt-2 rounded-md border border-dashed px-3 py-4 text-center"
              style={{ borderColor: '#2a2a2a' }}
            >
              <p className="text-[10px] text-white/30">
                Click + to save your first custom preset
              </p>
            </div>
          )}
        </div>

        <div className="border-t p-3" style={{ borderColor: '#2a2a2a' }}>
          <p className="mb-2 text-[9px] uppercase tracking-widest text-white/30">
            Projects
          </p>
          <div
            className="flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-4 text-center opacity-50"
            style={{ borderColor: '#2a2a2a' }}
          >
            <FolderOpen className="h-4 w-4 text-white/40 mb-1" aria-hidden="true" />
            <p className="text-[9px] text-white/40">Coming in Phase 10</p>
          </div>
        </div>
      </aside>
    </>
  )
}

export default PresetsSidebar
