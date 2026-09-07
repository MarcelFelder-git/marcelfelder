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
      // Wenig Luft nach oben, viel nach unten: das Manifest ist die
      // Fortsetzung des Heros, nicht der naechste Abschnitt.
      className="relative px-6 pb-[18vh] pt-[10vh] sm:px-10 lg:px-16"
      aria-label="Manifest"
    >
      {/* Gerichtet statt radial: der Text steht links, das Modell soll
          rechts frei bleiben. Ein zentriertes Radial verdeckt genau das
          Falsche. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 inset-y-0 -z-10 bg-[linear-gradient(100deg,rgba(var(--ground-rgb),0.97)_0%,rgba(var(--ground-rgb),0.93)_48%,rgba(var(--ground-rgb),0.45)_76%,transparent_100%)]"
      />

      {/* Schwelle statt Rubrikentitel — dieselbe Bauform wie vor den
          Projekten.
          "Prinzip" stand hier frueher als eigene Zeile ueber dem Text und
          kuendigte einen neuen Abschnitt an; zusammen mit "Projekte" kurz
          darauf las sich der Anfang als drei Anfaenge. Ganz weglassen war
          aber auch falsch: dann ging der Manifesttext ohne jede Kante aus
          dem Hero hervor, und zwei Textbloecke ohne Grenze sind kein
          Uebergang, sondern ein Durcheinander.
          Eine Haarlinie mit Miniaturbeschriftung ist beides nicht: sie
          gliedert, ohne eine zweite Ueberschrift zu behaupten. Und weil
          jeder Abschnittswechsel der Seite jetzt dieselbe Linie benutzt,
          liest sich das als System statt als Zierde. */}
      <div className="flex items-baseline gap-4 border-t border-rule pt-5">
        <p className="meta-accent shrink-0">Prinzip</p>
        <span aria-hidden className="h-px flex-1 bg-rule-soft" />
      </div>

      <div className="mt-14 max-w-4xl space-y-2">
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
