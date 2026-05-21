# Phase 9 — Social Format System

## Status
- [x] Complete

## Formats
| Format | Ratio | Resolution | Platform |
|--------|-------|-----------|----------|
| YouTube | 16:9 | 1920×1080 | YouTube |
| TikTok / Reels | 9:16 | 1080×1920 | TikTok |
| Instagram Square | 1:1 | 1080×1080 | Instagram |
| Instagram Portrait | 4:5 | 1080×1350 | Instagram |
| Twitter / X | 16:9 | 1280×720 | Twitter |
| Cinematic | 21:9 | 2560×1080 | Cinema |

## Files Created
- src/lib/socialFormats.ts
- src/store/useFormatStore.ts

## Files Modified
- src/pages/StudioPage.tsx — aspect ratio canvas + FormatSelector + flash overlay
- src/components/studio/ControlsSidebar.tsx — Format section grid
