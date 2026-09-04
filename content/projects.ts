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
      "Kühlt eine Wohnung vor, während die Sonne liefert — statt abends im Netzpeak.",
    body: "Dashboard und Mobile-App für eine Klimasteuerung, die den Solarüberschuss nutzt: Gibt es tagsüber Überschuss und wird es später heiß, kühlt die Wohnung früh mit eigenem Strom vor. Der Abend bleibt angenehm, ohne teuren Netzstrom zur Spitzenlastzeit.",
    detail:
      "Der geteilte Reading-Typ aus packages/db läuft über import type bis in die Mobile-App durch. Eine Schemaänderung lässt damit den Compiler meckern, nicht den Browser.",
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
    links: { repo: "https://github.com/MarcelFelder-git/solarsurge" },
    media: {
      image: "/projects/solarsurge.jpg",
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
    body: "PWA rund um Endometriose-Schmerzmanagement und entzündungshemmende Ernährung — kein Kinderwunsch-Kalender. Zwei live synchronisierte Ansichten: eine zum Erfassen von Symptomen, eine für den Partner, die zeigt, was gerade los ist und was tatsächlich hilft.",
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
      image: "/projects/aurora.jpg",
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
    body: "Filmemulation, die vollständig auf der GPU läuft — Kennlinien pro Farbschicht, wellenlängenabhängige Halation, Korn, das auf die Belichtung reagiert, Scannerprofile. Nichts wird hochgeladen, es gibt kein Backend. Installierbar und offline lauffähig, weil es nichts gibt, wovon man abgeschnitten werden könnte.",
    detail:
      "Die Reihenfolge der fünf GPU-Pässe ist der Punkt: das gestreute Licht wird auf die Belichtung addiert und läuft danach durch die Kennlinie — so, wie Licht in Wirklichkeit vor der Entwicklung in der Emulsion streut. Legt man es auf das fertige Bild, liegt es obenauf und liest sich als Effekt.",
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
      // TODO(Marcel): Platzhalter durch echte Screenshots ersetzen.
      // Gleiche Dateinamen, dann ist hier nichts zu ändern.
      image: "/projects/latent-01.jpg",
      stills: ["/projects/latent-02.jpg", "/projects/latent-03.jpg"],
      orientation: "landscape",
      alt: "Latent: entwickeltes Foto mit Kennlinie, Histogramm und Filmauswahl",
    },
    aiAssisted: true,
  },
  {
    id: "nxt-hud",
    index: "04",
    title: "NXT VideoGame HUD",
    tagline:
      "Spiele suchen, filtern, merken — plus ein Minigame, das dein Wissen testet.",
    body: "Web-App zum Entdecken von Videospielen, die in Echtzeit aus der RAWG-API liest. Suche, Filter, Detailansichten, eine persönliche Watchlist mit Login — und „Guess the Game“ als Dreingabe.",
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
      image: "/projects/hud.jpg",
      orientation: "landscape",
      video: { mp4: "/projects/hud.mp4", webm: "/projects/hud.webm" },
      alt: "NXT VideoGame HUD: Spielekatalog mit Filtern und Detailansicht",
    },
  },
  {
    id: "aufmischen",
    index: "05",
    title: "AUFMISCHEN",
    tagline:
      "Portfolio-Engine für einen Musikproduzenten, Inhalte pflegt er selbst.",
    body: "Auftragsarbeit für einen Produzenten aus Frankfurt/Berlin. Headless-Architektur: die Inhalte — Musik, Audioreferenzen, Tourdaten, Biografie — liegen in einem CMS, das Frontend liefert sie schnell aus.",
    detail:
      "Sanity als Headless CMS trennt Redaktion und Darstellung: er ändert Tourdaten, ohne dass ein Deploy nötig ist.",
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
      image: "/projects/aufmischen.jpg",
      orientation: "landscape",
      alt: "AUFMISCHEN Artist-Portfolio, Startansicht",
    },
  },
  {
    id: "art-robbery",
    index: "06",
    title: "Art Robbery",
    tagline:
      "Browsergame: Kunstraub, bei dem jedes Museum eine Fälschung versteckt.",
    body: "Du bist Meisterdieb und hast es auf die berühmtesten Gemälde der Welt abgesehen. In jedem Museum hängt neben dem Original eine Fälschung — richtig wählen, der Security ausweichen, rauskommen.",
    detail:
      "Spielzustand über useContext statt über eine State-Library: bei dieser Größe ist eine zusätzliche Abhängigkeit nur Ballast.",
    stack: [
      "React",
      "JavaScript",
      "Express",
      "TanStack Query",
      "CSS Modules",
    ],
    scope: "Frontend · Spiellogik",
    year: "2025",
    links: {
      live: "https://01-art-robbery.vercel.app",
      repo: "https://github.com/MarcelFelder-git/01_art_robbery",
    },
    media: {
      image: "/projects/art-robbery.jpg",
      orientation: "landscape",
      video: {
        mp4: "/projects/art-robbery.mp4",
        webm: "/projects/art-robbery.webm",
      },
      alt: "Art Robbery: Museumsansicht mit Gemäldeauswahl",
    },
  },
];
