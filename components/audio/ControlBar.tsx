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
 * Eingeklappt eine schmale Pille, ausgeklappt der volle Kanalzug-Satz.
 * Der Default ist eingeklappt: ein Portfolio, das ungefragt ein Mischpult
 * ueber den Inhalt legt, ist ein Portfolio, das seinen Inhalt verdeckt.
 */
export function ControlBar() {
  const [open, setOpen] = useState(false);
  const isRunning = useAudioStore((s) => s.isRunning);
  const toggle = useAudioStore((s) => s.toggle);

  return (
    // Auf breiten Schirmen nach rechts gedockt: mittig wuerde die Leiste
    // ausgerechnet die Hinweiszeile im Viewport verdecken.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4 lg:justify-end lg:px-6">
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="glass-panel pointer-events-auto rounded-2xl"
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

                <div className="hidden flex-col gap-2 border-l border-blueprint-line/70 pl-5 sm:flex">
                  <span className="label-tech">Analyser · 512 pt</span>
                  <SpectrumMeter running={isRunning} />
                  <span className="font-mono text-[10px] text-ink-faint">
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
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
              isRunning
                ? "bg-signal-cyan text-blueprint-void"
                : "text-ink-primary hover:bg-white/5",
            )}
          >
            <Power className="size-4" strokeWidth={2} />
            {isRunning ? "Engine läuft" : "Audio starten"}
          </button>

          <div
            aria-hidden
            className={cn(
              "size-1.5 rounded-full transition-colors",
              isRunning ? "animate-pulse bg-signal-cyan" : "bg-ink-faint",
            )}
          />

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-white/5 hover:text-ink-primary"
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
