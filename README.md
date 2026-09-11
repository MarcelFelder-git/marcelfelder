# marcelfelder

Portfolio von Marcel Felder, Frontend-Entwickler (React, Next.js,
TypeScript). Davor dreizehn Jahre Tontechnik und sechseinhalb Jahre
Bauingenieurwesen. Die Seite ist selbst das erste Projekt: eine
scrollgetriebene 3D-Szene, eine eigene Audio-Engine, kein UI-Kit.

## Schnellstart

```bash
npm install
```

```bash
npm run dev
```

Läuft auf http://localhost:3000. Für die Produktion `npm run build`, wobei
der Dev-Server dabei nicht laufen sollte: beide schreiben in `.next`.

## Was drin steckt

| Bereich | Umsetzung |
| --- | --- |
| Framework | Next.js 15 App Router, React 19, TypeScript, Turbopack |
| Styling | Tailwind v4, Design-Tokens in `@theme`, keine Config-Datei |
| 3D | Three.js über React Three Fiber 9, PBR mit selbstgebauter Lichtumgebung, eigene GLSL-Einschübe |
| Postprocessing | Bloom, Chromatic Aberration, Vignette auf einem opaken Canvas |
| Audio | Web Audio API: drei Oszillatoren, Biquad-Tiefpass, Delay-Bus, 512-Punkt-FFT |
| State | Zustand für alles, was ein Re-Render braucht; ein mutierbares Modul für alles, was pro Frame läuft |
| Motion | Framer Motion für den DOM, `useFrame` für die Szene |

## Aufbau der Seite

1. **Hero.** Ein Abhängigkeitsgraph aus 58 Knoten, mit Licht, das durch die
   Leitungen läuft. Drei Tiefenebenen und Luftperspektive, damit ein Körper
   im Raum steht und kein Diagramm.
2. **Projekte.** Sechs Projekte als Fahrt durch einen Korridor. Jedes hängt
   als Gerät an der Wand, Monitor für Desktop-Apps, Telefon für Mobile,
   mit wechselnden Screenshots. Danach ein Register mit allen Links.
3. **Profil.** Fundament, Werdegang, Stack. Dann drei Kapitel mit je einem
   Modell: eine Komponenten-Matrix mit Compile-Sweep, eine Chladni-Platte
   mit Sand, der sich auf den Knotenlinien sammelt, und ein Raumfachwerk,
   das unter der Maus nachgibt.
4. **Kontakt.** Mail, Standort, GitHub, LinkedIn.

## Wie die Szene gesteuert wird

`ScrollDriver` misst pro Frame, wie viel jeder Abschnitt vom Bildschirm
einnimmt, normalisiert das zu Gewichten und dämpft sie. Die Gewichte
liegen in `lib/scene/state.ts` als mutierbares Objekt, nicht als
React-State: sie ändern sich in jedem Frame, und ein `setState` pro Frame
würde den ganzen Baum durchrendern.

Alle Modelle sind gleichzeitig montiert. Jedes liest sein Gewicht in
`useFrame` und blendet sich darüber ein; jedes hat eine eigene Richtung,
aus der es hereinkommt (`lib/scene/entry.ts`), damit sich zwei Modelle im
Übergang nicht am Ursprung durchdringen. Dieselben Gewichte mischen die
Kamerastationen (`Rig`) und das Farbklima (`lib/scene/palette.ts`), das
als CSS-Variable auch die Textkästen erreicht.

Alle Tempo-Regler liegen in `lib/scene/pacing.ts`.

## Warum das Postprocessing auf einem opaken Canvas läuft

Der EffectComposer reicht bei einem transparenten Canvas kein Alpha durch
und legt den Bloom als grauen Schleier über die ganze Seite. Der Canvas
ist deshalb opak, und die Szene malt ihren eigenen Grund. Was wie ein
Hintergrund aussieht, ist die Szene selbst.

## Audio-Engine

```
3× Oscillator (verstimmt) → voiceGain → BiquadFilter (LP) ─┬→ masterGain
                                                            └→ Delay ⟲ Feedback → wet ─┘
                                         masterGain → AnalyserNode → Destination
```

Der `AudioContext` entsteht erst bei der ersten Geste. Alle Fader sind auf
0..1 normalisiert, das Mapping auf Hz, Q und Cent liegt in der Engine.
Die Steuerung sitzt nur im Klang-Kapitel, dort, wo man die Wirkung sieht:
die FFT lenkt die Platte aus, der Pegel färbt das Licht der Seite.

## Befehlspalette

`Strg K` (Mac: `⌘ K`) oder Klick auf den Hinweis oben rechts. Navigation zu
allen Abschnitten, Audio starten und stoppen, `cat resume`, `ls projects`,
`view stack`, `copy email`, `open github`, `open linkedin`.

## Projektstruktur

```
app/                 Layout, Seite, Vorschaubild, Icon, robots, sitemap, /api/profile
assets/fonts/        Space Grotesk Bold fuer Vorschaubild und Icon (OFL)
components/
  canvas/            Alles im <Canvas>: Szene, Rig, ScrollDriver, modes/
  sections/          Hero, Showcase (Tunnel), Manifest (Profil), ChapterSection, Closing
  audio/             Mischpult, Fader, Spektrum, Ambient-Glow
  terminal/          Befehlspalette
  layout/            HUD, Register, Boot-Sequenz
  motion/            Reveal, SplitHeading, Scramble, Counter, Parallax, Marquee
  projects/          Live-Vorschau der Projekte
content/             Projekte, Lebenslauf, Kontakt. Typisiert, nichts erfunden.
lib/
  audio/engine.ts    Der Web-Audio-Graph
  scene/             Gewichte, Tempo, Palette, Tunnelgeometrie, Eintrittsrichtungen
  store/             Zustand-Stores
scripts/             Kontrastpruefung gegen WCAG AA
```

Zwei Regeln, die das Bundle klein halten: `lib/scene/*` importiert nie
three, und alles aus `components/canvas/` hängt hinter einem dynamischen
Import. First Load JS liegt bei rund 215 kB, die 3D-Kette lädt danach.

## Barrierefreiheit

`prefers-reduced-motion` stellt die Szene still und die Animationen ab.
Alle Textfarben sind gegen alle Szenengründe gemessen
(`node scripts/check-contrast.mjs`), schwächste Paarung 4,6:1. Das
Register sind echte Sprungmarken, die Fader native `<input type="range">`,
ein Skip-Link führt am 3D-Bereich vorbei.

## Deployment

Vercel, ohne Umgebungsvariablen. Vorschaubild, Sitemap und kanonische
Adresse leiten sich aus `VERCEL_PROJECT_PRODUCTION_URL` ab;
`NEXT_PUBLIC_SITE_URL` sticht das, falls eine eigene Domain dazukommt.

## Entstehung

Gebaut im Pair-Programming mit Claude Code. Die Architektur, die Inhalte
und jede Entscheidung, was auf die Seite gehört und was nicht, sind von
mir; Inhalte stammen aus den Repositories und dem Lebenslauf, nichts ist
erfunden.
