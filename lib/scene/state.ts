import type { ViewportMode } from "@/types";

/**
 * Der Draht zwischen Scrollposition und 3D-Szene.
 *
 * Bewusst ein mutierbares Modul-Objekt und kein React-State: diese Werte
 * aendern sich in jedem einzelnen Frame. Ein setState pro Frame wuerde den
 * kompletten Komponentenbaum durchrendern, waehrend useFrame hier einfach
 * die aktuellen Zahlen liest - null Renderkosten, null Allokationen.
 *
 * Was ein Re-Render braucht (das aktive Kapitel im HUD), liegt daneben in
 * einem Zustand-Store und wird nur bei echtem Wechsel gesetzt.
 */
export interface SceneState {
  /** Globaler Scrollfortschritt 0..1 ueber das gesamte Dokument. */
  progress: number;
  /** Wieviel jedes Modell gerade "da" ist. Summe ist nicht normiert - */
  /** waehrend der Uebergabe sind zwei Modelle gleichzeitig halb sichtbar. */
  weights: Record<ViewportMode, number>;
  /** Zeigerposition in NDC (-1..1), geglaettet. */
  pointer: { x: number; y: number };
  /** Fortschritt innerhalb des aktiven Kapitels, 0..1. */
  chapterProgress: number;
  /**
   * Der Projekttunnel. `active` blendet ihn ein und uebernimmt dabei die
   * Kamera von der Kapitelfuehrung; `progress` ist die Position auf der
   * Fahrt durch den Korridor, 0 = Eingang, 1 = Ende.
   */
  tunnel: { active: number; progress: number };
  /**
   * Der Systemgraph im Hero. Wie der Tunnel ein eigener Zustand statt eines
   * vierten Kapitels: er taucht in keiner Kapitelnavigation auf und wird
   * nicht mit den Kapitelstationen gemischt - er uebernimmt schlicht,
   * solange man oben steht.
   */
  hero: { active: number };
}

export const sceneState: SceneState = {
  progress: 0,
  weights: { structure: 0, signal: 0, code: 0 },
  pointer: { x: 0, y: 0 },
  chapterProgress: 0,
  tunnel: { active: 0, progress: 0 },
  // Startwert 1: beim ersten Frame steht man oben, und der Graph soll
  // sofort da sein statt erst nach dem ersten Scroll-Tick einzublenden.
  hero: { active: 1 },
};

export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
