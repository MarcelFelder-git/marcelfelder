"use client";

import { create } from "zustand";
import type { ViewportMode } from "@/types";

interface ViewportState {
  mode: ViewportMode;
  /** Node-Index, über dem der Cursor im Structure-Mode schwebt (-1 = keiner). */
  hoveredNode: number;
  setMode: (mode: ViewportMode) => void;
  cycleMode: () => void;
  setHoveredNode: (index: number) => void;
}

const ORDER: ViewportMode[] = ["structure", "signal", "code"];

/**
 * Bewusst ein Store und kein Context: R3F rendert ausserhalb des React-Trees,
 * und useFrame darf pro Frame lesen, ohne ein Re-Render auszuloesen.
 */
export const useViewportMode = create<ViewportState>((set, get) => ({
  mode: "structure",
  hoveredNode: -1,
  setMode: (mode) => set({ mode, hoveredNode: -1 }),
  cycleMode: () => {
    const next = ORDER[(ORDER.indexOf(get().mode) + 1) % ORDER.length];
    set({ mode: next, hoveredNode: -1 });
  },
  setHoveredNode: (hoveredNode) => set({ hoveredNode }),
}));
