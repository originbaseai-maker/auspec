# Phase 8 — Locked Interface Contracts

> **LOCKED INTERFACES — DO NOT CHANGE AFTER AGENTS START**
>
> Phase 8 (Cover Art + Logo Upload). Treat as frozen.

---

## Cover Art Store

```ts
// src/store/useCoverArtStore.ts
export type CropMode = 'circle' | 'square' | 'none'

export interface CoverArtImage {
  file: File
  objectUrl: string
  width: number
  height: number
}

export interface CoverArtStore {
  coverArt: CoverArtImage | null
  logo: CoverArtImage | null
  coverArtSize: number          // 0.1–0.5, default 0.3 (ratio of canvas min dimension)
  logoSize: number              // 0.1–0.3, default 0.15
  coverArtCropMode: CropMode    // default 'circle'
  logoCropMode: CropMode        // default 'square'
  coverArtPosition: { x: number; y: number }  // 0–1 normalized, default { x: 0.5, y: 0.5 }
  blurredBgEnabled: boolean     // default true
  blurredBgIntensity: number    // 0–40, default 20

  setCoverArt: (image: CoverArtImage | null) => void
  setLogo: (image: CoverArtImage | null) => void
  setCoverArtSize: (size: number) => void
  setLogoSize: (size: number) => void
  setCoverArtCropMode: (mode: CropMode) => void
  setLogoCropMode: (mode: CropMode) => void
  setCoverArtPosition: (pos: { x: number; y: number }) => void
  setBlurredBgEnabled: (enabled: boolean) => void
  setBlurredBgIntensity: (intensity: number) => void
  cleanup: () => void
}
```

The store owns the `objectUrl` lifecycle: `setCoverArt` / `setLogo` revoke the previous URL when replaced, and `cleanup()` revokes both. UI code must go through the setters.

---

## Cover Art Renderer

```ts
// src/lib/renderers/coverArt.ts
export function renderCoverArt(
  ctx: CanvasRenderingContext2D,
  coverArt: CoverArtImage,
  logo: CoverArtImage | null,
  config: {
    coverArtSize: number
    logoSize: number
    coverArtCropMode: CropMode
    logoCropMode: CropMode
    coverArtPosition: { x: number; y: number }
    blurredBgEnabled: boolean
    blurredBgIntensity: number
  },
  width: number,
  height: number,
): void
```

Draws (in this order, bottom to top):

1. **Blurred background** (if `blurredBgEnabled`) — full-canvas blurred version of the cover art, alpha-darkened
2. **Cover art** — cropped per `coverArtCropMode`, sized as `coverArtSize × min(width, height)`, positioned via the normalized `coverArtPosition`
3. **Logo overlay** (if present) — cropped per `logoCropMode`, sized as `logoSize × min(width, height)`

Image elements should be cached per `objectUrl` to avoid reloading every frame.

---

## Upload Component Contract

```ts
// src/components/coverart/CoverArtUploader.tsx
export default function CoverArtUploader(): JSX.Element
```

- **Two upload zones**: cover art + logo
- Accepts: `.jpg`, `.png`, `.webp`, `.gif`
- Max size: **10 MB** each
- Shows preview thumbnail after upload
- Shows remove button per zone
- Invalid file / oversize → inline error message

---

## Controls Integration

New **"Cover Art"** section in [src/components/studio/ControlsSidebar.tsx](src/components/studio/ControlsSidebar.tsx):

- Upload cover art button
- Upload logo button
- Crop mode selector (`circle` / `square` / `none`) — per asset
- Size slider — per asset
- Blurred background toggle + intensity slider

All controls write to `useCoverArtStore`.
