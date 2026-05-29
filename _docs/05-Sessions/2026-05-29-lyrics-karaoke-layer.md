---
title: AuSpec — Session 2026-05-29 (Lyrics-Layer)
tags: [session, auspec, lyrics, karaoke, master-clock, text]
datum: 2026-05-29
status: completed
commits:
  - 01176ab  # feat(lyrics): karaoke layer type + data model + line rendering
  - 5321a97  # feat(lyrics): tap-to-sync mode
  - 7e6cf5e  # feat(lyrics): timeline fine-tuning + display modes
---

# AuSpec Session — 29. Mai 2026 (Lyrics-Karaoke-Layer)

Dritte und größte Session des Tages, im Anschluss an
[2026-05-29-text-layer-crash-and-effects](./2026-05-29-text-layer-crash-and-effects.md).

Aufgabe: ein vollständig neues Layer "Lyrics" (Karaoke) — Pasten,
Tap-to-Sync, Fine-Tuning, zwei Darstellungsmodi (Spotlight /
Scroll), unter Nachnutzung der frischen Text-Pipeline. 100 % im
Browser, kein Backend, keine externen APIs. Phase 1 von zwei
geplanten Phasen: in dieser Session wird die Tap-Sync-Mechanik
ausgeliefert, **automatischer / word-level Sync** bleibt als
Phase 2 für später.

---

## 🎯 Ziele der Session

1. **Neuer LayerType `'lyrics'`** mit eigenem `LyricsLayerConfig`,
   geliefert mit allen Touch-Points im Layer-System
   (Registrierung, Defaults, Sidebar, Detail-Panel, Renderer,
   Layer-Transform, Duplikat-/Reset-/Preset-Pfade).

2. **Daten-Modell**: pro Layer eine Liste von Zeilen
   `{ time: number | null, text: string }`. `time === null`
   bedeutet "noch nicht synchronisiert". Leere Zeilen sind
   explizite instrumentale Lücken.

3. **Tap-to-Sync-Modus**: Modal startet vom Panel, listet alle
   Zeilen, "armed" die nächste un-synchronisierte. Spacebar oder
   großer TAP-Button schreibt `currentTime` in die armed Zeile und
   armed dann die nächste.

4. **Fine-Tuning**: pro-Zeilen-Liste im Panel mit Vorschau-Sprung,
   ± 0.1 s Nudge, Un-Sync-Button.

5. **Zwei Darstellungsmodi**: Spotlight (Music-Video-Look, eine
   große Zeile + optional gedimmte Nachbarn) und Scroll
   (Teleprompter, gestapelte Zeilen mit Aktiver in der Mitte).

6. **Reuse, nicht Duplikat**: Lyrics-Text muss durch dieselbe
   Render-Pipeline wie Text-Layer laufen — Font-Loading via
   `fontLoader`, Glow via `drawGlow` (nicht `shadowBlur`), Outline,
   Gradient, Audio-Reactive Pulse. Gemeinsame Helper-Funktion
   `drawStyledText` aus `drawTextLayer` extrahieren statt eine
   parallele Render-Logik aufzubauen.

7. **Persistierung & Export-Sync**: automatisch über die existierende
   `studioPersistence`-Layer-Serialisation + Master-Clock-getriebenen
   Render-Loop.

---

## ✅ Erledigte Aufgaben

### 1. Layer-Registrierung (Commit `01176ab`)

Ein neuer `LayerType` greift in **viele** Schalter ein. Alle
Touch-Points:

| Datei                                    | Änderung |
|------------------------------------------|----------|
| [src/types/layer.ts](../../src/types/layer.ts) | `'lyrics'` zum LayerType-Union, `LAYER_LABELS`, `LAYER_TYPES`; neuer `LyricsLayer` + `LyricsLayerConfig` + `LyricsLine` + `LyricsDisplayMode`; `DEFAULT_LYRICS_CONFIG` |
| [src/types/studio.ts](../../src/types/studio.ts) | `'lyrics'` zum `StudioCategory`-Union + Icon-Name, neuer Eintrag in `STUDIO_CATEGORIES` |
| [src/store/useLayerStore.ts](../../src/store/useLayerStore.ts) | Vier exhaustive Schalter (defaultData, createLayer, duplicateLayer, resetLayer, replaceLayers-Preset-Import) bekommen den `case 'lyrics'`-Zweig |
| [src/lib/layerTransform.ts](../../src/lib/layerTransform.ts) | `getLayerBounds` + `setLayerBoundsPatch`: `'lyrics'` ist nicht via Canvas-Overlay positionierbar (Position kommt aus dem Panel), gibt `null` zurück |
| [src/components/studio/LayerSidebar.tsx](../../src/components/studio/LayerSidebar.tsx) | `LAYER_ICONS` → `Mic2`-Lucide-Icon, `CATEGORY_MAP` → `'lyrics'` |
| [src/components/studio/CategoryDetailPanel.tsx](../../src/components/studio/CategoryDetailPanel.tsx) | `LAYER_CATEGORIES` Set + neuer `case 'lyrics': <LyricsPanel />` |
| [src/components/studio/CategoryIcon.tsx](../../src/components/studio/CategoryIcon.tsx) | Eigenes SVG-Icon (Anführungszeichen + Wellenform) für die Kategorie |
| [src/components/studio/VisualizerCanvas.tsx](../../src/components/studio/VisualizerCanvas.tsx) | Import `drawLyricsLayer`, neuer `currentTimeRef`, `case 'lyrics':` im Render-Loop |

Lehre für künftige LayerType-Additionen: TypeScripts exhaustive-
check ist hier ein **Geschenk**, kein Hindernis. Ohne ihn wären
mehrere dieser Stellen still gebrochen geblieben — Commit `01176ab`
musste mehrere Compilation-Errors abarbeiten, bevor der Build
sauber wurde, und genau das ist die Kontrolle, die wir wollen.

### 2. `drawStyledText` — Renderer-Reuse zwischen Text & Lyrics

Statt eine zweite Text-Render-Pipeline für Lyrics zu schreiben,
wurde der Inhalt von `drawTextLayer` in einen wiederverwendbaren
Helper [`drawStyledText`](../../src/lib/renderers/textOverlay.ts)
extrahiert:

```ts
export interface StyledTextOpts {
  text: string
  x: number; y: number          // absolute CSS-Pixel auf dem Hauptcanvas
  fontSize: number
  font: FontFamily
  fontWeight: 400 | 600 | 700
  color: string
  letterSpacing: number
  // Effekt-Vokabular gespiegelt aus TextLayerConfig (alle ?optional)
  shadowEnabled? / glowEnabled? / outlineEnabled? / gradientEnabled? / audioReactiveEnabled? …
  // Per-Aufruf-Extras
  opacityMul?: number           // dimmt vorherige / nächste Lyric-Zeilen
  textAlign?: CanvasTextAlign
}

export function drawStyledText(ctx, opts, w, h, bassEnergy): void
```

`drawTextLayer` ist danach ein 30-Zeilen-Wrapper, der `config`-
Felder auf die `StyledTextOpts` mappt. `drawLyricsLayer` ruft
`drawStyledText` **pro gerenderter Zeile** auf (also bis zu N im
Scroll-Modus, bis zu 3 im Spotlight-Modus).

Konsequenz: jede Verbesserung am Text-Renderer (z. B. ein neuer
Effekt) erscheint automatisch im Lyrics-Renderer. Das ist genau die
Eigenschaft, die der User in der Aufgabenbeschreibung gefordert
hat ("share/extract the text-drawing function rather than
duplicating it").

### 3. Lyrics-Renderer ([src/lib/renderers/lyrics.ts](../../src/lib/renderers/lyrics.ts))

Pro Frame:

1. **Filtern + Sortieren**: `synchedLines` baut die Subset-Liste
   aus Zeilen mit `time !== null`, stabil sortiert nach `time` mit
   dem ursprünglichen Index als Tie-Breaker. So bricht
   Out-of-Order-Fine-Tuning die Wiedergabe nicht.

2. **Active-Index finden**: linearer Backward-Scan auf die kurze
   Liste (typisch 30–60 Zeilen) — `synced[i].time <= currentTime`,
   erster Treffer von hinten gewinnt. -1 = noch nicht angefangen,
   gar nichts zeichnen.

3. **Cross-Fade berechnen**: `fadeInAlpha(line, now, fadeSec)`
   gibt 0 → 1 über das `fadeSec`-Fenster nach `line.time`. Damit
   wechselt die aktive Zeile sanft ein, die ablösende ist
   gleichzeitig im "noch von der vorigen Zeile her dimmend".

4. **Mode-Dispatch**: `drawSpotlight` oder `drawScroll`.

#### Spotlight

- Aktive Zeile bei `(config.x * width, config.y * height)`, volle
  Größe, voller Pulse.
- Wenn `spotlightContext !== false`: Vorherige Zeile darüber
  (`anchorY - fontSize * 1.4`) bei 55 % Größe und ~35 % Alpha,
  ohne Pulse. Nächste Zeile darunter, gleiche Parameter.
- Reihenfolge: erst Kontext, dann Active — der scharfe Pass der
  Active landet immer auf den Glow / Schatten der Kontextzeilen.

#### Scroll

- Window von `±scrollVisibleLines` (default `±2` = bis zu 5 Zeilen
  insgesamt) um die aktive Zeile.
- Active in der Mitte; ältere Zeilen darüber, neuere darunter, mit
  `fontSize * 0.7` für Kontext.
- Smoother Scroll: `scrollShift = lineGap * (1 - activeFade)` —
  während des Cross-Fade-Fensters verschiebt sich der gesamte
  Stack nach unten, sodass die neue Active-Zeile in ihre Position
  hineinrutscht statt zu springen.
- Asymmetrisches Falloff: ältere Zeilen verlieren schneller Alpha
  (45 % → 20 %) als jüngere (60 % → 35 %). Bereits gesungener Text
  ist Hintergrund-Kontext, kommender Text ist Vorschau und soll
  besser lesbar bleiben.

### 4. Tap-to-Sync ([src/components/studio/LyricsSyncModal.tsx](../../src/components/studio/LyricsSyncModal.tsx)) — Commit `5321a97`

Modal vom Lyrics-Panel-Button "Sync lyrics" gestartet. Layout:

```
┌──────────────────────────────────────────┐
│ Sync Lyrics                          [X] │
├──────────────────────────────────────────┤
│ [▶ Play] [↺ Rewind]   Now: 0:34.20   3/12│
├──────────────────────────────────────────┤
│  ──   Hello, darkness, my old friend     │ ← synced
│  ──   I've come to talk with you again   │ ← synced
│  ──   Because a vision softly creeping   │ ← synced
│ →??   Left its seeds while I was sleep…  │ ← armed (highlighted)
│   ??  And the vision that was planted…   │ ← future (dim)
│   ??  Still remains, within the sound…   │
├──────────────────────────────────────────┤
│           ┌─────────────────────────┐    │
│           │  TAP NOW   [SPACEBAR]   │    │
│           └─────────────────────────┘    │
│  Spacebar = TAP · Backspace = undo …     │
├──────────────────────────────────────────┤
│ [↶ Undo]   [↺ Discard all]   [Done]      │
└──────────────────────────────────────────┘
```

#### Der Spacebar-Konflikt — gelöst

Die offensichtliche Versuchung wäre, Spacebar an Play/Pause zu
binden (Konvention im ganzen Web). Aber im Tap-Sync-Modus ist
**Tap die wichtigere Aktion** — der User trommelt rhythmisch mit
einer Hand, während die andere bei Bedarf den Transport bedient.
Entscheidung:

- **Spacebar = TAP** (mit `e.preventDefault()` damit der Browser
  nicht doch noch scrollt)
- **Play/Pause als dedizierter Button** im Modal-Header
- **R = Rewind**, **Backspace = Undo**, **Esc = Schließen**

Modal-Scoped Global-Keydown-Listener: ein einziger
`window.addEventListener('keydown', …)` in einem `useEffect`, der
INPUT- und TEXTAREA-Targets ignoriert (damit Tippen im Lyrics-
Panel-Textarea im Hintergrund nicht gestohlen wird). Da das Modal
nur gemounted ist, solange der User syncen will, gibt es **keinen
globalen Spacebar-Handler im Studio** mit dem das kollidieren
könnte — das Audit ergab: kein einziger.

#### Live-Now-Indikator ohne Re-Render-Sturm

`useAudioStore.currentTime` ändert sich ~60-mal pro Sekunde
während der Wiedergabe. Wenn das Modal das Feld via Zustand-
Selector lesen würde, würde das gesamte Modal-DOM 60-mal/s
re-rendern → ruckelt + verbraucht Strom.

Lösung: ein lokaler `useState<number>` plus ein eigener
`requestAnimationFrame`-Loop, der per Tick
`useAudioStore.getState().currentTime` synchron pollt und in den
State schreibt. So bleibt der "Now: 0:34.20"-Indikator butterweich
ohne dass die schwergewichtige Linien-Liste neu gerendert wird —
React batched die State-Updates auf ~60 fps und das ist genau die
Render-Rate, die ohnehin akzeptabel ist.

#### Undo-Historie

Stack `historyRef.current: { lineIndex, prevTime }[]`. Bei TAP
wird der vorherige Wert (typisch `null`, kann aber ein vorheriger
Timestamp sein bei Re-Sync) auf den Stack gelegt; Backspace pop't
und stellt wieder her. So lassen sich auch Fehl-Sync-Ketten
schrittweise zurückrollen — wichtig, weil rhythmische
Tap-Fehleinschätzungen passieren.

#### "Discard all" mit Confirm

Erneut-Sync auf einer schon getimten Layer (initialSyncedCount > 0)
zeigt einen Banner: "Diese Layer hat schon X Zeitstempel. Neue
Taps überschreiben ab der ersten un-synced Zeile." Der explizite
"Discard all"-Button verlangt einen `window.confirm`-Schritt —
zerstörerische Aktion mit verlustreichem Outcome darf nicht
versehentlich ausgelöst werden.

#### Leere Zeilen / Instrumental-Lücken

`findArmed` überspringt Zeilen mit `text === ''`. User trommelt
also nicht durch Stille hindurch. Die leeren Zeilen kann er
optional manuell im Fine-Tune-Tab des Panels syncen, wenn er den
Spotlight gezielt während einer Bridge ausschalten will.

### 5. Fine-Tuning + Display-Modi ([src/components/studio/panels/LyricsPanel.tsx](../../src/components/studio/panels/LyricsPanel.tsx)) — Commit `7e6cf5e`

Im Panel:

- **Fine-Tune-Liste** (nur sichtbar wenn `syncedCount > 0`):
  - ▶ Jump-to-Time (`masterElement.currentTime = t` +
    `useAudioStore.setCurrentTime(t)` für Store-Konsistenz)
  - − / + Nudge-Buttons (± 0.1 s)
  - ⟲ Un-sync-Button (setzt `time` wieder auf `null`)
  - Komplett leere Rows (kein Text, kein Timestamp) werden
    visuell rausgefiltert — die Trim-Trailing-Blanks-UX aus dem
    Paste-Pfad bleibt auch hier sauber.

- **Display-Mode-Block**:
  - `SegmentedGroup` Spotlight / Scroll mit Untertitel
    ("one line bright" / "teleprompter")
  - Spotlight zeigt: "Show prev + next"-Toggle
  - Scroll zeigt: "Visible lines ±N" Slider (0–4)
  - Beide: "Cross-fade" Slider (0–1 s)

Persistierung der neuen Felder kostet nichts — die
LayerStore-Layer-Serialisation in `studioPersistence` ist
Diskriminierte-Union-tippiert. Neue optional Fields fließen
automatisch durch `JSON.stringify(layers)` und werden beim
Reload eingeladen. Schema-Version-Bump nicht notwendig (additiv,
abwärtskompatibel).

---

## 🧩 Technische Details

### Master-Clock-Integration

Der Lyrics-Renderer braucht **eine** kritische Information:
`currentTime` in Sekunden. AuSpec hat dafür einen zentralen
`useMasterClock`-Helper, der unabhängig vom Audio-Source (MP3 vs.
Video-Audio vs. Video-only) das **eine** korrekte HTMLMediaElement
zurückgibt.

Aber: der Render-Loop in `VisualizerCanvas` läuft in einer
`requestAnimationFrame`-Schleife innerhalb eines `useEffect` mit
nur `[ctx, width, height]` als Deps. Alle Werte, die sich pro
Frame ändern können (Layers, Config, Data, jetzt auch
currentTime), kommen via Refs durch.

Neuer `currentTimeRef`:

```tsx
const currentTimeRef = useRef(currentTime)
useEffect(() => {
  currentTimeRef.current = currentTime
}, [currentTime])
```

Im Render-Switch:

```tsx
case 'lyrics':
  drawLyricsLayer(
    ctx, layer.config, width, height,
    currentTimeRef.current,   // ← frisch im rAF-Tick
    bassEnergy,
  )
  break
```

Konsequenz für den Export: `canvas.captureStream()` zeichnet
genau diesen Render-Loop auf, also kommt im exportierten MP4 die
selbe Lyrics-Position pro Frame heraus wie im Live-Studio. Sync
ist garantiert, ohne dass der Export-Pfad **irgendetwas** über
Lyrics wissen muss.

### `currentTime` Polling im Modal — warum nicht via Zustand-Selector?

Das Modal könnte einfach `useAudioStore((s) => s.currentTime)`
schreiben. Das würde funktionieren, aber auch das gesamte Modal-
DOM (Liste, Tap-Button, Header) bei jedem `currentTime`-Tick neu
rendern.

`currentTime` ändert sich pro `timeupdate`-Event auf dem HTML-
Audio-Element — auf modernen Browsern alle ~16 ms während der
Wiedergabe. Vier Zeilen-Listen-Items × ~60 Re-Renders/s = ein
spürbarer Jank-Lag, besonders auf Tablets.

Stattdessen: ein lokaler `useState` und ein eigener rAF-Loop,
der pro Tick `useAudioStore.getState().currentTime` synchron
liest und schreibt:

```tsx
const [nowSec, setNowSec] = useState(() => useAudioStore.getState().currentTime)
useEffect(() => {
  let raf = 0
  const tick = () => {
    setNowSec(useAudioStore.getState().currentTime)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}, [])
```

Das updated lokalen State auf rAF-Takt (vsync, ~60 fps) statt auf
timeupdate-Takt. React kann diese Updates batchen, und sie betreffen
nur den `<p>Now: …</p>`-Knoten, nicht die gesamte Komponente — gut
genug für ein Studio-Tool.

### Index-Aligned Paste-Parsing

Wenn der User Lyrics im Textarea editiert (z. B. einen Tippfehler
fixt in Zeile 17), soll **die Sync-Information der unveränderten
Zeilen erhalten bleiben**. Naive Lösung: bei jedem `onChange` alle
Timestamps wegwerfen. UX-Killer.

`parsePaste(raw, existing)` macht es per Index-Vergleich:

```ts
for (let i = 0; i < rows.length; i++) {
  const text = rows[i].trim()
  const prev = existing[i]
  const time = prev && prev.text === text ? prev.time : null
  out.push({ text, time })
}
```

Wenn Zeile i im neuen Text das Gleiche sagt wie Zeile i im alten,
keep den Timestamp. Sonst null. Insertion / Deletion-Detection ist
nicht eingebaut — die wäre LCS-basiert und Phase-2-Material. Für
Phase 1 kostet sie nicht das Risiko: User lernt schnell, dass
Insertion in der Mitte alle nachfolgenden Sync-Werte resetted, und
korrigiert dann lieber per Re-Sync ab der eingefügten Stelle.

### Display-Mode-Render-Reihenfolge

Spotlight zeichnet **immer** zuerst die Kontext-Zeilen (prev/next),
dann erst die aktive. Begründung: die aktive Zeile hat in
Render-Pass-1 ihren Glow durch `drawGlow` (Offscreen + GPU-Blur)
auf dem Hauptcanvas. Die folgenden scharfen Strokes (Outline-,
Gradient-Fill-Pass) der Active sollen **über** den Glow / Schatten
der Kontextzeilen sitzen, sonst wird der scharfe Active-Glyph
durch das Streulicht der Nachbarn weggewischt.

Im Scroll-Modus ist die Sortierung leicht anders (vom ältesten zum
neuesten), aber die Active-Zeile in der Mitte des Loops wird mit
voller Opacity gezeichnet, während die anderen reduziertes Alpha
haben — und Glow ist auf der Active strenger.

### Persistierung & Export — automatisch

`StudioAutosave.layers: Layer[]` ist diskriminierte Union. Der
neue `LyricsLayer`-Variant fließt durch `JSON.stringify` →
`JSON.parse` ohne Spezialbehandlung. Beim Reload wird der
`LyricsLayerConfig` als Plain-Object zurückkommen, mit allen
Fields die zur Save-Zeit existiert haben. Fehlende `?optional`
Fields werden vom Renderer per `?? default` aufgefangen.

Export via `canvas.captureStream()` zeichnet exakt den
Render-Loop auf — der Lyrics-Renderer wird pro Frame mit dem
korrekten `currentTime` aufgerufen. Der finale MP4 hat die
Lyrics-Sync **frame-akkurat** so wie die Preview.

---

## 📊 Aktueller Stand

| Bereich                          | Status      | Anmerkung |
|----------------------------------|-------------|-----------|
| Lyrics-Layer wählbar (+)         | ✅           | Sidebar-`+`-Dropdown bringt "Lyrics" zwischen Text und Frame |
| Paste-Lyrics-Workflow            | ✅           | Index-aligned, trim trailing blanks |
| Tap-to-Sync (Spacebar)           | ✅           | Modal + Spacebar = TAP, Backspace = Undo, R = Rewind, Esc = Close |
| Master-Clock-Routing             | ✅           | Play/Pause + Seek via `useMasterClock` — funktioniert mit Audio-File, Video-as-Audio, Video-only |
| Fine-Tune-Liste                  | ✅           | ▶ Jump, ± 0.1 s Nudge, ⟲ Un-sync |
| Spotlight-Modus                  | ✅           | Active + optionaler Prev/Next-Kontext |
| Scroll-Modus                     | ✅           | ±N Visible Lines, smoother Scroll im Fade-Fenster |
| Effekte gespiegelt von Text-Layer | ✅          | Font-Library, Glow via drawGlow, Outline, Gradient, Audio-Reactive Pulse |
| Drop-Shadow + Effects am Wirken  | ✅           | Über `drawStyledText`-Helper, kein Code-Duplikat |
| Autosave-Persistierung           | ✅           | Automatisch über die diskriminierte Layer-Union |
| Export-Sync                      | ✅           | captureStream zeichnet denselben Render-Loop auf |

**Bundle-Delta** über die drei Lyrics-Commits:

- 850.34 → **872.90 kB** raw (+ 22.56 kB)
- 228.25 → **233.00 kB** gz  (+ 4.75 kB)

Davon der Großteil im Tap-Sync-Modal (~12 kB raw — Modal-UI ist
ausgiebig instrumentiert mit visuellen Feedback-States) und im
Fine-Tune-UI (~5 kB raw).

---

## ⏳ Offene Punkte / Backlog

### Phase 2: Auto-Sync / Word-Level

Bewusst NICHT in dieser Session umgesetzt, mit klarem Plan für
später:

- **Auto-Align**: zu Phase 2 würde ein In-Browser-Audio-Forced-
  Alignment gehören (z. B. via `whisper.cpp` als WASM, oder ein
  vereinfachtes Modell, das nur Silben-Onsets findet).
  Beat-Detection als Fallback ist schon im Analyzer vorhanden —
  könnte für rhythmische Tracks ein erstes Auto-Sync liefern, das
  der User dann manuell korrigiert.
- **Word-Level-Sync**: pro Wort ein Timestamp, mit dem
  Renderer-Effekt "Wort wird heller / wechselt Farbe sobald
  gesungen". Erfordert eine Erweiterung des Daten-Modells
  (`LyricsWord[]` pro Zeile mit eigenen Times), neue Tap-UI und
  einen Word-Renderer, der `ctx.measureText` für Cursor-Position
  pro Wort nutzt. Klassischer Karaoke-Look.

### Visuelle Tests mit echtem Audio

Build ist sauber, Logik nach Code-Review schlüssig. Vor Release:

- Auf jedem der 8 Pack-Presets (vor allem auf Winter Dream +
  Spring Morning mit dem Wave-Glow-Stack) ein Lyrics-Layer
  hinzufügen, Glow aktivieren, kurzes Audio abspielen → kein
  Stuttering (drawGlow garantiert performant, aber nochmal
  empirisch nachschauen).
- Spacebar-Test im echten Studio: andere Modals / Inputs offen
  lassen, dann das Sync-Modal öffnen — Spacebar muss zuverlässig
  TAP triggern, niemals das geöffnete andere Element pasten /
  bewegen / scrollen.
- Export-Round-Trip: Sync 10 Zeilen, Export starten, MP4
  herunterladen, abspielen, prüfen ob die Lyrics frame-genau
  matchen.

### Drag-Position für Lyrics auf dem Canvas

Aktuell setzt `(x, y)` die Spotlight-Position (oder den Scroll-
Anchor) über Slider im Panel. `layerTransform.ts` hat
`'lyrics'` explizit als nicht-positionierbar markiert, damit der
Drag-Overlay keine Handles über das Lyrics-Rendering legt. Das ist
für Phase 1 fine, aber langfristig sollte Lyrics — wie Text —
direkt am Canvas draggbar sein (via TextInteractive oder einem
analogen Helper). Geringe Priorität.

### Verbesserung der Insertion-Detection beim Paste-Re-Edit

Index-Aligned ist eine 80 %-Lösung. Bei mittlerer Insertion (User
fügt eine vergessene Zeile zwischen 5 und 6 ein) gehen alle
Sync-Werte ab 6 verloren. Eine LCS-basierte Diffung würde besser
matchen ("Zeile 7 alt ist Zeile 8 neu, behalte ihren Timestamp").
Phase 2.

---

## 💡 Lessons Learned

### 1. Extract before Add — Reuse durch Refactor, nicht durch Copy

Der Spec-Punkt "share/extract the text-drawing function rather
than duplicating it" war ein **Architektur-Geschenk**. Statt
direkt `drawLyricsLayer` zu implementieren wurde zuerst
`drawStyledText` aus `drawTextLayer` extrahiert. Aufwand: ~30
Minuten. Belohnung: Lyrics bekommt **automatisch** jeden Effekt,
den Text bekommt, und umgekehrt.

Die alternative Welt — wo Lyrics seinen eigenen Glow-Pfad,
Outline-Pfad, Gradient-Pfad hat — wäre eine Code-Duplikations-
Schuld, die ich später schmerzhaft zurückzahlen müsste. Refactor
**bevor** der Use-Case einzieht, ist immer billiger als nach.

### 2. Spacebar-Konflikte werden gewonnen, nicht vermieden

Die Versuchung war groß, einen anderen Key zu wählen ("T"? "S"?),
um den Spacebar-Konflikt zu umgehen. Aber Spacebar ist
**ergonomisch dominant** für rhythmisches Tappen: der Daumen ist
natürlich darauf. Stattdessen den Konflikt sauber lösen:

- Im Sync-Modus ist Tap die Haupt-Aktion → Spacebar = Tap
- Play/Pause als sichtbarer Button → keine Verwechslung
- `e.preventDefault()` + INPUT/TEXTAREA-Filter im Listener →
  keine Side-Effects

Resultat: Spacebar fühlt sich richtig an, kein anderer Workflow
ist beschädigt. Das gilt allgemein für Keybinding-Konflikte:
**präziser Scope ist besser als globale Vermeidung**.

### 3. Refs sind die richtige Antwort für "frisch im rAF-Tick"

In einem React-Render-Loop ist die naive Frage "wo bekomme ich
den aktuellen currentTime her?" eine Falle. Antworten:

- **Closure** (read directly from scope): veraltet sobald React
  nicht re-rendert
- **Subscribe** (Zustand-Selector im rAF-Callback): Re-Rendert
  React 60 mal/s → Sturm
- **Ref + sync-Effekt**: liest immer den frischesten Wert pro
  rAF-Frame, **kostet null Re-Renders**

Der `currentTimeRef`-Pattern ist im Codebase mehrfach präzedent
(`layersRef`, `configRef`, `dataRef`). Für Lyrics einfach
fortsetzen.

### 4. Exhaustive Switches sind ein Frühwarnsystem

Beim ersten `npm run build` nach Hinzufügen von `'lyrics'` zum
`LayerType`-Union kamen 7 TypeScript-Errors aus
`useLayerStore.ts` und `layerTransform.ts`. Jeder davon war ein
**Verhaltens-Fragezeichen**, das ich aktiv beantworten musste:

- Wie reagiert "Duplicate Layer" auf Lyrics? → Tiefkopie der
  `lines`-Liste, sonst mutiert das Original.
- Wie reagiert "Reset Layer to defaults"? → Frischer
  DEFAULT_LYRICS_CONFIG, leere Liste.
- Wie reagiert "Lyrics am Canvas draggen"? → Phase 1: gar nicht,
  Panel-controlled.

Ohne diese Fragen wären stille Bugs in den Codebase eingeschlichen.
TypeScript-strict mit `exhaustive` Discriminated Unions ist genau
für solche Cases gemacht — und es lohnt sich jedes Mal.

### 5. Incremental Commits zahlen sich im Code-Review aus

Die drei Commits (Datenmodell + Renderer / Tap-Sync / Fine-Tune)
sind genau die natürlichen Bruchstellen der Feature-Arbeit. Jeder
einzelne baut sauber und produziert ein funktionsfähiges
Zwischenresultat (Layer existiert, lädt nicht, Display funktioniert
sobald gesynct → man kann sogar manuell `time`-Werte in
DevTools setzen). Ein Reviewer kann jeden Commit für sich
verstehen, jeden git-bisect-Schritt isolieren.

Größere Feature-Sessions werden hierdurch beherrschbar — und im
Zweifel bringt ein Revert nur das eine Stück zurück, nicht den
ganzen Tag.
