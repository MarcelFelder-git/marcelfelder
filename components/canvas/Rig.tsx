"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useViewportMode } from "@/lib/store/useViewportMode";
import type { ViewportMode } from "@/types";

/**
 * Kamerafuehrung.
 *
 * Jeder Modus hat eine eigene Aufstellung - Fachwerk von schraeg oben wie ein
 * Isometrie-Plan, Spektrum flacher und frontaler, Code-Matrix fast auf
 * Augenhoehe. Der Wechsel wird interpoliert statt geschnitten: ein harter
 * Schnitt wuerde die raeumliche Orientierung zerstoeren.
 */

const STATIONS: Record<ViewportMode, THREE.Vector3> = {
  structure: new THREE.Vector3(3.6, 3.1, 3.6),
  signal: new THREE.Vector3(0.15, 2.5, 5.3),
  code: new THREE.Vector3(2.4, 0.5, 4.3),
};

const TARGETS: Record<ViewportMode, THREE.Vector3> = {
  structure: new THREE.Vector3(0, -0.42, 0),
  signal: new THREE.Vector3(0, 0.2, 0),
  code: new THREE.Vector3(0, 0, 0),
};

export function Rig() {
  const mode = useViewportMode((s) => s.mode);
  const { camera } = useThree();

  const desired = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const station = STATIONS[mode];
    const target = TARGETS[mode];

    // Mausparallaxe: dezent, sonst wirkt der Viewport nervoes.
    const px = state.pointer.x * 0.55;
    const py = state.pointer.y * 0.35;

    desired.current.set(station.x + px, station.y + py, station.z);

    // Framerate-unabhaengige Daempfung statt fixem Lerp-Faktor.
    const k = 1 - Math.pow(0.0016, delta);
    camera.position.lerp(desired.current, k);
    lookAt.current.lerp(target, k);
    camera.lookAt(lookAt.current);
  });

  return null;
}
