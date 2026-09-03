# Flagship Portfolio — Structure · Signal · Code

Interaktives Engineering-Portfolio an der Schnittstelle von Bauingenieurwesen,
Tontechnik und Fullstack-Entwicklung. Ein 3D-Viewport erzählt alle drei
Disziplinen über denselben Körper, gespeist aus einem echten Web-Audio-Graphen.

## Schnellstart

```bash
npm install
```

```bash
npm run dev
```

Läuft auf http://localhost:3100 (Port in `package.json` bzw. `.claude/launch.json`).

## Was drin steckt

| Bereich | Umsetzung |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript, Turbopack |
| Styling | Tailwind v4 (Design-Tokens in `@theme`, keine `tailwind.config.ts`) |
| 3D | Three.js + React Three Fiber 9, `@react-three/postprocessing` (Bloom) |
| Audio | Native Web Audio API — Oszillatoren, BiquadFilter, Delay-Bus, Analyser |
| State | Zustand (zwei Stores), bewusst kein Context |
| Backend | Supabase (Postgres + Realtime) für das Gästebuch |

## Die drei Viewport-Modi

**Structure** — Ein zweilagiges Raumfachwerk, allseitig gelagert. Der Cursor
bringt eine Einzellast auf; die Durchbiegung folgt einer Einflussfunktion
(Gauß-Glocke × Auflager-Maske) statt einer FEM-Rechnung. Die Stäbe werden
anschließend aus ihrer tatsächlichen Längenänderung eingefärbt: Verkürzung =
Druck (cyan), Verlängerung = Zug (violett).

**Signal** — Drei konzentrische Ringe aus `InstancedMesh`-Balken, gespeist aus
der 512-Punkt-FFT des `AnalyserNode`. Die Frequenz läuft über den *Winkel*,
nicht über die Ringe — sonst bekäme der innerste Ring alle Tiefen und die
äußeren blieben tot. Abgetastet wird nur bis ~3,8 kHz, weil der Tiefpass
darüber ohnehin dichtmacht.

**Code** — Drei gestaffelte Ebenen aus Token-Balken mit einem Compile-Sweep,
hinterlegt mit einer GLSL-Shader-Ebene (Raster, Sweep-Band, Scanlines).

## Audio-Engine

Signalfluss in `lib/audio/engine.ts`:

```
3× Oscillator (detuned) → voiceGain → BiquadFilter (LP) ─┬→ masterGain
                                                          └→ Delay ⟲ Feedback → wet ─┘
                                       masterGain → AnalyserNode → Destination
```

Der `AudioContext` entsteht erst bei der ersten User-Geste (Autoplay-Policy).
Alle fünf Fader sind auf 0..1 normalisiert; das Mapping auf Hz, Q und Cent
liegt in der Engine, nicht im UI.

Die Filterfrequenz steuert zusätzlich die UI-Beleuchtung: `AmbientGlow`
schreibt `--audio-glow` und `--audio-level` per rAF ins Root-Element — als
CSS-Custom-Property, nicht als React-State, weil ein `setState` pro Frame den
gesamten Baum durchrendern würde.

## Command Palette

`Cmd/Ctrl + K` öffnet ein Terminal mit `cat resume`, `view stack`,
`play audio`, `view signal`, `copy email` und Sprungzielen. Ausgaben landen in
einer Ausgabeansicht innerhalb der Palette; `Escape` führt zurück zur Liste.

## Gästebuch (Supabase)

Ohne Credentials läuft die Seite normal weiter, das Gästebuch zeigt einen
Offline-Zustand. Zum Aktivieren:

1. `.env.local.example` nach `.env.local` kopieren und ausfüllen
   (Supabase-Dashboard → Project Settings → API).
2. `supabase/migrations/0001_guestbook.sql` im SQL-Editor ausführen.

Der `anon`-Key ist bewusst öffentlich — abgesichert wird über Row Level
Security: lesen und einfügen für alle, kein `update`/`delete`.

## Projektstruktur

```
app/                 Routen, Root-Layout, globals.css (Design-System)
components/
  canvas/            Alles innerhalb von <Canvas> — importiert kein React-DOM
  audio/             Mischpult, Fader, Analyzer, Ambient-Glow
  terminal/          Command Palette
  guestbook/         Realtime-Feed und Formular
  sections/          Hero, Disziplinen
  layout/            TopBar
lib/
  audio/engine.ts    Der Web-Audio-Graph (Singleton)
  store/             Zustand-Stores für Viewport-Modus und Audio
  supabase/          Browser-Client mit Offline-Fallback
content/             Texte, Stack, Resume — typisiert
supabase/migrations/ SQL für das Gästebuch
```

Leitregel: `components/canvas/` ist eine Insel. Nichts darin importiert
React-DOM-Komponenten, nichts außerhalb importiert Three.js direkt. Der
einzige Draht zwischen beiden Welten sind die Zustand-Stores.

## Barrierefreiheit

`prefers-reduced-motion` friert die Szene auf einen statischen Frame ein und
stellt CSS-Animationen ab. Die Fader sind native `<input type="range">` mit
vertikalem `writing-mode` — Tastatursteuerung und ARIA-Werte bleiben erhalten.
Ein Skip-Link führt am 3D-Bereich vorbei.

## Offen

- Component Playground (`/playground`) und Case Studies (`/work/[slug]`)
- Supabase-Projekt anlegen und Migration ausführen
- Kontaktadresse und Social-Links in `content/site.ts` sind Platzhalter
