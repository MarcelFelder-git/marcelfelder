"use client";

import { create } from "zustand";

/**
 * Qualitaetsstufe der Szene.
 *
 * Auf einem Windows-Rechner mit dedizierter Grafikkarte lief alles rund,
 * auf einem MacBook war die Seite eine Diashow. Die Szene rendert sonst
 * stur in voller Aufloesung, mit achtfachem Multisampling und drei
 * Nachbearbeitungspaessen, egal was die Grafikkarte hergibt.
 *
 * Zwei Stufen, mehr braucht es nicht:
 *
 *   high  - DPR bis 1.75, 2x MSAA, Bloom, Farbversatz, Vignette
 *   low   - DPR 1, kein MSAA, nur Bloom und Vignette
 *
 * Die Stufe wird zweimal bestimmt. Beim Start ueber die Grafikkarte:
 * eine integrierte Intel-GPU oder ein Geraet mit wenigen Kernen faengt
 * unten an, statt erst einzubrechen. Und dann fortlaufend ueber die
 * gemessene Bildrate (PerformanceMonitor in BackgroundScene): faellt sie
 * unter die Schwelle, geht es nach unten, und dabei bleibt es - ein
 * Hin und Her zwischen den Stufen waere schlimmer als eine niedrige.
 *
 * Die Entscheidung wird in sessionStorage gemerkt, damit ein Neuladen
 * nicht erst wieder ruckelt, bevor es reagiert.
 */
export type QualityTier = "high" | "low";

interface QualityState {
  tier: QualityTier;
  /** Warum die Stufe so ist - nur zum Nachsehen in der Konsole. */
  reason: string;
  setTier: (tier: QualityTier, reason: string) => void;
}

const KEY = "mf-quality";

function remembered(): QualityTier | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === "low" || v === "high" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Erste Einschaetzung ohne Messung.
 *
 * Kein Versuch, Grafikkarten zu bewerten - nur die zwei Faelle, die
 * sicher sind: ein Chip, der "Intel" im Namen traegt, ist eine
 * integrierte GPU, und vier oder weniger Kerne sind ein kleines Geraet.
 * Alles andere darf oben anfangen und wird notfalls gemessen.
 */
export function guessTier(): { tier: QualityTier; reason: string } {
  const kept = remembered();
  if (kept) return { tier: kept, reason: "gemerkt" };

  if (typeof navigator !== "undefined") {
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores <= 4) return { tier: "low", reason: `${cores} Kerne` };

    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ??
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      if (gl && info) {
        const renderer = String(
          gl.getParameter(info.UNMASKED_RENDERER_WEBGL),
        );
        if (/intel/i.test(renderer)) {
          return { tier: "low", reason: renderer };
        }
      }
    } catch {
      // Ohne Auskunft bleibt es bei der Messung.
    }
  }
  return { tier: "high", reason: "Standard" };
}

export const useQuality = create<QualityState>((set) => ({
  tier: "high",
  reason: "noch nicht bestimmt",
  setTier: (tier, reason) => {
    try {
      sessionStorage.setItem(KEY, tier);
    } catch {
      // privater Modus, egal
    }
    set({ tier, reason });
  },
}));
