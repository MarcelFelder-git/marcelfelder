"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sceneState } from "@/lib/scene/state";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";
import type { ViewportMode } from "@/types";

const CHAPTERS: { id: ViewportMode; label: string }[] = [
  { id: "structure", label: "Structure" },
  { id: "signal", label: "Signal" },
  { id: "code", label: "Code" },
];

/**
 * Instrumententafel.
 *
 * Fortschrittsbalken, Kapitelnavigation und ein Live-Readout. Balken und
 * Readout werden per rAF direkt ins DOM geschrieben - sie aendern sich in
 * jedem Frame, und ein React-Render pro Frame waere hier reine Verschwendung.
 * Nur das aktive Kapitel laeuft ueber State, weil es sich selten aendert.
 */
export function Hud() {
  const barRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  const mode = useViewportMode((s) => s.mode);
  const setMode = useViewportMode((s) => s.setMode);

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
      {/* Fortschrittsbalken, ganz oben */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-px bg-blueprint-line/60">
        <div
          ref={barRef}
          className="h-full origin-left bg-gradient-to-r from-signal-cyan to-signal-purple"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* Kopfzeile. Der Verlauf dahinter ist kein Dekor: Inhalt scrollt
          unter ihr durch, und ohne Abdunklung kollidiert die Type. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-24 bg-gradient-to-b from-blueprint-void via-blueprint-void/70 to-transparent"
      />
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
        <a
          href="#top"
          className="pointer-events-auto font-mono text-sm font-medium tracking-tight text-ink-primary transition-colors hover:text-signal-cyan"
        >
          MF
        </a>
        <div className="flex items-center gap-4">
          <span className="label-tech hidden sm:inline">
            SCROLL <span ref={readoutRef}>000.0%</span>
          </span>
          <kbd className="pointer-events-auto rounded border border-blueprint-line bg-blueprint-void/60 px-2 py-1 font-mono text-[10px] text-ink-muted backdrop-blur-sm">
            ⌘K
          </kbd>
        </div>
      </header>

      {/* Kapitelnavigation, rechts mittig */}
      <nav
        aria-label="Kapitel"
        className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 lg:flex"
      >
        {CHAPTERS.map((c) => {
          const active = c.id === mode;
          return (
            <button
              key={c.id}
              onClick={() => setMode(c.id)}
              aria-current={active ? "true" : undefined}
              className="group flex items-center gap-3"
            >
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300",
                  active
                    ? "text-signal-cyan opacity-100"
                    : "text-ink-faint opacity-0 group-hover:opacity-100",
                )}
              >
                {c.label}
              </span>
              <span
                className={cn(
                  "block h-px transition-all duration-500",
                  active
                    ? "w-10 bg-signal-cyan"
                    : "w-4 bg-ink-faint group-hover:w-7 group-hover:bg-ink-muted",
                )}
              />
            </button>
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
 * wo die Last auf dem Tragwerk sitzt.
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
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="pointer-events-none fixed left-0 top-0 z-30 size-10"
    >
      <span className="absolute inset-0 rounded-full border border-signal-cyan/30" />
      <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-signal-cyan/50" />
      <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-signal-cyan/50" />
      <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-signal-cyan/50" />
      <span className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 bg-signal-cyan/50" />
    </motion.div>
  );
}
