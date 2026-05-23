# Studio Redesign — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Restructures Studio from "sidebar with all controls" into a workflow-driven
> layout. Treat as frozen.

---

## New Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  TopBar: Logo+PRO  |  FormatPill  |  Save Dashboard Export Avatar
├──────────┬───────────────────────────────┬──────────────┤
│          │                               │              │
│ PRESETS  │      CANVAS (live)            │  CATEGORIES  │
│ (incl.   │                               │  (2×4 grid)  │
│ delete   │                               │  + detail    │
│ buttons) │                               │  panel       │
│          │                               │              │
│ ─────    │                               │              │
│ AI ZONE  │                               │              │
│ (chat +  │                               │              │
│ history) │                               │              │
├──────────┴───────────────────────────────┴──────────────┤
│  TIMELINE: Play | 0:00 | Waveform + Trim Handles | 3:48 | Tools
└─────────────────────────────────────────────────────────┘
```

Left sidebar split top/bottom: **Presets** (existing list, gains delete on built-ins) and **AI Zone** (new, UI-only shell). Right sidebar is now a **2×4 Category grid** with a detail panel that slides up from below the grid when a category is active. Bottom row replaces the existing `AudioPlayer` with a **Timeline** showing waveform + trim handles + transport.

---

## Category Definitions

```ts
// src/types/studio.ts (or co-located with the UI store)
export type StudioCategory =
  | 'visualizer_bars'
  | 'visualizer_circular'
  | 'visualizer_wave'
  | 'visualizer_polygon'
  | 'particles'      // placeholder for AI-driven particles (Phase 13+)
  | 'background'     // background image / color / video
  | 'logo'           // logo upload + frame
  | 'colors'         // primary / secondary + AI hint

export interface CategoryConfig {
  id: StudioCategory
  label: string
  icon: 'bars' | 'circular' | 'wave' | 'polygon' | 'particles' | 'background' | 'logo' | 'colors'
  hasAI: boolean
}

export const STUDIO_CATEGORIES: CategoryConfig[] = [
  { id: 'visualizer_bars',     label: 'Bars',       icon: 'bars',       hasAI: false },
  { id: 'visualizer_circular', label: 'Circular',   icon: 'circular',   hasAI: false },
  { id: 'visualizer_wave',     label: 'Wave',       icon: 'wave',       hasAI: false },
  { id: 'visualizer_polygon',  label: 'Polygon',    icon: 'polygon',    hasAI: false },
  { id: 'particles',           label: 'Particles',  icon: 'particles',  hasAI: true  },
  { id: 'background',          label: 'Background', icon: 'background', hasAI: false },
  { id: 'logo',                label: 'Logo',       icon: 'logo',       hasAI: false },
  { id: 'colors',              label: 'Colors',     icon: 'colors',     hasAI: true  },
]
```

**Behavior:** clicking one of the first 4 categories ALSO calls `useVisualizerStore.setVisualType()` to the corresponding type. The other 4 don't change `visualType` — they just open their detail panel. The detail panel below the grid renders different controls per category:

| Category | Detail panel contents |
|----------|------------------------|
| `visualizer_bars` | bar count, smoothing, glow, mirror, hue spread, freq range, side mode, display mode (digital/lines/dots) |
| `visualizer_circular` | radius, inner radius, bar count, smoothing, glow, rotation, bass pulse, hue, freq, side mode |
| `visualizer_wave` | line thickness, filled, glow, mirror, hue, freq |
| `visualizer_polygon` | shape selector, radius, bar count, smoothing, glow, rotation, fill, bar direction, hue, freq |
| `particles` | "Coming soon" placeholder + AI prompt hint |
| `background` | bg color swatches, blurred-bg toggle, intensity, cover art uploader |
| `logo` | logo uploader, crop mode, fill scale + Auto button, rotation |
| `colors` | primary/secondary swatches + AI prompt hint |

---

## UI Store — Active Category

```ts
// src/store/useStudioUIStore.ts
import type { StudioCategory } from '@/types/studio'

export interface StudioUIStore {
  activeCategory: StudioCategory | null  // null = no detail panel open
  setActiveCategory: (cat: StudioCategory | null) => void
}
```

Defaults: `activeCategory: null` (no panel open on first load). Reopening the same category is a no-op; opening a different one swaps the panel. Clicking the X / outside (or the same category twice) clears it.

---

## Presets — User Can Delete Built-in

```ts
// Extend usePresetStore
export interface PresetStore {
  // existing
  userPresets: Preset[]
  saveCurrentAsPreset: (...) => Preset
  renamePreset: (id: string, newName: string) => void
  deletePreset: (id: string) => void           // user presets only
  isBuiltIn: (id: string) => boolean

  // NEW — soft-hide built-ins
  builtInHidden: string[]                       // localStorage-persisted
  hideBuiltIn: (id: string) => void             // soft-deletes a built-in
  restoreAllBuiltIn: () => void                 // clears builtInHidden
}
```

Storage key: `auspec-builtin-hidden`. Same JSON-array pattern as `userPresets`.

**Sidebar rendering** ([PresetsSidebar.tsx](src/components/studio/PresetsSidebar.tsx)):

```ts
// In the Built-in section:
BUILT_IN_PRESETS
  .filter((p) => !builtInHidden.includes(p.id))
  .map((p) => ...)
```

Delete button (Trash icon) appears on **every** preset row now (was: user presets only). For built-ins it calls `hideBuiltIn(id)`; for user presets it calls `deletePreset(id)`. A small "Restore defaults" link appears at the bottom of the Built-in section if `builtInHidden.length > 0` and calls `restoreAllBuiltIn()`.

---

## Timeline — Trim Region

```ts
// Extend useAudioStore
export interface AudioStore {
  // existing
  audioFile: AudioFile | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  audioElement: HTMLAudioElement | null

  // NEW
  trimStart: number       // seconds, default 0
  trimEnd: number | null  // seconds, null = end of track
  loop: boolean           // default false — when true, loop within [trimStart, trimEnd]
  setTrimStart: (s: number) => void
  setTrimEnd: (s: number | null) => void
  resetTrim: () => void
  setLoop: (loop: boolean) => void
}
```

**Defaults on `setAudioFile`:** `trimStart: 0`, `trimEnd: null`, `loop: false`. The track defaults to playing in full until the user drags a handle.

**Playback semantics** ([useAudioPlayer.ts](src/hooks/useAudioPlayer.ts)):

- On `timeupdate`, if `trimEnd != null && audio.currentTime >= trimEnd`:
  - If `loop`: seek to `trimStart` and continue.
  - Else: stop playback (`setIsPlaying(false)`).
- On play, if `audio.currentTime < trimStart`: seek to `trimStart` before playing.
- Seek bar in Timeline is clamped to `[trimStart, trimEnd ?? duration]`.

**Timeline UI:**

```
[▶] 0:00 ╞══[waveform with trim handles ◤      ◥]══╡ 3:48  🔁  ✂
```

- Play / pause button
- Current time
- Waveform strip (rendered from `analyzerEngine`'s buffered data; if no audio yet, show a flat baseline)
- Two draggable trim handles inside the waveform
- Duration
- Loop toggle (🔁)
- Trim tools (reset, snap to current, etc.) — minimal v1: just a reset button

---

## AI Zone — UI Shell Only

```ts
// src/store/useAIStore.ts
export interface AIStore {
  prompt: string
  isLoading: boolean
  history: Array<{ id: string; prompt: string; result: string | null; ts: number }>
  setPrompt: (p: string) => void
  setLoading: (b: boolean) => void
  addHistoryEntry: (entry: { prompt: string; result: string | null }) => void
  clearHistory: () => void
}
```

UI in the left sidebar below the Presets section:

```
┌──────────────────────────┐
│  ✦ AI Style              │  ← header with PRO badge
│  ┌────────────────────┐  │
│  │ Describe a look... │  │  ← textarea
│  └────────────────────┘  │
│  [    Generate    ]      │  ← disabled with "Coming in Phase 13" tooltip
│                          │
│  ─── History ───         │
│  · "neon vaporwave"      │
│  · "minimal podcast"     │
└──────────────────────────┘
```

For this redesign branch, **Generate** is wired to set `isLoading: true` for ~1s, push a stub `{ result: null }` entry to `history`, and clear the prompt. No backend call. Real generation lands in Phase 13.

History persists to `localStorage["auspec-ai-history"]` (last 20 entries).

---

## TopBar Changes

Same components as today (LogoBadge + SaveProjectControl + FormatSelector + Dashboard link + Export + UserMenu/SignIn), but a small **PRO badge** sits next to the logo to signal paid features. The badge is purely visual in this redesign branch — entitlement enforcement is Phase 13.

```tsx
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
```

---

## File Plan

**New**

- `src/types/studio.ts` — `StudioCategory`, `CategoryConfig`, `STUDIO_CATEGORIES`
- `src/store/useStudioUIStore.ts`
- `src/store/useAIStore.ts`
- `src/components/studio/CategoryGrid.tsx` — 2×4 icon grid (right sidebar top)
- `src/components/studio/CategoryDetailPanel.tsx` — slide-up panel below the grid; switches on `activeCategory`
- `src/components/studio/Timeline.tsx` — replaces the existing `AudioPlayer` row
- `src/components/studio/AIZone.tsx` — bottom of left sidebar
- `src/components/studio/TrimHandles.tsx` — used inside `Timeline.tsx`

**Modified**

- `src/store/usePresetStore.ts` — add `builtInHidden` + `hideBuiltIn` + `restoreAllBuiltIn`; persist to `auspec-builtin-hidden`
- `src/store/useAudioStore.ts` — add trim/loop fields + setters; reset trim on `setAudioFile`
- `src/hooks/useAudioPlayer.ts` — honor `trimStart`/`trimEnd`/`loop` on play / timeupdate
- `src/components/studio/PresetsSidebar.tsx` — delete button on all preset rows; "Restore defaults" link; AIZone underneath
- `src/components/studio/ControlsSidebar.tsx` — replaced by `CategoryGrid` + `CategoryDetailPanel` (old file can be deleted once all controls are migrated)
- `src/pages/StudioPage.tsx` — new layout: left rail (presets + AI), center (canvas), right rail (categories + detail), bottom (Timeline). TopBar gains PRO badge.

**Deleted**

- `src/components/studio/AudioPlayer.tsx` — replaced by `Timeline.tsx`. Keep `AudioPlayerBar.tsx` (used in the "no audio" state).

---

## Backwards Compatibility

- All existing visualizer config + format + cover-art state survives — only the UI surface changes.
- Existing saved projects (Phase 10) still load; new fields (`trimStart`, `trimEnd`, `loop`) default to `0` / `null` / `false` on missing data.
- `useVisualizerStore.setVisualType` keeps its current shape — `CategoryGrid` just calls it for the first 4 categories.
- `useCoverArtStore` is unchanged; the **Background** and **Logo** category panels reuse its existing actions / `CoverArtUploaderSingle` / Auto-Sync wiring.

---

## Open Questions Deferred

- **Particles renderer** — Phase 13+ (AI-driven). The category card shows "Coming soon" until then.
- **Waveform pre-render** — v1 of the Timeline uses a low-frequency snapshot of `frequencyData.timeDomain` accumulated during playback. A proper pre-pass via `OfflineAudioContext` lands later if needed.
- **Restore single built-in** — only `restoreAllBuiltIn` ships now. Per-preset restore can come later if users hide things they didn't mean to.
- **AI history pruning** — capped at 20 entries via `slice(-20)` on insert.
