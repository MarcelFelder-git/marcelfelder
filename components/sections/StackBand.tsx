"use client";

import { Marquee } from "@/components/motion/primitives";
import { STACK_MARQUEE, STACK_MARQUEE_B } from "@/content/resume";

/**
 * Zwei gegenlaeufige Laufbaender mit dem Werkzeugkasten.
 *
 * Was hier nicht mehr steht, ist genauso wichtig wie das, was steht: die
 * Sektion hiess frueher "Werkzeugkasten", hatte eine eigene Ueberschrift
 * und vier grosse Kennzahlen darunter. Die Ueberschrift war die dritte in
 * Folge, und die Zahlen sagten ueber das Projekt, was die Projekte selbst
 * schon zeigen.
 *
 * Uebrig bleibt das Band — und das steht jetzt an der Stelle, an der es
 * etwas tut: zwischen den Projekten und den drei Kapiteln. Erst die
 * Namen, dann drei Abschnitte, die sie erklaeren. Ein Band ist keine
 * Sektion, sondern eine Schwelle, und genau so ist es gebaut: keine
 * Ueberschrift, keine Polsterung, nur zwei Linien und die Bewegung
 * dazwischen.
 */
export function StackBand() {
  return (
    <section
      className="relative py-[7vh]"
      aria-label="Werkzeugkasten"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(var(--ground-rgb),0.92)_22%,rgba(var(--ground-rgb),0.92)_78%,transparent)]"
      />

      <div className="space-y-3 border-y border-rule py-5">
        <Marquee items={STACK_MARQUEE} duration={46} />
        <Marquee items={STACK_MARQUEE_B} duration={54} reverse />
      </div>
    </section>
  );
}
