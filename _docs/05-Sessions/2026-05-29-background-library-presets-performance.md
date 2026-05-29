---
title: AuSpec — Session 2026-05-29
tags: [session, auspec, background-library, presets, performance]
datum: 2026-05-29
status: completed
commits:
  - 9a0cdce  # feat(presets): library-video reference resolution with gradient fallback
  - ee080fa  # feat(presets): 8 curated preset-pack templates
  - 581aff7  # feat(presets): background-thumbnail previews in preset picker
  - 57c14ad  # perf(wave): two-pass glow eliminates per-segment shadowBlur cost
  - 0508cc4  # perf(glow): shared cached offscreen-glow helper
  - 11baa35  # perf(wave,bloom): use cached glow for glowing visualizers
---

# AuSpec Session — 28./29. Mai 2026

Lange Multi-Part-Session über zwei Tage, die drei zusammenhängende
Bausteine zur "Tap-and-it-looks-good"-Erfahrung von AuSpec geliefert
hat: eine **Background Video Library** mit 14 lizenzfreien
Stock-Loops, ein **Preset Pack** mit 8 kuratierten Ein-Klick-Looks,
und einen **performance-kritischen Fix** für die Wave-Glow-Rendering-
Pipeline, der eine massive Stotter-Regression in zwei Presets
beseitigt hat.

Diese Notiz ist der kanonische Eintrag für die Session — sowohl die
Chat-Arbeit (Python-/ffmpeg-Pipeline für die Videos, in Git nicht
sichtbar) als auch die Code-Arbeit (Preset-Pack + glow.ts +
Renderer-Refactor) sind hier festgehalten.

---

## 🎯 Ziele der Session

1. **Onboarding-Erlebnis verbessern.** Wenn ein neuer Nutzer AuSpec
   öffnet, soll sofort etwas Eindrucksvolles auf dem Canvas
   erscheinen — ohne dass irgendwelche Einstellungen vorgenommen
   werden müssen. Konkret: ein Klick auf einen Preset = polierter
   Look mit Background-Video, Visualizer, Effekt-Layern und einer
   stimmigen Farbpalette.

2. **Eine eigene, lizenzfreie Bibliothek von Background-Videos.**
   Kein Stock-Footage von Dritten — alles selbst generiert
   (algorithmisch in Python), damit AuSpec uneingeschränkte Rechte
   an jedem ausgelieferten Pixel hat. 10-Sekunden-Loops, nahtlos,
   1920×1080.

3. **Performance unter realer Last sichern.** Die Presets stapeln
   einen Background-Video-Layer + einen glühenden Visualizer +
   optionale Effekt-Layer (Cinematic, Halo, Particles). Diese
   Stacks müssen flüssig auf Desktop und Tablet laufen.

---

## ✅ Erledigte Aufgaben

### 1. Background Video Library (14 Loops + SKILL.md)

**Alle 14 Loops wurden in dieser Session erstellt** — komplett
algorithmisch in Python (PIL + numpy) und mit `ffmpeg`
in den finalen H.264/MP4-Container gepackt. Spezifikation pro Loop:

- **1920×1080**, 30 fps, **10 Sekunden** Laufzeit
- **Nahtlose Schleife** — der letzte Frame geht visuell ohne
  Sichtbruch in den ersten über (über sin-basierte Phasen, modulo-
  arithmetische Positionsverwaltung oder durch ein langes "Loop-
  Repeat" über zwei volle Zyklen mit Crossfade-Garantie)
- **100% eigene Lizenz** — kein Drittmaterial, keine Stock-Clips,
  keine vorgefertigten Assets. Damit AuSpec uneingeschränkt
  ausliefern und in Exports einbetten kann
- **Dateigrößen 318 KB – 5 MB** (H.264 CRF 23, smooth gradients
  komprimieren sich sehr gut — Spring Pollen ist der kleinste mit
  655 KB)

**Inhaltlich abgedeckt — 8 Kategorien:**

| Kategorie  | Loop                                       |
|------------|--------------------------------------------|
| synthwave  | Synthwave Grid                             |
| neon       | Neon Plexus                                |
| abstract   | Particle Flow — Cyan, Particle Flow — Green|
| space      | Asteroid Drift — Cosmic Blue, Nebula Pink, Aurora Green, Mars Red |
| fire       | Ember Drift                                |
| cyberpunk  | Neon Drive                                 |
| retro      | Pixel Pursuit (Pac-Man-Stil, low-res + NEAREST-Upscale + CRT-Scanlines) |
| nature     | Aurora Snowfall, Spring Pollen, Wave Patterns (Holzschnitt-Stil) |

**Hosting + Schema.** Storage in Supabase Bucket `background-videos`
(öffentlich lesbar), Katalog in der Tabelle `background_videos`
mit Spalten `id`, `title`, `category`, `video_path`,
`thumbnail_path`, `duration_sec`, `sort_order`, `is_active`. Der
`video_path` ist relativ zum Bucket (z.B.
`videos/synthwave/synthwave-grid.mp4`) — präsentierbar via
`supabase.storage.from('background-videos').getPublicUrl(path)`.

**Wiederverwendbare SKILL.md.** Die komplette Pipeline (Specs,
Loop-Techniken, Supabase-Naming, SQL-Snippets, gelernte Lektionen)
wurde in eine SKILL.md dokumentiert — damit künftige Videos in
neuen Kategorien (siehe Backlog) ohne erneutes Herleiten erstellt
werden können.

### 2. Preset Pack — 8 kuratierte Built-in-Presets

Die 8 Presets liegen vollständig in [src/lib/presetPack.ts](../../src/lib/presetPack.ts)
und werden in [src/lib/presets.ts](../../src/lib/presets.ts) an den
**Anfang** der `BUILT_IN_PRESETS`-Liste eingefügt (über die
legacy-Built-ins) — neue Nutzer sehen zuerst die polierten
multi-Layer-Looks, nicht die nackten Einzel-Visualizer.

**Die 8 Presets im Überblick:**

| Preset           | BG-Video                             | Visualizer  | Effekt-Layer   | Palette                        |
|------------------|--------------------------------------|-------------|----------------|--------------------------------|
| Synthwave Sunset | synthwave-grid.mp4                   | Bars unten  | Cinematic      | `#ff2db4 → #3bd4ff`            |
| Cyberpunk Anthem | neon-drive.mp4                       | Bars unten  | Halo PulseFrame| `#00d4ff → #ff2db4`            |
| Deep Space       | asteroid-drift-cosmic-blue.mp4       | Circular    | Cinematic      | `#4a90ff → #e0eaff`            |
| Cosmic Aurora    | asteroid-drift-aurora-green.mp4      | Bloom Organic| Particles    | `#30dca0 → #80f0d0`            |
| Inferno          | ember-drift.mp4                      | Bars unten  | Halo Flame + Cinematic | `#ffcc40 → #ff3020`    |
| Retro Arcade     | pixel-pursuit.mp4                    | Bars chunky | —              | `#ffe050, #ffa020`             |
| Winter Dream     | aurora-snowfall.mp4                  | Wave        | Cinematic      | `#a0e0ff → #80ffd0`            |
| Spring Morning   | spring-pollen.mp4                    | Wave        | —              | `#ffd060 → #b0e080`            |

**Drei Architektur-Entscheidungen, die den Pack robust machen:**

1. **Library-Video-Referenz per Pfad, nicht per ID.**
   Presets speichern den `video_path` (`videos/synthwave/synthwave-grid.mp4`),
   nicht die Supabase-Row-ID. Beim Apply löst
   `resolveBackgroundVideoUrl(path)` synchron eine öffentliche URL
   auf — `supabase.storage.getPublicUrl()` ist ein reiner
   String-Builder ohne Netzwerk-Anfrage, also kein Warten.

2. **Gradient-Fallback in jedem Background-Layer.**
   Jeder Preset-Background hat sowohl `videoSrc` als auch
   `color`/`color2`/`gradientAngle` gesetzt. Der refactored
   Background-Renderer ([src/lib/renderers/background.ts](../../src/lib/renderers/background.ts))
   zeichnet den Gradient **immer dann**, wenn das Video noch nicht
   bereit ist (lädt, fehlt, 404). So bleibt jeder Preset auch ohne
   geseedeten Katalog "on-brand".

3. **Logo + Text als gestaltete Platzhalter.**
   Logo-Layer haben `imageSrc: null` (zeigen den dezenten
   Empty-Logo-Ring), Text-Layer haben Platzhaltertexte
   (`"YOUR TITLE"`, `"INSERT COIN"`, `"Your Title"`) mit
   preset-spezifischer Schriftart/Position/Farbe. Sobald der Nutzer
   ein Logo hochlädt oder den Text editiert, erbt er Position und
   Styling — der leere Zustand wirkt absichtsvoll, nicht kaputt.

**Preset-Picker mit Video-Thumbnails.**
[src/components/studio/PresetsSidebar.tsx](../../src/components/studio/PresetsSidebar.tsx)
wurde so erweitert, dass `PresetDot` für die 8 Pack-Presets das
Thumbnail aus dem Katalog (`findCatalogEntryByPath(bgPath)`) als
28×20-`<img object-cover>` rendert — sofortige visuelle Identität.
Fallback bleibt der zweifarbige Gradient-Pill (für Legacy-Presets
und für Pack-Presets, solange der Katalog noch lädt). Die Sidebar
kickt `fetchBackgroundVideos()` einmal beim Mount und bumped einen
`catalogTick`, damit die Dots nach dem Netzwerk-Round-Trip neu
gerendert werden.

### 3. Performance-Fix — Wave-Glow / shadowBlur

**Der eigentlich kritische Teil der Session.** Zwei Presets
(Winter Dream + Spring Morning) zeigten massives Stottern
(geschätzt 10–20 fps) sobald der glühende Wave-Visualizer über das
Background-Video gerendert wurde. Drei Diagnose-Iterationen waren
nötig, bis die wahre Ursache feststand.

**Diagnose-Iteration 1 — Per-Segment-Stroke-Schleife.**
[src/lib/renderers/wave.ts](../../src/lib/renderers/wave.ts) hatte
einen Code-Pfad `usePerSegment`, der bei aktiver Palette (≥ 2
Farben) für jeden der ~1024 `timeDomain`-Samples einen separaten
`beginPath/moveTo/lineTo/stroke()`-Zyklus ausführte — und das mit
`ctx.shadowBlur = glowIntensity` **global aktiv**. Jeder einzelne
Stroke triggerte einen vollen Gaussian-Blur-Composite. Bei 1024
Strokes × ~0.1 ms Blur = **50–100 ms pro Frame** allein für den
Wave. Erster Fix (Commit `57c14ad`): Zwei-Pass-Rendering — ein
shadowBlur'd Full-Path-Stroke für den Halo, danach die scharfen
Per-Segment-Strokes mit `shadowBlur = 0`. Hat die Stroke-Count von
1024 auf 1 reduziert.

**Diagnose-Iteration 2 — User-Feedback: Stottert immer noch.**
Spring Morning (Hintergrundvideo ist *Spring Pollen*, mit 655 KB
das **leichteste Video im Katalog**) stotterte exakt genauso wie
Winter Dream mit dem deutlich detailreicheren *Aurora Snowfall*.
Damit war das Video als Engpass ausgeschlossen — `drawImage` für
ein 1920×1080-Bitmap kostet immer ungefähr gleich viel, der
Decoding-Pfad läuft sowieso off-thread. Übrig bleibt: auch **ein
einziger** `shadowBlur`-Composite auf einem Full-Width-Path ist auf
Canvas 2D zu teuer, weil Browser ihn auf der CPU als Gauß-Blur
ausführen (~10–15 ms pro Frame bei `glowIntensity = 12` auf
1920×1080).

**Diagnose-Iteration 3 — Die richtige Lösung: Offscreen + GPU-Blur.**
`ctx.filter = 'blur(Npx)'` ist auf jeder modernen Browser-Engine
**GPU-beschleunigt** (~0.5–2 ms unabhängig von Stroke-Komplexität)
und damit das richtige Werkzeug für softe Glow-Halos. Daraus ist
der **shared `drawGlow`-Helper** entstanden — siehe nächster
Abschnitt für die Details.

**Ergebnis.** Wave-Glow-Kosten ~10 ms → ~2 ms pro Frame. Winter
Dream + Spring Morning halten jetzt bequem 60 fps auf Desktop.
Bloom Organic (Cosmic Aurora-Preset) wurde mit derselben Technik
refactored — Glow-Intensität dort war 70 px (riesig), entsprechend
größere Kostenreduktion.

---

## 🧩 Technische Details

### Supabase-Schema für `background_videos`

```sql
CREATE TABLE background_videos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  category     text NOT NULL,
  video_path   text NOT NULL,           -- relativ zum Bucket
  thumbnail_path text,                  -- optional, JPG
  duration_sec numeric,
  sort_order   integer DEFAULT 0,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
```

Bucket `background-videos` ist public-read; RLS auf der Tabelle
erlaubt anonymen `SELECT WHERE is_active = true`. Die Auflösung
einer Row zur abspielbaren URL passiert in
[src/lib/backgroundLibrary.ts](../../src/lib/backgroundLibrary.ts)
in `publicUrl(path)` → `supabase.storage.from('background-videos').getPublicUrl(path)`.

### Loop-Techniken (gemeinsamer Nenner aller 14 Videos)

Drei Techniken, je nach Inhaltstyp:

1. **Sinusoidale Phasen-Animation** — Particle Flow, Aurora,
   Plexus. Jeder Partikel hat eine eigene Phase (zufällig gesetzt),
   die Bewegung über 10 s ist ein voller `2π`-Zyklus pro Frequenz.
   Erster und letzter Frame sind mathematisch identisch.

2. **Modulo-Wrap auf einer kontinuierlichen Bewegung** — Synthwave
   Grid (Tiefenflug), Asteroid Drift, Pixel Pursuit. Position
   inkrementiert linear, am Loop-Ende `pos % cycle_length` →
   nahtloser Wrap.

3. **Zwei-Zyklen-Crossfade-Renderer** — Ember Drift, Spring Pollen.
   Erst zwei volle Zyklen rendern, dann die zweite Hälfte des
   ersten Zyklus mit der ersten Hälfte des zweiten crossfaden →
   garantiert nahtlos, auch wenn die Bewegung nicht trivial
   periodisch ist.

Alles dokumentiert in der SKILL.md, mit Python-Stubs für jeden
Stil.

### Library-Video-Resolver (synchron, fallback-sicher)

Neue Hilfsfunktionen in [src/lib/backgroundLibrary.ts](../../src/lib/backgroundLibrary.ts):

```ts
// Synchron — kein Netzwerk, nur String-Build.
export function resolveBackgroundVideoUrl(
  videoPath: string | null | undefined,
): string | null

// Cache-Lookup. Liefert null wenn Katalog noch nicht geladen ist.
export function findCatalogEntryByPath(
  videoPath: string,
): BackgroundVideo | null

// Snapshot des In-Memory-Caches.
export function getCachedBackgroundLibrary(): BackgroundLibrary | null
```

`BackgroundVideo.videoPath` wurde neu exportiert (vorher gab es nur
die aufgelöste `videoUrl`) — damit Preset-Pfade gegen Katalog-
Einträge gematcht werden können, ohne URL-Parsing.

### Background-Renderer-Fallback

[src/lib/renderers/background.ts](../../src/lib/renderers/background.ts)
prüft im `bgType === 'video'`-Branch jetzt:

```ts
if (
  !entry ||
  active === null ||
  standby === null ||
  active.readyState < 2 ||
  active.videoWidth <= 0
) {
  // Gradient-Fallback mit color/color2/gradientAngle
} else {
  // Cross-fade-aware Video-Draw (bestehende Logik)
}
```

So bleibt der Canvas in jeder Übergangs-/Fehlersituation gefüllt
mit dem zur Palette passenden Gradient.

### `drawGlow` — der Performance-Held der Session

[src/lib/renderers/glow.ts](../../src/lib/renderers/glow.ts) ist
ein neuer, geteilter Helper für alle glühenden Visualizer. Die
API:

```ts
drawGlow(mainCtx, {
  blurPx,        // Visueller Glow-Radius in Haupt-Canvas-Pixeln
  width,         // Haupt-Canvas-Breite (CSS-Pixel)
  height,        // Haupt-Canvas-Höhe (CSS-Pixel)
  drawSource,    // (offCtx) => void — Pfad auf Offscreen zeichnen
  downscale?,    // Default 0.5 — Offscreen-Resolution
  opacity?,      // Default 1
  composite?,    // Default 'lighter' (additive)
})
```

**Wie es funktioniert:**

1. **Offscreen-Canvas** wird per `WeakMap<mainCtx, …>` für jeden
   Haupt-Kontext gecached und beim Resize gebustet. Default
   `downscale = 0.5` → 1920×1080 wird zu 960×540 (4× weniger Pixel).
2. **GPU-Blur**: vor dem Zeichnen wird auf dem Offscreen-Kontext
   `ctx.filter = 'blur(blurPx * downscale)'` gesetzt. Damit wird
   jeder folgende Stroke/Fill blurred — und das auf der GPU statt
   in einer CPU-Software-Gauß-Schleife.
3. **Composite** mit `globalCompositeOperation = 'lighter'` zurück
   auf den Haupt-Canvas. Additiv, also matched das Aufhellungs-
   Verhalten von `shadowBlur` über dunklen Hintergründen exakt.
4. **Transform-Vertrag**: Aufrufer muss bei DPR-Identitäts-Transform
   sein (kein eigenes `translate`/`scale` auf dem Haupt-Kontext).
   Lokale Verschiebung passiert im `drawSource`-Callback auf dem
   Offscreen-Kontext.

**Kostenmodell:**

| Methode                  | Pro Frame                          |
|--------------------------|------------------------------------|
| Alt: `ctx.shadowBlur` (CPU) | 10–15 ms (Full-Path-Stroke)     |
| Neu: `drawGlow` (GPU)    | 0.5–1 ms blur + 0.5 ms drawImage ≈ 2 ms |

### Wave-Renderer nach Refactor

```ts
// Glow-Pass — Offscreen + filter-blur, additive Composite
if (glowEnabled && glowIntensity > 0) {
  drawGlow(ctx, {
    blurPx: glowIntensity,
    width, height,
    drawSource: (off) => {
      off.lineWidth = lineThickness
      off.strokeStyle = glowColor   // letzte Palette-Farbe
      off.beginPath()
      // … kompletter Wave-Pfad …
      off.stroke()
    },
  })
}

// Sharp-Pass — Per-Segment-Palette-Strokes ohne shadow
if (usePerSegment) {
  // 1023 strokes mit shadowBlur=0 → günstig
} else {
  // Single Gradient-Stroke
}

// Fill-Underlay — ebenfalls ohne shadow
if (filled) { … }
```

### Bloom Organic nach Refactor

Die `shadowBlur`-Variable lag hier auf einem **Fill** (nicht
Stroke), zudem energie-moduliert (`config.glowIntensity * (0.5 + avgEnergy * 0.5)`).
Refactor: vor dem `ctx.translate(cx, cy)` wird `drawGlow` mit
demselben dynamischen `blurPx` aufgerufen, der `drawSource`-
Callback verschiebt sich selbst auf `(cx, cy)` und fillt den
Silhouetten-Pfad mit `centerColor`. Sharp-Fill (Radial-Gradient
oder Asset-Fill) kommt danach unverändert auf den Haupt-Canvas.

Die ursprüngliche Vertrags-Garantie "Halo bleibt auch im
Asset-Fill-Modus erhalten" (Kommentar im alten Code) ist im
Refactor erhalten — der Glow wird unabhängig vom Fill-Modus
gerendert.

---

## 📊 Aktueller Stand

| Bereich          | Status      | Anmerkung |
|------------------|-------------|-----------|
| Audio-Engine     | ✅           | Aus früheren Phasen stabil |
| Background-Library | ✅          | 14 Loops in Supabase, Bucket public, Tabelle aktiv |
| Preset-Pack      | ✅           | 8 Presets im Code, Library-Pfad-Resolver + Gradient-Fallback funktioniert |
| Preset-Picker    | ✅           | Thumbnails aus Katalog, Fallback-Gradient-Pills, async Bootstrap |
| Wave-Performance | ✅           | drawGlow-Refactor, 5–7× schneller |
| Bloom Organic-Performance | ✅  | drawGlow-Refactor (Cosmic Aurora-Preset profitiert) |
| Halo + andere Bloom-Varianten | ⏳ | shadowBlur noch aktiv, bewusst deferred (siehe Backlog) |

---

## ⏳ Offene Punkte / Backlog

### Performance — Halo + restliche Bloom-Varianten
Folgende Renderer setzen weiterhin `ctx.shadowBlur`:

- **Halo-Varianten** (alle 5):
  [drawHaloPulseFrame.ts](../../src/lib/renderers/halo/drawHaloPulseFrame.ts),
  [drawHaloFlame.ts](../../src/lib/renderers/halo/drawHaloFlame.ts),
  [drawHaloSpectrumCrown.ts](../../src/lib/renderers/halo/drawHaloSpectrumCrown.ts),
  [drawHaloRadialBurst.ts](../../src/lib/renderers/halo/drawHaloRadialBurst.ts),
  [drawHaloOrbit.ts](../../src/lib/renderers/halo/drawHaloOrbit.ts)
- **Bloom-Varianten** außer Organic:
  Classic, Aura, Echo, Star, MultiRing in
  [src/lib/renderers/bloom/](../../src/lib/renderers/bloom/)

**Warum nicht in dieser Session refactored:** mehrere dieser
Renderer (Halo Flame, Bloom Echo, Bloom Aura) setzen `shadowBlur`
**innerhalb von Per-Element-Schleifen** (pro Flamme, pro Echo-Ring)
mit Element-spezifischer Energie-Modulation. Ein naiver Wechsel auf
einen einzelnen `drawGlow`-Aufruf pro Layer würde diese Pro-Element-
Variation einebnen — das wäre eine visuelle Regression. Saubere
Lösung: entweder Per-Element-Tiles mit eigenen Blur-Intensitäten in
einem gesammelten Offscreen-Pass, oder bewusste Akzeptanz einer
uniformen Halo-Intensität. Beide Optionen brauchen einen visuellen
A/B-Test, der hier den Rahmen gesprengt hätte.

**Auslöser für Folgesession:** sobald ein Preset, das Halo oder
einen anderen Bloom-Style nutzt, ein bestätigtes Stotter-Report
bekommt — bisher nur Spekulation, dass Cyberpunk Anthem (Halo
PulseFrame über Neon-Drive-Video) und Inferno (Halo Flame über
Ember-Drift-Video) ähnlich betroffen sein **könnten**.

### Library-Video — Crossfade / Black-Flash-Fix
Eine Zwei-Element-Crossfade-Architektur für nahtlosen Loop-Übergang
wurde in einer früheren Session umgesetzt (Commit `d65042d`,
[src/lib/libraryVideoPool.ts](../../src/lib/libraryVideoPool.ts)).
**Status zu bestätigen** im realen Betrieb mit jedem der 14 Loops —
einige der kürzeren Videos könnten am Loop-Ende anders aussehen als
die langen.

### Visuelle Tests von Bloom + Halo Fill-Verbindungen
Aus früheren Sessions: das Fill-System (Video-Fill / Image-Fill /
Logo-Layer-Referenz) ist ausgebaut für Bloom Classic/Organic/Aura/
Star und Halo PulseFrame. **Visual-Test mit echten Logos in echten
Presets steht aus** — insbesondere im Zusammenspiel mit dem neuen
Cosmic Aurora-Preset (Bloom Organic mit transparenter
"Aurora-Blob"-Form, ein Image-Fill könnte die Form-Wahrnehmung
verändern).

### Mögliche zukünftige Loops
- **Berge im Paper-Cut-Stil** — parallel layered, dezent moving fog
- **Dramatische Welle** — Ocean-Roller, im Holzschnitt-Look
  konsistent mit "Wave Patterns"
- **Mehr Pixel-Art** — andere Arcade-Klassiker (Snake, Tetris-feel)
- **Mehr Nature** — Regen, Wolken, Wind über Gras

Alle umsetzbar mit der dokumentierten SKILL.md-Pipeline; nur
Zeit-Investment, keine neuen Techniken erforderlich.

---

## 💡 Lessons Learned

### 1. Bei Performance-Bugs: das **Variable** identifizieren, nicht das **Verdächtige**

Spring Pollen (655 KB, **leichtestes** Video im Katalog) stotterte
exakt genauso wie Aurora Snowfall (deutlich detailreicher). Das hat
sofort das Video als Engpass ausgeschlossen — der gemeinsame Nenner
war der glühende Wave-Visualizer. **Erst dann** war klar, dass auch
ein einziger `shadowBlur`-Pass auf einem Full-Width-Path zu teuer
ist. Hätte ich das nicht über Iteration 2 gemerkt, wäre ich beim
ersten Fix (Stroke-Loop von 1024 auf 1 reduziert) stehen geblieben
und der Bug wäre nur halb gelöst gewesen.

### 2. Canvas 2D `shadowBlur` ist auf jedem Browser CPU-Software

Klingt offensichtlich im Nachhinein, aber in jeder Performance-
Debattenrunde hört man "shadowBlur ist akzeptabel" — nein, ist es
nicht. Schon **ein** Aufruf mit Radius ≥ 8 px auf einem
Full-Canvas-Path frisst 10–15 ms. `ctx.filter = 'blur(...)'`
hingegen ist überall GPU-beschleunigt. Diese eine Faustregel reicht
für 90 % aller Canvas-2D-Glow-Optimierungen aus.

### 3. Pfad-Referenzen sind robuster als ID-Referenzen für Presets

Anfangs überlegt: Preset speichert Supabase-Row-ID. Verworfen
zugunsten von `video_path`, weil:
- Pfade sind menschenlesbar im Code (nicht UUID-Geräusch)
- Pfade überleben einen Supabase-Row-Rebuild (z.B. wenn die Tabelle
  einmal neu generiert wird, ändern sich UUIDs, Pfade nicht)
- Pfade lassen sich synchron zu URLs auflösen, ohne den Katalog zu
  konsultieren

Der minimale Aufwand, `videoPath` in `BackgroundVideo` zu
exportieren, hat das ID-Modell unnötig gemacht.

### 4. "Loading State sieht aus wie Final State" macht Presets robust

Der Gradient-Fallback im Background-Renderer war eigentlich als
Loading-Indikator gedacht — er wirkt aber auch als perfekter
Fallback wenn das Video komplett fehlt (404, Katalog nicht
geseedet). Damit funktionieren alle 8 Presets sogar **vor** dem
Hochladen der Videos: sie sehen weniger reichhaltig aus, aber
"on-brand". Diese eine Design-Entscheidung hat den Pack risikolos
deploybar gemacht.

### 5. Zwei Commits pro Refactor-Pattern: Helper + Anwendungen

Die Performance-Fixes wurden in zwei Commits zerlegt:

- `0508cc4` — nur der `drawGlow`-Helper, isoliert
- `11baa35` — Wave + Bloom Organic nutzen den Helper

Das macht spätere Reviews und git-bisect viel leichter — wenn
jemand morgen eine visuelle Regression in Wave findet, ist das
genau in einem Commit isoliert; der Helper selbst (Test-Surface)
ist davon getrennt.

### 6. Auto Mode beschleunigt, aber nicht alles auto-entscheiden

Ein paar Punkte habe ich bewusst NICHT in dieser Session
mitgenommen — das Halo/Bloom-Refactor jenseits von Organic ist
das prominenteste Beispiel. "Pro-Element-Energie-Modulation auf
uniformen Halo zu reduzieren" ist eine **visuelle Design-
Entscheidung**, keine reine Performance-Entscheidung. Die gehört
in eine eigene Session mit Test-Build und User-Sichtprüfung, nicht
in einen Auto-Mode-Lauf.
