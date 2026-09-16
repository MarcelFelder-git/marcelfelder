/**
 * Alle Beschriftungen der Oberflaeche, in beiden Sprachen.
 *
 * Alles, was kein Inhalt ist, sondern Bedienung: Knoepfe, Register,
 * Beschriftungen, Hinweise der Palette, Metadaten. Inhalte (Projekte,
 * Kapitel, Werdegang) liegen in projects.ts und resume*.ts.
 *
 * Das deutsche Objekt ist die Vorlage; das englische muss dieselbe Form
 * haben, sonst meckert der Compiler. So kann kein Text in einer Sprache
 * fehlen.
 *
 * Englisch bewusst locker: "See the projects", nicht "View projects".
 * Die Seite duzt auch auf Deutsch.
 */
const de = {
  meta: {
    title: "Marcel Felder · Frontend-Entwickler (React, Next.js, TypeScript)",
    description:
      "Frontend-Entwickler aus Köln, auf dem Weg zum Fullstack. Sechs gebaute Projekte mit Live-Deployment und Quellcode, dazu dreizehn Jahre Tontechnik und sechseinhalb Jahre Bauingenieurwesen als Fundament.",
    ogDescription:
      "Sechs gebaute Projekte mit Live-Deployment und Quellcode. Diese Seite: Next.js 15, TypeScript, React Three Fiber, ohne UI-Bibliothek und ohne fertiges Theme.",
    ogAlt:
      "Marcel Felder, Frontend-Entwickler. Sechs gebaute Projekte mit Live-Deployment und Quellcode.",
    ogSub:
      "Frontend-Entwickler mit React, Next.js und TypeScript. Vorher dreizehn Jahre Tontechnik und sechseinhalb Jahre Bauingenieurwesen.",
    ogCity: "Köln",
  },
  nav: {
    start: "Start",
    projects: "Projekte",
    profile: "Profil",
    contact: "Kontakt",
    railLabel: "Seitenregister",
    paletteOpen: "Befehlspalette öffnen",
    scroll: "SCROLL",
    switchTo: "English version",
    switchShort: "EN",
  },
  hero: {
    // Der Eyebrow ist der Beweis: das, was ein Recruiter zuerst sucht,
    // klein und sachlich ueber dem Namen.
    eyebrow: "Sechs Projekte · alle live · alle mit Quellcode",
    cta: "Projekte ansehen",
    cv: "Lebenslauf",
    footLeft: "Scrollen bewegt die Kamera",
    footRight: ["Signale laufen", "durch den Graphen"],
    highlight: ["Felder"],
  },
  showcase: {
    label: "Projekte",
    count: (n: string) => `${n} Stück · alle im Repo`,
    heading: "Gebaut, deployt, nachlesbar.",
    highlight: "nachlesbar",
    sub: "Scrollen fährt durch den Korridor. Jedes Gerät an der Wand ist ein Projekt.",
    subReduced: "Jede Karte verlinkt Live-Deployment und Quellcode.",
    station: "Station",
    arrived: "angekommen",
    register: "Register, alle Projekte",
    live: "Live-Vorschau",
    source: "Quellcode",
    noDeploy: "kein öffentliches Deployment",
    ai: "Entstanden im KI-Pair-Programming, Architektur von mir",
    hoverLoop: "Hover für Loop",
    videoAlt: "Videovorschau: ",
  },
  manifest: {
    threshold: "Fundament",
    track: "Werdegang",
    since: "2008 bis heute",
  },
  closing: {
    threshold: "Kontakt",
    heading: "Reden wir über das nächste System.",
    highlight: ["System."],
    location: "Standort",
    available: "Verfügbar",
    cv: "Lebenslauf (PDF)",
    top: "Zurück nach oben",
    footer:
      "Gebaut mit Next.js, Three.js und der Web Audio API, im Pair-Programming mit Claude Code.",
  },
  audio: {
    start: "Audio starten",
    running: "Engine läuft",
    off: "Ton aus",
    mixer: "Mixer",
  },
  preview: {
    newTab: "Neuer Tab",
    loading: "Deployment wird geladen…",
    note: "Fremde Seite in einem Rahmen. Escape schließt, „Neuer Tab“ öffnet sie richtig.",
    aria: "Live-Vorschau: ",
    desktop: "Desktop-Breite",
    mobile: "Mobile Breite",
    close: "Vorschau schließen",
    iframe: "Live-Vorschau von ",
  },
  palette: {
    placeholder: "Befehl eingeben…",
    notFound: "command not found",
    escBack: "Escape für zurück",
    groups: { nav: "Navigation", audio: "Audio", system: "System" },
    hints: {
      start: "Zum Anfang",
      projects: "Sechs Projekte, Fahrt durch den Korridor",
      profile: "Fundament, Werdegang, Stack",
      code: "Kapitel 01 · Komponenten-Matrix",
      signal: "Kapitel 02 · Chladni-Platte",
      structure: "Kapitel 03 · Raumfachwerk",
      contact: "Zum Kontakt",
      play: "Engine starten und zur Platte springen",
      stop: "Engine anhalten",
      resume: "Kurzprofil ausgeben",
      projectsList: "Alle Projekte mit Live-Adresse",
      stack: "Technologie-Stack ausgeben",
      chapters: "Kapitelübersicht",
      cv: "Lebenslauf als PDF",
      email: "Kontaktadresse kopieren",
      open: (label: string) => `${label} in neuem Tab`,
    },
  },
};

export type UI = typeof de;

const en: UI = {
  meta: {
    title: "Marcel Felder · Frontend Developer (React, Next.js, TypeScript)",
    description:
      "Frontend developer from Cologne, heading towards fullstack. Six built projects, all live with source code, on top of thirteen years of audio engineering and six and a half years of structural engineering.",
    ogDescription:
      "Six built projects, all live with source code. This page: Next.js 15, TypeScript, React Three Fiber, no UI library, no ready-made theme.",
    ogAlt:
      "Marcel Felder, frontend developer. Six built projects, all live with source code.",
    ogSub:
      "Frontend developer working with React, Next.js and TypeScript. Before that: thirteen years of audio engineering and six and a half of structural engineering.",
    ogCity: "Cologne",
  },
  nav: {
    start: "Start",
    projects: "Projects",
    profile: "Profile",
    contact: "Contact",
    railLabel: "Page index",
    paletteOpen: "Open command palette",
    scroll: "SCROLL",
    switchTo: "Deutsche Fassung",
    switchShort: "DE",
  },
  hero: {
    eyebrow: "Six projects · all live · all with source code",
    cta: "See the projects",
    cv: "CV",
    footLeft: "Scrolling moves the camera",
    footRight: ["Signals travel", "through the graph"],
    highlight: ["Felder"],
  },
  showcase: {
    label: "Projects",
    count: (n: string) => `${n} of them · all on GitHub`,
    heading: "Built, deployed, readable.",
    highlight: "readable",
    sub: "Scrolling takes you down the corridor. Every device on the wall is a project.",
    subReduced: "Every card links to the live deployment and the source.",
    station: "Station",
    arrived: "arrived",
    register: "Index, all projects",
    live: "Live preview",
    source: "Source code",
    noDeploy: "no public deployment",
    ai: "Built pair-programming with AI, architecture is mine",
    hoverLoop: "Hover for loop",
    videoAlt: "Video preview: ",
  },
  manifest: {
    threshold: "Foundation",
    track: "Background",
    since: "2008 to now",
  },
  closing: {
    threshold: "Contact",
    heading: "Let's talk about the next system.",
    highlight: ["system."],
    location: "Based in",
    available: "Available",
    cv: "CV (PDF)",
    top: "Back to top",
    footer:
      "Built with Next.js, Three.js and the Web Audio API, pair-programming with Claude Code.",
  },
  audio: {
    start: "Start audio",
    running: "Engine running",
    off: "Sound off",
    mixer: "Mixer",
  },
  preview: {
    newTab: "New tab",
    loading: "Loading deployment…",
    note: "Someone else's site in a frame. Escape closes it, “New tab” opens it properly.",
    aria: "Live preview: ",
    desktop: "Desktop width",
    mobile: "Mobile width",
    close: "Close preview",
    iframe: "Live preview of ",
  },
  palette: {
    placeholder: "Type a command…",
    notFound: "command not found",
    escBack: "Escape to go back",
    groups: { nav: "Navigation", audio: "Audio", system: "System" },
    hints: {
      start: "Back to the top",
      projects: "Six projects, a ride down the corridor",
      profile: "Foundation, background, stack",
      code: "Chapter 01 · component matrix",
      signal: "Chapter 02 · Chladni plate",
      structure: "Chapter 03 · space frame",
      contact: "To the contact section",
      play: "Start the engine and jump to the plate",
      stop: "Stop the engine",
      resume: "Print the short profile",
      projectsList: "All projects with live URLs",
      stack: "Print the tech stack",
      chapters: "Chapter overview",
      cv: "CV as PDF",
      email: "Copy the email address",
      open: (label: string) => `${label} in a new tab`,
    },
  },
};

export const UI_TEXT: Record<"de" | "en", UI> = { de, en };
