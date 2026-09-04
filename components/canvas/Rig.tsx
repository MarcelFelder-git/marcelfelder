"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { TUNNEL_LENGTH } from "@/lib/scene/tunnel";
import type { ViewportMode } from "@/types";

/**
 * Kamerafuehrung.
 *
 * Jedes Kapitel hat eine eigene Aufstellung - Fachwerk von schraeg oben wie
 * ein Isometrie-Plan, Spektrum flacher und frontaler, Code-Matrix fast auf
 * Augenhoehe. Waehrend eines Uebergangs wird zwischen den Aufstellungen
 * gemischt, gewichtet mit denselben Werten, die auch die Modelle ein- und
 * ausblenden. Kamera und Geometrie bewegen sich dadurch als eine Bewegung.
 *
 * Zusaetzlich dreht der Scrollfortschritt die Kamera langsam um die Szene:
 * Scrollen soll sich anfuehlen wie Fahren, nicht wie Umblaettern.
 */

const STATIONS: Record<ViewportMode, THREE.Vector3> = {
  structure: new THREE.Vector3(5.0, 4.1, 5.0),
  signal: new THREE.Vector3(0.2, 3.4, 6.8),
  code: new THREE.Vector3(3.0, 0.6, 6.2),
};

const TARGETS: Record<ViewportMode, THREE.Vector3> = {
  structure: new THREE.Vector3(0, -0.35, 0),
  signal: new THREE.Vector3(0, 0.3, 0),
  code: new THREE.Vector3(0, 0, 0),
};

const MODES: ViewportMode[] = ["structure", "signal", "code"];

export function Rig() {
  const { camera } = useThree();

  const v = useMemo(
    () => ({
      station: new THREE.Vector3(),
      target: new THREE.Vector3(),
      lookAt: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const { weights, pointer, progress, tunnel, hero } = sceneState;

    // --- Hero: der Systemgraph steht frontal --------------------------
    // Keine Mischung mit den Kapitelstationen: solange man oben steht,
    // gibt es nur dieses eine Motiv.
    if (hero.active > 0.5 && tunnel.active < 0.5) {
      v.station.set(pointer.x * 0.85, 0.25 + pointer.y * 0.55, 7.6);
      const k = 1 - Math.pow(0.0012, Math.min(delta, 0.1));
      camera.position.lerp(v.station, k);
      v.lookAt.lerp(v.target.set(0, 0, 0), k);
      camera.lookAt(v.lookAt);
      return;
    }

    // --- Tunnelfahrt uebernimmt die Kamera --------------------------
    // Der Korridor liegt entlang der negativen Z-Achse; die Kamera faehrt
    // vom Eingang bis kurz vor das Ende. Kein Blenden mit den
    // Kapitelstationen: waehrend der Fahrt gibt es keine.
    if (tunnel.active > 0.5) {
      const z = 4 - tunnel.progress * (TUNNEL_LENGTH - 6);
      // Sanftes Schlingern, damit die Fahrt nicht wie eine Schiene wirkt.
      const swayX = Math.sin(tunnel.progress * 9) * 0.5 + pointer.x * 0.6;
      const swayY = Math.cos(tunnel.progress * 7) * 0.35 + pointer.y * 0.4;

      v.station.set(swayX, swayY, z);
      const k = 1 - Math.pow(0.0005, Math.min(delta, 0.1));
      camera.position.lerp(v.station, k);

      // Blick nach vorne in die Roehre, leicht der Schlingerbewegung
      // hinterher - das erzeugt den Eindruck von Traegheit.
      v.lookAt.lerp(v.target.set(swayX * 0.3, swayY * 0.3, z - 12), k);
      camera.lookAt(v.lookAt);
      return;
    }

    let sum = 0;
    v.station.set(0, 0, 0);
    v.target.set(0, 0, 0);

    for (const m of MODES) {
      const w = weights[m];
      if (w <= 0.001) continue;
      sum += w;
      v.station.addScaledVector(STATIONS[m], w);
      v.target.addScaledVector(TARGETS[m], w);
    }
    if (sum <= 0.001) return;

    v.station.divideScalar(sum);
    v.target.divideScalar(sum);

    // Langsame Umrundung ueber die gesamte Seitenlaenge.
    const orbit = progress * 0.75;
    const cos = Math.cos(orbit);
    const sin = Math.sin(orbit);
    const x = v.station.x * cos - v.station.z * sin;
    const z = v.station.x * sin + v.station.z * cos;

    // Mausparallaxe: dezent, sonst wirkt die Szene nervoes.
    v.station.set(x + pointer.x * 0.7, v.station.y + pointer.y * 0.45, z);

    // Framerate-unabhaengige Daempfung statt fixem Lerp-Faktor.
    const k = 1 - Math.pow(0.0009, Math.min(delta, 0.1));
    camera.position.lerp(v.station, k);
    v.lookAt.lerp(v.target, k);
    camera.lookAt(v.lookAt);
  });

  return null;
}
