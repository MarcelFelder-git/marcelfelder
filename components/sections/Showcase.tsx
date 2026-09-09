"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Code2, Play, SquareArrowOutUpRight } from "lucide-react";
import { PROJECTS, type Project } from "@/content/projects";
import { Reveal } from "@/components/motion/primitives";
import { GlitchText } from "@/components/motion/GlitchText";
import { LivePreview } from "@/components/projects/LivePreview";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { sceneState } from "@/lib/scene/state";
import { activeStation, stationNearness } from "@/lib/scene/tunnel";
import { TUNNEL_VH_LEAD, TUNNEL_VH_PER_PROJECT } from "@/lib/scene/pacing";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Projekte — der Teil, den ein Recruiter zuerst liest.
 *
 * Zwei Darstellungen desselben Inhalts:
 *
 *   1. Die Fahrt durch den 3D-Korridor. Die Tafeln haengen im Canvas, der
 *      Text laeuft als DOM darueber und wechselt an jeder Station.
 *   2. Eine flache Kartenliste als Rueckfallebene fuer `prefers-reduced-
 *      motion` — gleicher Inhalt, gleiche Links, ohne Fahrt.
 *
 * Darunter steht in beiden Faellen ein kompaktes Register mit allen
 * Projekten als echte Links. Das ist nicht nur Zierde: waehrend der Fahrt
 * ist immer nur eine Station im Text sichtbar, und ohne dieses Register
 * koennte man per Tastatur nicht an alle Projekte kommen.
 */
export function Showcase() {
  const reduced = usePrefersReducedMotion();
  const [preview, setPreview] = useState<Project | null>(null);

  return (
    <section
      id="projects"
      className="relative"
      aria-labelledby="projects-heading"
    >
      {/* Schwelle, keine dritte Ueberschrift.
          Hier stand eine Display-Zeile in derselben Groesse wie die des
          Heros. Drei solche Bloecke hintereinander - Hero, Manifest,
          Projekte - lesen sich als drei Anfaenge; der Blick weiss nicht
          mehr, wo die Seite eigentlich begonnen hat. Die Ueberschrift
          bleibt als h2 erhalten (die Sektion braucht ihren Namen, und
          das Register im Dokument auch), nur traegt sie das Gewicht
          einer Zwischenzeile statt das eines Auftakts. Das eigentliche
          Ereignis danach ist der Korridor, und der braucht keine
          Ansage. */}
      <header className="relative px-6 py-[9vh] sm:px-10 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(var(--ground-rgb),0.95)_30%,rgba(var(--ground-rgb),0.95))]"
        />
        <div className="flex items-baseline gap-4 border-t border-rule pt-5">
          <p className="meta-accent shrink-0">Projekte</p>
          <span aria-hidden className="h-px flex-1 bg-rule-soft" />
          <p className="meta shrink-0">
            {String(PROJECTS.length).padStart(2, "0")} Stück · alle im Repo
          </p>
        </div>
        <h2
          id="projects-heading"
          className="mt-6 max-w-xl text-balance text-[clamp(1.25rem,2.2vw,1.7rem)] font-medium leading-snug tracking-[-0.02em] text-ink"
        >
          Gebaut, deployt, <span className="text-accent">nachlesbar</span>.{" "}
          <span className="text-mute">
            {reduced
              ? "Jede Karte verlinkt Live-Deployment und Quellcode."
              : "Scrollen fährt durch den Korridor. Jedes Gerät an der Wand ist ein Projekt."}
          </span>
        </h2>
      </header>

      {reduced ? (
        <FlatList onPreview={setPreview} />
      ) : (
        <TunnelRide onPreview={setPreview} />
      )}

      <ProjectIndex />

      {preview?.links.live && (
        <LivePreview
          url={preview.links.live}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}

/* ================================================================== */
/* Fahrt durch den Korridor                                            */
/* ================================================================== */

function TunnelRide({ onPreview }: { onPreview: (p: Project) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [station, setStation] = useState(0);
  // Wie nah man der aktuellen Station ist - treibt die Ankunftsanzeige.
  const [arrival, setArrival] = useState(0);

  // Der aktive Abschnitt wird aus demselben Fortschritt abgeleitet, der
  // auch die Kamera fuehrt - per rAF gelesen statt per Scroll-Listener,
  // damit Text und Kamera denselben Frame teilen und nicht auseinander
  // laufen.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const p = sceneState.tunnelProgress;
      // Welche Tafel gerade dran ist, rechnet die Tunnelgeometrie selbst
      // aus - dieselbe Funktion, die auch das Wanderlicht im Korridor
      // fuehrt. Vorher stand hier eine aus Fahrtweg und Stationsabstand
      // abgeleitete Naeherung samt Korrekturfaktor; die stimmte nur fuer
      // genau eine Projektanzahl.
      const index = activeStation(p);
      setStation((prev) => (prev === index ? prev : index));

      // Auf Hundertstel gerundet: sonst setzt jeder Frame neuen State und
      // React rendert 60-mal pro Sekunde fuer eine Balkenbreite.
      const near = Math.round(stationNearness(p, index) * 100) / 100;
      setArrival((prev) => (prev === near ? prev : near));

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const project = PROJECTS[station];

  return (
    <div
      ref={ref}
      data-tunnel
      // Beide Zahlen stehen in lib/scene/pacing.ts - zusammen mit den
      // uebrigen Stellschrauben fuer das Tempo der Seite.
      style={{
        height: `${PROJECTS.length * TUNNEL_VH_PER_PROJECT + TUNNEL_VH_LEAD}vh`,
      }}
      className="relative"
    >
      {/* Der Text steht immer auf der Gegenseite der aktuellen Tafel.
          Tafeln haengen abwechselnd links und rechts an der Wand; stuende
          der Text fest auf einer Seite, laege er bei jeder zweiten Station
          genau ueber dem Screenshot - beides unlesbar. */}
      <div
        className={cn(
          "sticky top-0 flex h-screen items-end px-6 pb-[14vh] transition-[justify-content] duration-500 sm:px-10 lg:px-16",
          // Rechts zusaetzlicher Abstand: dort steht ab lg die fixierte
          // Kapitelnavigation, und der Text soll nicht darunter laufen.
          station % 2 === 0 ? "justify-end lg:pr-44" : "justify-start",
        )}
      >
        <div className="relative w-full max-w-lg">
          {/* Zwei Unterlagen statt einer, weil die Aufgabe eine andere ist:
              Auf dem Telefon fuellt die Karte fast das ganze Bild, und das
              Geraet im Korridor steht zwangslaeufig dahinter - dort
              braucht es eine deckende Flaeche mit Kante, sonst laeuft der
              Screenshot durch den Text. Ab sm steht die Karte seitlich
              neben dem Geraet, und dann ist ein weicher Verlauf richtig:
              er begrenzt nichts, er nimmt nur Helligkeit weg. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-5 -inset-y-5 -z-10 border border-rule-soft bg-[rgba(var(--ground-rgb),0.93)] sm:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 hidden bg-[radial-gradient(70%_70%_at_30%_60%,rgba(var(--ground-rgb),0.95),transparent_75%)] sm:block"
          />

          {/* Ankunftsanzeige: die Linie faerbt sich, waehrend man auf die
              Station zufaehrt, und steht voll, wenn man davor ist. Damit
              weiss man, ob die Tafel im Korridor gerade "die eigene" ist
              oder nur eine, an der man vorbeikommt. */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-300",
                arrival > 0.55 ? "text-accent" : "text-faint",
              )}
            >
              Station {String(station + 1).padStart(2, "0")} /{" "}
              {String(PROJECTS.length).padStart(2, "0")}
            </span>
            <span className="relative h-px flex-1 bg-rule">
              <span
                className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-200"
                style={{ width: `${Math.round(arrival * 100)}%` }}
              />
            </span>
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.18em] transition-opacity duration-300",
                arrival > 0.55 ? "text-accent opacity-100" : "opacity-0",
              )}
            >
              angekommen
            </span>
          </div>

          {/* key erzwingt Remount bei Stationswechsel - der Glitch laeuft
              dadurch bei jedem Wechsel neu an. */}
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="mt-4"
          >
            <GlitchText
              as="h3"
              text={project.title}
              className="block text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-none tracking-[-0.03em]"
            />
            <p className="meta mt-3">
              {project.scope} · {project.year}
            </p>

            <p className="mt-5 text-pretty text-[17px] leading-snug text-ink">
              {project.tagline}
            </p>
            {/* Auf dem Telefon nur fuer Screenreader.
                Der technische Zusatz ist das, was jemanden interessiert,
                der schon eingestiegen ist - auf einem Handschirm kostet
                er vier Zeilen, die der Karte genau den Platz nehmen, den
                das Geraet dahinter braucht. `sr-only` statt `hidden`,
                damit er trotzdem vorgelesen wird: weniger sehen ist eine
                Gestaltungsentscheidung, weniger erfahren waere keine. */}
            <p className="mt-3 text-[14px] leading-relaxed text-mute max-sm:sr-only">
              {project.detail}
            </p>

            <ul className="mt-5 flex flex-wrap gap-1.5">
              {project.stack.slice(0, 6).map((tech) => (
                <li
                  key={tech}
                  className="border border-rule bg-surface/90 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mute"
                >
                  {tech}
                </li>
              ))}
            </ul>

            <ProjectLinks project={project} onPreview={onPreview} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Flache Liste — Rueckfallebene ohne Bewegung                         */
/* ================================================================== */

function FlatList({ onPreview }: { onPreview: (p: Project) => void }) {
  return (
    <div className="flex flex-col gap-px bg-rule">
      {PROJECTS.map((project, i) => (
        <Reveal key={project.id} className="bg-paper">
          <article
            className={cn(
              "grid items-stretch gap-px bg-rule lg:grid-cols-2",
              i % 2 === 1 && "lg:[&>*:first-child]:order-2",
            )}
          >
            <ProjectMediaFrame project={project} />
            <div className="flex flex-col justify-center bg-paper p-6 sm:p-10 lg:p-12">
              <div className="flex items-baseline gap-4">
                <span
                  aria-hidden
                  className="font-mono text-[clamp(2rem,4vw,3rem)] font-bold leading-none text-transparent"
                  style={{ WebkitTextStroke: "1px rgba(56,189,248,0.35)" }}
                >
                  {project.index}
                </span>
                <div>
                  <h3 className="text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-tight tracking-[-0.02em]">
                    {project.title}
                  </h3>
                  <p className="meta mt-1.5">
                    {project.scope} · {project.year}
                  </p>
                </div>
              </div>

              <p className="mt-6 text-pretty text-[17px] leading-snug text-ink">
                {project.tagline}
              </p>
              <p className="mt-4 text-[14.5px] leading-relaxed text-mute">
                {project.body}
              </p>
              <p className="mt-5 border-l border-accent/50 pl-4 font-mono text-[12px] leading-relaxed text-faint">
                {project.detail}
              </p>

              <ul className="mt-6 flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <li
                    key={tech}
                    className="border border-rule bg-surface px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mute"
                  >
                    {tech}
                  </li>
                ))}
              </ul>

              <ProjectLinks project={project} onPreview={onPreview} />
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Register — immer vorhanden, immer per Tastatur erreichbar           */
/* ================================================================== */

function ProjectIndex() {
  return (
    <div className="relative border-y border-rule bg-paper/90">
      <div className="px-6 py-10 sm:px-10 lg:px-16">
        <h3 className="meta mb-5">Register, alle Projekte</h3>
        <ul className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <li key={project.id} className="bg-paper">
              <a
                href={project.links.live ?? project.links.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex h-full flex-col gap-1 p-5 transition-colors hover:bg-raise"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-accent">
                    {project.index}
                  </span>
                  <span className="font-medium text-ink group-hover:text-accent">
                    {project.title}
                  </span>
                  <ArrowUpRight
                    className="ml-auto size-3.5 shrink-0 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    strokeWidth={2}
                  />
                </span>
                <span className="text-[13px] leading-snug text-mute">
                  {project.tagline}
                </span>
                <span className="meta mt-1">{project.scope}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================== */

function ProjectLinks({
  project,
  onPreview,
}: {
  project: Project;
  onPreview?: (p: Project) => void;
}) {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      {project.links.live && onPreview && (
        <button
          onClick={() => onPreview(project)}
          className="group flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-px"
        >
          Live-Vorschau
          <SquareArrowOutUpRight className="size-4" strokeWidth={2} />
        </button>
      )}
      {/* Kein zweiter Knopf fuer dieselbe Adresse: "Neuer Tab" steht in
          der Leiste der Vorschau, wo man ihn braucht - naemlich dann,
          wenn einem der Rahmen zu eng wird. Zwei Schaltflaechen
          nebeneinander, die auf dieselbe URL zeigen, sind eine Entscheidung,
          die niemand treffen will. */}
      <a
        href={project.links.repo}
        target="_blank"
        rel="noreferrer noopener"
        className="invert-hover flex items-center gap-2 border border-rule px-4 py-2.5 text-sm text-mute"
      >
        <Code2 className="size-4" strokeWidth={1.75} />
        Quellcode
      </a>
      {!project.links.live && (
        <span className="meta">kein öffentliches Deployment</span>
      )}
      {project.aiAssisted && (
        <span className="meta w-full pt-1">
          Entstanden im KI-Pair-Programming, Architektur von mir
        </span>
      )}
    </div>
  );
}

/**
 * Medienrahmen der flachen Liste: HUD-Eckwinkel, Scanlines, Duoton-Kante.
 * Bei vorhandenem Video übernimmt es bei Hover oder Fokus das Standbild.
 */
function ProjectMediaFrame({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();
  const hasVideo = Boolean(project.media.video) && !reduced;
  const portrait = project.media.orientation === "portrait";

  const start = () => {
    if (!hasVideo || !videoRef.current) return;
    void videoRef.current.play().then(
      () => setPlaying(true),
      () => undefined,
    );
  };

  const stop = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setPlaying(false);
  };

  return (
    <div
      className={cn(
        "scanlines hud-corners group relative overflow-hidden bg-surface",
        portrait
          ? "aspect-[4/3] p-6 sm:p-10 lg:aspect-auto lg:py-14"
          : "aspect-[16/10] lg:aspect-auto",
      )}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      {portrait && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_50%,rgb(56_189_248/0.12),transparent_70%)]"
        />
      )}

      <Image
        src={project.media.image}
        alt={project.media.alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={cn(
          "transition-all duration-500",
          portrait ? "object-contain object-center" : "object-cover object-left-top",
          "saturate-[0.75] group-hover:saturate-100",
          playing ? "opacity-0" : "opacity-100",
        )}
      />

      {hasVideo && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={project.media.image}
          aria-label={`Videovorschau: ${project.title}`}
          className={cn(
            "absolute inset-0 size-full object-cover object-left-top transition-opacity duration-500",
            playing ? "opacity-100" : "opacity-0",
          )}
        >
          <source src={project.media.video!.webm} type="video/webm" />
          <source src={project.media.video!.mp4} type="video/mp4" />
        </video>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, rgb(56 189 248 / 0.16), transparent 45%, rgb(168 85 247 / 0.18))",
          mixBlendMode: "screen",
        }}
      />

      <div
        aria-hidden
        className="edge-duotone pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-60"
      />

      {hasVideo && (
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: playing ? 0 : 1 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 bg-paper/85 px-2.5 py-1.5"
        >
          <Play className="size-3 text-accent" strokeWidth={2.5} />
          <span className="meta">Hover für Loop</span>
        </motion.div>
      )}
    </div>
  );
}
