"use client";

import { create } from "zustand";
import type { ViewportMode } from "@/types";

interface ViewportState {
  /** Das Kapitel, in dem der Nutzer gerade steht. Nur fuer UI-Beschriftung. */
  mode: ViewportMode;
  /** Sprungziel, das der ScrollDriver anfaehrt (Command Palette, Nav). */
  setMode: (mode: ViewportMode) => void;
}

/**
 * Nur noch fuer alles, was ein Re-Render braucht: HUD-Label, Kapitelnavigation,
 * Hinweistexte. Die Szene selbst liest ihre Gewichte pro Frame aus
 * `sceneState` und laesst React dabei komplett aussen vor.
 */
export const useViewportMode = create<ViewportState>((set) => ({
  mode: "structure",
  setMode: (mode) => {
    set({ mode });
    if (typeof document !== "undefined") {
      // Der Hero traegt dieselbe Kennung wie Kapitel 01 - angesteuert wird
      // das letzte Vorkommen, also der echte Kapitelabschnitt.
      const els = document.querySelectorAll(`[data-chapter="${mode}"]`);
      els[els.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },
}));
