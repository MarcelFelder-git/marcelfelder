import { SCENE_KEYS, type SceneKey } from "./state";

/**
 * Farbklima je Abschnitt.
 *
 * ## Warum die Trennung hier liegt und nicht im CSS
 *
 * Naheliegend waere, jedem Abschnitt einen eigenen Hintergrund zu geben.
 * Das geht hier nicht: der Hintergrund der Seite ist kein CSS-Kasten,
 * sondern eine durchlaufende 3D-Szene. Ein farbiger Kasten daueber wuerde
 * genau das kaputtmachen, was die Seite ausmacht — man saehe eine Kante
 * quer durch den Raum wandern.
 *
 * Also faerbt sich das Licht. Grundton, Nebel und Streiflicht der Szene
 * haengen an denselben Gewichten, die auch Kamera und Modelle mischen —
 * die Trennung ist damit kein Schnitt, sondern ein Klimawechsel, und sie
 * erbt die Ueberblendung, die es ohnehin schon gibt.
 *
 * Damit die Textkaesten nicht in der alten Farbe stehenbleiben, schreibt
 * `ScrollDriver` denselben Grundton als CSS-Variable heraus. Deshalb liegt
 * die Tabelle hier und nicht in der Szene: dieses Modul darf nichts aus
 * three importieren, sonst zoege es die gesamte 3D-Kette ins Hauptbundle.
 *
 * ## Warum die Grundtoene so dicht beieinander liegen
 *
 * Alle fuenf sind nahezu schwarz und unterscheiden sich fast nur im
 * Farbton. Das ist Absicht und keine Zurueckhaltung aus Bequemlichkeit:
 * auf diesen Grundtoenen steht Text, und dessen Kontrast ist gemessen
 * (siehe `scripts/check-contrast.mjs`). Ein Abschnitt, der spuerbar heller
 * wird, faellt unter die AA-Schwelle — die Trennung muss aus dem Farbton
 * kommen, nicht aus der Helligkeit.
 */

/** Grundton und Nebel, sRGB 0..255. */
export const GROUND: Record<SceneKey, readonly [number, number, number]> = {
  hero: [8, 9, 14],
  // Stahl: minimal warm, das einzige Klima der Seite ohne Blaustich.
  structure: [14, 12, 9],
  signal: [12, 8, 20],
  code: [6, 16, 15],
  // Weltraum: der tiefste Grund der Seite.
  tunnel: [4, 5, 13],
};

/**
 * Streiflicht: das Gegenlicht, das den Koerpern ihre Kante gibt.
 * Bewusst im Band Cyan–Violett–Teal — eine dritte Familie (Bernstein,
 * Rot) waere sofort als Fremdkoerper zu sehen.
 */
export const RIM: Record<SceneKey, readonly [number, number, number]> = {
  hero: [56, 189, 248],
  // Entsaettigt statt umgefaerbt: Stahl trennt sich hier ueber die
  // Saettigung vom Rest, nicht ueber den Farbton.
  structure: [143, 168, 189],
  signal: [168, 85, 247],
  code: [45, 212, 191],
  tunnel: [99, 102, 241],
};

/**
 * Mischt eine Tabelle nach den aktuellen Szenengewichten.
 *
 * Die Gewichte summieren sich normalerweise zu 1; waehrend eines
 * Uebergangs kann die Summe kurz daneben liegen, deshalb wird geteilt
 * statt darauf zu vertrauen.
 */
export function blend(
  table: Record<SceneKey, readonly [number, number, number]>,
  weights: Record<SceneKey, number>,
  out: [number, number, number],
) {
  let r = 0;
  let g = 0;
  let b = 0;
  let sum = 0;
  for (const key of SCENE_KEYS) {
    const w = weights[key];
    if (w <= 0.001) continue;
    const c = table[key];
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
    sum += w;
  }
  if (sum <= 0.001) return out;
  out[0] = r / sum;
  out[1] = g / sum;
  out[2] = b / sum;
  return out;
}
