"use client";

import { create } from "zustand";

/**
 * Ob die Befehlspalette offen ist.
 *
 * Lag als useState in der Palette selbst. Damit konnte nur die Tastatur
 * sie oeffnen - und der Hinweis oben rechts war ein Schild, kein
 * Schalter. Auf dem Telefon gibt es keine Tastenkombination; dort war die
 * Palette schlicht unerreichbar. Jetzt kann auch die Kopfzeile schalten.
 */
interface PaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const usePalette = create<PaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
