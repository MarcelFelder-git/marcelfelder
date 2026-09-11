"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, FileDown } from "lucide-react";
import { PROFILE } from "@/content/resume";
import { CV_PATH, HERO_FACTS } from "@/content/site";
import { SplitHeading } from "@/components/motion/primitives";
import { EASE_OUT } from "@/lib/motion";

/**
 * Hier wechselten drei Felder durch: Frontend-Entwicklung, Tontechnik,
 * Bauingenieurwesen, mit Zaehler "01_03". Ein Gutachter nannte die Zeile
 * "ohne klaren Job", ein anderer suchte genau an dieser Stelle Rolle,
 * Stack und Verfuegbarkeit und fand ein Bild. Beide hatten recht: die
 * Zeile war Dekor an dem Ort, an dem Fakten hingehoeren.
 *
 * Die drei Felder stehen weiter im Eyebrow darueber und im Text darunter.
 * Diese Zeile sagt jetzt nur noch, was ein Recruiter in drei Sekunden
 * wissen will. Inhalt in content/site.ts.
 */
export function Hero() {

  // Der Hero faehrt beim Scrollen langsamer weg als die Seite und blendet
  // aus - dadurch uebernimmt die 3D-Szene die Buehne, statt dass Text und
  // Modell gemeinsam nach oben rutschen.
  const ref = useRef<HTMLElement>(null);

  /**
   * Gemessen an der EIGENEN Hoehe, nicht am Dokument.
   *
   * Vorher stand hier `useScroll()` ohne Ziel, also der Fortschritt der
   * ganzen Seite. Das Ausblenden lief damit ueber 10 % der Gesamtlaenge -
   * bei elf Bildschirmen sind das gut anderthalb. Der Hero hing also noch
   * halb im Bild, waehrend das Manifest darunter schon anfing: zwei
   * Textbloecke gleichzeitig, ohne Kante dazwischen. Und die Zahl driftete
   * bei jeder Aenderung der Seitenlaenge mit.
   *
   * Jetzt laeuft der Fortschritt von "Hero steht oben" bis "Hero ist
   * oben raus". Der Hero ist damit weg, bevor das Manifest da ist —
   * genau das ist der saubere Schnitt.
   */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const opacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);

  return (
    <section
      ref={ref}
      id="start"
      data-hero
      className="relative flex min-h-[100svh] flex-col justify-center px-6 py-24 sm:px-10 lg:px-16"
    >
      <motion.div style={{ y, opacity }} className="relative max-w-4xl">
        {/* Scrim: die Szene liegt direkt hinter der Type, ohne Abdunklung
            waere der Text auf hellen Stellen des Modells unlesbar. Ein
            gerichteter Verlauf statt eines Radials - er deckt die Textspalte
            zuverlaessig ab und laeuft nach rechts aus, wo das Modell frei
            stehen soll. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-24 -inset-y-28 -z-10 bg-[linear-gradient(102deg,rgba(var(--ground-rgb),0.97)_0%,rgba(var(--ground-rgb),0.94)_42%,rgba(var(--ground-rgb),0.55)_72%,transparent_100%)]"
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
          {/* Hier stand "Rev. 03" davor: die interne Nummer des
              Entwurfs, die aus dem Arbeitsprozess in den sichtbaren Text
              gerutscht war. Fuer Besucher ohne Bedeutung, also weg. */}
          Code · Signal · Structure
        </motion.div>

        <SplitHeading
          as="h1"
          text={PROFILE.claim}
          // Steht beim Laden immer im Bild und darf deshalb nicht auf
          // einen Sichtbereichs-Ausloeser warten. Siehe `immediate`.
          immediate
          delay={0.25}
          highlight={["hören", "kann."]}
          className="chromatic mt-7 text-balance text-[clamp(2.6rem,min(8vw,11.5vh),7rem)] font-semibold leading-[0.95] tracking-[-0.03em]"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 font-mono text-[13px]"
        >
          <span className="text-faint">$</span>
          {HERO_FACTS.map((fact, i) => (
            <span key={fact} className="flex items-baseline gap-x-3">
              {i > 0 && <span className="text-faint">·</span>}
              <span className={i === 0 ? "text-ink" : "text-mute"}>{fact}</span>
            </span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05, ease: EASE_OUT }}
          className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-mute"
        >
          {PROFILE.summary}
        </motion.p>

        {/* Direkter Weg zu den Projekten - wer eine Stelle zu besetzen
            hat, soll nicht erst durch drei Kapitel scrollen muessen. */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2, ease: EASE_OUT }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <a
            href="#projects"
            className="group flex items-center gap-2 bg-accent px-5 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-px"
          >
            Projekte ansehen
            <ArrowDown
              className="size-4 transition-transform group-hover:translate-y-0.5"
              strokeWidth={2}
            />
          </a>
          {/* Zweiter Weg, bewusst leiser: wer nur den Lebenslauf will,
              soll ihn hier finden, ohne die Fahrt zu machen. Der
              Recruiter im Gutachten hat genau das gesucht. */}
          <a
            href={CV_PATH}
            download="Marcel-Felder-Lebenslauf.pdf"
            className="flex items-center gap-2 border border-rule px-5 py-3 text-sm text-ink transition-colors hover:border-ink"
          >
            Lebenslauf
            <FileDown className="size-4" strokeWidth={1.75} />
          </a>
        </motion.div>
      </motion.div>

      {/* --- Fusszeile des Heros ------------------------------------ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute inset-x-6 bottom-24 flex items-end justify-between sm:inset-x-10 sm:bottom-8 lg:inset-x-16"
      >
        <div className="flex items-center gap-3">
          <ArrowDown
            className="size-4 animate-bounce text-accent"
            strokeWidth={2}
          />
          <span className="meta">Scrollen bewegt die Kamera</span>
        </div>

        <span className="meta hidden text-right sm:block">
          Signale laufen
          <br />
          durch den Graphen
        </span>
      </motion.div>
    </section>
  );
}
