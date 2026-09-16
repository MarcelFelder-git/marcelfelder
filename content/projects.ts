/**
 * Echte Projekte, Inhalte aus den jeweiligen Repositories übernommen
 * (README, package.json, Deployment-URL). Nichts hier ist erfunden — wo eine
 * Angabe fehlt, fehlt sie auch im Repo.
 *
 * Reihenfolge ist Absicht: Fullstack und Cloud zuerst, Spielereien zuletzt.
 * Ein Recruiter, der nach einem Entwickler sucht, liest die ersten zwei
 * Karten und sonst nichts.
 */

export interface ProjectMedia {
  /** Standbild, immer vorhanden — trägt die Karte auch ohne Video. */
  image: string;
  /**
   * Weitere Ansichten desselben Projekts. Im Tunnel wechselt die Tafel
   * zwischen ihnen durch — aber nur die eine, an der man gerade steht.
   *
   * Bewusst optional: ein Projekt mit einem einzigen guten Screenshot
   * bleibt stehen, statt zwischen einem starken und zwei schwachen Bildern
   * zu wechseln. Reihenfolge ist die Reihenfolge im Wechsel; `image` ist
   * immer das erste Bild und muss hier nicht wiederholt werden.
   */
  stills?: string[];
  /**
   * Bestimmt die Darstellung: "landscape" füllt den Rahmen randlos,
   * "portrait" wird eingepasst und zentriert. Ein Handy-Screenshot
   * randlos zu beschneiden zeigt nur einen Streifen aus der Mitte.
   */
  orientation: "landscape" | "portrait";
  /** Kurzer, stummer Loop. Startet erst bei Hover/Fokus, nie automatisch. */
  video?: { mp4: string; webm: string };
  alt: string;
}

export interface Project {
  id: string;
  index: string;
  title: string;
  /** Ein Satz, der das Produkt erklärt — nicht die Technik. */
  tagline: string;
  body: string;
  /** Der eine technisch interessante Punkt, der über "hab ich gebaut" hinausgeht. */
  detail: string;
  stack: string[];
  scope: string;
  year: string;
  links: { live?: string; repo: string };
  media: ProjectMedia;
  /** Marcel legt das in seinen READMEs selbst offen — hier konsistent dazu. */
  aiAssisted?: boolean;
}

export const PROJECTS: Project[] = [
  {
    id: "solarsurge",
    index: "01",
    title: "SolarSurge",
    tagline:
      "Kühlt die Wohnung vor, solange die Sonne liefert. Nicht abends, wenn der Strom am teuersten ist.",
    body: "Dashboard und Mobile-App für eine Klimasteuerung, die den Solarüberschuss nutzt. Gibt es tagsüber Überschuss und wird es später heiß, kühlt die Wohnung schon am Mittag mit eigenem Strom vor. Der Abend bleibt angenehm, ohne teuren Netzstrom zur Spitzenlastzeit.",
    detail:
      "Der geteilte Reading-Typ aus packages/db läuft über import type bis in die Mobile-App durch. Ändert sich das Schema, meckert der Compiler und nicht der Browser.",
    stack: [
      "TypeScript",
      "Next.js App Router",
      "Expo / React Native",
      "Python (AWS Lambda)",
      "PostgreSQL / Prisma",
      "AWS CDK",
      "pnpm Monorepo",
      "GitHub Actions",
    ],
    scope: "Fullstack · Cloud · Mobile",
    year: "2026",
    links: {
      live: "https://solarsurge-web.vercel.app",
      repo: "https://github.com/MarcelFelder-git/solarsurge",
    },
    media: {
      image: "/projects/solarsurge-01.jpg",
      stills: ["/projects/solarsurge-02.jpg"],
      orientation: "landscape",
      alt: "SolarSurge-Dashboard mit Live-Metriken, Regelbedingungen und Verlaufsdiagramm",
    },
    aiAssisted: true,
  },
  {
    id: "aurora",
    index: "02",
    title: "Aurora",
    tagline:
      "Zyklus-Tracking für zwei: eine Person trackt, eine Person unterstützt.",
    body: "Eine PWA für Endometriose-Schmerzmanagement und entzündungshemmende Ernährung. Kein Kinderwunsch-Kalender. Zwei Ansichten, live synchronisiert: eine zum Erfassen von Symptomen, eine für den Partner. Die zeigt, was gerade los ist und was bisher geholfen hat.",
    detail:
      "Row Level Security ist die echte Sicherheitsgrenze, nicht das Frontend: jede Tabelle ist über couple_id abgegrenzt und wird per SECURITY DEFINER gegen das eigene Profil geprüft.",
    stack: [
      "TypeScript",
      "Next.js 14",
      "Supabase (RLS, Realtime)",
      "Tailwind CSS",
      "Service Worker / PWA",
      "Web Push (VAPID)",
    ],
    scope: "Fullstack · Realtime · PWA",
    year: "2026",
    links: {
      live: "https://aurora-app-pied.vercel.app",
      repo: "https://github.com/MarcelFelder-git/aurora-app",
    },
    media: {
      image: "/projects/aurora-01.jpg",
      stills: [
        "/projects/aurora-02.jpg",
        "/projects/aurora-03.jpg",
        "/projects/aurora-04.jpg",
      ],
      orientation: "portrait",
      alt: "Aurora-App: Zyklusübersicht mit Symptomerfassung",
    },
    aiAssisted: true,
  },
  {
    id: "latent",
    index: "03",
    title: "Latent",
    tagline:
      "Eine Dunkelkammer im Browser: Foto rein, Emulsion wählen, entwickeln zusehen.",
    body: "Filmemulation, die vollständig auf der GPU läuft: Kennlinien pro Farbschicht, wellenlängenabhängige Halation, Korn, das auf die Belichtung reagiert, Scannerprofile. Nichts wird hochgeladen, es gibt kein Backend. Die App ist installierbar und läuft offline, weil es nichts gibt, wovon man abgeschnitten werden könnte.",
    detail:
      "Auf die Reihenfolge der fünf GPU-Pässe kommt es an. Das gestreute Licht wird auf die Belichtung addiert und läuft erst danach durch die Kennlinie, so wie Licht in Wirklichkeit vor der Entwicklung in der Emulsion streut. Legt man es stattdessen auf das fertige Bild, sieht man sofort, dass es ein Filter ist.",
    stack: [
      "TypeScript",
      "WebGL2 / GLSL",
      "React",
      "Vite",
      "Web Worker / OffscreenCanvas",
      "transformers.js (CLIP)",
      "Service Worker / PWA",
    ],
    scope: "Frontend · GPU · Farbwissenschaft",
    year: "2026",
    links: {
      live: "https://latent-mu-nine.vercel.app",
      repo: "https://github.com/MarcelFelder-git/Latent",
    },
    media: {
      image: "/projects/latent-01.jpg",
      stills: ["/projects/latent-02.jpg", "/projects/latent-03.jpg"],
      orientation: "landscape",
      alt: "Latent: entwickeltes Foto mit Kennlinie, Histogramm und Filmauswahl",
    },
    aiAssisted: true,
  },

  {
    id: "aufmischen",
    index: "04",
    title: "AUFMISCHEN",
    tagline:
      "Portfolio-Engine für eine Musikproduzentin, Inhalte pflegt sie selbst.",
    body: "Auftragsarbeit für eine Produzentin aus Frankfurt und Berlin. Headless-Architektur: Musik, Audioreferenzen, Tourdaten und Biografie liegen in einem CMS, das Frontend liefert sie schnell aus.",
    detail:
      "Sanity als Headless CMS trennt Redaktion und Darstellung: sie ändert Tourdaten, ohne dass ein Deploy nötig ist.",
    stack: [
      "Next.js",
      "Sanity CMS",
      "Framer Motion",
      "React Hook Form + Zod",
      "CSS Modules",
      "Vercel",
    ],
    scope: "Auftragsarbeit · Headless CMS",
    year: "2026",
    links: {
      live: "https://next-aufmischen-portfolio-v03.vercel.app",
      repo: "https://github.com/MarcelFelder-git/next-aufmischen_portfolio_v02",
    },
    media: {
      image: "/projects/aufmischen-01.jpg",
      stills: [
        "/projects/aufmischen-02.jpg",
        "/projects/aufmischen-03.jpg",
        "/projects/aufmischen-04.jpg",
        "/projects/aufmischen-05.jpg",
      ],
      orientation: "landscape",
      alt: "AUFMISCHEN Artist-Portfolio, Startansicht",
    },
  },
  {
    id: "nxt-hud",
    index: "05",
    title: "NXT VideoGame HUD",
    tagline:
      "Spiele suchen, filtern und merken. Dazu ein Minigame, das dein Wissen testet.",
    body: "Web-App zum Entdecken von Videospielen, die in Echtzeit aus der RAWG-API liest. Suche, Filter, Detailansichten und eine persönliche Watchlist mit Login. „Guess the Game“ ist als Dreingabe dazugekommen.",
    detail:
      "Auth mit NextAuth und Prisma, damit die Watchlist an einem echten Konto hängt statt im LocalStorage zu liegen.",
    stack: [
      "Next.js",
      "React",
      "TypeScript",
      "Prisma",
      "NextAuth",
      "RAWG API",
      "CSS Modules",
    ],
    scope: "Frontend · API-Integration · Auth",
    year: "2026",
    links: {
      live: "https://02-nxt-videogame-hud.vercel.app",
      repo: "https://github.com/MarcelFelder-git/02_nxt_videogame_hud",
    },
    media: {
      image: "/projects/hud-01.jpg",
      stills: ["/projects/hud-02.jpg", "/projects/hud-03.jpg"],
      orientation: "landscape",
      video: { mp4: "/projects/hud.mp4", webm: "/projects/hud.webm" },
      alt: "NXT VideoGame HUD: Spielekatalog mit Filtern und Detailansicht",
    },
  },
  {
    id: "art-robbery",
    index: "06",
    title: "Art Robbery",
    tagline:
      "Browsergame: Kunstraub, bei dem jedes Museum eine Fälschung versteckt.",
    body: "Du bist Meisterdieb und hast es auf die berühmtesten Gemälde der Welt abgesehen. In jedem Museum hängt neben dem Original eine Fälschung. Richtig wählen, der Security ausweichen, rauskommen.",
    detail:
      "Spielzustand über useContext statt über eine State-Library: bei dieser Größe ist eine zusätzliche Abhängigkeit nur Ballast.",
    stack: ["React", "JavaScript", "Express", "TanStack Query", "CSS Modules"],
    scope: "Frontend · Spiellogik",
    year: "2025",
    links: {
      live: "https://01-art-robbery.vercel.app",
      repo: "https://github.com/MarcelFelder-git/01_art_robbery",
    },
    media: {
      image: "/projects/art-robbery-01.jpg",
      stills: ["/projects/art-robbery-02.jpg", "/projects/art-robbery-03.jpg"],
      orientation: "landscape",
      video: {
        mp4: "/projects/art-robbery.mp4",
        webm: "/projects/art-robbery.webm",
      },
      alt: "Art Robbery: Museumsansicht mit Gemäldeauswahl",
    },
  },
];

/* ================================================================== */
/* Englisch                                                            */
/* ================================================================== */

/**
 * Nur die Texte, nicht die Daten.
 *
 * Links, Bilder, Stack und Jahr gibt es einmal, oben in PROJECTS. Hier
 * stehen die englischen Fassungen der Saetze, und `projectsFor` legt
 * sie ueber die deutschen Eintraege. So kann eine Adresse nicht in
 * einer Sprache stimmen und in der anderen veralten.
 */
type ProjectText = Pick<Project, "tagline" | "body" | "detail" | "scope"> & {
  alt: string;
};

const EN: Record<string, ProjectText> = {
  solarsurge: {
    tagline:
      "Cools the flat down while the sun is still delivering. Not in the evening, when power costs the most.",
    body: "Dashboard and mobile app for a climate control that runs on solar surplus. If there's surplus at midday and it's going to get hot later, the flat gets pre-cooled on its own power. The evening stays comfortable, without expensive grid power at peak time.",
    detail:
      "The shared Reading type from packages/db travels via import type all the way into the mobile app. If the schema changes, the compiler complains, not the browser.",
    scope: "Fullstack · Cloud · Mobile",
    alt: "SolarSurge dashboard with live metrics, rule conditions and history chart",
  },
  aurora: {
    tagline: "Cycle tracking for two: one person tracks, one person supports.",
    body: "A PWA for endometriosis pain management and anti-inflammatory nutrition. Not a fertility calendar. Two views, synced live: one for logging symptoms, one for the partner. That one shows what's going on right now and what has helped so far.",
    detail:
      "Row Level Security is the real security boundary, not the frontend: every table is scoped by couple_id and checked against the user's own profile via SECURITY DEFINER.",
    scope: "Fullstack · Realtime · PWA",
    alt: "Aurora app: cycle overview with symptom logging",
  },
  latent: {
    tagline:
      "A darkroom in the browser: drop in a photo, pick an emulsion, watch it develop.",
    body: "Film emulation that runs entirely on the GPU: characteristic curves per colour layer, wavelength-dependent halation, grain that reacts to exposure, scanner profiles. Nothing gets uploaded, there is no backend. The app installs and works offline, because there's nothing to be cut off from.",
    detail:
      "The order of the five GPU passes is what matters. Scattered light is added to the exposure and only then runs through the characteristic curve, the way light scatters in the emulsion before development. Put it on the finished image instead and you can tell it's a filter right away.",
    scope: "Frontend · GPU · Colour science",
    alt: "Latent: developed photo with characteristic curve, histogram and film selection",
  },
  aufmischen: {
    tagline:
      "Portfolio engine for a music producer. She keeps the content up to date herself.",
    body: "Commissioned work for a producer based in Frankfurt and Berlin. Headless architecture: music, audio references, tour dates and bio live in a CMS, the frontend serves them fast.",
    detail:
      "Sanity as a headless CMS separates editing from presentation: she changes tour dates without anyone needing to deploy.",
    scope: "Commissioned · Headless CMS",
    alt: "AUFMISCHEN artist portfolio, start view",
  },
  "nxt-hud": {
    tagline:
      "Search, filter and save games. Plus a mini game that tests what you know.",
    body: "Web app for discovering video games, reading live from the RAWG API. Search, filters, detail views and a personal watchlist with login. 'Guess the Game' came in as a bonus.",
    detail:
      "Auth with NextAuth and Prisma, so the watchlist belongs to a real account instead of living in LocalStorage.",
    scope: "Frontend · API integration · Auth",
    alt: "NXT VideoGame HUD: game catalogue with filters and detail view",
  },
  "art-robbery": {
    tagline: "Browser game: an art heist where every museum hides a forgery.",
    body: "You're a master thief going after the world's most famous paintings. In every museum, a forgery hangs next to the original. Pick right, dodge security, get out.",
    detail:
      "Game state via useContext instead of a state library: at this size, an extra dependency is just ballast.",
    scope: "Frontend · Game logic",
    alt: "Art Robbery: museum view with painting selection",
  },
};

export function projectsFor(locale: "de" | "en"): Project[] {
  if (locale === "de") return PROJECTS;
  return PROJECTS.map((p) => {
    const t = EN[p.id];
    if (!t) return p;
    return { ...p, ...t, media: { ...p.media, alt: t.alt } };
  });
}
