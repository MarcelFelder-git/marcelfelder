"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  MANIFEST,
  STACK_MARQUEE,
  STACK_MARQUEE_B,
  VITA,
} from "@/content/resume";
import { Marquee, Reveal } from "@/components/motion/primitives";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Das Fundament: die These, die die drei Kapitel zusammenhaelt, und
 * darunter der Werkzeugkasten als Laufband.
 *
 * ## Warum das hier steht und nicht mehr oben
 *
 * Der Text stand frueher direkt hinter dem Hero. Damit lagen zwischen
 * "wer bin ich" und "was habe ich gebaut" zwei Ueberschriftenbloecke,
 * und wer eine Stelle zu besetzen hat, will genau dazwischen nichts
 * lesen. Jetzt kommen erst die Projekte, und die These steht da, wo sie
 * gebraucht wird: als Auftakt zu den drei Disziplinen, die sie erklaert.
 *
 * Das Laufband ist aus demselben Grund hier gelandet statt in einer
 * eigenen Sektion. Erst die These, dann die Namen der Werkzeuge, dann
 * drei Kapitel, die beides ausfuehren. Das ist ein Abschnitt, nicht
 * drei.
 *
 * Der Text wird nicht eingeblendet, sondern aufgedeckt: der
 * Scrollfortschritt innerhalb der Sektion schiebt eine Helligkeitsgrenze
 * Zeile fuer Zeile nach unten. Er ist die ganze Zeit da, nur eben noch
 * nicht gelesen.
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
      id="fundament"
      // Kein `data-hero` mehr: der Abschnitt liegt jetzt hinter dem
      // Tunnel. Er beansprucht den Hintergrund gar nicht, dadurch bleibt
      // die Korridorszene stehen und klingt aus, waehrend man liest.
      className="relative px-6 pb-[12vh] pt-[10vh] sm:px-10 lg:px-16"
      aria-label="Fundament"
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
        <p className="meta-accent shrink-0">Fundament</p>
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

      {/* Werdegang als Band, nicht als Zeitleiste.
          Am Seitenende stand er als hoher, hellgrundiger Abschnitt mit
          vier Absaetzen zwischen der Fahrt und dem Kontakt. Das war
          doppelt falsch: es war zu viel Text an der Stelle, an der man
          eigentlich schon anrufen will, und es hat den Schluss von einer
          Seite mit einem Ziel in eine mit zweien verwandelt.
          Hier gehoert er hin, direkt unter die These, die er belegt: vier
          Stationen, je vier Zeilen, dieselbe Rasterform wie das
          Projektregister. Auf dunklem Grund, mitten in der Fahrt. */}
      <Track />

      {/* Zwei gegenlaeufige Laufbaender mit dem Werkzeugkasten. Sie
          stehen bewusst unter der These und nicht in einer eigenen
          Sektion: erst der Satz, dann die Namen, dann die drei Kapitel,
          die beides ausfuehren. Die negativen Raender heben die
          Seitenpolsterung auf, damit die Baender ueber die volle Breite
          laufen. */}
      <div className="-mx-6 mt-16 space-y-3 border-y border-rule py-5 sm:-mx-10 lg:-mx-16">
        <Marquee items={STACK_MARQUEE} duration={46} />
        <Marquee items={STACK_MARQUEE_B} duration={54} reverse />
      </div>
    </section>
  );
}

/**
 * Vier Stationen nebeneinander statt untereinander.
 *
 * Entwuerfe (siehe `VitaEntry.draft`) fallen weg; bleibt nichts uebrig,
 * faellt das ganze Band weg. Eine Station, in der "eintragen" steht, ist
 * schlechter als keine.
 */
function Track() {
  const entries = VITA.filter((entry) => !entry.draft);
  if (entries.length === 0) return null;

  return (
    <div className="mt-20">
      <div className="flex items-baseline gap-4 border-t border-rule pt-5">
        <p className="meta-accent shrink-0">Werdegang</p>
        <span aria-hidden className="h-px flex-1 bg-rule-soft" />
        <p className="meta shrink-0">
          {entries[0].period.split(" ")[0]} bis heute
        </p>
      </div>

      <ol className="mt-8 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry, i) => (
          <Reveal key={entry.title} delay={i * 0.06} y={16}>
            <li className="h-full bg-surface/80 p-5">
              <p className="meta">{entry.period}</p>
              <h3 className="mt-2 text-[15px] font-medium leading-snug text-ink">
                {entry.title}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-accent">
                {entry.org}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
                {entry.body}
              </p>
            </li>
          </Reveal>
        ))}
      </ol>
    </div>
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
