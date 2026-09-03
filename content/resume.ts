import type { Discipline } from "@/types";

export const PROFILE = {
  name: "Marcel Felder",
  title: "Structural · Signal · Software",
  location: "Deutschland",
  summary:
    "Bauingenieur, Tontechniker und Fullstack-Entwickler. Drei Disziplinen, ein Prinzip: erst das Modell verstehen, dann das Interface bauen.",
} as const;

export const DISCIPLINES: Discipline[] = [
  {
    id: "structure",
    label: "Structure",
    caption: "Bauingenieurwesen",
    headline: "Tragwerke denken in Lastpfaden.",
    body: "Jedes System hat einen Weg, auf dem die Kraft nach unten wandert. Wer ihn kennt, weiss vorher, wo es bricht — im Fachwerk wie in der Architektur einer Anwendung.",
    metrics: [
      { label: "Methodik", value: "FEM / Nachweisführung" },
      { label: "Werkzeug", value: "AutoCAD · Revit" },
      { label: "Übertrag", value: "Systemdenken" },
    ],
  },
  {
    id: "signal",
    label: "Signal",
    caption: "Audio Engineering",
    headline: "Klang ist eine messbare Größe.",
    body: "Gain-Staging, Filterbänke, FFT-Analyse. Was im Studio nach Gefühl klingt, ist unter der Haube ein Signalgraph mit Knoten und Übertragungsfunktionen — exakt wie dieser hier.",
    metrics: [
      { label: "Domäne", value: "DSP / Web Audio API" },
      { label: "Analyse", value: "512-pt FFT" },
      { label: "Übertrag", value: "Echtzeit-Denken" },
    ],
  },
  {
    id: "code",
    label: "Code",
    caption: "Fullstack Development",
    headline: "Interfaces sind gebaute Systeme.",
    body: "Next.js 15 App Router, React Server Components, Supabase Realtime, Edge-Deployment. Struktur aus dem Ingenieurwesen, Timing aus der Tontechnik, ausgeliefert im Browser.",
    metrics: [
      { label: "Stack", value: "Next.js · TypeScript" },
      { label: "Daten", value: "Supabase / Postgres" },
      { label: "Hosting", value: "Vercel Edge" },
    ],
  },
];

export const STACK = [
  { group: "Framework", items: ["Next.js 15", "React 19", "TypeScript"] },
  { group: "3D & Motion", items: ["Three.js", "React Three Fiber", "Framer Motion"] },
  { group: "Audio", items: ["Web Audio API", "BiquadFilter", "AnalyserNode"] },
  { group: "Backend", items: ["Supabase", "PostgreSQL", "Realtime"] },
  { group: "Delivery", items: ["Vercel Edge", "Tailwind v4", "Shadcn UI"] },
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
