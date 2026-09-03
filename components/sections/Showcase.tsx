"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Code2, Play } from "lucide-react";
import { PROJECTS, type Project } from "@/content/projects";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Projekte — der Teil, den ein Recruiter zuerst liest.
 *
 * Bewusst medienlastig: jede Karte trägt einen echten Screenshot aus dem
 * jeweiligen Repository, zwei davon einen kurzen Loop. Keine Mockup-Rahmen,
 * keine Stockbilder, kein "Coming soon".
 *
 * Video startet ausschließlich auf Hover oder Fokus und nie mit Ton. Ein
 * Autoplay-Loop pro Karte wären fünf gleichzeitig dekodierende Videos —
 * das kostet Akku und Aufmerksamkeit, ohne etwas zu erklären.
 */
export function Showcase() {
  return (
    <section
      id="projects"
      className="relative py-[14vh]"
      aria-labelledby="projects-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(8,9,14,0.95)_10%,rgba(8,9,14,0.95)_90%,transparent)]"
      />

      <header className="px-6 sm:px-10 lg:px-16">
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
          Jede Karte verlinkt Live-Deployment und Quellcode. Die Screenshots
          kommen aus den Repositories, nicht aus einem Mockup-Generator.
        </p>
      </header>

      <div className="mt-14 flex flex-col gap-px bg-rule">
        {PROJECTS.map((project, i) => (
          <ProjectRow key={project.id} project={project} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function ProjectRow({
  project,
  flip,
}: {
  project: Project;
  flip: boolean;
}) {
  return (
    <Reveal className="bg-paper">
      <article
        className={cn(
          "grid items-stretch gap-px bg-rule lg:grid-cols-2",
          // Jede zweite Zeile dreht die Anordnung. Fünf identisch
          // aufgebaute Zeilen liest niemand bis zum Ende.
          flip && "lg:[&>*:first-child]:order-2",
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

          {/* Der technische Kern - was das Projekt über "hab ich gebaut"
              hinaus interessant macht. */}
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

          <div className="mt-8 flex flex-wrap items-center gap-3">
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
          </div>

          {project.aiAssisted && (
            <p className="mt-5 font-mono text-[11px] leading-relaxed text-faint">
              Entstanden im KI-Pair-Programming (Claude Code) — Architektur und
              Entscheidungen von mir, jede davon erklärbar.
            </p>
          )}
        </div>
      </article>
    </Reveal>
  );
}

/**
 * Medienrahmen mit HUD-Anleihen: Eckwinkel, Scanlines, Duoton-Kante.
 * Bei vorhandenem Video übernimmt es bei Hover/Fokus das Standbild.
 */
function ProjectMediaFrame({ project }: { project: Project }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();
  const hasVideo = Boolean(project.media.video) && !reduced;
  const portrait = project.media.orientation === "portrait";

  const start = () => {
    if (!hasVideo || !videoRef.current) return;
    // `play()` gibt ein Promise zurueck, das bei schnellem Hover-Wechsel
    // abgebrochen wird - der Fehler ist erwartbar und irrelevant.
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
        // Portrait bekommt einen festen, hohen Rahmen mit Innenabstand -
        // ein Handy-Screenshot soll als Handy lesbar sein, nicht als
        // beschnittener Streifen. Landscape füllt randlos.
        portrait
          ? "aspect-[4/3] p-6 sm:p-10 lg:aspect-auto lg:py-14"
          : "aspect-[16/10] lg:aspect-auto",
      )}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      {/* Bei Portrait ein weicher Schein hinter dem Gerät, damit es nicht
          im Nichts schwebt. */}
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
          portrait
            ? "object-contain object-center"
            : "object-cover object-left-top",
          // Leicht entsättigt im Ruhezustand, volle Farbe bei Hover: das
          // lenkt den Blick auf die Karte, über die man gerade fährt,
          // ohne dass irgendwas springt.
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

      {/* Duoton-Schleier, nur bei Hover - Cyan/Violett über dem Bild */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(115deg, rgb(56 189 248 / 0.16), transparent 45%, rgb(168 85 247 / 0.18))",
          mixBlendMode: "screen",
        }}
      />

      {/* Duoton-Kante unten */}
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
