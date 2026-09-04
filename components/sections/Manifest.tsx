"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MANIFEST } from "@/content/resume";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Das Manifest wird nicht eingeblendet, sondern aufgedeckt: der
 * Scrollfortschritt innerhalb der Sektion schiebt eine Helligkeitsgrenze
 * Zeile fuer Zeile nach unten. Der Text ist die ganze Zeit da - nur eben
 * noch nicht gelesen.
 */
export function Manifest() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.4"],
  });

  return (
    <section
      ref={ref}
      // Teilt sich den Systemgraphen mit dem Hero: hier soll der
      // Hintergrund weiterlaufen, nicht auf ein Kapitelmotiv springen.
      data-hero
      className="relative px-6 py-[22vh] sm:px-10 lg:px-16"
      aria-label="Manifest"
    >
      {/* Gerichtet statt radial: der Text steht links, das Modell soll
          rechts frei bleiben. Ein zentriertes Radial verdeckt genau das
          Falsche. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 inset-y-0 -z-10 bg-[linear-gradient(100deg,rgba(var(--ground-rgb),0.97)_0%,rgba(var(--ground-rgb),0.93)_48%,rgba(var(--ground-rgb),0.45)_76%,transparent_100%)]"
      />

      <p className="meta mb-10">Prinzip</p>

      <div className="max-w-4xl space-y-2">
        {MANIFEST.map((line, i) => (
          <ManifestLine
            key={line.text}
            text={line.text}
            accent={line.accent}
            index={i}
            total={MANIFEST.length}
            progress={scrollYProgress}
            reduced={reduced}
          />
        ))}
      </div>
    </section>
  );
}

function ManifestLine({
  text,
  accent,
  index,
  total,
  progress,
  reduced,
}: {
  text: string;
  accent: boolean;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduced: boolean;
}) {
  // Jede Zeile bekommt ein eigenes Fenster im Scrollfortschritt, mit
  // Ueberlappung: waehrend Zeile n fertig aufhellt, faengt n+1 schon an.
  const start = index / total;
  const end = (index + 0.85) / total;

  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const x = useTransform(progress, [start, end], [reduced ? 0 : -24, 0]);

  return (
    <motion.p
      style={reduced ? undefined : { opacity, x }}
      className={cn(
        "text-[clamp(1.75rem,4.4vw,3.6rem)] font-medium leading-[1.15] tracking-[-0.02em]",
        accent ? "text-accent" : "text-ink",
      )}
    >
      {text}
    </motion.p>
  );
}
