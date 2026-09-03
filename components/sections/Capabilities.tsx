"use client";

import {
  Counter,
  Marquee,
  ParallaxY,
  Reveal,
  SplitHeading,
} from "@/components/motion/primitives";
import {
  STACK_MARQUEE,
  STACK_MARQUEE_B,
  SYSTEM_SPECS,
} from "@/content/resume";

/**
 * Zwei gegenlaeufige Laufbaender plus die Kennzahlen dieser Seite.
 *
 * Die Zahlen sind bewusst ueber das Projekt selbst und nicht ueber
 * Berufsjahre: sie sind im Quelltext nachpruefbar. Ein Portfolio, das seine
 * eigenen Behauptungen belegen kann, braucht keine Superlative.
 */
export function Capabilities() {
  return (
    <section
      className="relative py-[16vh]"
      aria-labelledby="capabilities-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(8,9,14,0.94)_18%,rgba(8,9,14,0.94)_82%,transparent)]"
      />

      <div className="px-6 sm:px-10 lg:px-16">
        <p className="meta">Werkzeugkasten</p>
        <SplitHeading
          as="h2"
          id="capabilities-heading"
          text="Drei Werkzeugkästen, ein Kopf."
          className="mt-4 max-w-2xl text-balance text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em]"
        />
      </div>

      <div className="mt-12 space-y-4 border-y border-rule py-6">
        <Marquee items={STACK_MARQUEE} duration={46} />
        <Marquee items={STACK_MARQUEE_B} duration={54} reverse />
      </div>

      <div className="px-6 sm:px-10 lg:px-16">
        <ParallaxY distance={34} className="mt-16">
          <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {SYSTEM_SPECS.map((spec, i) => (
              <Reveal
                key={spec.label}
                delay={i * 0.07}
                className="group bg-surface p-7 transition-colors hover:bg-raise"
              >
                <dd className="font-mono text-[clamp(2.2rem,4vw,3.2rem)] font-semibold leading-none tracking-tight text-ink">
                  <Counter to={spec.value} />
                  <span className="text-accent">{spec.suffix}</span>
                </dd>
                <dt className="mt-4 text-sm font-medium text-ink">
                  {spec.label}
                </dt>
                <p className="mt-1.5 text-[13px] leading-relaxed text-faint">
                  {spec.note}
                </p>
              </Reveal>
            ))}
          </dl>
        </ParallaxY>
      </div>
    </section>
  );
}
