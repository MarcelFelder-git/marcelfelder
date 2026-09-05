import * as THREE from "three";

/**
 * Geometrie fuer Geraetegehaeuse.
 *
 * Ein Screenshot in einem rechteckigen Rahmen ist ein Bild. Derselbe
 * Screenshot in einem Monitor oder einem Telefon ist ein Produkt — man
 * sieht sofort, wofuer es gebaut wurde, ohne dass es danebenstehen muss.
 * Genau deshalb steckt hier etwas Aufwand: die Silhouette traegt die
 * Aussage, und eine Silhouette lebt von ihren Radien.
 *
 * Beide Funktionen bauen auf derselben abgerundeten Kontur auf. Die eine
 * zieht sie in die Tiefe (Gehaeuse), die andere fuellt sie flach
 * (Bildflaeche) — so sitzt das Bild passgenau in seinem Gehaeuse, statt
 * mit eckigen Ecken in einer runden Oeffnung zu stehen.
 */

/** Rechteck mit gleichmaessig abgerundeten Ecken. */
function roundedShape(w: number, h: number, r: number) {
  const x = w / 2;
  const y = h / 2;
  // Ein Radius groesser als die halbe kuerzere Seite ergaebe eine Kontur,
  // die sich selbst ueberschneidet.
  const radius = Math.max(0, Math.min(r, x, y));

  const shape = new THREE.Shape();
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x, y - radius);
  shape.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(-x + radius, y);
  shape.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-x, -y + radius);
  shape.absarc(
    -x + radius,
    -y + radius,
    radius,
    Math.PI,
    Math.PI * 1.5,
    false,
  );
  return shape;
}

/**
 * Gehaeuseplatte: abgerundete Kontur, in die Tiefe gezogen, um den
 * Mittelpunkt zentriert.
 *
 * Die kleine Fase ist der eigentliche Trick. Eine scharfe Kante hat keine
 * Flaeche, die zum Betrachter zeigt, und bleibt deshalb dunkel — sie
 * verschwindet. Zwei Hundertstel Fase geben ihr genau so viel Flaeche,
 * dass die Leuchtflaechen der Umgebung als feine Lichtlinie darauf
 * stehen. Das ist es, was ein Gehaeuse aus Metall aussehen laesst.
 */
export function roundedSlab(w: number, h: number, depth: number, r: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelOffset: 0,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Flache Bildflaeche mit denselben Radien.
 *
 * `ShapeGeometry` legt seine UVs aus den Konturkoordinaten an, also in
 * Weltmass statt in 0..1. Wuerde man die Textur so auftragen, saehe man
 * bei einer 3 Einheiten breiten Flaeche drei nebeneinanderliegende
 * Kopien. Deshalb werden die UVs hier auf die Ausmasse normiert.
 */
export function roundedPlane(w: number, h: number, r: number) {
  const geometry = new THREE.ShapeGeometry(roundedShape(w, h, r), 10);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, (position.getX(i) + w / 2) / w, (position.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return geometry;
}
