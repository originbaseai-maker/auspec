# AuSpec — Master Phase Plan

> Last updated: 2026-05-24 (post-redesign, post-frame, post-presets-favorites)
> Current branch: main (auspec.ai live)

## Status Legend
- ✅ Shipped
- 🚧 In progress
- 📋 Planned
- 💡 Backlog (not committed yet)

---

## ✅ Completed Phases

### Phase 1-7 — Foundation
- ✅ Core visualizer engine (4 types: Bars, Circular, Wave, Polygon)
- ✅ Audio upload + playback
- ✅ Preset system with built-ins + custom save
- ✅ Cover art + Logo with Auto-Sync
- ✅ Frequency analysis (bass/mid/treble/RMS/peak/beat)
- ✅ Background colors + blurred bg
- ✅ Format selector (YouTube, TikTok, Instagram, Twitter, Cinematic)

### Phase 8 — Cover Art + Logo (Polygon Spectrum)
- ✅ 6 polygon shapes, Auto Sync, smart render order
- ✅ Analog Dots/Lines display modes, Hue Rainbow, Frequency Range, Side A/B

### Phase 9 — Social Format System
- ✅ 6 formats with CSS container queries
- ✅ FormatFlashOverlay on format change

### Phase 10 — Supabase Integration
- ✅ Email/password + Google OAuth
- ✅ Projects CRUD with RLS
- ✅ Auth-protected /studio and /dashboard

### Phase 11 — Video Export
- ✅ WebM via MediaRecorder API
- ✅ Duration: 15s/30s/60s/Manual
- ✅ Quality: Low to Ultra
- ✅ Audio + Frame in export

### Phase R — Studio Redesign (Workflow Layout)
- ✅ 3-column layout: Presets | Canvas | Categories
- ✅ 3x3 category grid (Bars, Circular, Wave, Polygon, Particles, Background, Logo, AI Style, Frame)
- ✅ Timeline with waveform, trim handles, loop, scissors popover
- ✅ Demo Songs Library UI (5 genres, placeholder tracks)
- ✅ Preview Mode (mock spectrum without audio)
- ✅ Preset Favorites (top 6 pinned, drag to reorder)
- ✅ Frame category (color, thickness, smoothness, halo, shadow, reflection, pulse)
- ✅ Frame state persisted in presets
- ✅ AudioElement single-owner pattern

---

## 📋 Planned Phases (Prioritized)

### Phase 12 — Quick Wins (NEXT)
Small features, high visible impact. Should be doable in 1-2 days each.

- 📋 **Text Overlay** — Artist name + Song title as canvas-painted layer
  - Font picker (5-10 web-safe fonts)
  - Position: top, bottom, center, custom
  - Size, color, shadow, animation (fade in, slide, pulse)
  - "Made with AuSpec" watermark for free tier

- 📋 **Multi-Color Palette** — Replace Primary/Secondary with 3-7 color palette
  - Color picker grid (up to 7 stops)
  - Gradient rotation animation
  - Per-bar coloring (every Nth bar cycles palette)
  - Beat-reactive palette swap option

- 📋 **Sensitivity per Band** — Separate Bass / Mid / Treble sensitivity sliders
  - Per-visualizer config (Bars/Circular/Wave/Polygon)
  - Visual response curve preview
  - Useful for matching genre energy

- 📋 **60 FPS Render Loop** — Currently 30 FPS, target 60
  - rAF tuning
  - Verify perf on lower-end devices
  - Optional toggle for battery saving

### Phase 13 — Particle System
The "Coming Soon" placeholder gets filled. Big visual impact.

- 📋 Particle physics engine (gravity, friction, lifespan)
- 📋 Particle shapes: dots, lines, sparkles, stars, custom SVG
- 📋 Beat-reactive emitters (kick triggers burst)
- 📋 Color cycling through palette
- 📋 Density slider (10-1000 particles)
- 📋 Trail/glow per particle
- 📋 5 preset configurations (Cosmic, Fire, Snow, Confetti, Galaxy)

### Phase 14 — BPM Detection + Beat Sync
Foundation for many advanced features.

- 📋 Web Audio API BPM analysis on load
- 📋 Confidence score (some tracks are ambiguous)
- 📋 Manual BPM override input
- 📋 Beat grid overlay on timeline (visual aid)
- 📋 Snap trim handles to beats
- 📋 Drop "Color Halo Pulse" — synced kick triggers visual changes
- 📋 Display detected BPM on timeline

### Phase 15 — Storyboard / Auto Scene Changes
Killer feature — sets us apart from Specterr.

- 📋 Track segmentation (Intro / Verse / Chorus / Bridge / Outro)
  - Manual markers user can drag on timeline
  - Optional auto-detection via energy curve
- 📋 Per-section preset assignment
- 📋 Smooth transitions between sections (fade, swipe, instant)
- 📋 Section preview list above timeline
- 📋 "Auto-pilot" mode: smart preset rotation based on track energy

### Phase 16 — Background Video Loops
- 📋 Upload video file as background
- 📋 Looping playback
- 📋 Audio-reactive playback speed
- 📋 Curated free background library (5-10 royalty-free loops)
- 📋 Blend mode picker (overlay, multiply, screen)

### Phase 17 — Lyric Mode
- 📋 Manual lyric timing editor (timestamp + line)
- 📋 Live preview during playback
- 📋 Animation styles (fade, slide, kinetic typography)
- 📋 Auto-import from .lrc files
- 📋 Future: speech-to-text auto-timing (might use Whisper API)

### Phase 18 — Stripe Pro Features
Paywall the right things.

- 📋 Stripe integration
- 📋 Pro plan ($9.99/mo or $79/yr)
- 📋 Free tier limits:
  - 30s max export duration
  - 2 social formats (YT + TikTok only)
  - 3 saved projects
  - "Made with AuSpec" watermark
  - 3 custom presets
- 📋 Pro tier: unlimited everything, no watermark
- 📋 Billing portal, invoice download

### Phase 19 — AI Visual Prompt Engine
The "AI Style" category gets backend wired up.

- 📋 Claude API integration (Anthropic SDK)
- 📋 Prompt → Visualizer config JSON
- 📋 System prompt with all visualizer schema
- 📋 Quick prompts library (genre + mood combinations)
- 📋 History persistence per user (Supabase table)
- 📋 Rate limiting for Pro users
- 📋 "Surprise me" random config generator

---

## 💡 Backlog (Not Yet Committed)

### Visual Features
- 💡 3D objects (using three.js — already a dep)
- 💡 GLSL shader backgrounds (advanced users)
- 💡 Reactive image masks (visualizer drawn inside a shape)
- 💡 Stem separation visualization (kick=bars, vocals=wave, etc.)
- 💡 "Bake effects" toggle so halo+shadow get rendered into export

### Audio Features
- 💡 Live mic input
- 💡 Multi-track mixing (overlay two songs)
- 💡 Audio effects (reverb, lowpass for visualizer reactivity)
- 💡 Soundcloud/Spotify URL import (if APIs allow)

### Platform Features
- 💡 Mobile responsive layout
- 💡 Google OAuth verification (currently 100 user limit)
- 💡 Public preset gallery (share + remix)
- 💡 Direct YouTube upload from export
- 💡 Direct TikTok/Instagram share
- 💡 Code splitting (bundle 581 kB → split for faster load)
- 💡 Project version history (undo across sessions)

### Demo Songs
- 💡 Replace placeholders with Suno-generated tracks (user task)
- 💡 Track attribution + license info

---

## 🐛 Known Issues
- Bundle size warning: 581 kB (gz 167 kB) — code splitting deferred
- Dynamic import warning: useAuthStore → useProjectStore circular
- Mobile breakpoints: studio uses `hidden md:flex` — small screens broken
- Halo + Shadow not in exported video (CSS-only, by design)

---

## Competitor Analysis Notes

**Specterr** (direct competitor)
- Strengths: huge template library, cloud rendering, lyric mode
- Our edge: workflow layout, real-time browser preview, no render queue
- Adopting: Text overlay, Multi-color, Sensitivity per band, 60 FPS

**Neural Frames** (adjacent — AI video generator)
- Strengths: AI scene generation, stem separation, character consistency
- We're not competing: different tech, different price point
- Adopting (UI-only): Storyboard concept, BPM detection, vibe slider

**Strategic Position**
- "Canva for Music Visuals" — not "After Effects for music"
- Browser-native, no cloud costs, instant feedback
- Open creative play > prescriptive templates
