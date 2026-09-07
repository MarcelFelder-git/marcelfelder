"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Counter, Reveal, SplitHeading } from "@/components/motion/primitives";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/types";

/**
 * Ein Kapitel ist absichtlich ueberhoch (rund zwei Bildschirme). Der
 * ScrollDriver misst, wie nah seine Mitte an der Bildschirmmitte liegt, und
 * blendet daraus das zugehoerige 3D-Modell ein. Waere die Sektion nur einen
 * Bildschirm hoch, waere der Uebergang ein Sprung statt einer Uebergabe.
 *
 * Der Textblock klebt waehrenddessen - man scrollt durch das Kapitel, nicht
 * an ihm vorbei.
 */
export function ChapterSection({
  chapter,
  side,
  children,
}: {
  chapter: Chapter;
  side: "left" | "right";
  /** Werkzeug, das zu genau diesem Kapitel gehoert (z. B. das Mischpult). */
  children?: ReactNode;
}) {
  return (
    <section
      data-chapter={chapter.id}
      className="relative min-h-[130vh] px-6 py-[10vh] sm:px-10 lg:px-16"
      aria-labelledby={`chapter-${chapter.id}`}
    >
      <div
        className={cn(
          "sticky top-[16vh] flex",
          side === "right" ? "justify-end" : "justify-start",
        )}
      >
        <div className="relative w-full max-w-xl">
          {/* Scrim, damit die Type auf dem Modell lesbar bleibt. Die
              Richtung folgt der Textseite: die dem Modell zugewandte Kante
              laeuft aus, die andere deckt voll ab. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute -inset-x-16 -inset-y-20 -z-10",
              side === "left"
                ? "bg-[linear-gradient(100deg,rgba(var(--ground-rgb),0.97)_0%,rgba(var(--ground-rgb),0.94)_55%,rgba(var(--ground-rgb),0.4)_82%,transparent_100%)]"
                : "bg-[linear-gradient(260deg,rgba(var(--ground-rgb),0.97)_0%,rgba(var(--ground-rgb),0.94)_55%,rgba(var(--ground-rgb),0.4)_82%,transparent_100%)]",
            )}
          />

          {/* Kapitelnummer als Outline-Type - Massstab, keine Deko */}
          <motion.span
            aria-hidden
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            className="block font-mono text-[clamp(4rem,10vw,8rem)] font-bold leading-none tracking-tighter text-transparent"
            style={{ WebkitTextStroke: "1px rgba(56,189,248,0.28)" }}
          >
            {chapter.index}
          </motion.span>

          <Reveal delay={0.05} className="mt-4 flex items-center gap-3">
            <span className="h-px w-8 bg-accent/60" />
            <span className="meta text-accent">
              {chapter.caption}
            </span>
          </Reveal>

          <SplitHeading
            as="h2"
            text={chapter.headline}
            className="mt-5 text-balance text-[clamp(1.9rem,4vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.025em]"
          />
          <span id={`chapter-${chapter.id}`} className="sr-only">
            {chapter.label}
          </span>

          <Reveal delay={0.1}>
            <p className="mt-6 text-pretty text-[17px] leading-relaxed text-mute">
              {chapter.body}
            </p>
          </Reveal>

          {/* Was die Szene gerade tut - erklaert das Bild, statt es zu
              behaupten */}
          <Reveal delay={0.16}>
            <p className="mt-6 border-l-2 border-accent/45 pl-4 font-mono text-[12.5px] leading-relaxed text-faint">
              {chapter.aside}
            </p>
          </Reveal>

          {/* Kompetenzen, gestaffelt */}
          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="mt-8 flex flex-wrap gap-2"
          >
            {chapter.skills.map((skill) => (
              <motion.li
                key={skill}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, ease: EASE_OUT },
                  },
                }}
                className="border border-rule bg-surface px-3.5 py-1.5 font-mono text-[11px] text-mute"
              >
                {skill}
              </motion.li>
            ))}
          </motion.ul>

          {/* Messwerte */}
          <dl className="mt-10 grid grid-cols-3 gap-px border border-rule bg-rule">
            {chapter.metrics.map((m, i) => (
              <Reveal
                key={m.label}
                delay={0.06 * i}
                y={14}
                className="bg-surface p-4"
              >
                <dt className="meta leading-relaxed">{m.label}</dt>
                <dd className="mt-2 font-mono text-xl text-ink">
                  <Counter to={m.value} />
                  <span className="text-accent">{m.suffix}</span>
                </dd>
              </Reveal>
            ))}
          </dl>

          {children ? <div className="mt-10">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
