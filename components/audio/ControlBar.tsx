"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Power, SlidersHorizontal } from "lucide-react";
import { FADERS, useAudioStore } from "@/lib/store/useAudioStore";
import { Fader } from "./Fader";
import { SpectrumMeter } from "./SpectrumMeter";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

/**
 * Das Mischpult.
 *
 * ## Warum es nicht mehr fest ueber der Seite liegt
 *
 * Vorher klebte diese Leiste unten rechts auf jedem Abschnitt. Damit
 * stand ein Regler auf dem Schirm, dessen Wirkung man an neun von zehn
 * Stellen der Seite gar nicht sehen konnte - und was man nicht wirken
 * sieht, ist kein Bedienelement, sondern Dekor. Es sass ausserdem den
 * ganzen Weg ueber dem Inhalt.
 *
 * Jetzt steht es im Signal-Kapitel, also genau dort, wo das Spektrum
 * daneben laeuft und man jeden Regler unmittelbar hoert und sieht. Was
 * fest bleibt, ist nur die Notbremse - siehe `AudioBadge`.
 *
 * Eingeklappt eine schmale Pille, ausgeklappt der volle Kanalzug-Satz.
 * Der Default bleibt eingeklappt: das Kapitel soll sich nicht selbst
 * zuschuetten.
 */
export function ControlBar() {
  const [open, setOpen] = useState(false);
  const isRunning = useAudioStore((s) => s.isRunning);
  const toggle = useAudioStore((s) => s.toggle);

  return (
    <div className="flex justify-start">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="panel"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {open && (
            <motion.div
              key="mixer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex items-end gap-5 px-5 pb-4 pt-5">
                {FADERS.map((spec) => (
                  <Fader key={spec.key} spec={spec} />
                ))}

                <div className="hidden flex-col gap-2 border-l border-rule pl-5 sm:flex">
                  <span className="meta">Analyser · 512 pt</span>
                  <SpectrumMeter running={isRunning} />
                  <span className="font-mono text-[10px] text-faint">
                    {isRunning ? "signal present" : "no input"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Kopfzeile: immer sichtbar ---------------------------- */}
        <div className="flex items-center gap-2 px-2 py-2">
          <button
            onClick={() => void toggle()}
            aria-pressed={isRunning}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors",
              isRunning
                ? "bg-accent text-paper"
                : "text-ink hover:bg-raise",
            )}
          >
            <Power className="size-4" strokeWidth={2} />
            {isRunning ? "Engine läuft" : "Audio starten"}
          </button>

          <div
            aria-hidden
            className={cn(
              "size-1.5 rounded-full transition-colors",
              isRunning ? "animate-pulse bg-accent" : "bg-faint",
            )}
          />

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-2 px-3 py-2 text-sm text-mute transition-colors hover:bg-raise hover:text-ink"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Mixer</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
