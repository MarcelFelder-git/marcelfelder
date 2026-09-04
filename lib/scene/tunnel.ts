import { PROJECTS } from "@/content/projects";

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
 * 465 kB. Deshalb liegt hier nur Arithmetik. `content/projects.ts` ist
 * reine Datei ohne Abhaengigkeiten und darf deshalb importiert werden.
 *
 * ## Warum die Laenge gerechnet und nicht gesetzt ist
 *
 * Frueher waren Ringzahl und Fahrtweg feste Zahlen, die zufaellig zu
 * fuenf Projekten passten. Beim sechsten lag die letzte Tafel hinter dem
 * Punkt, an dem die Kamera stehenbleibt — man waere nie an ihr
 * angekommen. Ein Projekt hinzuzufuegen darf keine Geometrie nachziehen
 * muessen, also haengt hier alles an `PROJECTS.length`.
 */

/** Erste Tafel etwas hinter dem Eingang, dann gleichmaessig verteilt. */
const STATION_START = -12;
const STATION_GAP = 17;

export function stationZ(index: number) {
  return STATION_START - index * STATION_GAP;
}

/** Z der letzten Tafel — der Punkt, hinter den die Fahrt reichen muss. */
const LAST_STATION = stationZ(PROJECTS.length - 1);

export const RING_SPACING = 2.5;
/**
 * Der Korridor reicht ueber die letzte Tafel hinaus, damit sie nicht am
 * offenen Ende haengt, sondern im Fog verschwindet.
 */
export const RING_COUNT = Math.ceil((-LAST_STATION + 16) / RING_SPACING);
export const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;

/** Wieviel Weg die Kamera auf der Fahrt zuruecklegt. */
const CAMERA_START = 4;
/** Acht Einheiten hinter der letzten Tafel: man faehrt an ihr vorbei. */
const CAMERA_END = LAST_STATION - 8;
const TRAVEL = CAMERA_START - CAMERA_END;

/** Kameraposition auf der Fahrt, aus dem Fortschritt gerechnet. */
export function tunnelCameraZ(progress: number) {
  return CAMERA_START - progress * TRAVEL;
}

/**
 * Wie "angekommen" man an einer Station ist, 0..1.
 *
 * Wird an vier Stellen gebraucht — Tafelhelligkeit, Lichtfleck, das
 * wandernde Licht im Korridor und die Anzeige im DOM. Deshalb hier einmal
 * definiert statt viermal mit leicht anderen Schwellen nachgebaut.
 */
export function stationNearness(progress: number, index: number) {
  const distance = Math.abs(tunnelCameraZ(progress) - stationZ(index));
  return Math.max(0, 1 - distance / 22);
}

/**
 * Die Station, an der man gerade steht.
 *
 * Vorher rechnete das Overlay das aus dem Fortschritt mal Anzahl mal
 * einem Korrekturfaktor 1.04 — eine Zahl, die zu genau einer Kombination
 * aus Fahrtweg und Stationsabstand passte und bei jeder Aenderung
 * daneben lag. Hier gewinnt schlicht die naechste Station; das stimmt
 * per Definition immer.
 */
export function nearestStation(progress: number) {
  const z = tunnelCameraZ(progress);
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < PROJECTS.length; i++) {
    const distance = Math.abs(z - stationZ(i));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
