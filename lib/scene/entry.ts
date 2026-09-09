import type * as THREE from "three";

/**
 * Auftritt und Abgang der drei Kapitelmodelle.
 *
 * ## Das Problem
 *
 * Fachwerk, Spektrum und Code-Matrix stehen alle im Ursprung. Solange
 * immer nur eines sichtbar ist, faellt das nicht auf. Waehrend einer
 * Ueberblendung sind aber zwei gleichzeitig da, beide halb
 * durchsichtig, beide an derselben Stelle - und dann steckt das eine im
 * anderen. Genau das sieht man an den Grenzen zwischen den drei
 * Kapiteln, und es sieht nach Fehler aus, weil es einer ist.
 *
 * ## Die Loesung
 *
 * Jedes Modell bekommt eine eigene Richtung, aus der es kommt und in die
 * es wieder verschwindet. Bei halber Ueberblendung liegen die beiden
 * beteiligten Modelle dadurch weit auseinander: das eine zieht nach
 * links weg, waehrend das andere von rechts hereinkommt. Aus dem
 * Ineinander wird eine Uebergabe.
 *
 * Die Richtungen sind nicht beliebig gewaehlt, sondern folgen der
 * Leserichtung der Kapitel: Entwicklung (01) kommt von links, Tontechnik
 * (02) von unten, Tragwerk (03) von rechts. Wer die Seite hinunterfaehrt,
 * sieht die Modelle dadurch immer in derselben Reihenfolge durchs Bild
 * wandern.
 */

export type ChapterKey = "code" | "signal" | "structure";

interface Pose {
  x: number;
  y: number;
  z: number;
  /** Groesse im Abseits. Kleiner heisst: weiter weg. */
  scale: number;
}

const AWAY: Record<ChapterKey, Pose> = {
  code: { x: -15, y: -1.5, z: -9, scale: 0.6 },
  signal: { x: 0, y: -13, z: -9, scale: 0.6 },
  structure: { x: 15, y: -1.5, z: -9, scale: 0.6 },
};

/**
 * Setzt Position und Groesse einer Kapitelgruppe aus ihrem Gewicht.
 *
 * `weight` ist das Szenengewicht 0..1. Zurueck kommt der geglaettete
 * Wert, weil die Module ihn auch fuer Deckkraft und Eigenleuchten
 * brauchen und ihn sonst zweimal berechnen wuerden.
 */
export function applyEntry(
  group: THREE.Group,
  key: ChapterKey,
  weight: number,
) {
  const eased = weight * weight * (3 - 2 * weight);
  const away = AWAY[key];
  const back = 1 - eased;

  group.position.set(away.x * back, away.y * back, away.z * back);
  group.scale.setScalar(away.scale + (1 - away.scale) * eased);

  return eased;
}
