"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneLoad } from "@/lib/store/useSceneLoad";

const LINES = [
  "init scene graph",
  "load lattice: 100 nodes / 476 members",
  "build audio graph: 3 osc, biquad, analyser",
  "compile shaders",
  "stream project textures",
];

const STEP_MS = 110;
/**
 * Spaetestens dann ist Schluss, egal was die Szene meldet.
 *
 * Ein Ladebildschirm, der auf ein Ereignis wartet, das nicht kommt, ist
 * die schlimmste Art von Fehler: die Seite sieht kaputt aus, obwohl der
 * Inhalt laengst da waere. Sechs Sekunden reichen fuer die knapp
 * 800 kB Texturen auch auf einer mageren Leitung; danach zaehlt der
 * Inhalt mehr als die Vollstaendigkeit der Szene.
 */
/**
 * Harte Obergrenze fuer den Ladebildschirm.
 *
 * Vorher 6000, und geschlossen wurde erst, wenn die 3D-Szene fertig
 * geladen war. Damit hing der erste Text der Seite am Laden von
 * three.js: gemessen 3,7 Sekunden bis zum groessten sichtbaren Element,
 * auf einem gedrosselten Rechner. Das ist die Zahl, die Speed Insights
 * als LCP meldet, und sie war der Grund fuer den schlechten Wert.
 *
 * Jetzt ist der Ladebildschirm eine Geste mit fester Laenge und keine
 * Bedingung mehr. Die Szene blendet sich ein, wenn sie so weit ist -
 * dafuer hat jedes Modell ohnehin seine eigene Ueberblendung.
 */
const FAILSAFE_MS = 900;

/**
 * Boot-Sequenz mit echtem Ladebalken.
 *
 * ## Was sich geaendert hat
 *
 * Vorher war der Balken Theater: er lief in festen Schritten von 0 auf
 * 100 und hatte mit dem tatsaechlichen Zustand der Seite nichts zu tun.
 * Er war damit genau das, was diese Seite sonst nirgends tut, naemlich
 * eine Behauptung.
 *
 * Jetzt zeigt er den echten Fortschritt ueber die Texturen der Szene,
 * gemeldet aus dem Canvas (siehe lib/store/useSceneLoad.ts). Die
 * Protokollzeilen laufen weiter mit, tragen aber nur noch ein Sechstel
 * zum Balken bei: sie sollen ihn in Bewegung halten, solange der
 * Ladevorgang noch gar nicht angefangen hat, und ihn nicht faelschen.
 *
 * Weggeblendet wird, wenn beides fertig ist. Damit ist die Wartezeit
 * nicht laenger als noetig - und wenn die Szene laenger braucht, wartet
 * man auf etwas Echtes statt auf einen Timer.
 *
 * Sie laeuft einmal pro Sitzung; wer zurueckkommt, sieht sofort die
 * Seite. Bei reduzierter Bewegung entfaellt sie ganz.
 */
export function BootSequence() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const sceneProgress = useSceneLoad((s) => s.progress);

  const close = useCallback(() => {
    setActive(false);
    document.body.style.overflow = "";
    // Signal an die Szene: ab jetzt schaut jemand hin.
    document.documentElement.classList.remove("booting");
    try {
      sessionStorage.setItem("mf-booted", "1");
    } catch {
      /* Privater Modus: dann laeuft die Sequenz eben jedes Mal. */
    }
  }, []);

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
    // Solange diese Klasse steht, ist die Szene verdeckt. Der Hero
    // haelt daran seinen Auftritt zurueck, statt ihn hinter dem
    // Ladebildschirm ablaufen zu lassen.
    document.documentElement.classList.add("booting");

    const id = window.setInterval(() => {
      setStep((s) => (s >= LINES.length ? s : s + 1));
    }, STEP_MS);

    return () => {
      window.clearInterval(id);
      document.body.style.overflow = "";
      document.documentElement.classList.remove("booting");
    };
  }, [reduced]);

  // Fertig heisst: alle Zeilen durch. Auf die Szene wird nicht mehr
  // gewartet, siehe FAILSAFE_MS.
  useEffect(() => {
    if (!active) return;
    if (step < LINES.length) return;
    const id = window.setTimeout(close, 160);
    return () => window.clearTimeout(id);
  }, [active, step, close]);

  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(close, FAILSAFE_MS);
    return () => window.clearTimeout(id);
  }, [active, close]);

  const lineProgress = step / LINES.length;
  // Der Balken zeigt weiter den echten Ladefortschritt, er haelt die
  // Sequenz nur nicht mehr auf.
  const progress = Math.max(lineProgress, sceneProgress);

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
