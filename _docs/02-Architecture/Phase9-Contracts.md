# Phase 9 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Phase 9 (Social Format System). Treat as frozen.

---

## Social Formats

```ts
// src/types/format.ts (or co-located with the store)
export type SocialFormat =
  | 'youtube'       // 16:9  — 1920×1080
  | 'tiktok'        // 9:16  — 1080×1920
  | 'instagram_sq'  // 1:1   — 1080×1080
  | 'instagram_pt'  // 4:5   — 1080×1350
  | 'twitter'       // 16:9  — 1280×720
  | 'cinematic'     // 21:9  — 2560×1080

export interface FormatConfig {
  id: SocialFormat
  label: string
  width: number
  height: number
  aspectRatio: string   // e.g. '16:9'
  platform: string      // e.g. 'YouTube'
  icon: string          // emoji
}

export const SOCIAL_FORMATS: FormatConfig[] = [
  { id: 'youtube',      label: 'YouTube',           width: 1920, height: 1080, aspectRatio: '16:9', platform: 'YouTube',   icon: '▶' },
  { id: 'tiktok',       label: 'TikTok / Reels',    width: 1080, height: 1920, aspectRatio: '9:16', platform: 'TikTok',    icon: '♪' },
  { id: 'instagram_sq', label: 'Instagram Square',  width: 1080, height: 1080, aspectRatio: '1:1',  platform: 'Instagram', icon: '⬛' },
  { id: 'instagram_pt', label: 'Instagram Portrait',width: 1080, height: 1350, aspectRatio: '4:5',  platform: 'Instagram', icon: '▬' },
  { id: 'twitter',      label: 'Twitter / X',       width: 1280, height: 720,  aspectRatio: '16:9', platform: 'Twitter',   icon: '✕' },
  { id: 'cinematic',    label: 'Cinematic',         width: 2560, height: 1080, aspectRatio: '21:9', platform: 'Cinema',    icon: '🎬' },
]
```

A helper for lookups:

```ts
export function getFormatConfig(id: SocialFormat): FormatConfig {
  return SOCIAL_FORMATS.find((f) => f.id === id) ?? SOCIAL_FORMATS[0]
}
```

---

## Format Store

```ts
// src/store/useFormatStore.ts
export interface FormatStore {
  activeFormat: SocialFormat  // default: 'youtube'
  setFormat: (format: SocialFormat) => void
}
```

Persistence (recommended but not strictly required): bootstrap `activeFormat` from `localStorage['auspec-active-format']` and write through on `setFormat` — same pattern as `usePresetStore`. If persistence is dropped, the store starts every session on `'youtube'`.

---

## Canvas Contract

[VisualizerCanvas](src/components/studio/VisualizerCanvas.tsx) and [CanvasPlaceholder](src/components/studio/CanvasPlaceholder.tsx) must:

1. **Respect the active format's aspect ratio** via the `aspect-ratio` CSS property on the canvas wrapper (no manual width/height math in JS).
2. **Scale to fit within the available studio space** — letterbox horizontally (e.g. 21:9 in a 16:9 area) or pillarbox vertically (e.g. 9:16 in a 16:9 area). Use `max-width: 100%; max-height: 100%; width: auto; height: auto` on the wrapper so the browser does the math.
3. **Show format dimensions as overlay text when format changes** — small label in a corner of the canvas reading e.g. `YouTube · 16:9 · 1920×1080`, fading in for ~1.5 s after every `activeFormat` change, then fading out. Implemented via a transient state + `useEffect` watching `activeFormat`.

The existing `useVisualizerCanvas` hook already uses `ResizeObserver` on the container, so the analyzer / rAF loop will pick up the new dimensions automatically once the wrapper resizes.

---

## StudioPage Layout Contract

The canvas area maintains the correct aspect ratio via this structure:

```tsx
// inside <main>
<div className="flex flex-1 min-w-0 min-h-0 items-center justify-center p-4">
  <div
    style={{ aspectRatio: `${format.width} / ${format.height}` }}
    className="relative bg-black max-w-full max-h-full"
  >
    {/* VisualizerCanvas / CanvasPlaceholder fills 100% */}
  </div>
</div>
```

Rules:

- The **wrapper** controls the aspect ratio via `aspect-ratio`. The browser sizes it to fit inside the parent flex cell.
- The canvas / placeholder fills the wrapper **100% width and height** and reads its actual pixel dimensions through `ResizeObserver` (no changes needed in the canvas component).
- The outer flex cell uses `items-center justify-center` so the aspect-correct child is letterboxed / pillarboxed in the dead space.
- No new visualization logic — switching format only changes the wrapper size, and existing renderers re-size automatically.

---

## Format Selector UI

A new section in the studio (suggested placement: top of [ControlsSidebar](src/components/studio/ControlsSidebar.tsx), or a row in the [TopBar](src/pages/StudioPage.tsx)) renders a grid of 6 `SOCIAL_FORMATS` buttons. Each button shows the icon + label + aspect-ratio chip. Active format gets the violet/blue gradient border like the Visual Type selector.

Clicking writes via `useFormatStore.setFormat(id)`.

---

## Backwards Compatibility

- Replaces the unused `canvasRatio` field on `useVisualizerStore` for canvas sizing. Keep `canvasRatio` in the store for now (other code may read it); add a follow-up to remove or alias it to the new format after this phase ships.
- Existing presets do not need updating — format is independent of preset config.
- Export (Phase 12) will read `width` / `height` from `getFormatConfig(activeFormat)` to render at the platform's native resolution.
