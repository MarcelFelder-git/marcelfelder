"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio/engine";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Dreidimensionales Frequenzspektrum.
 *
 * Drei konzentrische Ringe aus InstancedMesh-Balken, gespeist aus der
 * 512-Punkt-FFT des AnalyserNode. Die Bins werden logarithmisch abgetastet:
 * lineares Mapping wuerde die unteren zwei Oktaven auf drei Balken quetschen
 * und den Rest mit Hochton-Rauschen fuellen - so, wie ein Analyzer im
 * Studio eben nicht aussieht.
 *
 * Ohne laufende Audio-Engine laeuft ein synthetisches Ruhesignal, damit der
 * Viewport nicht tot wirkt, bevor der Nutzer den Ton startet.
 */

const RINGS = 3;
const BARS_PER_RING = 44;
const COUNT = RINGS * BARS_PER_RING;
const BASE_RADIUS = 1.05;
const RING_GAP = 0.52;

const COL_LOW = new THREE.Color("#0ea5e9");
const COL_MID = new THREE.Color("#38bdf8");
const COL_HIGH = new THREE.Color("#a855f7");

export function SignalMode() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();

  const layout = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const heights = new Float32Array(COUNT);
    // Vorberechnete Polarkoordinaten - Trigonometrie gehoert nicht in useFrame.
    const angles = new Float32Array(COUNT);
    const radii = new Float32Array(COUNT);
    const binIndex = new Uint16Array(COUNT);

    const spectrumSize = 256; // FFT_SIZE / 2
    // Bei 48 kHz Samplerate und 512-Punkt-FFT ist ein Bin 93 Hz breit.
    // Der Drone steht auf 110 Hz und laeuft durch einen Tiefpass, der bei
    // ~1 kHz zumacht - oberhalb von Bin 40 (rund 3,8 kHz) passiert nichts
    // mehr. Wer das volle Spektrum aufspannt, bekommt eine halb tote Scheibe.
    const usableBins = Math.floor(spectrumSize * 0.16);

    for (let r = 0; r < RINGS; r++) {
      for (let b = 0; b < BARS_PER_RING; b++) {
        const i = r * BARS_PER_RING + b;
        angles[i] = (b / BARS_PER_RING) * Math.PI * 2;
        radii[i] = BASE_RADIUS + r * RING_GAP;

        // Frequenz laeuft ueber den WINKEL, nicht ueber die Ringe: so zeigt
        // jeder Ring dasselbe Spektrum und alle drei bleiben lebendig.
        // Die Ringe sind gegeneinander versetzt, was die Wellenfront sichtbar
        // macht, statt drei identische Kopien zu stapeln.
        const t = (b + r * 0.33) / BARS_PER_RING;
        binIndex[i] = Math.min(
          spectrumSize - 1,
          Math.floor(Math.pow(t, 1.45) * usableBins) + 1,
        );
      }
    }
    return { dummy, color, heights, angles, radii, binIndex };
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { dummy, color, heights, angles, radii, binIndex } = layout;
    const t = state.clock.elapsedTime;
    const spectrum = audioEngine.getSpectrum();
    const live = audioEngine.isRunning;

    for (let i = 0; i < COUNT; i++) {
      // Aeussere Ringe gedaempft - sonst verdecken drei gleich hohe
      // Balkenwaende einander und der Koerper verliert seine Tiefe.
      const ringDamp = 1 - Math.floor(i / BARS_PER_RING) * 0.26;
      let amplitude: number;

      if (live) {
        amplitude = (spectrum[binIndex[i]] / 255) * 1.35 * ringDamp;
      } else if (reducedMotion) {
        amplitude = 0.12;
      } else {
        // Ruhesignal: zwei ueberlagerte Sinus, bewusst niedrig gehalten.
        amplitude =
          (0.1 +
            Math.abs(Math.sin(t * 0.7 + i * 0.19)) * 0.16 +
            Math.abs(Math.sin(t * 0.31 - i * 0.07)) * 0.1) *
          ringDamp;
      }

      // Attack schnell, Release langsam - das VU-Meter-Verhalten.
      const prev = heights[i];
      const rate = amplitude > prev ? 0.45 : 0.12;
      heights[i] = prev + (amplitude - prev) * rate;
      const h = Math.max(0.02, heights[i]);

      const a = angles[i];
      const rad = radii[i];
      dummy.position.set(Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Farbe nach Pegel, nicht nach Position: laute Bins leuchten violett.
      const level = Math.min(1, h / 1.05);
      color.copy(COL_LOW).lerp(COL_MID, Math.min(1, level * 2));
      if (level > 0.5) color.lerp(COL_HIGH, (level - 0.5) * 2);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Der Kern atmet mit dem Gesamtpegel.
    if (coreRef.current) {
      const level = live ? audioEngine.getLevel() : 0.08;
      const s = 0.55 + level * 0.9;
      coreRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
      coreRef.current.rotation.y = t * 0.15;
      coreRef.current.rotation.x = t * 0.09;
    }

    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.075, 1, 0.075]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Kern: das Signal selbst, als Icosaeder-Wireframe */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshBasicMaterial color="#38bdf8" wireframe toneMapped={false} />
      </mesh>

      {/* Grundebene mit Ringmarkierungen wie auf einem Analyzer */}
      {Array.from({ length: RINGS }).map((_, r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              BASE_RADIUS + r * RING_GAP - 0.005,
              BASE_RADIUS + r * RING_GAP + 0.005,
              96,
            ]}
          />
          <meshBasicMaterial color="#1b2437" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
