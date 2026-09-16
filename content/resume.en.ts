import type { Chapter } from "@/types";
import type { VitaEntry } from "./resume";

/**
 * Englische Fassung von resume.ts.
 *
 * Bewusst locker gehalten, kein Behoerdenenglisch: die Seite duzt auch
 * auf Deutsch, und ein Recruiter in London liest lieber "what holds up"
 * als "which withstands the applied loads". Zahlen, Daten und
 * Kennzahlen sind dieselben wie in der deutschen Fassung; wer hier
 * etwas aendert, aendert es dort auch.
 */

export const PROFILE_EN = {
  name: "Marcel Felder",
  title: "Structural · Signal · Software",
  claim: "I build systems you can hear.",
  summary:
    "Frontend developer working with React, Next.js and TypeScript, heading towards fullstack. Before that, thirteen years of audio engineering and six and a half years of structural engineering. All three fields come down to the same question: how is this built, and what happens when you put load on it?",
} as const;

export const MANIFEST_EN = [
  { text: "A load-bearing structure", accent: false },
  { text: "and a signal graph", accent: false },
  { text: "are the same problem:", accent: true },
  { text: "Where does the energy go,", accent: false },
  { text: "and what holds up?", accent: true },
] as const;

export const CHAPTERS_EN: Chapter[] = [
  {
    id: "structure",
    index: "03",
    label: "Structure",
    caption: "Structural engineering",
    headline: "Structures think in load paths.",
    body: "Every system has a path the force travels down. Know it, and you know where it breaks before it does. In a truss that's a column; in an app it's the one service everything hangs on.",
    aside:
      "The model in the background is a two-layer space frame, supported on all sides. The pointer applies a point load. The members take their colour from their actual change in length: cyan in compression, violet in tension.",
    skills: [
      "Structural analysis",
      "Construction drawings",
      "Building permits",
      "Structural design",
      "Project coordination",
      "Client consulting",
    ],
    metrics: [
      { label: "Nodes in the model", value: 100, suffix: "" },
      { label: "Members", value: 476, suffix: "" },
      { label: "Supported on", value: 4, suffix: " sides" },
    ],
  },
  {
    id: "signal",
    index: "02",
    label: "Signal",
    caption: "Audio engineering",
    headline: "Sound is something you can measure.",
    body: "Gain staging, filter banks, FFT analysis. What feels like instinct in the studio is, under the hood, a signal graph of nodes and transfer functions. One of those is running in the background right now.",
    aside:
      "The sound on this page isn't a sample. Three slightly detuned oscillators run through a biquad low-pass and a delay bus. The plate in the background is driven by the 512-point FFT of that same graph, computed point by point in the shader, and the sand on it gathers wherever the plate stands still. The filter frequency also tints the light of the whole page.",
    skills: [
      "Mixing & mastering",
      "Recording",
      "Live sound",
      "Web Audio API",
      "Spectral analysis",
      "Signal flow & routing",
    ],
    metrics: [
      { label: "FFT resolution", value: 512, suffix: " pt" },
      { label: "Oscillators", value: 3, suffix: "" },
      { label: "Latency to picture", value: 1, suffix: " frame" },
    ],
  },
  {
    id: "code",
    index: "01",
    label: "Code",
    caption: "Development",
    headline: "Interfaces are built systems.",
    body: "Next.js 15 App Router, React Server Components, edge deployment. The structure comes from engineering, the feel for timing from audio. It ships in the browser.",
    aside:
      "This page is the proof. No UI library for the layout, no ready-made theme, no animation library for the 3D scene. Scroll progress drives the camera, and the same weights blend the models into each other.",
    skills: [
      "Next.js 15 / React 19",
      "TypeScript",
      "React Three Fiber",
      "GLSL shaders",
      "Tailwind v4",
      "Edge deployment",
    ],
    metrics: [
      { label: "Models in memory", value: 4, suffix: "" },
      { label: "Frame rate, measured", value: 60, suffix: " fps", live: "fps" },
      { label: "Draw calls per model", value: 4, suffix: "" },
    ],
  },
];

export const STACK_MARQUEE_B_EN = [
  "Structural analysis",
  "Construction drawings",
  "Building permits",
  "Structural design",
  "Mixing",
  "Mastering",
  "Recording",
  "Live sound",
  "Signal flow",
  "Acoustics",
] as const;

export const VITA_EN: VitaEntry[] = [
  {
    period: "2008 to 2011",
    title: "Audio Engineering",
    org: "Akademie Deutsche Pop",
    body: "Recording, mixing, mastering, songwriting.",
  },
  {
    period: "2010 to 2023",
    title: "Music and audio engineering",
    org: "freelance",
    body: "Live and session musician, production, live sound, tour management. Thirteen years of projects that had to be done by a fixed date.",
  },
  {
    period: "2014 to 2022",
    title: "Structural engineering",
    org: "BHT Berlin and an engineering office",
    body: "Studied without finishing the degree, six and a half years in the office: structural analysis, construction drawings, building permits, project coordination.",
  },
  {
    period: "2024 to 2025",
    title: "Frontend development",
    org: "Bootcamp, cimData Berlin",
    body: "Nine months of React, Next.js, TypeScript and accessibility. Finished August 2025.",
  },
];

export const RESUME_LINES_EN = [
  "MARCEL FELDER · Frontend developer · Cologne",
  "",
  "DEVELOPMENT    React, Next.js, TypeScript, React Three Fiber",
  "               Python, PostgreSQL, Prisma, AWS basics",
  "AUDIO          Mixing, mastering, recording, Web Audio API",
  "STRUCTURAL     Statics, construction drawings, building permits",
  "",
  "Understand the model first, then build the surface.",
];
