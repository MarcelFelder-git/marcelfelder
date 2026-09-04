import * as THREE from "three";

/**
 * Hilfsmittel, um eine Verbindung zwischen zwei Punkten als Zylinder zu
 * setzen.
 *
 * Warum ueberhaupt Zylinder statt `lineSegments`: eine Linie hat in der
 * Rasterung keine Oberflaeche. Sie kann kein Licht reflektieren, keinen
 * Glanz zeigen und keine Tiefe andeuten - sie ist ein eingefaerbter Strich.
 * Sobald in einer Szene beleuchtete Koerper stehen, faellt jede Linie
 * daneben als flach auf. Ein Zylinder ist Geometrie und wird von derselben
 * Beleuchtung angefasst wie alles andere.
 *
 * Die Rechnung ist an vier Stellen dieselbe (Systemgraph, Fachwerk,
 * Korridor, Komponentenrahmen), deshalb liegt sie hier statt viermal
 * kopiert im jeweiligen Modul.
 */
export interface TubeScratch {
  from: THREE.Vector3;
  to: THREE.Vector3;
  dir: THREE.Vector3;
  up: THREE.Vector3;
  quat: THREE.Quaternion;
  dummy: THREE.Object3D;
}

export function createTubeScratch(): TubeScratch {
  return {
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    // Der Zylinder von three steht auf der Y-Achse; das ist die Referenz,
    // gegen die gedreht wird.
    up: new THREE.Vector3(0, 1, 0),
    quat: new THREE.Quaternion(),
    dummy: new THREE.Object3D(),
  };
}

/**
 * Schreibt die Matrix fuer eine Roehre von `from` nach `to` in die
 * Instanz `index` von `mesh`.
 *
 * `radiusScale` skaliert die Dicke, ohne die Geometrie zu tauschen - so
 * koennen duenne und dicke Verbindungen dasselbe Mesh teilen.
 */
export function setTube(
  mesh: THREE.InstancedMesh,
  index: number,
  s: TubeScratch,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  radiusScale = 1,
) {
  s.from.set(ax, ay, az);
  s.to.set(bx, by, bz);
  s.dir.subVectors(s.to, s.from);

  const length = s.dir.length();
  // Entartete Verbindung: nicht normalisierbar, also unsichtbar schalten
  // statt eine NaN-Matrix zu schreiben.
  if (length < 1e-6) {
    s.dummy.scale.set(0, 0, 0);
    s.dummy.updateMatrix();
    mesh.setMatrixAt(index, s.dummy.matrix);
    return;
  }

  s.dummy.position.copy(s.from).addScaledVector(s.dir, 0.5);
  s.quat.setFromUnitVectors(s.up, s.dir.divideScalar(length));
  s.dummy.quaternion.copy(s.quat);
  s.dummy.scale.set(radiusScale, length, radiusScale);
  s.dummy.updateMatrix();
  mesh.setMatrixAt(index, s.dummy.matrix);
}
