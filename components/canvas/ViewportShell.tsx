"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { AudioWaveform, Boxes, Braces } from "lucide-react";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { useAudioStore } from "@/lib/store/useAudioStore";
import { cn } from "@/lib/utils";
import type { ViewportMode } from "@/types";

/**
 * Three.js kennt kein Server-Rendering, und das WebGL-Bundle darf den
 * First Paint nicht blockieren. Deshalb ssr:false plus ein Fallback, der
 * exakt die Flaeche des Canvas belegt - kein Layout-Shift beim Nachladen.
 */
const SceneCanvas = dynamic(() => import("./SceneCanvas"), {
  ssr: false,
  loading: () => <ViewportFallback />,
});

const TABS: {
  id: ViewportMode;
  label: string;
  Icon: typeof Boxes;
  hint: string;
}[] = [
  {
    id: "structure",
    label: "Structure",
    Icon: Boxes,
    hint: "Knoten überfahren, um eine Einzellast aufzubringen",
  },
  {
    id: "signal",
    label: "Signal",
    Icon: AudioWaveform,
    hint: "Audio starten, um das Spektrum zu speisen",
  },
  {
    id: "code",
    label: "Code",
    Icon: Braces,
    hint: "Compile-Sweep durch drei Komponentenebenen",
  },
];

function ViewportFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan" />
        Initialisiere Scene Graph
      </div>
    </div>
  );
}

export function ViewportShell() {
  const mode = useViewportMode((s) => s.mode);
  const setMode = useViewportMode((s) => s.setMode);
  const audioRunning = useAudioStore((s) => s.isRunning);

  const active = TABS.find((t) => t.id === mode)!;
  // Die Aufforderung zum Starten waere albern, wenn die Engine schon laeuft.
  const hint =
    mode === "signal" && audioRunning
      ? "Live-Spektrum · 512-pt FFT · Winkel = Frequenz"
      : active.hint;

  return (
    <div className="relative">
      <div className="glass-panel corner-ticks relative aspect-square overflow-hidden rounded-panel sm:aspect-[4/3] lg:aspect-[5/4]">
        {/* Raster liegt UNTER dem Canvas und scheint durch dessen Alpha durch */}
        <div className="absolute inset-0 blueprint-grid opacity-50" />

        <SceneCanvas />

        {/* --- HUD ------------------------------------------------- */}
        <div className="pointer-events-none absolute inset-0 p-5">
          <div className="flex items-start justify-between">
            <span className="label-tech">Viewport / WebGL</span>
            <span className="label-tech text-signal-cyan">
              MODE_{mode.toUpperCase()}
            </span>
          </div>

          <div className="absolute inset-x-5 bottom-5">
            {/* key erzwingt Remount -> die Einblendung laeuft neu an.
                Ohne AnimatePresence, weil ein haengendes exit hier die
                neue Zeile blockieren wuerde. */}
            <motion.p
              key={hint}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="max-w-[62%] font-mono text-[11px] leading-snug text-ink-muted"
            >
              {hint}
            </motion.p>
          </div>
        </div>
      </div>

      {/* --- Modus-Umschalter ------------------------------------- */}
      <div
        role="tablist"
        aria-label="3D-Viewport-Modus"
        className="glass-panel mt-3 grid grid-cols-3 gap-1 rounded-panel p-1"
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === mode;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(id)}
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-blueprint-void"
                  : "text-ink-muted hover:text-ink-primary",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="viewport-tab"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-signal-cyan"
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="size-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
