"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sceneState } from "@/lib/scene/state";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import { CHAPTERS as CONTENT_CHAPTERS } from "@/content/resume";

/**
 * Seitenregister.
 *
 * Frueher standen hier nur die drei Kapitel, und der aktive Eintrag kam
 * aus dem Kapitel-Store. Der kennt aber nur Kapitel: im Hero und in den
 * Projekten blieb deshalb "Structure" markiert, also ein Abschnitt, der
 * hunderte Prozent Scrollweg entfernt lag. Ein Register, das auf etwas
 * zeigt, wo man nicht ist, ist schlimmer als keins.
 *
 * Jetzt sind alle Abschnitte drin, und der aktive wird direkt gemessen.
 * Die Reihenfolge ist die der Seite; die drei Kapitel kommen aus dem
 * Inhalt, damit das Register nicht auseinanderlaeuft, wenn sich dort
 * etwas aendert.
 */
const NAV_SECTIONS: { id: string; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "projects", label: "Projekte" },
  { id: "fundament", label: "Fundament" },
  ...[...CONTENT_CHAPTERS]
    .sort((a, b) => a.index.localeCompare(b.index))
    .map((c) => ({ id: c.id, label: c.label })),
  { id: "kontakt", label: "Kontakt" },
];

/**
 * Welcher Abschnitt gerade den Bildschirm fuellt.
 *
 * Bewertet wird die BEDECKUNG in Pixeln, nicht der Anteil des Abschnitts
 * selbst. Der Unterschied ist wichtig, weil die Abschnitte sehr
 * unterschiedlich hoch sind: der Projekttunnel ist gut vier Bildschirme
 * lang, der Kontakt einen halben. Nach Anteil gerechnet gewinnt immer
 * der kurze, obwohl der lange den ganzen Blick fuellt.
 *
 * Gemessen wird auf `scroll` und `resize`, jeweils auf den naechsten
 * Frame gebuendelt. Sieben Rechtecke pro Frame kosten nichts, und es
 * spart einen zweiten Beobachter neben dem, der ohnehin schon laeuft.
 */
function useActiveSection() {
  const [active, setActive] = useState(NAV_SECTIONS[0].id);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      let best = NAV_SECTIONS[0].id;
      let bestCover = -1;

      for (const section of NAV_SECTIONS) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cover = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        if (cover > bestCover) {
          bestCover = cover;
          best = section.id;
        }
      }
      setActive((prev) => (prev === best ? prev : best));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return active;
}

/**
 * Instrumententafel.
 *
 * Fortschrittsbalken, Kapitelnavigation und ein Live-Readout. Balken und
 * Readout werden per rAF direkt ins DOM geschrieben - sie aendern sich in
 * jedem Frame, und ein React-Render pro Frame waere hier reine Verschwendung.
 * Nur der aktive Abschnitt laeuft ueber State, weil er sich selten aendert.
 */
export function Hud() {
  const barRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  const activeSection = useActiveSection();

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const p = sceneState.progress;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${p})`;
      }
      if (readoutRef.current) {
        readoutRef.current.textContent = `${(p * 100).toFixed(1).padStart(5, "0")}%`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      {/* Fortschrittsbalken, ganz oben — 2px, keine Rundung, ein Ton */}
      <div
        data-chrome="topbar"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 bg-rule"
      >
        <div
          ref={barRef}
          className="h-full origin-left bg-accent"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* Kopfzeile. Der Verlauf dahinter ist kein Dekor: Inhalt scrollt
          unter ihr durch, und ohne Abdunklung kollidiert die Type. */}
      <div
        aria-hidden
        data-chrome="topbar"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-paper via-paper/75 to-transparent"
      />
      <header
        data-chrome="topbar"
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16"
      >
        <a
          href="#top"
          className="pointer-events-auto font-mono text-sm font-medium tracking-tight text-ink transition-colors hover:text-accent"
        >
          MF
        </a>
        <div className="flex items-center gap-4">
          <span className="meta hidden sm:inline">
            SCROLL <span ref={readoutRef}>000.0%</span>
          </span>
          <kbd className="pointer-events-auto border border-rule bg-paper px-2 py-1 font-mono text-[10px] text-mute">
            ⌘K
          </kbd>
        </div>
      </header>

      {/* Kapitelnavigation, rechts mittig — nummeriert wie ein Register,
          nicht wie ein Tab-Set. */}
      {/* Echte Sprungmarken statt Schaltflaechen mit scrollIntoView:
          Links lassen sich mit der Tastatur ansteuern, in einem neuen
          Tab oeffnen und kopieren, und sie funktionieren auch, wenn das
          JavaScript noch nicht geladen ist. */}
      <nav
        aria-label="Seitenregister"
        // Nicht `scene`, sondern `topbar`: das Register verschwindet im
        // hellen Abschnitt nicht, es faerbt sich um. Ausgerechnet dort
        // waere "Kontakt" der aktive Eintrag, und ein Register, das
        // genau dann weg ist, wenn man am Ziel steht, ist keins.
        data-chrome="topbar"
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
      >
        {NAV_SECTIONS.map((section) => {
          const current = section.id === activeSection;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={current ? "true" : undefined}
              className="group flex items-center gap-3"
            >
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300",
                  current ? "text-ink" : "text-faint group-hover:text-mute",
                )}
              >
                {section.label}
              </span>
              <span
                className={cn(
                  "block h-px transition-all duration-500",
                  current
                    ? "w-10 bg-accent"
                    : "w-4 bg-faint group-hover:w-7 group-hover:bg-mute",
                )}
              />
            </a>
          );
        })}
      </nav>
    </>
  );
}

/**
 * Fadenkreuz-Reticle, das dem Zeiger traege folgt.
 *
 * Der native Cursor bleibt bewusst sichtbar - ihn zu verstecken macht eine
 * Seite schick und unbedienbar. Das Reticle liegt nur daneben und markiert,
 * wo die Last auf dem Tragwerk sitzt. Eckmarken statt Kreis - ein Fadenkreuz
 * ist ein Messwerkzeug, kein Aufkleber.
 */
export function Reticle() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Auf Touch-Geraeten gibt es keinen Zeiger, den man markieren koennte.
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { ...pos };
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  if (!enabled) return null;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      data-chrome="scene"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="pointer-events-none fixed left-0 top-0 z-30 size-10"
    >
      {/* vier Eckwinkel statt eines Kreises */}
      <span className="absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-accent/50" />
      <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-accent/50" />
      <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-accent/50" />
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-accent/50" />
      <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 bg-accent" />
    </motion.div>
  );
}
