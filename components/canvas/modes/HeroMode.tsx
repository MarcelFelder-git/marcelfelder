"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Systemgraph — das Bild im Hero.
 *
 * Ein Tragwerk war hier das falsche Motiv, sobald Entwicklung die Rolle
 * ist, um die es geht: es erzaehlt Statik, nicht Software. Was hier steht,
 * ist ein Abhaengigkeitsgraph — Knoten, Kanten, und Signale, die
 * hindurchlaufen. Dieselbe Formsprache wie Fachwerk und Tunnel (Punkte
 * und Linien), aber die Aussage ist eine andere: nicht "das haelt", sondern
 * "da fliesst etwas".
 *
 * Die Pulse sind der eigentliche Blickfang. Ein statischer Graph ist ein
 * Diagramm; ein Graph, durch den etwas laeuft, ist ein laufendes System.
 */

const NODE_COUNT = 58;
/** Wie viele nächste Nachbarn jeder Knoten verbindet. */
const NEIGHBOURS = 3;
const PULSE_COUNT = 18;
const RADIUS = 3.4;

const COL_NODE = new THREE.Color("#38bdf8");
const COL_NODE_ALT = new THREE.Color("#a855f7");
const COL_EDGE = new THREE.Color("#1e4763");

interface Edge {
  a: number;
  b: number;
}

function buildGraph() {
  const base = new Float32Array(NODE_COUNT * 3);
  const phase = new Float32Array(NODE_COUNT);

  // Fibonacci-Verteilung auf einer abgeflachten Kugel: gleichmaessiger als
  // Zufall, ohne das Raster eines Gitters. Y gestaucht, damit die Form
  // breiter als hoch steht und neben der Headline funktioniert.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NODE_COUNT; i++) {
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    base[i * 3] = Math.cos(theta) * r * RADIUS;
    base[i * 3 + 1] = y * RADIUS * 0.62;
    base[i * 3 + 2] = Math.sin(theta) * r * RADIUS;
    phase[i] = Math.random() * Math.PI * 2;
  }

  // Kanten zu den nächsten Nachbarn, Duplikate ueber ein Set verhindert.
  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const distances: { index: number; d: number }[] = [];
    for (let j = 0; j < NODE_COUNT; j++) {
      if (i === j) continue;
      const dx = base[i * 3] - base[j * 3];
      const dy = base[i * 3 + 1] - base[j * 3 + 1];
      const dz = base[i * 3 + 2] - base[j * 3 + 2];
      distances.push({ index: j, d: dx * dx + dy * dy + dz * dz });
    }
    distances.sort((p, q) => p.d - q.d);
    for (let k = 0; k < NEIGHBOURS; k++) {
      const j = distances[k].index;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j });
    }
  }

  return { base, phase, edges };
}

export function HeroMode() {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pulsesRef = useRef<THREE.Points>(null);
  const reduced = usePrefersReducedMotion();

  const graph = useMemo(buildGraph, []);

  const buffers = useMemo(() => {
    const { edges } = graph;
    return {
      live: new Float32Array(NODE_COUNT * 3),
      linePos: new Float32Array(edges.length * 6),
      lineCol: new Float32Array(edges.length * 6),
      pulsePos: new Float32Array(PULSE_COUNT * 3),
      // Jeder Puls laeuft auf einer Kante von a nach b und setzt danach
      // auf einer neuen Kante neu an.
      pulseEdge: new Int32Array(PULSE_COUNT),
      pulseT: new Float32Array(PULSE_COUNT),
      pulseSpeed: new Float32Array(PULSE_COUNT),
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
    };
  }, [graph]);

  const lineGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buffers.linePos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(buffers.lineCol, 3));
    return g;
  }, [buffers]);

  const pulseGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(buffers.pulsePos, 3));
    return g;
  }, [buffers]);

  // Pulse initial auf zufaellige Kanten setzen.
  useMemo(() => {
    for (let i = 0; i < PULSE_COUNT; i++) {
      buffers.pulseEdge[i] = Math.floor(Math.random() * graph.edges.length);
      buffers.pulseT[i] = Math.random();
      buffers.pulseSpeed[i] = 0.25 + Math.random() * 0.55;
    }
  }, [buffers, graph]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const active = sceneState.hero.active;
    group.visible = active > 0.01;
    if (!group.visible) return;

    const eased = active * active * (3 - 2 * active);
    const t = state.clock.elapsedTime;
    const { base, phase, edges } = graph;
    const {
      live,
      linePos,
      lineCol,
      pulsePos,
      pulseEdge,
      pulseT,
      pulseSpeed,
      dummy,
      color,
    } = buffers;

    if (!reduced) {
      group.rotation.y = t * 0.055;
      group.rotation.x = Math.sin(t * 0.19) * 0.12;
    }

    // --- Knoten driften leicht um ihre Ruhelage --------------------
    for (let i = 0; i < NODE_COUNT; i++) {
      const drift = reduced ? 0 : 0.16;
      live[i * 3] = base[i * 3] + Math.sin(t * 0.4 + phase[i]) * drift;
      live[i * 3 + 1] =
        base[i * 3 + 1] + Math.cos(t * 0.33 + phase[i] * 1.7) * drift;
      live[i * 3 + 2] =
        base[i * 3 + 2] + Math.sin(t * 0.28 + phase[i] * 0.6) * drift;
    }

    // --- Kanten neu aufspannen -------------------------------------
    for (let e = 0; e < edges.length; e++) {
      const { a, b } = edges[e];
      const o = e * 6;
      linePos[o] = live[a * 3];
      linePos[o + 1] = live[a * 3 + 1];
      linePos[o + 2] = live[a * 3 + 2];
      linePos[o + 3] = live[b * 3];
      linePos[o + 4] = live[b * 3 + 1];
      linePos[o + 5] = live[b * 3 + 2];

      for (let k = 0; k < 6; k += 3) {
        lineCol[o + k] = COL_EDGE.r;
        lineCol[o + k + 1] = COL_EDGE.g;
        lineCol[o + k + 2] = COL_EDGE.b;
      }
    }
    if (linesRef.current) {
      const geo = linesRef.current.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      (linesRef.current.material as THREE.LineBasicMaterial).opacity =
        eased * 0.75;
    }

    // --- Signale laufen ueber die Kanten ---------------------------
    for (let p = 0; p < PULSE_COUNT; p++) {
      if (!reduced) pulseT[p] += pulseSpeed[p] * delta;
      if (pulseT[p] >= 1) {
        pulseT[p] = 0;
        // Neue Kante: so wirkt es wie Verkehr im Netz und nicht wie
        // eine feste Rundstrecke.
        pulseEdge[p] = Math.floor(Math.random() * edges.length);
      }
      const { a, b } = edges[pulseEdge[p]];
      const k = pulseT[p];
      pulsePos[p * 3] = live[a * 3] + (live[b * 3] - live[a * 3]) * k;
      pulsePos[p * 3 + 1] =
        live[a * 3 + 1] + (live[b * 3 + 1] - live[a * 3 + 1]) * k;
      pulsePos[p * 3 + 2] =
        live[a * 3 + 2] + (live[b * 3 + 2] - live[a * 3 + 2]) * k;
    }
    if (pulsesRef.current) {
      pulsesRef.current.geometry.attributes.position.needsUpdate = true;
      (pulsesRef.current.material as THREE.PointsMaterial).opacity = eased;
    }

    // --- Knoten setzen ---------------------------------------------
    const mesh = nodesRef.current;
    if (mesh) {
      for (let i = 0; i < NODE_COUNT; i++) {
        dummy.position.set(live[i * 3], live[i * 3 + 1], live[i * 3 + 2]);
        // Jeder siebte Knoten ist ein Knotenpunkt hoeherer Ordnung -
        // groesser und in der Gegenfarbe. Ohne diese Abstufung liest sich
        // der Graph als gleichfoermige Punktwolke.
        const major = i % 7 === 0;
        dummy.scale.setScalar(major ? 1.9 : 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.copy(major ? COL_NODE_ALT : COL_NODE));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      (mesh.material as THREE.MeshBasicMaterial).opacity = eased;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <lineSegments ref={linesRef} geometry={lineGeometry} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0} />
      </lineSegments>

      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, NODE_COUNT]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[0.055, 0]} />
        <meshBasicMaterial toneMapped={false} transparent />
      </instancedMesh>

      <points ref={pulsesRef} geometry={pulseGeometry} frustumCulled={false}>
        <pointsMaterial
          size={0.13}
          color="#bae6fd"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
