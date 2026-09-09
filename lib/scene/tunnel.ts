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
 * Dieselbe Fahrt, aber als Verschiebung des Korridors statt als Bewegung
 * der Kamera.
 *
 * ## Warum sich der Tunnel bewegt und nicht die Kamera
 *
 * Frueher fuhr die Kamera durch die Roehre, von z = 4 bis z = -105.
 * Innerhalb des Tunnels war das voellig richtig, am Ausgang aber ein
 * Problem: die drei Kapitelmodelle stehen alle im Ursprung, ihre
 * Kamerastationen liegen bei z ~ 6. Sobald der Tunnel ausblendete,
 * musste die Kamera also 111 Einheiten zuruecklegen, und zwar genau
 * waehrend der Ueberblendung. Man sah den ganzen Korridor an sich
 * vorbeirauschen. Das war der Ruck beim Sektionswechsel.
 *
 * Relativ betrachtet ist es dieselbe Bewegung, wenn stattdessen der
 * Korridor auf die Kamera zulaeuft. Nur steht die Kamera dann die ganze
 * Fahrt ueber bei z = 4, also dort, wo auch die Kapitelstationen liegen,
 * und die Uebergabe ist ein kurzer Weg statt einer Rueckfahrt.
 */
export function tunnelTravel(progress: number) {
  return CAMERA_START - tunnelCameraZ(progress);
}

/**
 * Wie weit die Ausfahrt fortgeschritten ist, 0..1.
 *
 * Auf dem letzten Stueck loest sich der Korridor auf und gibt den Blick
 * ins Sternfeld frei. Der Tunnel hoert damit nicht einfach auf, sondern
 * endet: man faehrt hinaus.
 *
 * Der Wert steuert drei Dinge an drei verschiedenen Stellen - die
 * Deckkraft der Streben im Tunnel, die Sichtweite des Nebels in der
 * Szene und den Ruecklauf der Kamera im Rig. Deshalb steht er hier und
 * nicht dreimal nachgebaut.
 */
export function tunnelExit(progress: number) {
  const t = Math.min(1, Math.max(0, (progress - 0.84) / 0.16));
  return t * t * (3 - 2 * t);
}

/**
 * Wie weit eine Station voraus noch zaehlt, und wie schnell sie hinter
 * einem verfaellt. Bewusst sehr unterschiedlich, siehe unten.
 */
const REACH_AHEAD = 30;
const REACH_BEHIND = 9;

/**
 * Wie "angekommen" man an einer Station ist, 0..1.
 *
 * Wird an vier Stellen gebraucht — Tafelhelligkeit, Lichtfleck, das
 * wandernde Licht im Korridor und die Anzeige im DOM. Deshalb hier einmal
 * definiert statt viermal mit leicht anderen Schwellen nachgebaut.
 *
 * ## Warum das Fenster nicht symmetrisch ist
 *
 * Vorher zaehlte nur der Abstand, egal ob die Tafel vor oder hinter einem
 * lag. Damit war eine Tafel, an der man gerade vorbeigefahren ist, genauso
 * "nah" wie eine gleich weit entfernte voraus — sie blieb hell, ihr Bild
 * wechselte weiter, und die naechste blieb dunkel, bis man die Haelfte des
 * Weges hinter sich hatte.
 *
 * Fahren ist aber gerichtet. Voraus reicht der Einfluss deshalb weit (eine
 * Tafel wird interessant, lange bevor man an ihr ist), hinter einem faellt
 * er schnell ab (was vorbei ist, ist vorbei). Genau das laesst die naechste
 * Tafel uebernehmen, sobald man die letzte passiert hat.
 */
export function stationNearness(progress: number, index: number) {
  // > 0: die Tafel liegt noch voraus. < 0: schon passiert.
  const gap = tunnelCameraZ(progress) - stationZ(index);
  return gap >= 0
    ? Math.max(0, 1 - gap / REACH_AHEAD)
    : Math.max(0, 1 + gap / REACH_BEHIND);
}

/**
 * Wie weit vor einer Tafel die naechste uebernimmt.
 *
 * Zwei Einheiten Vorlauf: die Umschaltung faellt damit genau in den
 * Moment, in dem die Tafel seitlich aus dem Bild laeuft. Genau dann steht
 * schon die naechste im Blick, und der Text soll ueber sie sprechen.
 */
const HANDOVER_LEAD = 2;

/**
 * Die Station, ueber die gerade gesprochen wird.
 *
 * Nicht die naechstgelegene, sondern die naechste, die noch vor einem
 * liegt. Der Unterschied ist der ganze Punkt: bei "naechstgelegen"
 * wechselt der Text erst auf halber Strecke zwischen zwei Tafeln, also
 * lange nachdem man die eine passiert hat und waehrend die andere schon
 * gross im Bild steht. Man liest dann ueber etwas, das hinter einem
 * haengt.
 *
 * Davor stand hier eine Naeherung aus Fortschritt mal Anzahl mal
 * Korrekturfaktor 1.04, die nur zu genau einer Projektanzahl passte.
 */
export function activeStation(progress: number) {
  const z = tunnelCameraZ(progress);
  for (let i = 0; i < PROJECTS.length; i++) {
    if (z > stationZ(i) + HANDOVER_LEAD) return i;
  }
  return PROJECTS.length - 1;
}
