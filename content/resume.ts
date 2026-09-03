import type { Chapter } from "@/types";

export const PROFILE = {
  name: "Marcel Felder",
  title: "Structural · Signal · Software",
  claim: "Ich baue Systeme, die man hören kann.",
  summary:
    "Bauingenieur, Tontechniker und Fullstack-Entwickler. Drei Disziplinen, ein Prinzip: erst das Modell verstehen, dann das Interface bauen.",
} as const;

/**
 * Das Manifest wird zeilenweise beim Scrollen aufgedeckt. Kurze Zeilen sind
 * Absicht - jede bekommt ihren eigenen Moment.
 */
export const MANIFEST = [
  { text: "Ein Tragwerk", accent: false },
  { text: "und ein Signalgraph", accent: false },
  { text: "sind dasselbe Problem:", accent: true },
  { text: "Wo geht die Energie hin,", accent: false },
  { text: "und was hält dem stand?", accent: true },
] as const;

export const CHAPTERS: Chapter[] = [
  {
    id: "structure",
    index: "03",
    label: "Structure",
    caption: "Bauingenieurwesen",
    headline: "Tragwerke denken in Lastpfaden.",
    body: "Jedes System hat einen Weg, auf dem die Kraft nach unten wandert. Wer ihn kennt, weiß vorher, wo es bricht — im Fachwerk genauso wie in der Architektur einer Anwendung.",
    aside:
      "Das Modell rechts ist ein zweilagiges Raumfachwerk, allseitig gelagert. Der Cursor bringt eine Einzellast auf; die Stäbe färben sich aus ihrer tatsächlichen Längenänderung: cyan unter Druck, violett unter Zug.",
    skills: [
      "Tragwerksplanung",
      "FEM-Modellierung",
      "Nachweisführung",
      "CAD / BIM",
      "Lastannahmen",
      "Bauablaufplanung",
    ],
    metrics: [
      { label: "Knoten im Modell", value: 100, suffix: "" },
      { label: "Stäbe", value: 476, suffix: "" },
      { label: "Auflagerung", value: 4, suffix: "-seitig" },
    ],
  },
  {
    id: "signal",
    index: "02",
    label: "Signal",
    caption: "Tontechnik",
    headline: "Klang ist eine messbare Größe.",
    body: "Gain-Staging, Filterbänke, FFT-Analyse. Was im Studio nach Gefühl klingt, ist unter der Haube ein Signalgraph mit Knoten und Übertragungsfunktionen — exakt wie der hier.",
    aside:
      "Der Ton auf dieser Seite ist kein Sample. Drei verstimmte Oszillatoren laufen durch einen Biquad-Tiefpass und einen Delay-Bus; das Ringdiagramm liest direkt die 512-Punkt-FFT desselben Graphen aus. Die Filterfrequenz steuert nebenbei die Farbe der ganzen Seite.",
    skills: [
      "Mixing & Mastering",
      "Web Audio API",
      "DSP-Grundlagen",
      "Filterdesign",
      "Spektralanalyse",
      "Signalfluss & Routing",
    ],
    metrics: [
      { label: "FFT-Auflösung", value: 512, suffix: " pt" },
      { label: "Oszillatoren", value: 3, suffix: "" },
      { label: "Latenz bis Bild", value: 1, suffix: " Frame" },
    ],
  },
  {
    id: "code",
    index: "01",
    label: "Code",
    caption: "Entwicklung",
    headline: "Interfaces sind gebaute Systeme.",
    body: "Next.js 15 App Router, React Server Components, Edge-Deployment. Struktur aus dem Ingenieurwesen, Timing aus der Tontechnik, ausgeliefert im Browser.",
    aside:
      "Diese Seite ist der Beleg. Keine UI-Bibliothek für das Layout, keine Animationsbibliothek für die 3D-Szene, kein fertiges Theme. Der Scrollfortschritt fährt die Kamera, die Kapitelgewichte blenden die Modelle ineinander.",
    skills: [
      "Next.js 15 / React 19",
      "TypeScript",
      "React Three Fiber",
      "GLSL-Shader",
      "Tailwind v4",
      "Edge Deployment",
    ],
    metrics: [
      { label: "Modelle im Speicher", value: 3, suffix: "" },
      { label: "Ziel-Framerate", value: 60, suffix: " fps" },
      { label: "Draw Calls je Modell", value: 4, suffix: "" },
    ],
  },
];

export const STACK_MARQUEE = [
  "Next.js 15",
  "React 19",
  "TypeScript",
  "Three.js",
  "React Three Fiber",
  "GLSL",
  "Web Audio API",
  "Tailwind v4",
  "Framer Motion",
  "Zustand",
  "Vercel Edge",
] as const;

export const STACK_MARQUEE_B = [
  "FEM",
  "AutoCAD",
  "Revit",
  "Nachweisführung",
  "Mixing",
  "Mastering",
  "DSP",
  "Signalfluss",
  "Tragwerksplanung",
  "Akustik",
] as const;

/**
 * Kennzahlen ueber DIESE Seite - nachpruefbar, statt erfundener
 * Berufsjahre. Wer den Quelltext aufmacht, findet jede davon wieder.
 */
export const SYSTEM_SPECS = [
  {
    value: 3,
    suffix: "",
    label: "Disziplinen",
    note: "in einem Szenengraphen zusammengeführt",
  },
  {
    value: 512,
    suffix: " pt",
    label: "FFT-Auflösung",
    note: "live aus dem AnalyserNode gelesen",
  },
  {
    value: 476,
    suffix: "",
    label: "Stäbe im Tragwerk",
    note: "jeder Frame neu aufgebaut und eingefärbt",
  },
  {
    value: 0,
    suffix: "",
    label: "UI-Bibliotheken",
    note: "Layout und Komponenten sind handgeschrieben",
  },
] as const;

/**
 * PLATZHALTER — hier gehoert Marcels echte Vita hin.
 * Struktur steht, Inhalte muessen ersetzt werden.
 */
export const VITA = [
  {
    period: "Jahr — Jahr",
    title: "Bauingenieurwesen",
    org: "Hochschule eintragen",
    body: "Schwerpunkt eintragen. Diese Einträge sind Platzhalter und müssen durch die echte Vita ersetzt werden.",
  },
  {
    period: "Jahr — Jahr",
    title: "Tontechnik",
    org: "Ausbildung / Station eintragen",
    body: "Stationen, Projekte, Genres eintragen.",
  },
  {
    period: "Jahr — heute",
    title: "Fullstack-Entwicklung",
    org: "Kontext eintragen",
    body: "Projekte und Schwerpunkte eintragen.",
  },
] as const;

/** Wird vom Terminal-Befehl `cat resume` ausgegeben. */
export const RESUME_LINES = [
  "MARCEL FELDER — Structural · Signal · Software",
  "",
  "BAUINGENIEURWESEN     Tragwerksplanung, FEM, Nachweisführung, CAD",
  "TONTECHNIK            Mixing, DSP, Web Audio API, Signalanalyse",
  "ENTWICKLUNG           Next.js, TypeScript, React Three Fiber, Supabase",
  "",
  "Prinzip: erst das Modell verstehen, dann das Interface bauen.",
];
