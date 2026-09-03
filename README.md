# Flagship Portfolio — Structure · Signal · Code

Interaktives Engineering-Portfolio an der Schnittstelle von Bauingenieurwesen,
Tontechnik und Fullstack-Entwicklung.

Die Seite ist **scrollgetrieben**: eine einzige 3D-Szene liegt vollflächig
hinter dem Inhalt und wechselt beim Scrollen zwischen drei Modellen, während
der Scrollfortschritt die Kamera um die Szene fährt. Es gibt keine Umschalter
und keine 3D-Kachel neben dem Text — der Hintergrund *ist* die Erzählung.

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
| 3D | Three.js + React Three Fiber 9, eigene GLSL-Shader (kein Postprocessing) |
| Audio | Native Web Audio API — Oszillatoren, BiquadFilter, Delay-Bus, Analyser |
| State | Zustand (zwei Stores), bewusst kein Context |
| Motion | Framer Motion — Split-Headings, Scroll-Reveals, Parallax, Marquee |

## Wie die Szene gesteuert wird

`ScrollDriver` misst in einem einzigen rAF-Loop, wie nah die Mitte jedes
Kapitels an der Bildschirmmitte liegt, und schreibt daraus Gewichte nach
`lib/scene/state.ts`. Alle drei Modelle sind gleichzeitig montiert; jedes
liest sein Gewicht in `useFrame` und blendet sich darüber ein oder aus. Während
eines Übergangs sind zwei Modelle gleichzeitig halb sichtbar — der Wechsel
liest sich als Umbau, nicht als Schnitt. Dieselben Gewichte mischen auch die
Kamerastationen, damit Geometrie und Blickwinkel eine Bewegung sind.

Der State ist bewusst ein mutierbares Modul-Objekt statt React-State: die
Werte ändern sich in jedem Frame, und ein `setState` pro Frame würde den
gesamten Komponentenbaum durchrendern. Dasselbe Prinzip an drei weiteren
Stellen — Fortschrittsbalken, Scroll-Readout und die audio-reaktive
UI-Beleuchtung schreiben direkt in CSS-Custom-Properties.

## Die drei Modelle

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

## Kein Postprocessing

Der Bloom-Pass aus `@react-three/postprocessing` ist bewusst entfernt: bei
einem transparenten Canvas reicht der EffectComposer kein Alpha durch und legt
seinen Halo als grauen Schleier über die gesamte Fläche. In einer kleinen
Kachel fällt das nicht auf, vollflächig ruiniert es die Seite. Das Leuchten
kommt stattdessen aus den Farben selbst — ungetonte Basismaterialien auf fast
schwarzem Grund.

## Projektstruktur

```
app/                 Routen, Root-Layout, globals.css (Design-System)
components/
  canvas/            Alles innerhalb von <Canvas> plus ScrollDriver
  motion/            Reveal, SplitHeading, Scramble, Counter, Parallax, Marquee
  audio/             Mischpult, Fader, Analyzer, Ambient-Glow
  terminal/          Command Palette
  sections/          Hero, Manifest, ChapterSection, Capabilities, Closing
  layout/            HUD, Reticle, Boot-Sequenz
lib/
  audio/engine.ts    Der Web-Audio-Graph (Singleton)
  scene/state.ts     Scrollfortschritt und Kapitelgewichte (kein React-State)
  store/             Zustand-Stores für aktives Kapitel und Audio
content/             Texte, Kapitel, Kennzahlen, Vita — typisiert
```

Leitregel: `components/canvas/` ist eine Insel. Nichts darin importiert
React-DOM-Komponenten, nichts außerhalb importiert Three.js direkt. Der
einzige Draht zwischen beiden Welten sind die Zustand-Stores.

## Barrierefreiheit

`prefers-reduced-motion` friert die Szene auf einen statischen Frame ein und
stellt CSS-Animationen ab. Die Fader sind native `<input type="range">` mit
vertikalem `writing-mode` — Tastatursteuerung und ARIA-Werte bleiben erhalten.
Ein Skip-Link führt am 3D-Bereich vorbei.

## Offen — muss von Marcel gefüllt werden

- **`VITA` in `content/resume.ts`** ist ein Platzhalter: Jahreszahlen,
  Hochschule und Stationen stehen dort wörtlich als „eintragen". Ich habe
  bewusst keine Biografie erfunden.
- **Kontaktadresse und Social-Links** in `content/site.ts` sind Platzhalter
  (`mail@marcelfelder.dev` existiert nicht).
- Case Studies (`/work/[slug]`) und Component Playground (`/playground`)
