/**
 * Gemeinsame Easing-Kurve fuer alle UI-Bewegungen.
 * Explizit als 4er-Tupel typisiert: framer-motion erwartet eine
 * BezierDefinition, und ein blosses number[] wird abgelehnt.
 */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
