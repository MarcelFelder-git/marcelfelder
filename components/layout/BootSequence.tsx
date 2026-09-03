"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const LINES = [
  "init scene graph",
  "load lattice — 100 nodes / 476 members",
  "build audio graph — 3 osc → biquad → analyser",
  "compile shaders",
  "ready",
];

const STEP_MS = 190;

/**
 * Kurze Boot-Sequenz.
 *
 * Zwei Sekunden, nicht mehr - eine Intro-Animation, die den Inhalt laenger
 * aufhaelt, als sie Eindruck macht, ist ein Eigentor. Sie laeuft einmal pro
 * Sitzung; wer zurueckkommt, sieht sofort die Seite. Bei reduzierter
 * Bewegung entfaellt sie ganz.
 */
export function BootSequence() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("mf-booted") === "1";
    } catch {
      // Privater Modus o.ae. - dann laeuft die Sequenz eben jedes Mal.
    }
    if (seen) return;

    setActive(true);
    document.body.style.overflow = "hidden";

    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= LINES.length) {
          window.clearInterval(id);
          return s;
        }
        return s + 1;
      });
    }, STEP_MS);

    const done = window.setTimeout(
      () => {
        setActive(false);
        document.body.style.overflow = "";
        try {
          sessionStorage.setItem("mf-booted", "1");
        } catch {
          /* ignorieren */
        }
      },
      LINES.length * STEP_MS + 420,
    );

    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
      document.body.style.overflow = "";
    };
  }, [reduced]);

  const progress = Math.min(1, step / LINES.length);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="boot"
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: EASE_OUT }}
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-paper p-8 sm:p-14"
        >
          <div className="absolute inset-0 column-grid opacity-60" />

          <div className="relative max-w-lg font-mono text-[12px] leading-relaxed">
            {LINES.slice(0, step).map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  i === LINES.length - 1 ? "text-accent" : "text-faint"
                }
              >
                <span className="text-faint">
                  [{String(i + 1).padStart(2, "0")}]
                </span>{" "}
                {line}
              </motion.p>
            ))}
          </div>

          <div className="relative mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-rule">
              <motion.div
                className="h-full origin-left bg-accent"
                animate={{ scaleX: progress }}
                style={{ transformOrigin: "left" }}
                transition={{ duration: 0.18, ease: "linear" }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-accent">
              {String(Math.round(progress * 100)).padStart(3, "0")}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
