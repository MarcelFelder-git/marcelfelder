"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio/engine";
import { sceneState } from "@/lib/scene/state";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Dreidimensionales Frequenzspektrum.
 *
 * Drei konzentrische Ringe aus InstancedMesh-Balken, gespeist aus der
 * 512-Punkt-FFT des AnalyserNode. Ohne laufende Audio-Engine laeuft ein
 * synthetisches Ruhesignal - der Viewport soll nicht tot wirken, bevor der
 * Nutzer den Ton startet.
 */

const RINGS = 3;
const BARS_PER_RING = 52;
const COUNT = RINGS * BARS_PER_RING;
const BASE_RADIUS = 1.5;
const RING_GAP = 0.72;

const COL_LOW = new THREE.Color("#0ea5e9");
const COL_MID = new THREE.Color("#38bdf8");
const COL_HIGH = new THREE.Color("#a855f7");

export function SignalMode() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const reducedMotion = usePrefersReducedMotion();

  const layout = useMemo(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const heights = new Float32Array(COUNT);
    const angles = new Float32Array(COUNT);
    const radii = new Float32Array(COUNT);
    const binIndex = new Uint16Array(COUNT);
    const scratch = new THREE.Vector3();

    const spectrumSize = 256; // FFT_SIZE / 2
    // Bei 48 kHz Samplerate und 512-Punkt-FFT ist ein Bin 93 Hz breit.
    // Der Drone steht auf 110 Hz und laeuft durch einen Tiefpass, der bei
    // ~1 kHz zumacht - oberhalb von Bin 40 passiert nichts mehr. Wer das
    // volle Spektrum aufspannt, bekommt eine halb tote Scheibe.
    const usableBins = Math.floor(spectrumSize * 0.16);

    for (let r = 0; r < RINGS; r++) {
      for (let b = 0; b < BARS_PER_RING; b++) {
        const i = r * BARS_PER_RING + b;
        angles[i] = (b / BARS_PER_RING) * Math.PI * 2;
        radii[i] = BASE_RADIUS + r * RING_GAP;

        // Frequenz laeuft ueber den WINKEL, nicht ueber die Ringe: so zeigt
        // jeder Ring dasselbe Spektrum und alle drei bleiben lebendig. Der
        // leichte Versatz macht die Wellenfront sichtbar, statt drei
        // identische Kopien zu stapeln.
        const t = (b + r * 0.33) / BARS_PER_RING;
        binIndex[i] = Math.min(
          spectrumSize - 1,
          Math.floor(Math.pow(t, 1.45) * usableBins) + 1,
        );
      }
    }
    return { dummy, color, heights, angles, radii, binIndex, scratch };
  }, []);

  useFrame((state) => {
    const weight = sceneState.weights.signal;
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    group.visible = weight > 0.01;
    if (!group.visible) return;

    const eased = weight * weight * (3 - 2 * weight);
    group.scale.setScalar(0.72 + eased * 0.28);
    group.position.y = (1 - eased) * -0.6;

    const { dummy, color, heights, angles, radii, binIndex, scratch } = layout;
    const t = state.clock.elapsedTime;
    const spectrum = audioEngine.getSpectrum();
    const live = audioEngine.isRunning;

    for (let i = 0; i < COUNT; i++) {
      // Aeussere Ringe gedaempft - sonst verdecken drei gleich hohe
      // Balkenwaende einander und der Koerper verliert seine Tiefe.
      const ringDamp = 1 - Math.floor(i / BARS_PER_RING) * 0.26;
      let amplitude: number;

      if (live) {
        amplitude = (spectrum[binIndex[i]] / 255) * 1.6 * ringDamp;
      } else if (reducedMotion) {
        amplitude = 0.12 * ringDamp;
      } else {
        // Ruhesignal: zwei ueberlagerte Sinus, bewusst niedrig gehalten.
        amplitude =
          (0.12 +
            Math.abs(Math.sin(t * 0.7 + i * 0.19)) * 0.2 +
            Math.abs(Math.sin(t * 0.31 - i * 0.07)) * 0.12) *
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
      const level = Math.min(1, h / 1.1);
      color.copy(COL_LOW).lerp(COL_MID, Math.min(1, level * 2));
      if (level > 0.5) color.lerp(COL_HIGH, (level - 0.5) * 2);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    (mesh.material as THREE.MeshBasicMaterial).opacity = eased;

    if (coreRef.current) {
      const level = live ? audioEngine.getLevel() : 0.08;
      const s = 0.6 + level * 1.1;
      coreRef.current.scale.lerp(scratch.set(s, s, s), 0.15);
      coreRef.current.rotation.y = t * 0.15;
      coreRef.current.rotation.x = t * 0.09;
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity =
        eased * 0.9;
    }

    if (spinRef.current && !reducedMotion) {
      spinRef.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, COUNT]}
          frustumCulled={false}
        >
          <boxGeometry args={[0.085, 1, 0.085]} />
          <meshStandardMaterial
            metalness={0.75}
            roughness={0.25}
            envMapIntensity={1.3}
            transparent
          />
        </instancedMesh>

        {/* Kern: das Signal selbst, als Icosaeder-Wireframe */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.62, 1]} />
          <meshStandardMaterial
            color="#0e3a52"
            emissive="#38bdf8"
            emissiveIntensity={1.1}
            metalness={0.9}
            roughness={0.15}
            envMapIntensity={1.8}
            transparent
          />
        </mesh>

        {/* Ringmarkierungen wie auf einem Analyzer */}
        {Array.from({ length: RINGS }).map((_, r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[
                BASE_RADIUS + r * RING_GAP - 0.006,
                BASE_RADIUS + r * RING_GAP + 0.006,
                128,
              ]}
            />
            <meshBasicMaterial
              color="#1b2437"
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
