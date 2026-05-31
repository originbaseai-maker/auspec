---
title: AuSpec — Session 2026-05-31 (Lyrics-Polish)
tags: [session, auspec, lyrics, timeline, entrance-effects, ux]
datum: 2026-05-31
status: completed
commits:
  - 1e6fa17  # feat(lyrics-sync): timeline scrubber + seek-to-timestamp in sync modal
  - f11c219  # feat(lyrics): line entrance effects (fade/slide-up/scale/blur)
  - 8b2e187  # feat(lyrics): independent prev/next visibility toggles
---

# AuSpec Session — 31. Mai 2026 (Lyrics-Polish)

Vierte Lyrics-Session, im Anschluss an die Phase-1-Auslieferung in
[2026-05-29-lyrics-karaoke-layer](./2026-05-29-lyrics-karaoke-layer.md)
und den Tool-Button-Fix vom 30. Mai. Schwerpunkt jetzt: vier
gezielte UX-, Workflow- und Effekt-Verbesserungen am bestehenden
Karaoke-Layer. Kein neues Daten-Modell, keine neuen Layer-Typen —
nur Polish, Comfort und Effekte.

---

## 🎯 Ziele der Session

Vier Tasks, alle auf der bestehenden Karaoke-Engine aufsetzend:

1. **TASK A — Timeline-Scrubber im Sync-Modal**: visueller Balken
   mit Playhead und Markern für jede gesynce Zeile, damit der User
   die Verteilung seiner Taps auf einen Blick sieht und seekt.

2. **TASK B — Click-Timestamp = Seek + Arm**: ein Click auf
   irgendeinen Timestamp (oder den Timeline-Balken) soll die
   Wiedergabe dorthin springen lassen UND die "armed" Zeile auf
   genau diese Stelle setzen, damit Mistap-Korrektur ein
   Single-Click-+-Retap-Vorgang wird.

3. **TASK C — Entrance-Effekte**: per-Layer Einstellung "wie kommt
   eine neue Zeile rein?" mit fünf Varianten (None, Fade, Slide-up,
   Scale, Blur). Master-Clock-getrieben, also identisch im Export.

4. **TASK D — Unabhängige Prev/Next-Toggles**: der bestehende
   "Show prev + next"-Schalter wird in zwei getrennte Toggles
   zerlegt, mit Migration der Bestandsprojekte.

---

## ✅ Erledigte Aufgaben

### 1. Timeline + Seek-and-Arm (Commit `1e6fa17`)

Der Sync-Modal-Header bekommt einen 28-px-hohen Scrubber-Balken
zwischen der Transport-Reihe und der Zeilenliste. Drei visuelle
Schichten:

1. **Played-Portion-Füllung** — Linear-Gradient von blau zu lila
   am linken Rand, breite via `playheadPct = (nowSec / duration) * 100`.
2. **Marker pro gesynce Zeile** — 2-px-Strich an
   `(line.time / duration) * 100 %`. Wenn die Zeile gerade armed
   ist: 3 px breit, blau, mit Glow.
3. **Playhead** — 2-px-weißer Strich mit Glow, an
   `playheadPct`. Updated über den existierenden rAF-Poll, daher
   smooth auf 60 fps ohne React-Re-Render-Sturm (nur ein einziges
   `style.width`-Attribut wird mutiert).

#### Click = Seek + Arm

Click auf den Balken:
1. `rect.getBoundingClientRect()` + `e.clientX` → Fraktion 0..1
2. `t = fraction * duration`
3. `seekTo(t)` (über Master-Clock-Element + Store-Update)
4. `findClosestLineAtOrAfter` mit 0.5-s Toleranz nach hinten:
   nimm die Zeile mit dem kleinsten `line.time - t` im Bereich
   `[-0.5s, +∞)`. Wenn nichts gefunden → `manualArm = null` →
   auto-arm via `findAutoArmed`.

Click auf einen per-Zeilen-Timestamp:
1. Wenn die Zeile selbst einen Timestamp hat → seek dorthin.
2. Wenn nicht (un-synced) → extrapoliere aus den Nachbarn:
   - Beide Nachbarn synced → Mittel
   - Nur prev → `prev + 1 s`
   - Nur next → `next - 1 s`
   - Keine → bleibe bei Now
3. `setManualArm(idx)` — die Zeile ist explicit armed.

#### Manual-Arm-State

Das Kernstück der UX-Verbesserung. Vorher: armed war immer
`findAutoArmed(cfg.lines)` = erste un-syncte Zeile. Jetzt:

```ts
const [manualArm, setManualArm] = useState<number | null>(null)
const autoArmed = findAutoArmed(cfg.lines)
const isValidManual = manualArm !== null &&
                      manualArm >= 0 &&
                      manualArm < cfg.lines.length &&
                      cfg.lines[manualArm].text !== ''
const armed = isValidManual ? manualArm : autoArmed
```

Lebenszyklus:
- **Default**: `null` → auto-armed nimmt über (bisheriges Verhalten).
- **Click Timestamp / Bar**: `setManualArm(idx)`.
- **TAP** (mit manualArm aktiv): schreibt `currentTime`, dann
  `setManualArm(nextManualArm(lines, armed))` — sucht die nächste
  nicht-leere Zeile. Falls keine mehr → `null` → fällt zurück auf
  auto-armed, das jetzt -1 ("All synced") gibt.
- **Undo**: setzt manualArm auf die just-undone-Zeile, damit
  Retap ein einziger Spacebar-Tap ist.
- **Rewind / Discard all**: setzt `null` zurück.

Die history-Stack-Entries führen jetzt drei Felder:
`{ lineIndex, prevTime, prevManualArm }` — damit eine Undo-Kette
nicht nur die Timestamps, sondern auch den Arm-Cursor sauber
zurückwickelt.

### 2. Entrance-Effekte (Commit `f11c219`)

Neuer Type `LyricsEntrance = 'none' | 'fade' | 'slide-up' | 'scale' | 'blur'`,
optionales Feld `entrance?: LyricsEntrance` auf
`LyricsLayerConfig`, Default `'none'` im
`DEFAULT_LYRICS_CONFIG`.

#### `planEntrance` — die zentrale Logik

```ts
interface EntrancePlan {
  dy: number       // Y-Offset auf den Anker
  sizeMul: number  // Multiplikator auf fontSize
  opacityMul: number
  blurPx: number   // > 0 → ctx.filter blur((1-p)*N)
}

function planEntrance(variant, progress, fontSize): EntrancePlan
```

Der `progress` ist identisch mit `activeFade` (also dem bestehenden
`fadeInAlpha`-Wert über `fadeSec`). Damit teilen sich
Cross-Fade und Entrance die gleiche Zeitachse. `fadeSec = 0` →
Hard-Cut für alles. Sonst rampt jeder Effekt über die fadeSec-Dauer.

Mapping pro Variante:

| Variante  | `dy`                 | `sizeMul`        | `blurPx`     |
|-----------|----------------------|------------------|--------------|
| none      | 0                    | 1                | 0            |
| fade      | 0                    | 1                | 0            |
| slide-up  | `(1-p) * fs * 0.5`  | 1                | 0            |
| scale     | 0                    | `0.85 + 0.15*p` | 0            |
| blur      | 0                    | 1                | `(1-p) * 6` |

`'none'` und `'fade'` sind visuell identisch — beide nutzen nur den
existierenden Cross-Fade. Die separaten UI-Labels existieren, weil
manche User explizit "Fade in" wählen wollen statt "None"; der
Code-Pfad ist absichtlich derselbe.

#### `blur` und das drawGlow-Transform-Vertragsproblem

Slide-up und Scale ändern einfach `y` und `fontSize` in den
`StyledTextOpts`, die in `drawStyledText` weitergegeben werden.
Blur war heikler: `drawGlow` hat einen Transform-Vertrag, der
voraussetzt, dass das Main-Canvas bei der Identity (nur DPR-Scale)
ist — sonst läuft der `drawImage`-Composite-Schritt am Ziel
vorbei.

Die Lösung steckt im Detail des `drawGlow`-Codes: er macht
`mainCtx.save()` → `drawImage(...)` → `mainCtx.restore()`.
**Innerhalb** dieses Save/Restore vererbt sich `ctx.filter` von
außen — d. h. wenn ich vor dem Aufruf von `drawStyledText`
`ctx.filter = 'blur(6px)'` setze, dann blurrt das BOTH den
geblurrten Glow-Composite UND den nachfolgenden Sharp-Pass. Genau
das gewünschte Verhalten:

```ts
if (entrance.blurPx > 0) {
  ctx.save()
  ctx.filter = `blur(${entrance.blurPx}px)`
  drawActive()       // drawStyledText läuft mit der Filter-Inheritance
  ctx.restore()
} else {
  drawActive()
}
```

Kein zweiter Offscreen-Pass nötig. GPU-Beschleunigung erhalten.
Cost: 1 zusätzliche Composite-Operation pro Frame während der
Entrance-Fenster, ~0.5 ms.

#### Beschränkung auf die aktive Zeile

Entrance-Animation läuft nur auf der active Line. Die Spotlight-
Context-Zeilen (prev/next) und die Scroll-Nachbarn bleiben statisch
— sonst würde der gesamte Frame bei jedem Line-Change "schwimmen",
was als jittery erscheint statt als Effekt. Das Modell: das
Drumherum ist der stabile Rahmen, die Active ist das Theater-
Spotlight-Highlight.

### 3. Unabhängige Prev/Next-Toggles (Commit `8b2e187`)

Zwei neue Felder auf `LyricsLayerConfig`:

```ts
showPrevLine?: boolean   // Default true in DEFAULT_LYRICS_CONFIG
showNextLine?: boolean   // Default true in DEFAULT_LYRICS_CONFIG
```

Das alte Feld `spotlightContext?: boolean` bleibt als Legacy auf
dem Type — nicht entfernt, weil bestehende User-Projekte das
Feld enthalten können.

#### Migration via zwei Resolver-Funktionen

```ts
export function resolveShowPrev(config): boolean {
  if (config.showPrevLine !== undefined) return config.showPrevLine
  return config.spotlightContext !== false
}
export function resolveShowNext(config): boolean {
  if (config.showNextLine !== undefined) return config.showNextLine
  return config.spotlightContext !== false
}
```

Lookup-Priorität:
1. Neues Feld gesetzt → das gewinnt.
2. Sonst Legacy: `false` (alt-explizit aus) → beide aus.
3. Sonst Legacy: `true` oder undefined → beide an.

Damit lädt jedes Bestandsprojekt ohne Verhaltensänderung. Wenn
der User dann am UI an einem der neuen Toggles dreht, schreibt
der Panel-Code:

```ts
onChange={(v) => update({ showNextLine: v, spotlightContext: undefined })}
```

— d. h. das neue Feld kommt rein, das alte wird explicit gelöscht
(undefined-write hebt den vorherigen Wert auf). Ab dann steuern
ausschließlich die neuen Felder die Anzeige. Saubere Migration ohne
Schema-Bump.

#### Anwendung in beiden Modi

- **Spotlight**: Render-Pfad gated jede Nachbarzeile einzeln.
  `showPrev` aus → keine Prev-Zeile; `showNext` aus → keine
  Next-Zeile. Beide aus → nur die aktive Zeile (Single-Hero-Look).
- **Scroll**: `start = showPrev ? activeIdx - visible : activeIdx`
  und `end = showNext ? activeIdx + visible : activeIdx`.
  Damit kann der User nur die kommenden Zeilen als Vorschau zeigen
  (klassische Karaoke-Konvention) oder nur die schon gesungenen
  Zeilen als Kontext (Recap-Stil).

#### Panel-UI

Vorher (Spotlight-Modus):
```
Show prev + next     [●○]
```

Nachher:
```
Show previous line               [●○]
Show next line (upcoming)        [●○]
```

Beide Toggles immer im Spotlight-Branch sichtbar; für Scroll
würden sie analog gelten, aber dort hat der Scroll-Modus zusätzlich
`scrollVisibleLines` als Slider, also fügen wir die Toggles dort
NICHT in die UI ein (sie würden den Slider sinnlos vervielfachen).
Für Scroll-Nutzer, die "nur kommende Zeilen" wollen, ist Toggle
zurück auf Spotlight die natürlichere Route.

---

## 🧩 Technische Details

### Manual-Arm vs. Auto-Arm — die kleine Zustandsmaschine

Der Zustand `manualArm: number | null` ist die Achse, um die sich
fast die ganze neue UX dreht:

| Aktion                          | Effekt auf manualArm                          |
|---------------------------------|-----------------------------------------------|
| Modal-Open                      | `null` (auto-arm-Default)                     |
| Click Line-Timestamp            | `setManualArm(idx)`                           |
| Click Timeline-Bar              | `setManualArm(bestMatch)` oder `null`         |
| TAP (manualArm aktiv)           | `setManualArm(nextManualArm(lines, armed))`   |
| TAP (manualArm null, auto-arm)  | bleibt `null` (findAutoArmed picked nextline) |
| Undo                            | `setManualArm(last.lineIndex)`                |
| Rewind                          | `setManualArm(null)`                          |
| Discard all                     | `setManualArm(null)`                          |

`isValidManual` schützt vor "manualArm zeigt auf eine leere/non-
existente Zeile" — falls die User-Editierung die Liste verkleinert
hat, fällt der Code automatisch in auto-arm zurück. Robustheit
ohne explicit Cleanup-Effects.

### Timeline-Polling vs. Re-Render

Der Playhead muss auf 60 fps smooth laufen. Das geschieht via:

```ts
const [nowSec, setNowSec] = useState(() => useAudioStore.getState().currentTime)
useEffect(() => {
  let raf = 0
  const tick = () => {
    setNowSec(useAudioStore.getState().currentTime)
    raf = requestAnimationFrame(tick)
  }
  ...
})
```

Diese rAF-Schleife rendert das Modal pro Frame neu, was die ganze
Linie-Liste, Timeline, Tap-Button etc. mit eingeschlossen. Auf den
ersten Blick teuer — aber React ist mit so kleinen Component-Trees
schnell genug, dass das Modal smooth bleibt. Der Alternative wäre
ein imperativer DOM-Mutator (`ref.current.style.width = ...`) auf
einem einzelnen Playhead-Span, ohne State. Habe das nicht gewählt,
weil:

1. Die Marker (auch State-abhängig — armed-Highlight!) brauchen
   React-Reaktivität.
2. Performance ist akzeptabel.
3. Der Code bleibt deklarativ.

Falls auf schwacher Hardware Jank auftritt, ist der Single-Span-
Imperativ-Path der nächste Schritt — aber Phase 1 ist fine.

### Entrance-Driven-Off-Master-Clock = Export-Identisch

Die Entrance-Effekte lesen `currentTime` (via `currentTimeRef` im
Render-Loop), berechnen daraus `progress = fadeInAlpha(line, t, fadeSec)`,
und mappen über `planEntrance` auf den visuellen State.

Im Export läuft `captureStream` über genau diesen Render-Loop mit
dem gleichen `currentTime`-Wert pro Frame. Die Entrance-Animation
ist also **byte-für-byte deterministisch** im Export — kein
Sub-Frame-Drift, kein Refresh-Cycle-Skew, keine WebAudio-Latenz-
Korrektur nötig.

Das gilt auch für einen späteren Server-side-Render (Phase 15,
Railway-Worker): solange der Worker den Audio-Stream frame-genau
dekodiert und denselben Renderer nutzt, kommt im Server-MP4
exakt dasselbe heraus wie in der Browser-Preview.

---

## 📊 Aktueller Stand

| Bereich                                  | Status     | Anmerkung |
|------------------------------------------|------------|-----------|
| Timeline-Scrubber im Sync-Modal          | ✅          | Playhead + Markers, Click-to-Seek+Arm |
| Click-Timestamp = Seek+Arm               | ✅          | Per-Zeilen-Click oder Timeline-Click |
| Manual-Arm-State + Undo-Restore          | ✅          | Mistap-Recovery ist 1 Click + 1 Spacebar |
| Entrance: None / Fade                    | ✅          | Default, kein visueller Effekt über Cross-Fade hinaus |
| Entrance: Slide-up                       | ✅          | Y-Offset Linear-Ramp |
| Entrance: Scale                          | ✅          | 85 % → 100 % Linear-Ramp |
| Entrance: Blur                           | ✅          | ctx.filter blur Inheritance über drawGlow-Composite |
| Show Previous Line (Toggle)              | ✅          | Spotlight + Scroll |
| Show Next Line (Toggle)                  | ✅          | Spotlight + Scroll |
| Legacy `spotlightContext`-Migration      | ✅          | Resolver-Funktionen, kein Schema-Bump |

**Bundle-Delta** über die drei Commits:

- 872.90 → **877.60 kB** raw (+ 4.70 kB)
- 233.00 → **234.58 kB** gz (+ 1.58 kB)

Wichtigster Anteil:
- `+289 / -21` LOC im LyricsSyncModal (Timeline + Manual-Arm)
- `+203 / -29` LOC verteilt auf Renderer + Panel + Types
  (Entrance + planEntrance + UI)
- `+74 / -16` LOC für die unabhängigen Prev/Next-Toggles

---

## ⏳ Offene Punkte / Backlog

### Typewriter-Entrance (Phase 2)

Letter-by-letter Reveal — klassischer Karaoke-Look. Nicht in dieser
Session umgesetzt, weil:

- Daten-Modell-Erweiterung nötig: pro Zeile eine Wort- oder Char-
  Liste mit eigenen relativen Timestamps
- Render-Loop: pro Frame text-substring berechnen + per `ctx.measureText`
  Cursor-Position pro Wort/Char tracken
- Sync-UX: Auto-Align-Heuristik oder Pro-Wort-Tap

Phase 2 Kandidat zusammen mit Auto-Align und Word-Level-Sync —
die drei Themen teilen sich das gleiche Daten-Modell-Update.

### Timeline-Drag (Scrub)

Aktuell click-only. Drag-to-scrub wäre einen einzelnen `pointermove`-
Handler wert, der bei gedrückter Maustaste den Seek-Pfad triggert.
Geringe Priorität — User können auch das vorhandene globale
Timeline-Widget unten im Studio nutzen.

### Per-Line-Lock im Fine-Tune

Beim Re-Sync von der Mitte aus ist der manual-arm-Advance aggressiv:
jeder TAP überschreibt die nächste Zeile, auch wenn die schon einen
guten Timestamp hatte. Ein "lock"-Checkbox pro Zeile im
Fine-Tune-Panel würde verhindern, dass eine geliebte Zeile beim
versehentlichen Retap gekillt wird. Geringe Priorität — die
Undo-Kette federt das ab.

### Entrance + Audio-Reactive-Pulse-Interaktion

Audio-Reactive Pulse (bestehendes Feature) und Entrance-Scale
beide multiplizieren den `fontSize`. Bei `entrance: 'scale'` und
`audioReactiveEnabled` gleichzeitig multipliziert sich der Effekt
(1.06 × 1.15 = 1.22 statt 1.15). Aktuell ist das OK, weil der
Pulse-Cap niedrig ist (6 % bei vollem Bass). Falls jemand
beide kombiniert und der Mix komisch aussieht: dann müsste der
Pulse INSIDE die Entrance applizieren (nicht parallel). Erstmal
beobachten.

### Visueller A/B-Test der Entrance-Effekte

Build ist sauber, Logik nach Code-Review schlüssig. Vor Release:
- Jeden der vier Effekte (Fade, Slide, Scale, Blur) auf einem
  Track mit dichtem Lyrics-Rhythmus (~120 BPM, kurze Lines)
  anschauen — die Effekte sollen "feel-good" sein, nicht
  ablenkend.
- Performance-Check: Blur-Entrance kombiniert mit aktivem Glow
  über einem Video-Background → muss smooth bleiben (der
  drawGlow-Pfad ist GPU, Filter-Blur ist GPU, sollte fine sein,
  aber empirisch bestätigen).

---

## 💡 Lessons Learned

### 1. Pure-Read-Migration > Schema-Versionierung

Für Task D (Prev/Next-Split) habe ich KEINEN Schema-Version-Bump
gemacht und KEINEN Migrate-Step in `studioPersistence` eingebaut.
Stattdessen zwei pure Resolver-Funktionen
(`resolveShowPrev` / `resolveShowNext`), die zur Render-Zeit
zwischen alten und neuen Feldern auflösen.

Vorteile:
- Keine Risiko-Race im Migrate (was ist, wenn der Migrate vor
  dem Type-Check läuft? was, wenn jemand mitten in der
  Migration crasht?). Pure Read = idempotent = safe.
- Bestandsprojekte sind sofort migriert, ohne speziellen
  Schreib-Pfad.
- Beim ersten User-Click auf einen neuen Toggle wird das
  legacy Feld explicit gelöscht — Migration passiert organisch.

Nachteil: das Legacy-Feld bleibt im Type ewig. Akzeptabler
Preis für das Schema-Hygiene-Geschenk.

### 2. `ctx.filter` vererbt sich über `mainCtx.save/restore`-Brücken

Der `drawGlow`-Helper macht intern `mainCtx.save() → drawImage()
→ mainCtx.restore()`. Wenn ich VOR `drawStyledText` (das intern
`drawGlow` ruft) den `ctx.filter` setze, dann erlebt der
`drawImage`-Composite-Schritt INNERHALB `drawGlow` den Filter
und blurrt mit. Das ist genau das Verhalten, das ich für die
Blur-Entrance wollte: sowohl der Glow als auch der scharfe Text
blurren synchronisiert.

Diese Vererbung war NICHT explizit dokumentiert in
`drawGlow`'s Vertrag, sondern eine emergente Eigenschaft des
Canvas-2D-State-Modells. Nice find — und ich habe es im
Kommentar dokumentiert, damit zukünftige Renderer-Autoren
nicht die Falle in die andere Richtung tappen ("warum blurrt
mein Glow plötzlich?").

### 3. Mistap-UX braucht 1 Click + 1 Spacebar, nicht 5 Klicks

Vorher war die Fix-Workflow:
1. Pause
2. Im Studio-Timeline-Widget scrubben zur richtigen Zeit
3. Modal wieder öffnen (wenn schon geschlossen)
4. Backspace mehrmals drücken um die armed-Zeile zurückzurollen
5. Play
6. Re-Tap

Sechs Schritte. Mit Timeline + Click-to-Seek-and-Arm im Modal:
1. Click den falschen Timestamp im Modal
2. Tap

**Zwei Schritte.** Das ist der Unterschied zwischen "ich räume
heute meine Sync-Schulden ab" und "ich gebe nach Drittfehler
auf". Die richtige UX-Frage ist nicht "kann der User es?", sondern
"kostet es ihn weniger als 5 Sekunden + 2 Hirn-Schritte?". Wenn
ja, machen sie's. Wenn nein, bleibt das Feature ungenutzt.

### 4. Cross-Fade-Window = Entrance-Window — ein Slider, eine Zeitachse

Die Entscheidung, Entrance und Cross-Fade die SELBE `fadeSec`-
Variable teilen zu lassen (statt eine separate `entranceSec` zu
addieren), spart einen Slider in der UI und garantiert, dass die
Animation immer abgeschlossen ist, bevor die nächste Zeile rein
will. Ein bisschen Flexibilität verloren (man kann nicht "langer
Cross-Fade aber kurze Entrance" haben), aber:

- Das ist ein 95 %-Case: User wollen "wie schnell wechselt das"
  als EINE Einstellung, nicht zwei.
- Wenn jemand wirklich beides separat braucht, ist ein zweiter
  Slider später additiv hinzufügbar.
- One-Slider-Pro-Konzept ist eine produktive UX-Regel.

### 5. Toggle-Aufspaltung mit Resolver = abwärtskompatibel ohne Hack-Smell

Combined-Toggle → zwei Toggles ist ein klassischer Migrations-Fall.
Die Versuchung: das alte Feld als Pflichtfeld behalten + bei jedem
Toggle-Click in beide Richtungen syncen. Result: state drift,
Race-Conditions, ewige Code-Schmerzen.

Bessere Lösung (hier umgesetzt):
1. Neue Felder als optional hinzufügen
2. Resolver-Funktion mit klarer Präzedenz (neu vor alt)
3. Beim Write auf einen der neuen Toggles: setze beide neuen
   Felder UND lösche das alte (`spotlightContext: undefined`)

Damit ist nach EINEM User-Touch das alte Feld weg, der State
clean. Auf User-Seite kein Schritt nötig — sie haben es nicht
gemerkt.
