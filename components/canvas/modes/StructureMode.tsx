"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createTubeScratch, setTube } from "@/lib/scene/tube";

/**
 * Zweilagiges Raumfachwerk (Space Frame), allseitig gelagert.
 *
 * Die Verformung ist KEINE FEM-Rechnung, sondern eine Einflussfunktion:
 * eine Gauss-Glocke um den Lastpunkt, multipliziert mit einer Auflager-Maske,
 * die zum Rand hin gegen 0 geht. Das reproduziert die Charakteristik einer
 * Plattenbiegung (Maximum im Feld, Null am Auflager) zu Frame-Kosten, die
 * ein echter Solver nie erreichen wuerde.
 *
 * Die Staebe werden anschliessend aus der tatsaechlichen Laengenaenderung
 * eingefaerbt: Verkuerzung = Druck (cyan), Verlaengerung = Zug (violett).
 */

const GRID = 8; // Knoten je Richtung in der Obergurtebene
const SPAN = 4.6; // Stuetzweite in Weltkoordinaten
const DEPTH = 0.8; // Fachwerkhoehe (Abstand Ober-/Untergurt)
const AMPLITUDE = 0.75; // maximale Durchbiegung unter Einzellast
const SIGMA = 1.15; // Wirkungsradius der Last

const COL_NEUTRAL = new THREE.Color("#2a3a55");
const COL_COMPRESSION = new THREE.Color("#38bdf8");
const COL_TENSION = new THREE.Color("#a855f7");

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

interface Lattice {
  base: Float32Array;
  mask: Float32Array;
  edges: Uint16Array;
  restLengths: Float32Array;
  topCount: number;
  nodeCount: number;
}

function buildLattice(): Lattice {
  const positions: number[] = [];
  const mask: number[] = [];
  const coord = (i: number) => (i / (GRID - 1) - 0.5) * SPAN;

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      positions.push(coord(i), 0, coord(j));
      const edgeDist = Math.min(i, j, GRID - 1 - i, GRID - 1 - j);
      const t = edgeDist / ((GRID - 1) / 2);
      mask.push(t * t * (3 - 2 * t)); // smoothstep
    }
  }
  const topCount = positions.length / 3;

  const lower = (i: number) => ((i + 0.5) / (GRID - 1) - 0.5) * SPAN;
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      positions.push(lower(i), -DEPTH, lower(j));
      const edgeDist = Math.min(i, j, GRID - 2 - i, GRID - 2 - j);
      const t = Math.min(1, (edgeDist + 0.5) / ((GRID - 1) / 2));
      mask.push(t * t * (3 - 2 * t));
    }
  }

  const nodeCount = positions.length / 3;
  const top = (i: number, j: number) => i * GRID + j;
  const bot = (i: number, j: number) => topCount + i * (GRID - 1) + j;
  const edges: number[] = [];

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if (i < GRID - 1) edges.push(top(i, j), top(i + 1, j));
      if (j < GRID - 1) edges.push(top(i, j), top(i, j + 1));
    }
  }
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      if (i < GRID - 2) edges.push(bot(i, j), bot(i + 1, j));
      if (j < GRID - 2) edges.push(bot(i, j), bot(i, j + 1));
    }
  }
  // Fuellstaebe: jeder Untergurtknoten haengt an vier Obergurtknoten
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      edges.push(bot(i, j), top(i, j));
      edges.push(bot(i, j), top(i + 1, j));
      edges.push(bot(i, j), top(i, j + 1));
      edges.push(bot(i, j), top(i + 1, j + 1));
    }
  }

  const base = new Float32Array(positions);
  const edgeArr = new Uint16Array(edges);
  const restLengths = new Float32Array(edgeArr.length / 2);
  for (let e = 0; e < restLengths.length; e++) {
    const a = edgeArr[e * 2] * 3;
    const b = edgeArr[e * 2 + 1] * 3;
    restLengths[e] = Math.hypot(
      base[a] - base[b],
      base[a + 1] - base[b + 1],
      base[a + 2] - base[b + 2],
    );
  }

  return {
    base,
    mask: new Float32Array(mask),
    edges: edgeArr,
    restLengths,
    topCount,
    nodeCount,
  };
}

export function StructureMode() {
  const lattice = useMemo(buildLattice, []);
  const reducedMotion = usePrefersReducedMotion();

  const groupRef = useRef<THREE.Group>(null);
  const membersRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const arrowRef = useRef<THREE.Group>(null);

  const buffers = useMemo(() => {
    const { nodeCount } = lattice;
    return {
      current: new Float32Array(nodeCount),
      target: new Float32Array(nodeCount),
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
      load: { index: -1, x: 0, z: 0 },
      tube: createTubeScratch(),
    };
  }, [lattice]);

  useFrame((state) => {
    const weight = sceneState.weights.structure;
    const group = groupRef.current;
    if (!group) return;

    // Unter der Sichtbarkeitsschwelle wird gar nicht erst gerechnet.
    group.visible = weight > 0.01;
    if (!group.visible) return;

    const eased = weight * weight * (3 - 2 * weight);
    group.scale.setScalar(0.78 + eased * 0.22);
    group.position.y = (1 - eased) * -0.7;
    group.rotation.y = (1 - eased) * 0.35;

    const { base, mask, edges, restLengths, nodeCount, topCount } = lattice;
    const { current, target, dummy, color, ndc, hit, load, tube } = buffers;
    const t = state.clock.elapsedTime;

    // --- 1. Lastpunkt aus dem Mauszeiger ------------------------------
    // Kein Raycast auf die Knoten: die sind wenige Pixel gross, und der
    // Canvas nimmt bewusst keine Pointer-Events entgegen (der Inhalt liegt
    // darueber und muss klickbar bleiben). Stattdessen wird der Zeiger auf
    // die Obergurtebene projiziert und der naechste Knoten gesucht.
    load.index = -1;
    if (!reducedMotion && weight > 0.35) {
      ndc.set(sceneState.pointer.x, sceneState.pointer.y);
      state.raycaster.setFromCamera(ndc, state.camera);
      if (state.raycaster.ray.intersectPlane(GROUND, hit)) {
        const i = Math.round((hit.x / SPAN + 0.5) * (GRID - 1));
        const j = Math.round((hit.z / SPAN + 0.5) * (GRID - 1));
        if (i >= 0 && i < GRID && j >= 0 && j < GRID) {
          load.index = i * GRID + j;
          load.x = base[load.index * 3];
          load.z = base[load.index * 3 + 2];
        }
      }
    }
    const hasLoad = load.index >= 0 && load.index < topCount;

    // --- 2. Zielverformung --------------------------------------------
    for (let n = 0; n < nodeCount; n++) {
      if (hasLoad) {
        const dx = base[n * 3] - load.x;
        const dz = base[n * 3 + 2] - load.z;
        const d2 = dx * dx + dz * dz;
        target[n] = -AMPLITUDE * Math.exp(-d2 / (SIGMA * SIGMA)) * mask[n];
      } else if (reducedMotion) {
        target[n] = 0;
      } else {
        const phase = base[n * 3] * 0.8 + base[n * 3 + 2] * 0.6;
        target[n] = Math.sin(t * 0.55 + phase) * 0.05 * mask[n];
      }
      current[n] += (target[n] - current[n]) * 0.12;
    }

    // --- 3. Staebe als Roehren setzen und nach Dehnung faerben ---------
    // Jeder Stab ist ein eigener Zylinder statt eines Linienabschnitts:
    // nur so bekommt das Fachwerk dieselbe Materialitaet wie der
    // Systemgraph im Hero. Die Farbe traegt weiterhin die Information -
    // Verkuerzung cyan (Druck), Verlaengerung violett (Zug).
    const members = membersRef.current;
    if (members) {
      for (let e = 0; e < restLengths.length; e++) {
        const ia = edges[e * 2];
        const ib = edges[e * 2 + 1];
        const ax = base[ia * 3];
        const ay = base[ia * 3 + 1] + current[ia];
        const az = base[ia * 3 + 2];
        const bx = base[ib * 3];
        const by = base[ib * 3 + 1] + current[ib];
        const bz = base[ib * 3 + 2];

        const len = Math.hypot(bx - ax, by - ay, bz - az);
        const strain = ((len - restLengths[e]) / restLengths[e]) * 26;
        const amount = Math.min(1, Math.abs(strain));

        // Stark beanspruchte Staebe werden zusaetzlich etwas dicker -
        // im Statikbild ist die Linienstaerke traditionell selbst eine
        // Groesse, nicht nur die Farbe.
        setTube(members, e, tube, ax, ay, az, bx, by, bz, 1 + amount * 0.7);

        color
          .copy(COL_NEUTRAL)
          .lerp(strain > 0 ? COL_TENSION : COL_COMPRESSION, amount);
        members.setColorAt(e, color);
      }
      members.instanceMatrix.needsUpdate = true;
      if (members.instanceColor) members.instanceColor.needsUpdate = true;
      (members.material as THREE.MeshStandardMaterial).opacity = eased * 0.95;
    }

    // --- 4. Knoten ----------------------------------------------------
    const mesh = nodesRef.current;
    if (mesh) {
      for (let n = 0; n < nodeCount; n++) {
        dummy.position.set(
          base[n * 3],
          base[n * 3 + 1] + current[n],
          base[n * 3 + 2],
        );
        const active = n === load.index;
        dummy.scale.setScalar(active ? 2.4 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.setColorAt(
          n,
          color.set(active ? "#7dd3fc" : mask[n] < 0.05 ? "#c084fc" : "#5b7288"),
        );
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity = eased;
    }

    // --- 5. Lastpfeil -------------------------------------------------
    if (arrowRef.current) {
      arrowRef.current.visible = hasLoad;
      if (hasLoad) {
        arrowRef.current.position.set(load.x, current[load.index] + 0.75, load.z);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Staebe als Stahlprofile: gleiche Materialsprache wie der
          Systemgraph, damit beim Wechsel zwischen den Abschnitten nicht
          eine Szene gerendert und die andere gezeichnet aussieht. */}
      <instancedMesh
        ref={membersRef}
        args={[undefined, undefined, lattice.edges.length / 2]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.014, 0.014, 1, 6, 1, true]} />
        <meshStandardMaterial
          metalness={0.85}
          roughness={0.32}
          envMapIntensity={1.2}
          transparent
        />
      </instancedMesh>

      {/* Knotenpunkte als glaenzende Kugeln - der Anschlusspunkt ist im
          Stahlbau das sichtbare Detail, also darf er hier auch eins sein. */}
      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, lattice.nodeCount]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.06, 1]} />
        <meshStandardMaterial
          metalness={0.95}
          roughness={0.18}
          envMapIntensity={1.6}
          transparent
        />
      </instancedMesh>

      {/* Lastpfeil: Schaft + Spitze, nach unten wie im Statik-Schema.
          Emissiv, damit er als Markierung ueber dem Tragwerk liegt und
          nicht als weiteres Bauteil gelesen wird. */}
      <group ref={arrowRef} visible={false}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.4, 8]} />
          <meshStandardMaterial
            color="#0b3a4d"
            emissive="#38bdf8"
            emissiveIntensity={2.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.17, 10]} />
          <meshStandardMaterial
            color="#0b3a4d"
            emissive="#38bdf8"
            emissiveIntensity={2.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}
