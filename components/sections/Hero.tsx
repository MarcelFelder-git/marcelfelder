"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { PROFILE } from "@/content/resume";
import { ScrambleText, SplitHeading } from "@/components/motion/primitives";
import { EASE_OUT } from "@/lib/motion";

const ROLES = ["BAUINGENIEUR", "TONTECHNIKER", "FULLSTACK-ENTWICKLER"];

export function Hero() {
  const [role, setRole] = useState(0);

  // Die Rolle wechselt langsam genug, dass man sie liest, und schnell genug,
  // dass man alle drei mitbekommt, bevor man weiterscrollt.
  useEffect(() => {
    const id = window.setInterval(
      () => setRole((r) => (r + 1) % ROLES.length),
      2900,
    );
    return () => window.clearInterval(id);
  }, []);

  // Der Hero faehrt beim Scrollen langsamer weg als die Seite und blendet
  // aus - dadurch uebernimmt die 3D-Szene die Buehne, statt dass Text und
  // Modell gemeinsam nach oben rutschen.
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.14], [0, -90]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <section
      data-chapter="structure"
      className="relative flex min-h-[100svh] flex-col justify-center px-6 pb-28 pt-28 sm:px-10 lg:px-16"
    >
      <motion.div style={{ y, opacity }} className="relative max-w-4xl">
        {/* Scrim: die Szene liegt direkt hinter der Type, ohne Abdunklung
            waere der Text auf hellen Stellen des Modells unlesbar. Ein
            gerichteter Verlauf statt eines Radials - er deckt die Textspalte
            zuverlaessig ab und laeuft nach rechts aus, wo das Modell frei
            stehen soll. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-24 -inset-y-28 -z-10 bg-[linear-gradient(102deg,rgba(10,10,11,0.97)_0%,rgba(10,10,11,0.94)_42%,rgba(10,10,11,0.55)_72%,transparent_100%)]"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
          className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-accent"
        >
          <span
            className="size-1.5 rounded-full bg-accent"
            style={{ animation: "blink 2.4s ease-in-out infinite" }}
          />
          Rev. 02 — Structure · Signal · Code
        </motion.div>

        <SplitHeading
          as="h1"
          text={PROFILE.claim}
          delay={0.25}
          highlight={["hören", "kann."]}
          className="mt-7 text-balance text-[clamp(2.6rem,8vw,7rem)] font-semibold leading-[0.95] tracking-[-0.03em]"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 font-mono text-sm"
        >
          <span className="text-faint">$</span>
          <ScrambleText
            key={ROLES[role]}
            text={ROLES[role]}
            className="text-ink"
          />
          <span className="text-faint">
            /{" "}
            {String(role + 1).padStart(2, "0")}
            <span className="text-faint/60">
              _{String(ROLES.length).padStart(2, "0")}
            </span>
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05, ease: EASE_OUT }}
          className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-mute"
        >
          {PROFILE.summary}
        </motion.p>
      </motion.div>

      {/* --- Fusszeile des Heros ------------------------------------ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute inset-x-6 bottom-24 flex items-end justify-between sm:inset-x-10 sm:bottom-8 lg:inset-x-16"
      >
        <div className="flex items-center gap-3">
          <ArrowDown className="size-4 animate-bounce text-accent" strokeWidth={2} />
          <span className="meta">Scrollen bewegt die Kamera</span>
        </div>

        <span className="meta hidden text-right sm:block">
          Zeiger belastet
          <br />
          das Tragwerk
        </span>
      </motion.div>
    </section>
  );
}
