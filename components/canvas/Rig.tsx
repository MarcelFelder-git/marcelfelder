"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_KEYS, sceneState, type SceneKey } from "@/lib/scene/state";
import { tunnelExit } from "@/lib/scene/tunnel";

/**
 * Kamerafuehrung.
 *
 * Jede Szene hat eine Aufstellung: das Fachwerk von schraeg oben wie ein
 * Isometrie-Plan, das Spektrum flacher und frontaler, die Code-Matrix fast
 * auf Augenhoehe, der Systemgraph frontal, der Tunnel auf der Fahrbahn.
 *
 * Entscheidend ist, wie dazwischen gewechselt wird: gar nicht. Es gibt
 * keinen Umschaltpunkt und keinen `return`-Zweig, sondern eine einzige
 * gewichtete Mischung ueber alle fuenf Aufstellungen. Waehrend eines
 * Uebergangs ist die Kamera buchstaeblich zwischen zwei Positionen -
 * dieselbe Mischung, die auch die Modelle ein- und ausblendet.
 *
 * Dass der Tunnel dabei nicht ausschert, liegt an seiner Geometrie: sein
 * Eingang liegt bei z = 4, also ungefaehr dort, wo auch die anderen
 * Stationen stehen. Erst waehrend der Fahrt wandert die Kamera in die
 * Tiefe - da ist die Uebergabe laengst abgeschlossen.
 */

const STATIONS: Record<SceneKey, THREE.Vector3> = {
  hero: new THREE.Vector3(0, 0.25, 7.6),
  structure: new THREE.Vector3(5.0, 4.1, 5.0),
  signal: new THREE.Vector3(0.2, 3.4, 6.8),
  code: new THREE.Vector3(3.0, 0.6, 6.2),
  // Wird pro Frame aus dem Fahrtfortschritt ueberschrieben.
  tunnel: new THREE.Vector3(0, 0, 4),
};

const TARGETS: Record<SceneKey, THREE.Vector3> = {
  hero: new THREE.Vector3(0, 0, 0),
  structure: new THREE.Vector3(0, -0.35, 0),
  signal: new THREE.Vector3(0, 0.3, 0),
  code: new THREE.Vector3(0, 0, 0),
  tunnel: new THREE.Vector3(0, 0, -8),
};

export function Rig() {
  const { camera } = useThree();

  const v = useMemo(
    () => ({
      station: new THREE.Vector3(),
      target: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
      settled: false,
    }),
    [],
  );

  useFrame((_, delta) => {
    const { weights, pointer, progress, tunnelProgress } = sceneState;

    // Die Tunnelstation steht fest.
    //
    // Die Fahrt macht der Korridor, der auf die Kamera zulaeuft (siehe
    // tunnelTravel). Dadurch bleibt die Kamera waehrend der ganzen Fahrt
    // in der Naehe der Kapitelstationen, und der Wechsel vom Tunnel zum
    // ersten Kapitel ist ein kurzer Weg statt einer Rueckfahrt ueber die
    // volle Korridorlaenge.
    // Auf der Ausfahrt zieht sich die Kamera ein Stueck zurueck und
    // schaut weiter in die Ferne: der Korridor bleibt hinter einem, das
    // Sternfeld oeffnet sich.
    const exit = tunnelExit(tunnelProgress);
    const tunnelZ = 4 + exit * 7;
    // Sanftes Schlingern, damit die Fahrt nicht wie eine Schiene wirkt.
    // Bewusst klein: die Innenkanten der Tafeln stehen nur knapp neben
    // der Fahrbahn, und ein zu weiter Ausschlag traegt die Kamera auf
    // die falsche Seite einer Tafel.
    const swayX = Math.sin(tunnelProgress * 9) * 0.3;
    const swayY = Math.cos(tunnelProgress * 7) * 0.25;
    STATIONS.tunnel.set(swayX, swayY, tunnelZ);
    TARGETS.tunnel.set(swayX * 0.3, swayY * 0.3, tunnelZ - 12 - exit * 26);

    let sum = 0;
    v.station.set(0, 0, 0);
    v.target.set(0, 0, 0);

    for (const key of SCENE_KEYS) {
      const w = weights[key];
      if (w <= 0.001) continue;
      sum += w;
      v.station.addScaledVector(STATIONS[key], w);
      v.target.addScaledVector(TARGETS[key], w);
    }
    if (sum <= 0.001) return;

    v.station.divideScalar(sum);
    v.target.divideScalar(sum);

    // Langsame Umrundung ueber die Seitenlaenge - aber nur, solange die
    // Kapitel das Bild bestimmen. Im Tunnel wuerde eine Drehung um den
    // Ursprung die Kamera aus der Roehre tragen.
    const orbitAmount =
      weights.structure + weights.signal + weights.code;
    if (orbitAmount > 0.01) {
      const orbit = progress * 0.75 * orbitAmount;
      const cos = Math.cos(orbit);
      const sin = Math.sin(orbit);
      const x = v.station.x * cos - v.station.z * sin;
      const z = v.station.x * sin + v.station.z * cos;
      v.station.x = x;
      v.station.z = z;
    }

    // Mausparallaxe: dezent, sonst wirkt die Szene nervoes.
    v.station.x += pointer.x * 0.7;
    v.station.y += pointer.y * 0.45;

    // Beim allerersten Frame direkt setzen statt hinfahren - sonst faehrt
    // die Kamera beim Laden sichtbar aus dem Nichts an ihre Position.
    if (!v.settled) {
      camera.position.copy(v.station);
      v.lookAt.copy(v.target);
      v.settled = true;
    }

    const k = 1 - Math.pow(0.0009, Math.min(delta, 0.1));
    camera.position.lerp(v.station, k);
    v.lookAt.lerp(v.target, k);
    camera.lookAt(v.lookAt);
  });

  return null;
}
