# Phase 8 — Cover Art + Logo Upload

## Status
- [x] Complete

## Features
- [x] Upload album cover image
- [x] Upload creator logo
- [x] Center placement on canvas
- [x] Circle crop mode
- [x] Square crop mode
- [x] Adjustable size (10–50% of canvas)
- [x] Blurred background generation from cover art

## Files Created
- src/types/coverArt.ts — CropMode, CoverArtImage, loadImageFile, isValidImageFile
- src/store/useCoverArtStore.ts — Zustand store, objectUrl cleanup
- src/lib/renderers/coverArt.ts — renderCoverArt(), blurred bg, crop modes, logo overlay
- src/components/coverart/CoverArtUploader.tsx — two-zone uploader with previews
- src/components/coverart/index.ts — barrel export

## Files Modified
- src/components/studio/VisualizerCanvas.tsx — renders cover art after visualizer
- src/components/studio/ControlsSidebar.tsx — Cover Art section with controls

## Dependencies
- Phase 7 complete ✅
