"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { VITA } from "@/content/resume";
import { CONTACT_EMAIL, SOCIALS } from "@/content/site";
import { EASE_OUT } from "@/lib/motion";

/**
 * Zeitleiste. Die senkrechte Linie fuellt sich mit dem Scrollfortschritt der
 * Sektion - ein Fortschrittsbalken, der zugleich die Achse der Darstellung
 * ist, statt eines zusaetzlichen Elements daneben.
 */
export function Vita() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.6"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      ref={ref}
      className="relative px-6 py-[14vh] sm:px-10 lg:px-16"
      aria-labelledby="vita-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(65%_60%_at_35%_50%,rgba(5,7,13,0.92),transparent_80%)]"
      />

      <p className="label-tech">Werdegang</p>
      <SplitHeading
        as="h2"
        id="vita-heading"
        text="Drei Ausbildungen, die aufeinander zeigen."
        className="mt-4 max-w-3xl text-balance text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em]"
      />

      <div className="relative mt-16 pl-8 sm:pl-12">
        {/* Achse: unbelegt dunkel, belegt im Verlauf */}
        <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-blueprint-line" />
        <motion.div
          style={{ height }}
          className="absolute left-0 top-2 w-px bg-gradient-to-b from-signal-cyan to-signal-purple"
        />

        <ol className="space-y-14">
          {VITA.map((entry, i) => (
            <Reveal key={entry.title} delay={i * 0.06}>
              <li className="relative">
                <span
                  aria-hidden
                  className="absolute -left-8 top-2 size-2 -translate-x-1/2 rounded-full bg-signal-cyan ring-4 ring-blueprint-void sm:-left-12"
                />
                <p className="label-tech">{entry.period}</p>
                <h3 className="mt-2 text-2xl font-medium tracking-tight">
                  {entry.title}
                </h3>
                <p className="mt-1 font-mono text-[12px] text-signal-cyan">
                  {entry.org}
                </p>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
                  {entry.body}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Abbinder. Die Mailadresse ist das groesste Element der Seite - wer bis
 * hierher gescrollt hat, soll nicht nach einem Kontaktformular suchen.
 */
export function Outro() {
  return (
    <footer
      className="relative px-6 pb-16 pt-[16vh] sm:px-10 lg:px-16"
      aria-labelledby="outro-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(5,7,13,0.95)_30%)]"
      />

      <p className="label-tech">Kontakt</p>
      <SplitHeading
        as="h2"
        id="outro-heading"
        text="Reden wir über das nächste System."
        className="mt-4 max-w-3xl text-balance text-[clamp(2rem,5vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
        highlight={["System."]}
      />

      <Reveal delay={0.1}>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group mt-10 inline-flex items-center gap-4 border-b border-blueprint-line pb-3 transition-colors hover:border-signal-cyan"
        >
          <span className="font-mono text-[clamp(1rem,2.4vw,1.75rem)] text-ink-primary transition-colors group-hover:text-signal-cyan">
            {CONTACT_EMAIL}
          </span>
          <motion.span
            className="text-signal-cyan"
            initial={{ x: 0, y: 0 }}
            whileHover={{ x: 3, y: -3 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <ArrowUpRight className="size-6" strokeWidth={1.75} />
          </motion.span>
        </a>
      </Reveal>

      <div className="mt-20 flex flex-col gap-4 border-t border-blueprint-line/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="label-tech">
          © {new Date().getFullYear()} — gebaut mit Next.js, Three.js und der
          Web Audio API
        </span>
        <div className="flex items-center gap-6">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="label-tech transition-colors hover:text-signal-cyan"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
