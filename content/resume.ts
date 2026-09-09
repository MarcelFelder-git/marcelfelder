import type { Chapter } from "@/types";

export const PROFILE = {
  name: "Marcel Felder",
  title: "Structural · Signal · Software",
  claim: "Ich baue Systeme, die man hören kann.",
  summary:
    "Frontend-Entwickler mit React, Next.js und TypeScript, auf dem Weg zum Fullstack. Davor dreizehn Jahre Tontechnik und sechseinhalb Jahre Bauingenieurwesen. In allen drei Feldern geht es um dieselbe Frage: wie ist das gebaut, und was passiert, wenn es belastet wird.",
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
    body: "Jedes System hat einen Weg, auf dem die Kraft nach unten wandert. Wer ihn kennt, weiß vorher, wo es bricht. Im Fachwerk ist das eine Stütze, in einer Anwendung ein Service, an dem alles hängt.",
    aside:
      "Das Modell im Hintergrund ist ein zweilagiges Raumfachwerk, allseitig gelagert. Der Mauszeiger bringt eine Einzellast auf. Die Stäbe färben sich aus ihrer tatsächlichen Längenänderung: cyan unter Druck, violett unter Zug.",
    skills: [
      "Statische Berechnungen",
      "Konstruktionspläne",
      "Bauanträge",
      "Tragwerksplanung",
      "Projektkoordination",
      "Kundenberatung",
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
    body: "Gain-Staging, Filterbänke, FFT-Analyse. Was im Studio nach Gefühl klingt, ist unter der Haube ein Signalgraph aus Knoten und Übertragungsfunktionen. So einer läuft hier gerade im Hintergrund.",
    aside:
      "Der Ton auf dieser Seite ist kein Sample. Drei leicht verstimmte Oszillatoren laufen durch einen Biquad-Tiefpass und einen Delay-Bus. Das Ringdiagramm liest die 512-Punkt-FFT desselben Graphen aus, und die Filterfrequenz färbt nebenbei das Licht der ganzen Seite.",
    skills: [
      "Mixing & Mastering",
      "Recording",
      "Live-Tontechnik",
      "Web Audio API",
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
    body: "Next.js 15 App Router, React Server Components, Edge-Deployment. Die Struktur habe ich aus dem Ingenieurwesen mitgebracht, das Gefühl für Timing aus der Tontechnik. Ausgeliefert wird es im Browser.",
    aside:
      "Diese Seite ist der Beleg. Keine UI-Bibliothek für das Layout, kein fertiges Theme, keine Animationsbibliothek für die 3D-Szene. Der Scrollfortschritt fährt die Kamera, und dieselben Gewichte blenden die Modelle ineinander.",
    skills: [
      "Next.js 15 / React 19",
      "TypeScript",
      "React Three Fiber",
      "GLSL-Shader",
      "Tailwind v4",
      "Edge Deployment",
    ],
    metrics: [
      { label: "Modelle im Speicher", value: 4, suffix: "" },
      // Gemessen, nicht behauptet: die Bildrate der Szene, die gerade
      // hinter diesem Text laeuft.
      { label: "Bildrate, gemessen", value: 60, suffix: " fps", live: "fps" },
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

/**
 * Das zweite Band: alles, was nicht aus der Entwicklung kommt.
 *
 * Die Eintraege decken sich mit dem Lebenslauf. Wer beides
 * nebeneinanderlegt, soll nichts finden, was nur hier steht.
 */
export const STACK_MARQUEE_B = [
  "Statische Berechnungen",
  "Konstruktionspläne",
  "Bauanträge",
  "Tragwerksplanung",
  "Mixing",
  "Mastering",
  "Recording",
  "Live-Tontechnik",
  "Signalfluss",
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

export interface VitaEntry {
  period: string;
  title: string;
  org: string;
  body: string;
  /**
   * Noch nicht ausgefuellt.
   *
   * Solche Eintraege werden nicht angezeigt. Das ist kein Komfort,
   * sondern Schutz: eine Zeile "Hochschule eintragen" auf einer Seite,
   * mit der man sich bewirbt, ist schlimmer als gar keine Vita. Sind
   * alle drei Eintraege Entwuerfe, faellt der ganze Abschnitt weg und
   * die Seite endet beim Kontakt.
   *
   * Zum Freischalten: Werte eintragen und `draft: true` loeschen.
   */
  draft?: boolean;
}

export const VITA: VitaEntry[] = [
  {
    period: "2008 bis 2011",
    title: "Audio Engineering",
    org: "Akademie Deutsche Pop",
    body: "Recording, Mixing, Mastering, Songwriting.",
  },
  {
    period: "2010 bis 2023",
    title: "Musik und Tontechnik",
    org: "freiberuflich",
    body: "Produktion, Live-Tontechnik, Tourplanung. Dreizehn Jahre lang Projekte, die zu einem festen Termin fertig sein mussten.",
  },
  {
    period: "2014 bis 2022",
    title: "Bauingenieurwesen",
    org: "BHT Berlin und Ingenieurbüro",
    body: "Studium ohne Abschluss, sechseinhalb Jahre im Büro: Statik, Konstruktionspläne, Bauanträge, Projektkoordination.",
  },
  {
    period: "2024 bis 2025",
    title: "Frontend-Entwicklung",
    org: "Weiterbildung, cimData Berlin",
    body: "Neun Monate React, Next.js, TypeScript und Barrierefreiheit. Abgeschlossen im August 2025.",
  },
];

/** Wird vom Terminal-Befehl `cat resume` ausgegeben. */
export const RESUME_LINES = [
  "MARCEL FELDER · Frontend-Entwickler · Köln",
  "",
  "ENTWICKLUNG    React, Next.js, TypeScript, React Three Fiber",
  "               Python, PostgreSQL, Prisma, AWS-Grundlagen",
  "TONTECHNIK     Mixing, Mastering, Recording, Web Audio API",
  "BAUWESEN       Statik, Konstruktionsplaene, Bauantraege",
  "",
  "Erst das Modell verstehen, dann die Oberfläche bauen.",
];
