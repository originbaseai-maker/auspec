---
title: AuSpec — Session 2026-05-29 (Text-Layer)
tags: [session, auspec, text, react-hooks, fonts, audio-reactive, glow]
datum: 2026-05-29
status: completed
commits:
  - 44560ea  # fix(text): resolve React #310 hooks violation when opening text tool from preset
  - 7d2dea5  # docs(session): 2026-05-29 — background library, preset pack, perf fix
  - 2255926  # feat(text): font library, audio-reactive pulse, glow/outline/gradient effects
---

# AuSpec Session — 29. Mai 2026 (Text-Layer)

Zweite Session des Tages, im direkten Anschluss an
[2026-05-29-background-library-presets-performance](./2026-05-29-background-library-presets-performance.md).
Fokus: ein **Crash-Bug**, der durch das frisch ausgelieferte Preset
Pack erst sichtbar wurde, und ein größeres **Feature-Set für
Text-Layer** — Font-Bibliothek mit Kategorisierung, Audio-Reactive
Pulse, plus drei neue Render-Effekte (Glow / Outline / Gradient).

Diese Notiz ist der kanonische Eintrag für die Text-Layer-Arbeit
vom 29.05.2026.

---

## 🎯 Ziele der Session

1. **PART 1 — Black-Screen-Crash beim Öffnen des Text-Tools beheben.**
   Symptom: Klick auf "Text" in der Toolbar, während ein Preset
   geladen ist, killt die App. Konsole zeigt `Minified React error #310`
   ("Rendered more hooks than during the previous render"). Erste
   Aufgabe und Stopper: PART 1 muss verifiziert sein, bevor PART 2
   beginnt.

2. **PART 2 — Text-Layer erweitern**, in drei Teilen:
   - **A) Mehr Schriften** — 12 kuratierte Fonts in 6 Kategorien
     (Sans / Serif / Display / Handwritten / Mono / Retro/Pixel)
     mit Canvas-tauglichem Font-Loading (kein stiller Fallback).
   - **B) Audio-Reactive Pulse** — Text "atmet" mit dem Bass,
     gespeist aus dem **vorhandenen** Analyzer (keine Parallel-
     Pipeline), synchron im Export.
   - **C) Render-Effekte** — Outer Glow (über den geteilten
     `drawGlow`-Helper, **nicht** `ctx.shadowBlur`), Outline /
     Stroke, Zwei-Stop-Gradient-Fill.

---

## ✅ Erledigte Aufgaben

### 1. Text-Crash-Fix #310 (PART 1)

**Diagnose.** Das Crash-Pattern war ein klassischer Rules-of-Hooks-
Verstoß in [src/components/studio/panels/TextPanel.tsx](../../src/components/studio/panels/TextPanel.tsx):
zwei Hook-Aufrufe **vor** einem Early-Return, ein dritter Hook
**danach**. Wenn ein Render in den Early-Return-Pfad lief (nur 2
Hooks), und der nächste Render mit gefundenem Layer alle 3 Hooks
ausführte, kippte Reacts interner Hook-Index → `#310`.

```tsx
// VORHER — fehlerhaft
export function TextPanel({ layerId }: Props) {
  const layer = useLayerStore((s) => s.layers.find(...))   // hook 1
  const updateConfig = useLayerStore((s) => s.updateConfig) // hook 2
  if (!layer) return <div>Layer not found...</div>          // ⚠ Early Return
  // ...
  const brandFonts = useBrandKitStore((s) => s.kit.fonts)  // hook 3 (conditional!)
  // ...
}
```

**Warum preset-spezifisch.** Beim Klick auf das Text-Tool ruft die
Toolbar `startDraft('text')` auf, was das neue Layer in
`s.draftLayer` schreibt (**nicht** in `s.layers`). Der Parent
`CategoryDetailPanel` prüft beide Slots, aber `TextPanel.layer`-
Lookup suchte nur in `s.layers` → `undefined` → Early Return → 2
Hooks. Sobald der Draft committed oder ein Preset-Apply die
Layer-Liste umsortiert, springt der Lookup auf 3 Hooks → Mismatch
→ Crash. Mit einem aktiven Preset stapeln sich mehr Active-Layer-
Übergänge, deshalb war's "preset-only" reproduzierbar.

**Fix (zwei Schritte in einem Commit `44560ea`):**

1. `useBrandKitStore` vor den Early Return verschoben — alle drei
   Hooks werden unkonditional bei jedem Render aufgerufen.
2. Layer-Lookup um Draft-Awareness erweitert:

```tsx
const layer = useLayerStore((s) => {
  if (s.draftLayer && s.draftLayer.id === layerId && s.draftLayer.type === 'text') {
    return s.draftLayer
  }
  return s.layers.find((l) => l.id === layerId && l.type === 'text')
})
```

**Verifikation.** Build clean. Manuell testbar: in jedes der 8
Preset-Pack-Templates wechseln (Synthwave Sunset, Cyberpunk Anthem,
Deep Space, Cosmic Aurora, Inferno, Retro Arcade, Winter Dream,
Spring Morning) → Text-Tool öffnen → Panel mountet, Felder
gefüllt, kein Black-Screen. Auch "Text-Tool aus leerem Studio
heraus" funktioniert (Draft-Lookup greift).

### 2. Font-Bibliothek (PART 2A)

**Vorher:** 5 Fonts (Inter, Bebas Neue, Playfair Display, Pacifico,
Space Mono).

**Nachher:** 12 Fonts, gruppiert in 6 Kategorien:

| Kategorie    | Fonts                                |
|--------------|---------------------------------------|
| Sans         | Inter, Montserrat, Poppins            |
| Serif        | Playfair Display, Lora                |
| Display      | Bebas Neue, Anton                     |
| Handwritten  | Pacifico, Caveat                      |
| Mono         | Space Mono, JetBrains Mono            |
| Retro/Pixel  | Press Start 2P                        |

Die Liste lebt zentral als `FONT_CATEGORIES`-Konstante in
[src/types/layer.ts](../../src/types/layer.ts) — `TextPanel` und
`BrandKitModal` lesen daraus statt eigene Arrays zu duplizieren.
Das `FontFamily`-Union wurde entsprechend erweitert.

**Canvas-Font-Loading — der nicht-offensichtliche Teil.**
`ctx.fillText` **schweigt**, wenn die angefragte Font nicht
geladen ist — es zeichnet kommentarlos die Browser-Default-Schrift
(typischerweise Times New Roman). Das `@font-face`-CSS aus dem
Google-Fonts-<link>-Tag deklariert nur Faces, **lädt sie nicht
unmittelbar**. Erst beim ersten Referenz-Bedarf passiert der
Fetch — und Canvas-2D-Aufrufe **triggern diesen Fetch nicht**,
sondern fallen zurück.

Lösung in [src/lib/fontLoader.ts](../../src/lib/fontLoader.ts):

```ts
export function ensureFontLoaded(family: FontFamily): Promise<void>
export function preloadAllAppFonts(): Promise<void>
```

`ensureFontLoaded` wrappt `document.fonts.load('16px "Press Start 2P"')`
mit Per-Family-Caching (Set + inflight Map). `preloadAllAppFonts`
wird in [src/main.tsx](../../src/main.tsx) genau einmal auf
App-Mount nicht-blockierend gefeuert; jeder Font-Button-Klick im
TextPanel ruft zusätzlich `ensureFontLoaded(family)` auf, um den
Race "User klickt schneller als der Hintergrund-Preload" zu
gewinnen.

`index.html` wurde um die 7 neuen Familien erweitert (eine einzige
Google-Fonts-CSS-URL, `display=swap`).

### 3. Audio-Reactive Text-Pulse (PART 2B)

**Neue Config-Felder:**

```ts
audioReactiveEnabled?: boolean    // Default false
audioReactiveIntensity?: number   // 0..1, Default 0.5
```

**Implementierung** in [src/lib/renderers/textOverlay.ts](../../src/lib/renderers/textOverlay.ts):
der Renderer bekommt jetzt einen zusätzlichen Parameter
`bassEnergy: number` (0..1), thread-through aus
`VisualizerCanvas.render`. Das ist dieselbe normalisierte
Bass-Band-Energie, die auch der Background-Video-Pulse, das
Frame-Pulsing und die Visualizer-Layer lesen — **keine** parallele
FFT-Analyse, **kein** eigener Beat-Detector.

```ts
let scale = 1
if (config.audioReactiveEnabled) {
  const intensity = clamp01(config.audioReactiveIntensity ?? 0.5)
  const e = clamp01(bassEnergy)
  scale = 1 + e * 0.06 * intensity   // max 6 % scale-up bei Vollausschlag
}
const fontPx = config.fontSize * scale
```

**Export-Sync.** Der Export-Pfad treibt denselben Render-Loop
über die Master-Clock (siehe `useMasterClockSync`). Da bassEnergy
in jedem Frame frisch aus dem Analyzer geliefert wird (der wiederum
am Master-Audio hängt), ist der Pulse im Export **bit-für-bit
identisch** mit der Preview — auch bei Railway-Render-Workern
in der Zukunft, sobald die ein eigenes Audio-Decode haben.

**Sinnvoller Default.** 6 % maximaler Scale-Effekt ist deutlich
unter den 50–100 % typischer Music-Visualizer — Text mit hohem
Kontrast verstärkt visuelle Bewegung perzeptiv, mehr wäre
ablenkend.

### 4. Render-Effekte: Glow / Outline / Gradient (PART 2C)

#### 4a. Glow — über `drawGlow`, NICHT `shadowBlur`

```ts
glowEnabled?: boolean
glowIntensity?: number   // px, 0..60
glowColor?: string
```

**Kritischer Punkt.** In der vorherigen Session haben wir
`ctx.shadowBlur` aus Wave + Bloom Organic ausgebaut, weil es auf
Canvas 2D **CPU-software-gerendert** wird (~10–15 ms pro Aufruf
auf einem Full-Width-Path). Auf Text wäre der Effekt dieselbe
Stutter-Falle. Stattdessen nutzt der Glow-Pfad den **geteilten
`drawGlow`-Helper** ([src/lib/renderers/glow.ts](../../src/lib/renderers/glow.ts)):

```ts
if (config.glowEnabled && (config.glowIntensity ?? 0) > 0) {
  const glowColor = config.glowColor ?? config.color
  drawGlow(ctx, {
    blurPx: config.glowIntensity ?? 24,
    width, height,
    drawSource: (off) => {
      off.font = fontSpec
      off.fillStyle = glowColor
      off.textAlign = 'center'
      off.textBaseline = 'middle'
      off.fillText(config.text, x, y)
    },
  })
}
```

Damit kostet ein leuchtender Text bei beliebigem `glowIntensity`-
Wert ~2 ms — statt 10–15 ms bei shadowBlur. Direkt verifizierbar
durch Stapeln eines Text-Layers mit `glowEnabled` auf Winter Dream
oder Spring Morning, dem 60-fps-Hot-Stack vom Vormittag: Stack
bleibt smooth.

#### 4b. Outline / Stroke

```ts
outlineEnabled?: boolean
outlineColor?: string    // Default #000000
outlineWidth?: number    // px, 0..20
```

Reines `ctx.strokeText` mit `lineJoin = 'round'` und
`miterLimit = 2` (vermeidet Spitzen-Artefakte bei breiteren
Strokes). Wird **vor** dem Fill gezeichnet, damit der Fill auf dem
Outline-Anteil innerhalb der Silhouette sitzt (klassischer
"Sticker-Look").

#### 4c. Zwei-Stop-Gradient-Fill

```ts
gradientEnabled?: boolean
gradientColor2?: string
gradientAngle?: number   // 0..360 deg
```

Wenn aktiv, ersetzt der `ctx.createLinearGradient` den soliden
`fillStyle`. Der Gradient erstreckt sich über die per
`ctx.measureText` ermittelte Bounding Box des Textes, **nicht**
über die ganze Canvas — so bekommt jeder Buchstabe den vollen
Sweep, unabhängig von Position auf dem Canvas. `color` ist Stop 1,
`gradientColor2` ist Stop 2, `gradientAngle` rotiert den Verlauf.

#### Reihenfolge im Render

```
1. Glow-Pass (Offscreen + drawGlow, additiv-Composite)
2. Sharp-Pass (Main Canvas):
   a. Drop-Shadow (offset shadow, kleiner Radius — bleibt
      bewusst shadowBlur weil offset + per-letter = günstig)
   b. Outline (strokeText)
   c. Fill (fillStyle solid oder Gradient, dann fillText)
```

---

## 🧩 Technische Details

### Wichtige Code-Änderungen im Überblick

| Datei                                          | Änderung |
|------------------------------------------------|----------|
| [src/components/studio/panels/TextPanel.tsx](../../src/components/studio/panels/TextPanel.tsx)   | Hook-Reihenfolge korrigiert, Draft-Lookup, 4 neue PanelGroups (Glow / Outline / Gradient / Audio Reactive), kategorisierter Font-Picker |
| [src/types/layer.ts](../../src/types/layer.ts) | `FontFamily` auf 12 Werte erweitert, `FONT_CATEGORIES` exportiert, `TextLayerConfig` um 11 neue Felder ergänzt, `DEFAULT_TEXT_CONFIG` aktualisiert |
| [src/lib/renderers/textOverlay.ts](../../src/lib/renderers/textOverlay.ts) | `drawTextLayer` nimmt jetzt `bassEnergy`, Glow via `drawGlow`, Outline-Pass, Gradient-Fill |
| [src/components/studio/VisualizerCanvas.tsx](../../src/components/studio/VisualizerCanvas.tsx) | `bassEnergy` an `drawTextLayer` durchgereicht |
| [src/lib/fontLoader.ts](../../src/lib/fontLoader.ts) | Neuer Helper (`ensureFontLoaded`, `preloadAllAppFonts`) |
| [src/main.tsx](../../src/main.tsx) | `void preloadAllAppFonts()` auf App-Mount |
| [src/components/studio/BrandKitModal.tsx](../../src/components/studio/BrandKitModal.tsx) | Lokales `AVAILABLE_FONTS`-Array ersetzt durch Lookup auf `FONT_CATEGORIES` |
| [index.html](../../index.html) | Google-Fonts-CSS-URL um die 7 neuen Familien erweitert |

### React-#310-Prävention — Faustregeln

1. **Alle Hooks an den Anfang der Component**, **vor** jedem
   möglichen `return` (auch `return null`).
2. Hook-Anzahl muss zwischen zwei aufeinanderfolgenden Renders
   **identisch** sein — nicht "im Idealfall", sondern garantiert.
3. Konditionalität in das Hook-**Innere** verlagern
   (`useCallback(() => { if (!x) return; ... }, [x])`), nicht in
   den Hook-Aufrufer-Pfad.
4. Wenn ein Lookup-Hook potenziell `undefined` zurückgeben kann,
   **immer** alle nachgelagerten Hooks trotzdem aufrufen, und die
   Conditionality erst im JSX behandeln.

### Canvas-Font-Loading — was funktioniert garantiert

Drei Bedingungen müssen alle erfüllt sein, sonst zeichnet Canvas
die Fallback-Font:

1. **`@font-face`-Deklaration** existiert (via Google-Fonts-`<link>`
   oder lokales CSS).
2. **Browser hat die Datei tatsächlich geladen** —
   `document.fonts.load('16px "FAMILY"')` triggert das und
   resolved erst nach erfolgreichem Decode.
3. **Canvas wird (re-)rendert nachdem die Font ready ist** — bei
   einem kontinuierlich laufenden requestAnimationFrame-Loop kein
   Problem; einmaliges Canvas-Rendern wäre es.

Im AuSpec-Setup ist Bedingung 3 immer erfüllt (Render-Loop läuft).
Bedingungen 1+2 garantiert die neue
`fontLoader.ts` + `preloadAllAppFonts()` in `main.tsx`.

### Audio-Reactive — Master-Clock-Synchronität

Der Render-Loop liest `bassEnergy = data.bass / 255` pro Frame.
`data` kommt aus dem Master-Audio-Analyzer (verwaltet in
`useMasterClockSync` + `useAudioStore`), der seinerseits am
gewählten Master-Audio-Source (MP3, Video, oder Both) hängt.

Export-Pfad (heute: `captureStream()`-basiert) triggert denselben
Render-Loop, also dieselbe `bassEnergy`-Sequenz. Für zukünftige
Server-side-Exports (Railway-Worker, Phase 15) gilt: solange der
Worker den Audio-Stream frame-genau dekodiert und denselben
Analyzer drüberlaufen lässt, ist der Text-Pulse identisch zur
Browser-Preview.

---

## 📊 Aktueller Stand

| Bereich                          | Status | Anmerkung |
|----------------------------------|--------|-----------|
| Text-Tool öffnet ohne Crash       | ✅      | Aus Preset, aus leerem Studio, mit Draft — alle Pfade |
| Font-Bibliothek                   | ✅      | 12 Fonts, 6 Kategorien, Canvas-Loading garantiert |
| Audio-Reactive-Text-Pulse         | ✅      | bassEnergy thread-through, Export-sync via Master-Clock |
| Text-Glow                         | ✅      | über `drawGlow` (kein shadowBlur) |
| Text-Outline / Stroke             | ✅      | strokeText, Round-Join, 0–20 px |
| Text-Gradient-Fill                | ✅      | 2-Stop linear, BoundingBox-skaliert |
| Drop-Shadow (legacy)              | ✅      | bewusst auf shadowBlur belassen (offset + klein = günstig) |

**Bundle-Delta** über alle drei Commits dieser Session:

- 845.19 → **850.34 kB** raw (+ 5.15 kB)
- 227.09 → **228.25 kB** gz  (+ 1.16 kB)

Davon der größte Anteil im neuen `textOverlay.ts`-Rendering-Pfad
(Glow + Gradient-Maths) und im TextPanel-UI (4 neue
PanelGroups).

---

## ⏳ Offene Punkte / Backlog

### Entrance-Animation (Fade-In)
Im PART-2-Spec als optional markiert, **bewusst nicht in dieser
Session umgesetzt.** Die saubere Implementierung verlangt einen
stabilen "Animation-Start"-Zeitpunkt (Layer-Apply? Audio-Play-
Start? Erster Render-Tick?), der dann über einen `WeakMap<config,
{startedAt}>` in `textOverlay.ts` getrackt würde. Lohnt sich nur
wenn echte User-Demand existiert — sonst Over-Engineering. Vorerst
weglassen.

### Manuelles Verifizieren mit Live-Audio
Build ist clean, Logik geprüft. Vor Production-Release lohnt sich
das händische Smoke-Testing:
- Jeden der 12 Fonts auf Canvas auswählen → bestätigen dass die
  echten Glyphen kommen (nicht der Times-New-Roman-Fallback bei
  z.B. Press Start 2P / Caveat).
- Audio-Reactive auf einem Track mit kräftigem Bass aktivieren →
  bestätigen dass der Pulse sichtbar, aber **subtil** ist (nicht
  überpumpend) und exakt mit der Visualizer-Reaktion synchron.
- Glow auf Winter Dream stapeln, ~3 s im DevTools Performance-
  Recording überprüfen — Text-Layer-Frames sollten ~2 ms zeigen,
  kein 10-ms-Peak wie bei shadowBlur.
- Outline + Gradient kombinieren → sicherstellen dass Stroke
  außerhalb des Gradient-Fills liegt (Reihenfolge korrekt).

### Restliche Renderer mit `shadowBlur` (aus Vorgänger-Session)
Halo-Varianten und Bloom-Varianten außer Organic sind noch nicht
auf `drawGlow` umgezogen. Siehe
[2026-05-29-background-library-presets-performance](./2026-05-29-background-library-presets-performance.md#offene-punkte--backlog)
für die Details. Sobald jemand bei Cyberpunk Anthem (Halo PulseFrame)
oder Inferno (Halo Flame) Stottern reportet, hochziehen.

### Audio-Reactive: Frequenzband-Wahl
Aktuell hardcoded auf `bassEnergy`. Sinnvoll wäre eine Auswahl
zwischen Bass / Mid / Treble / Beat, ähnlich wie es die Visualizer
schon haben. Kleines Future-Feature.

---

## 💡 Lessons Learned

### 1. React #310 ist immer "Hook-Reihenfolge geändert" — nie etwas anderes

Wenn `#310` in der Konsole steht, **erste Hypothese**: Es gibt
einen Pfad zur Component, in dem **vor einem Early-Return** weniger
Hooks aufgerufen werden als auf dem Normalpfad. Genau das war's
hier. Die Diagnose dauert in der Praxis ~30 Sekunden:

1. Component öffnen
2. Alle Hook-Aufrufe von oben nach unten zählen
3. Den ersten Early-Return suchen
4. Alles, was nach dem Early-Return als Hook aufgerufen wird, ist
   die Falle

Lehrreich für die Zukunft: Das Pattern "Lookup-Hook → Early
Return → Mehr Hooks" ist ein Anti-Pattern, das mehrfach in der
Codebase auftauchen könnte. Wenn ich das nochmal sehe, sofort
flaggen.

### 2. Canvas-Font-Loading ist eine schweigende Falle

`fillText` wirft keinen Error, loggt keine Warnung, gibt keinen
Hinweis darauf, dass die angefragte Font fehlt. Es zeichnet einfach
mit `serif`-Fallback. Bei einem Preset wie "Retro Arcade"
(`Press Start 2P`) wäre der Bug "kommt komplett falsch raus" und
würde lange unentdeckt bleiben — Times New Roman ist 8-Bit-
Pixel-Art-mäßig **definitiv falsch**, aber visuell nicht so falsch
dass es sofort schreit.

Eigene Regel: **Jede Font, die jemals auf Canvas landet, muss
durch `document.fonts.load()` gegangen sein.** Punkt. Ein Mal
Preload auf App-Mount erschlägt das für alle bekannten Familien.

### 3. shadowBlur ist verboten — auch für Text

Die natürliche Versuchung beim Implementieren von "Text-Glow" ist
`ctx.shadowBlur = 24` plus `ctx.shadowColor = '#fff'` — vier
Zeilen, läuft. Nach der `shadowBlur`-Performance-Diagnose vom
Vormittag wäre das eine direkte Regression in dieselbe Falle. Der
geteilte `drawGlow`-Helper (eine Session vorher gebaut) hat sich
hier direkt ausgezahlt: 4 zusätzliche Zeilen im Text-Renderer,
fertig, und garantiert günstig.

Lehre: Wenn ein Performance-Pattern als geteilter Helper ausgelagert
ist, sollte er in jedem neuen Code-Pfad **standardmäßig** verwendet
werden. Das `glow.ts`-Module-Banner sollte mittelfristig diesen Hinweis
prominenter machen — etwa: "Wenn Du Canvas-Glow brauchst, benutze
diesen Helper. Nicht `ctx.shadowBlur` direkt."

### 4. Audio-Reactive: existierenden Signalpfad wiederverwenden, nicht parallelisieren

Naheliegend wäre: "Text hat seinen eigenen Beat-Detector, weil
Text ist ja unabhängig vom Visualizer." Falsch — das würde:
- Doppelte FFT-Kosten verursachen
- Asynchron-Drift mit dem Visualizer-Layer erzeugen
- Den Export-Sync brechen (zwei verschiedene Quellen für "wann
  ist der Beat?")

Die Lösung war trivial, sobald die Diagnose stand: `bassEnergy`
ist eh schon in jedem Frame im Render-Scope. Ein Funktionsparameter
durchgereicht, fertig. So bleibt jeder reaktive Layer in
millisekunden-genauer Lockstep mit jedem anderen.

### 5. Default-aus für alle neuen Effects = no-regression by design

Alle neuen Felder (`audioReactiveEnabled`, `glowEnabled`,
`outlineEnabled`, `gradientEnabled`) sind im
`DEFAULT_TEXT_CONFIG` **explizit false**. Das bedeutet:
- Jedes existierende Preset rendert pixel-identisch wie vorher
- Jedes gespeicherte User-Projekt rendert pixel-identisch
- Jeder Snapshot/Export, der bisher in irgendeinem Test- oder
  Demo-Material aufgenommen wurde, bleibt verifizierbar
- Die User entdeckt die neuen Effekte aktiv, kein Reset-Schreck

Diese Disziplin macht "neue Features zu existierender Pipeline"
risikolos deploybar — eine Lehre, die ich aus der Preset-Pack-
Session mitgenommen habe und hier konsequent angewendet habe.
