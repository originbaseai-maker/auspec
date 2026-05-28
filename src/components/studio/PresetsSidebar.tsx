import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  FolderOpen,
  GripVertical,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  Unlock,
} from 'lucide-react'
import { BUILT_IN_PRESETS, type Preset } from '@/lib/presets'
import { MAX_PRESET_FAVORITES, usePresetStore } from '@/store/usePresetStore'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useAuthStore } from '@/store/useAuthStore'
import { LayerSidebar } from './LayerSidebar'

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
  const frameEnabled = preset.frameConfig?.enabled === true
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full"
      style={{
        background: `linear-gradient(135deg, ${start}, ${end})`,
        boxShadow: frameEnabled
          ? `0 0 0 1.5px ${preset.frameConfig?.color ?? '#3b82f6'}`
          : 'none',
      }}
      aria-hidden="true"
    />
  )
}

interface PresetItemProps {
  preset: Preset
  isActive: boolean
  isBuiltIn: boolean
  isLocked: boolean
  isFavorite: boolean
  canFavorite: boolean
  showDragHandle?: boolean
  onApply: (p: Preset) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  onToggleLock: (id: string) => void
}

function PresetItem({
  preset,
  isActive,
  isBuiltIn,
  isLocked,
  isFavorite,
  canFavorite,
  showDragHandle,
  onApply,
  onRename,
  onDelete,
  onToggleFavorite,
  onToggleLock,
}: PresetItemProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(preset.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  const startEdit = (e: React.MouseEvent) => {
    if (isBuiltIn || isLocked) return
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

  const deleteLabel = isBuiltIn
    ? `Hide ${preset.name}`
    : `Delete ${preset.name}`
  const starDisabled = !isFavorite && !canFavorite
  const starLabel = isFavorite
    ? `Remove ${preset.name} from favorites`
    : starDisabled
      ? `Favorites full (${MAX_PRESET_FAVORITES} max)`
      : `Add ${preset.name} to favorites`

  return (
    <div
      ref={itemRef}
      className="group flex items-center gap-2 rounded-md border px-2 py-2 cursor-pointer transition-all"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))'
          : '#1a1a1a',
        borderColor: isActive ? '#8b5cf6' : '#2a2a2a',
      }}
      onClick={() => !editing && onApply(preset)}
    >
      {showDragHandle && (
        <GripVertical
          className="h-3 w-3 shrink-0 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      )}
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
      {!editing && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (starDisabled) return
              onToggleFavorite(preset.id)
            }}
            aria-pressed={isFavorite}
            aria-label={starLabel}
            title={starLabel}
            disabled={starDisabled}
            className="flex h-5 w-5 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              color: isFavorite ? '#f59e0b' : 'rgba(255,255,255,0.35)',
            }}
          >
            <Star
              className="h-3 w-3"
              aria-hidden="true"
              fill={isFavorite ? '#f59e0b' : 'none'}
              strokeWidth={isFavorite ? 1.5 : 2}
            />
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isBuiltIn && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleLock(preset.id)
                  }}
                  aria-pressed={isLocked}
                  aria-label={
                    isLocked
                      ? `Unlock ${preset.name}`
                      : `Lock ${preset.name} to prevent edits`
                  }
                  title={
                    isLocked
                      ? 'Locked — click to unlock'
                      : 'Click to lock and prevent edits'
                  }
                  className="flex h-5 w-5 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white"
                >
                  {isLocked ? (
                    <Lock
                      className="h-3 w-3 text-amber-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <Unlock className="h-3 w-3" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={startEdit}
                  disabled={isLocked}
                  aria-label={`Rename ${preset.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(preset.id)
              }}
              disabled={!isBuiltIn && isLocked}
              aria-label={deleteLabel}
              title={
                isBuiltIn
                  ? 'Hide preset (restorable)'
                  : isLocked
                    ? 'Locked — unlock to delete'
                    : 'Delete preset'
              }
              className="flex h-5 w-5 items-center justify-center rounded text-white/50 hover:bg-red-500/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {isActive && !editing && (
        <Check
          className="h-3 w-3 shrink-0 text-[#3b82f6]"
          aria-hidden="true"
        />
      )}
    </div>
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

/**
 * `desktop` (default) — fixed-width left sidebar (220 px default,
 * override via `widthPx`). `mobile` — fills its parent (used inside a
 * MobileBottomSheet) with no width constraint.
 *
 * StudioPage now handles viewport-based show/hide, so this no longer
 * uses `hidden md:flex`; rendering is fully controlled by the parent.
 */
export type PresetsSidebarVariant = 'desktop' | 'mobile'
/**
 * Which sections of the sidebar to render. Desktop always shows
 * `'both'` (presets list + Layers panel pinned at the bottom). Mobile
 * splits them into two separate bottom-sheet tabs and passes
 * `'presetsOnly'` or `'layersOnly'`.
 */
export type PresetsSidebarSection = 'both' | 'presetsOnly' | 'layersOnly'

interface PresetsSidebarProps {
  variant?: PresetsSidebarVariant
  widthPx?: number
  mobileSection?: PresetsSidebarSection
}

export function PresetsSidebar({
  variant = 'desktop',
  widthPx = 220,
  mobileSection = 'both',
}: PresetsSidebarProps = {}): JSX.Element {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const userPresets = usePresetStore((s) => s.userPresets)
  const builtInHidden = usePresetStore((s) => s.builtInHidden)
  const favorites = usePresetStore((s) => s.favorites)
  const saveCurrentAsPreset = usePresetStore((s) => s.saveCurrentAsPreset)
  const renamePreset = usePresetStore((s) => s.renamePreset)
  const deletePreset = usePresetStore((s) => s.deletePreset)
  const hideBuiltIn = usePresetStore((s) => s.hideBuiltIn)
  const restoreAllBuiltIn = usePresetStore((s) => s.restoreAllBuiltIn)
  const toggleFavorite = usePresetStore((s) => s.toggleFavorite)
  const reorderFavorites = usePresetStore((s) => s.reorderFavorites)
  const togglePresetLock = usePresetStore((s) => s.togglePresetLock)
  const userPresetLockMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const p of userPresets) m.set(p.id, p.locked === true)
    return m
  }, [userPresets])

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
    applyPreset(newPreset)
    setShowSaveModal(false)
  }

  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const loadProject = useProjectStore((s) => s.loadProject)
  const user = useAuthStore((s) => s.user)

  const handleLoadProject = (id: string) => {
    loadProject(id)
    navigate('/studio')
  }

  const visibleBuiltIns = useMemo(
    () => BUILT_IN_PRESETS.filter((p) => !builtInHidden.includes(p.id)),
    [builtInHidden],
  )

  const favoritePresets = useMemo(() => {
    const lookup = new Map<string, Preset>()
    for (const p of BUILT_IN_PRESETS) lookup.set(p.id, p)
    for (const p of userPresets) lookup.set(p.id, p)
    return favorites
      .map((id) => lookup.get(id))
      .filter((p): p is Preset => p !== undefined)
  }, [favorites, userPresets])

  const canFavoriteMore = favorites.length < MAX_PRESET_FAVORITES
  const totalAllPresets = visibleBuiltIns.length + userPresets.length

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDragIndex(index)
  }
  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) setDragOverIndex(index)
  }
  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const fromRaw = e.dataTransfer.getData('text/plain')
    const from = parseInt(fromRaw, 10)
    if (Number.isFinite(from) && from !== index) {
      reorderFavorites(from, index)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const onDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // Mobile-only "layers-only" tab renders just the LayerSidebar with no
  // surrounding presets chrome. Keeps the bottom sheet focused on a
  // single concept per tab.
  if (variant === 'mobile' && mobileSection === 'layersOnly') {
    return (
      <aside
        className="flex h-full w-full flex-col bg-[#0a0a0a] overflow-hidden"
        aria-label="Layers"
      >
        <div className="flex-1 overflow-y-auto">
          <LayerSidebar />
        </div>
      </aside>
    )
  }

  // 'presetsOnly' (mobile) and 'both' (desktop default) share the
  // preset-list rendering below; mobile presets-only just suppresses
  // the trailing <LayerSidebar />.
  const showLayers = mobileSection !== 'presetsOnly'
  const showPresets = mobileSection !== 'layersOnly'

  return (
    <>
      {showSaveModal && (
        <SavePresetModal
          onSave={handleSave}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
      <aside
        className={
          variant === 'mobile'
            ? 'flex h-full w-full flex-col bg-[#0a0a0a] overflow-hidden'
            : 'flex shrink-0 flex-col border-r bg-[#111111] overflow-hidden'
        }
        style={
          variant === 'mobile'
            ? undefined
            : { borderColor: '#2a2a2a', width: widthPx }
        }
        aria-label="Presets, projects, and layers"
      >
        {showPresets && (
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
        )}

        {showPresets && (
        <div className="flex-1 overflow-y-auto">
          {/* FAVORITES */}
          <section
            className="px-3 pt-3 pb-3 border-b"
            style={{
              borderColor: '#1a1a1a',
              background:
                'linear-gradient(180deg, rgba(59,130,246,0.04), rgba(139,92,246,0.04))',
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-widest text-white/40">
                Favorites
              </p>
              <span className="text-[9px] tabular-nums text-white/30">
                {favorites.length}/{MAX_PRESET_FAVORITES}
              </span>
            </div>
            {favoritePresets.length > 0 ? (
              <ul className="space-y-1.5">
                {favoritePresets.map((preset, index) => {
                  const isOver = dragOverIndex === index && dragIndex !== index
                  return (
                    <li
                      key={preset.id}
                      draggable
                      onDragStart={onDragStart(index)}
                      onDragOver={onDragOver(index)}
                      onDrop={onDrop(index)}
                      onDragEnd={onDragEnd}
                      className="transition-transform"
                      style={{
                        transform: isOver ? 'translateY(2px)' : 'none',
                        boxShadow: isOver
                          ? 'inset 0 2px 0 0 #3b82f6'
                          : 'none',
                        opacity: dragIndex === index ? 0.5 : 1,
                        cursor: 'grab',
                      }}
                    >
                      <PresetItem
                        preset={preset}
                        isActive={activePresetId === preset.id}
                        isBuiltIn={usePresetStore.getState().isBuiltIn(preset.id)}
                        isLocked={userPresetLockMap.get(preset.id) === true}
                        isFavorite={true}
                        canFavorite={true}
                        showDragHandle
                        onApply={handleApply}
                        onRename={renamePreset}
                        onDelete={(id) => {
                          // Built-in → hide; user → delete
                          if (usePresetStore.getState().isBuiltIn(id)) {
                            hideBuiltIn(id)
                          } else {
                            deletePreset(id)
                          }
                        }}
                        onToggleFavorite={toggleFavorite}
                        onToggleLock={togglePresetLock}
                      />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div
                className="rounded-md border border-dashed px-3 py-3 text-center"
                style={{ borderColor: '#2a2a2a' }}
              >
                <p className="text-[10px] leading-snug text-white/30">
                  Star presets to pin them here
                </p>
              </div>
            )}
          </section>

          {/* ALL PRESETS — collapsible */}
          <section className="px-3 pt-3 pb-3">
            <button
              type="button"
              onClick={() => setAllOpen((v) => !v)}
              aria-expanded={allOpen}
              className="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight
                  className="h-3 w-3 text-white/40 transition-transform"
                  style={{ transform: allOpen ? 'rotate(90deg)' : 'none' }}
                  aria-hidden="true"
                />
                <span className="text-[9px] uppercase tracking-widest text-white/40">
                  All Presets
                </span>
              </span>
              <span className="text-[9px] tabular-nums text-white/30">
                {totalAllPresets}
              </span>
            </button>

            {allOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-[9px] uppercase tracking-widest text-white/30">
                    Built-in
                  </p>
                  {visibleBuiltIns.length > 0 ? (
                    <ul className="space-y-1.5">
                      {visibleBuiltIns.map((preset) => (
                        <li key={preset.id}>
                          <PresetItem
                            preset={preset}
                            isActive={activePresetId === preset.id}
                            isBuiltIn={true}
                            isLocked={false}
                            isFavorite={favorites.includes(preset.id)}
                            canFavorite={canFavoriteMore}
                            onApply={handleApply}
                            onRename={renamePreset}
                            onDelete={hideBuiltIn}
                            onToggleFavorite={toggleFavorite}
                            onToggleLock={togglePresetLock}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-white/30">
                      All built-ins hidden.
                    </p>
                  )}
                  {builtInHidden.length > 0 && (
                    <button
                      type="button"
                      onClick={restoreAllBuiltIn}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[10px] text-white/50 hover:text-white/80 transition-colors"
                      style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Restore {builtInHidden.length} default preset
                      {builtInHidden.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                <div className="border-t pt-3" style={{ borderColor: '#2a2a2a' }}>
                  <p className="mb-1.5 text-[9px] uppercase tracking-widest text-white/30">
                    Custom ({userPresets.length})
                  </p>
                  {userPresets.length > 0 ? (
                    <ul className="space-y-1.5">
                      {userPresets.map((preset) => (
                        <li key={preset.id}>
                          <PresetItem
                            preset={preset}
                            isActive={activePresetId === preset.id}
                            isBuiltIn={false}
                            isLocked={userPresetLockMap.get(preset.id) === true}
                            isFavorite={favorites.includes(preset.id)}
                            canFavorite={canFavoriteMore}
                            onApply={handleApply}
                            onRename={renamePreset}
                            onDelete={deletePreset}
                            onToggleFavorite={toggleFavorite}
                            onToggleLock={togglePresetLock}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div
                      className="rounded-md border border-dashed px-3 py-3 text-center"
                      style={{ borderColor: '#2a2a2a' }}
                    >
                      <p className="text-[10px] text-white/30">
                        Click + to save your first custom preset
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* PROJECTS */}
          <section
            className="border-t px-3 py-3"
            style={{ borderColor: '#1a1a1a' }}
          >
            <p className="mb-2 text-[9px] uppercase tracking-widest text-white/30">
              Projects
            </p>
            {user && projects.length > 0 ? (
              <ul className="space-y-1">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleLoadProject(p.id)}
                      className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors hover:border-[#3b82f6]/40"
                      style={{ borderColor: '#2a2a2a', background: '#1a1a1a' }}
                    >
                      <FolderOpen
                        className="h-3 w-3 shrink-0 text-white/50"
                        aria-hidden="true"
                      />
                      <span className="truncate text-[11px] text-white/80">
                        {p.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-4 text-center opacity-50"
                style={{ borderColor: '#2a2a2a' }}
              >
                <FolderOpen
                  className="h-4 w-4 text-white/40 mb-1"
                  aria-hidden="true"
                />
                <p className="text-[9px] text-white/40">
                  {user ? 'No projects yet' : 'Sign in to save'}
                </p>
              </div>
            )}
          </section>
        </div>
        )}
        {showLayers && (
          /* Layers section pinned at the bottom of the sidebar so the
             scrollable presets list above can grow to fill remaining
             space. On mobile this branch is skipped (Layers lives in
             its own bottom-sheet tab). */
          <LayerSidebar />
        )}
      </aside>
    </>
  )
}

export default PresetsSidebar
