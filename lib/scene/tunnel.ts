/**
 * Geometrie des Projekttunnels — reine Zahlen, keine 3D-Abhaengigkeiten.
 *
 * Diese Werte brauchen zwei sehr verschiedene Stellen: die Szene im Canvas
 * (Tafelposition, Helligkeit) und das DOM-Overlay (welche Station ist
 * aktiv, wie weit ist die Ankunft). Wuerden sie in `TunnelMode.tsx`
 * stehen, zoege ein Import aus dem Overlay die gesamte 3D-Kette — three,
 * drei, postprocessing — ins Haupt-Bundle und machte das
 * `dynamic(..., { ssr: false })` der Szene wirkungslos.
 *
 * Genau das war passiert: First Load JS sprang dadurch von 229 kB auf
 * 465 kB. Deshalb liegt hier nur Arithmetik.
 */

/** Ringe des Korridors und ihr Abstand — bestimmen seine Laenge. */
export const RING_COUNT = 42;
export const RING_SPACING = 2.5;
export const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;

/** Erste Tafel etwas hinter dem Eingang, dann gleichmaessig verteilt. */
const STATION_START = -12;
const STATION_GAP = 17;

/** Wieviel Weg die Kamera auf der Fahrt zuruecklegt. */
const TRAVEL = TUNNEL_LENGTH - 6;
const CAMERA_START = 4;

export function stationZ(index: number) {
  return STATION_START - index * STATION_GAP;
}

/** Kameraposition auf der Fahrt, aus dem Fortschritt gerechnet. */
export function tunnelCameraZ(progress: number) {
  return CAMERA_START - progress * TRAVEL;
}

/**
 * Wie "angekommen" man an einer Station ist, 0..1.
 *
 * Wird an drei Stellen gebraucht — Tafelhelligkeit, Lichtfleck und die
 * Anzeige im DOM. Deshalb hier einmal definiert statt dreimal mit leicht
 * anderen Schwellen nachgebaut.
 */
export function stationNearness(progress: number, index: number) {
  const distance = Math.abs(tunnelCameraZ(progress) - stationZ(index));
  return Math.max(0, 1 - distance / 22);
}
