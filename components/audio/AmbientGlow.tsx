"use client";

import { useEffect } from "react";
import { audioEngine } from "@/lib/audio/engine";
import { useAudioStore } from "@/lib/store/useAudioStore";

/** Cyan -> Violett, abhaengig von der Filterfrequenz. */
const COLD = [56, 189, 248] as const;
const WARM = [168, 85, 247] as const;

/**
 * Verbindet den Audiograph mit der UI-Beleuchtung.
 *
 * Bewusst ueber CSS-Custom-Properties statt React-State: der Pegel aendert
 * sich 60-mal pro Sekunde, ein setState pro Frame wuerde den kompletten
 * Baum durchrendern. So schreibt eine einzige rAF-Schleife zwei Variablen
 * ins Root-Element, und die Composited-Layer erledigen den Rest.
 */
export function AmbientGlow() {
  const isRunning = useAudioStore((s) => s.isRunning);
  const cutoff = useAudioStore((s) => s.params.cutoff);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = COLD.map((c, i) => Math.round(c + (WARM[i] - c) * cutoff));
    root.style.setProperty("--audio-glow", rgb.join(" "));
  }, [cutoff]);

  useEffect(() => {
    const root = document.documentElement;

    if (!isRunning) {
      root.style.setProperty("--audio-level", "0");
      return;
    }

    let frame = 0;
    let smoothed = 0;

    const tick = () => {
      const level = audioEngine.getLevel();
      // Traege Glaettung: das Licht soll atmen, nicht zucken.
      smoothed += (level - smoothed) * 0.08;
      root.style.setProperty("--audio-level", smoothed.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      root.style.setProperty("--audio-level", "0");
    };
  }, [isRunning]);

  return null;
}
