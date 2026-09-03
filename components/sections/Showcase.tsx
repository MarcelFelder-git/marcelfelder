"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Code2, Play } from "lucide-react";
import { PROJECTS, type Project } from "@/content/projects";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { GlitchText } from "@/components/motion/GlitchText";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { sceneState } from "@/lib/scene/state";
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

  return (
    <section
      id="projects"
      className="relative"
      aria-labelledby="projects-heading"
    >
      <header className="relative px-6 py-[12vh] sm:px-10 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(8,9,14,0.95)_30%,rgba(8,9,14,0.95))]"
        />
        <div className="flex items-baseline justify-between gap-4">
          <p className="meta-accent">Projekte</p>
          <p className="meta">{PROJECTS.length} Stück · alle im Repo einsehbar</p>
        </div>
        <SplitHeading
          as="h2"
          id="projects-heading"
          text="Gebaut, deployt, nachlesbar."
          className="mt-4 max-w-3xl text-balance text-[clamp(2rem,4.6vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.03em]"
          highlight={["nachlesbar."]}
        />
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mute">
          {reduced
            ? "Jede Karte verlinkt Live-Deployment und Quellcode. Die Screenshots kommen aus den Repositories, nicht aus einem Mockup-Generator."
            : "Scrollen fährt durch den Korridor. Jede Tafel an der Wand ist ein Projekt — Live-Deployment und Quellcode jeweils darunter verlinkt."}
        </p>
      </header>

      {reduced ? <FlatList /> : <TunnelRide />}

      <ProjectIndex />
    </section>
  );
}

/* ================================================================== */
/* Fahrt durch den Korridor                                            */
/* ================================================================== */

function TunnelRide() {
  const ref = useRef<HTMLDivElement>(null);
  const [station, setStation] = useState(0);

  // Der aktive Abschnitt wird aus demselben Fortschritt abgeleitet, der
  // auch die Kamera fuehrt - per rAF gelesen statt per Scroll-Listener,
  // damit Text und Kamera denselben Frame teilen und nicht auseinander
  // laufen.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const p = sceneState.tunnel.progress;
      // Stationen liegen im Korridor bei 12, 29, 46, 63, 80 von 99
      // Einheiten Fahrt; in Fortschritt umgerechnet ergibt das etwa
      // gleiche Abstaende mit etwas Vorlauf.
      const index = Math.min(
        PROJECTS.length - 1,
        Math.max(0, Math.floor(p * PROJECTS.length * 1.04)),
      );
      setStation((prev) => (prev === index ? prev : index));
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
      // Eine Bildschirmhoehe pro Projekt plus Vor- und Nachlauf. Kuerzer
      // wirkt die Fahrt gehetzt, laenger wird sie zur Geduldsprobe.
      style={{ height: `${PROJECTS.length * 100 + 80}vh` }}
      className="relative"
    >
      <div className="sticky top-0 flex h-screen items-end px-6 pb-[14vh] sm:px-10 lg:px-16">
        {/* Der Text sitzt links unten und laesst die Roehre frei. */}
        <div className="relative w-full max-w-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-12 -z-10 bg-[radial-gradient(70%_70%_at_30%_60%,rgba(8,9,14,0.95),transparent_75%)]"
          />

          <div className="flex items-center gap-3">
            <span className="meta-accent">
              Station {String(station + 1).padStart(2, "0")} /{" "}
              {String(PROJECTS.length).padStart(2, "0")}
            </span>
            <span className="h-px flex-1 bg-rule" />
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
            <p className="mt-3 text-[14px] leading-relaxed text-mute">
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

            <ProjectLinks project={project} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Flache Liste — Rueckfallebene ohne Bewegung                         */
/* ================================================================== */

function FlatList() {
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

              <ProjectLinks project={project} />
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
        <h3 className="meta mb-5">Register — alle Projekte</h3>
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

function ProjectLinks({ project }: { project: Project }) {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      {project.links.live && (
        <a
          href={project.links.live}
          target="_blank"
          rel="noreferrer noopener"
          className="group flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-px"
        >
          Live ansehen
          <ArrowUpRight
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2}
          />
        </a>
      )}
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
          Entstanden im KI-Pair-Programming — Architektur von mir
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
