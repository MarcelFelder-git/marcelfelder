"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

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

const GRID = 7; // Knoten je Richtung in der Obergurtebene
const SPAN = 3.4; // Stuetzweite in Weltkoordinaten
const DEPTH = 0.62; // Fachwerkhoehe (Abstand Ober-/Untergurt)
const AMPLITUDE = 0.55; // maximale Durchbiegung unter Einzellast
const SIGMA = 0.9; // Wirkungsradius der Last

const COL_NEUTRAL = new THREE.Color("#334155");
const COL_COMPRESSION = new THREE.Color("#38bdf8");
const COL_TENSION = new THREE.Color("#a855f7");

interface Lattice {
  base: Float32Array; // Ruhelage der Knoten (x,y,z)
  mask: Float32Array; // Auflager-Maske je Knoten, 0 = unverschieblich
  edges: Uint16Array; // Stabliste als Knotenpaare
  restLengths: Float32Array;
  topCount: number;
  nodeCount: number;
}

function buildLattice(): Lattice {
  const positions: number[] = [];
  const mask: number[] = [];

  const coord = (i: number) => (i / (GRID - 1) - 0.5) * SPAN;

  // --- Obergurt: regelmaessiges Raster --------------------------------
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      positions.push(coord(i), 0, coord(j));
      // Randknoten sind Auflager -> Maske 0, nach innen weich ansteigend.
      const edgeDist = Math.min(i, j, GRID - 1 - i, GRID - 1 - j);
      const t = edgeDist / ((GRID - 1) / 2);
      mask.push(t * t * (3 - 2 * t)); // smoothstep
    }
  }
  const topCount = positions.length / 3;

  // --- Untergurt: um eine halbe Masche versetzt ------------------------
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

  // Obergurt-Staebe in beide Richtungen
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if (i < GRID - 1) edges.push(top(i, j), top(i + 1, j));
      if (j < GRID - 1) edges.push(top(i, j), top(i, j + 1));
    }
  }
  // Untergurt-Staebe
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

  const hoveredNode = useViewportMode((s) => s.hoveredNode);
  const setHoveredNode = useViewportMode((s) => s.setHoveredNode);

  const linesRef = useRef<THREE.LineSegments>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const arrowRef = useRef<THREE.Group>(null);

  // Arbeitspuffer - werden pro Frame mutiert, nie neu alloziert.
  const buffers = useMemo(() => {
    const { edges, nodeCount } = lattice;
    return {
      current: new Float32Array(nodeCount), // aktuelle Durchbiegung je Knoten
      target: new Float32Array(nodeCount),
      linePos: new Float32Array(edges.length * 3),
      lineCol: new Float32Array(edges.length * 3),
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
    };
  }, [lattice]);

  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buffers.linePos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(buffers.lineCol, 3));
    return g;
  }, [buffers]);

  useFrame((state) => {
    const { base, mask, edges, restLengths, nodeCount, topCount } = lattice;
    const { current, target, linePos, lineCol, dummy, color } = buffers;
    const t = state.clock.elapsedTime;

    // --- 1. Zielverformung bestimmen ---------------------------------
    const hasLoad = hoveredNode >= 0 && hoveredNode < topCount;
    const lx = hasLoad ? base[hoveredNode * 3] : 0;
    const lz = hasLoad ? base[hoveredNode * 3 + 2] : 0;

    for (let n = 0; n < nodeCount; n++) {
      if (hasLoad) {
        const dx = base[n * 3] - lx;
        const dz = base[n * 3 + 2] - lz;
        const d2 = dx * dx + dz * dz;
        target[n] = -AMPLITUDE * Math.exp(-d2 / (SIGMA * SIGMA)) * mask[n];
      } else if (reducedMotion) {
        target[n] = 0;
      } else {
        // Ruhezustand: eine langsam wandernde Welle, damit das Tragwerk lebt.
        const phase = base[n * 3] * 0.8 + base[n * 3 + 2] * 0.6;
        target[n] = Math.sin(t * 0.55 + phase) * 0.045 * mask[n];
      }
      // Gedaempfte Annaeherung - kein Ueberschwingen.
      current[n] += (target[n] - current[n]) * 0.12;
    }

    // --- 2. Staebe neu aufbauen und nach Dehnung einfaerben -----------
    for (let e = 0; e < restLengths.length; e++) {
      const ia = edges[e * 2];
      const ib = edges[e * 2 + 1];
      const ax = base[ia * 3];
      const ay = base[ia * 3 + 1] + current[ia];
      const az = base[ia * 3 + 2];
      const bx = base[ib * 3];
      const by = base[ib * 3 + 1] + current[ib];
      const bz = base[ib * 3 + 2];

      const o = e * 6;
      linePos[o] = ax;
      linePos[o + 1] = ay;
      linePos[o + 2] = az;
      linePos[o + 3] = bx;
      linePos[o + 4] = by;
      linePos[o + 5] = bz;

      const len = Math.hypot(bx - ax, by - ay, bz - az);
      // Dehnung eps = dL / L, auf einen sichtbaren Bereich skaliert.
      const strain = ((len - restLengths[e]) / restLengths[e]) * 26;
      const amount = Math.min(1, Math.abs(strain));
      color
        .copy(COL_NEUTRAL)
        .lerp(strain > 0 ? COL_TENSION : COL_COMPRESSION, amount);

      lineCol[o] = color.r;
      lineCol[o + 1] = color.g;
      lineCol[o + 2] = color.b;
      lineCol[o + 3] = color.r;
      lineCol[o + 4] = color.g;
      lineCol[o + 5] = color.b;
    }

    if (linesRef.current) {
      const geo = linesRef.current.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    }

    // --- 3. Knotenpunkte setzen --------------------------------------
    const mesh = nodesRef.current;
    if (mesh) {
      for (let n = 0; n < nodeCount; n++) {
        dummy.position.set(
          base[n * 3],
          base[n * 3 + 1] + current[n],
          base[n * 3 + 2],
        );
        const active = n === hoveredNode;
        dummy.scale.setScalar(active ? 2.1 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(n, dummy.matrix);
        mesh.setColorAt(
          n,
          color.set(active ? "#38bdf8" : mask[n] < 0.05 ? "#a855f7" : "#475569"),
        );
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // --- 4. Lastpfeil ueber dem belasteten Knoten --------------------
    if (arrowRef.current) {
      arrowRef.current.visible = hasLoad;
      if (hasLoad) {
        arrowRef.current.position.set(lx, current[hoveredNode] + 0.62, lz);
      }
    }
  });

  return (
    <group>
      <lineSegments ref={linesRef} geometry={lineGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} />
      </lineSegments>

      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, lattice.nodeCount]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[0.05, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/*
        Pickebene statt Treffer auf den Knoten selbst: ein Knoten mit 5 cm
        Radius ist auf dem Bildschirm ein paar Pixel gross, den trifft
        niemand absichtlich. Stattdessen faengt eine unsichtbare Ebene den
        Cursor und rechnet den naechstgelegenen Obergurtknoten aus - die
        Last landet immer dort, wo der Nutzer offensichtlich hinzeigt.
      */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          e.stopPropagation();
          const i = Math.round((e.point.x / SPAN + 0.5) * (GRID - 1));
          const j = Math.round((e.point.z / SPAN + 0.5) * (GRID - 1));
          if (i < 0 || i > GRID - 1 || j < 0 || j > GRID - 1) return;
          const id = i * GRID + j;
          if (id !== hoveredNode) setHoveredNode(id);
        }}
        onPointerOut={() => setHoveredNode(-1)}
      >
        <planeGeometry args={[SPAN * 1.05, SPAN * 1.05]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lastpfeil: Schaft + Spitze, nach unten wie im Statik-Schema */}
      <group ref={arrowRef} visible={false}>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.32, 6]} />
          <meshBasicMaterial color="#38bdf8" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.04, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 8]} />
          <meshBasicMaterial color="#38bdf8" toneMapped={false} />
        </mesh>
      </group>

      {/* Auflagerebene als Referenz - wie die Grundrisslinie im Plan */}
      <gridHelper
        args={[SPAN * 1.7, 12, "#1b2437", "#0f172a"]}
        position={[0, -DEPTH - 0.55, 0]}
      />
    </group>
  );
}
