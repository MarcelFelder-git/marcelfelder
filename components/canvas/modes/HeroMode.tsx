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
 * hindurchlaufen. Dieselbe Formsprache wie Fachwerk und Tunnel (Punkte und
 * Linien), aber die Aussage ist eine andere: nicht "das haelt", sondern
 * "da fliesst etwas".
 *
 * ## Warum Roehren und Perlen statt Linien und Punkte
 *
 * Die erste Fassung benutzte `lineBasicMaterial` und `pointsMaterial`.
 * Beide sind unbeleuchtet: eine 1px-Linie hat keine Oberflaeche, die Licht
 * reflektieren koennte, und ein Point-Sprite ist eine flache Scheibe. Das
 * Ergebnis sah aus wie ein Diagramm, nicht wie ein gerendertes Objekt -
 * genau der Eindruck, den "amateurhaft" beschreibt.
 *
 * Jetzt sind die Kanten duenne Metallzylinder und die Knoten glaenzende
 * Koerper mit hoher Metalness. Zusammen mit den Leuchtflaechen aus
 * `BackgroundScene` bekommen sie Glanzlichter und Kantenreflexe - das ist
 * der Unterschied zwischen eingefaerbt und beleuchtet.
 */

const NODE_COUNT = 58;
/** Wie viele nächste Nachbarn jeder Knoten verbindet. */
const NEIGHBOURS = 3;
const PULSE_COUNT = 18;
const RADIUS = 3.4;

const COL_NODE = new THREE.Color("#5eb7e8");
const COL_NODE_MAJOR = new THREE.Color("#c084fc");

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
  const tubesRef = useRef<THREE.InstancedMesh>(null);
  const pulsesRef = useRef<THREE.InstancedMesh>(null);
  const reduced = usePrefersReducedMotion();

  const graph = useMemo(buildGraph, []);

  const buffers = useMemo(() => {
    // Wo jeder Knoten herkommt: zufaellig verteilt auf einer weiten
    // Kugelschale. Beim Auftritt zieht sich der Graph daraus zusammen.
    const spawn = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 16 + Math.random() * 12;
      spawn[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      spawn[i * 3 + 1] = Math.cos(phi) * r;
      spawn[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }

    return {
      spawn,
      /** Zeitpunkt des ersten sichtbaren Frames, fuer den Auftritt. */
      born: 0,
      live: new Float32Array(NODE_COUNT * 3),
      // Jeder Puls laeuft auf einer Kante von a nach b und setzt danach
      // auf einer neuen Kante neu an.
      pulseEdge: new Int32Array(PULSE_COUNT),
      pulseT: new Float32Array(PULSE_COUNT),
      pulseSpeed: new Float32Array(PULSE_COUNT),
      dummy: new THREE.Object3D(),
      edgeDummy: new THREE.Object3D(),
      color: new THREE.Color(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      quat: new THREE.Quaternion(),
    };
  }, []);

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

    const active = sceneState.weights.hero;
    group.visible = active > 0.01;
    if (!group.visible) return;

    const eased = active * active * (3 - 2 * active);
    const t = state.clock.elapsedTime;
    const { base, phase, edges } = graph;
    const {
      spawn,
      live,
      pulseEdge,
      pulseT,
      pulseSpeed,
      dummy,
      edgeDummy,
      color,
      from,
      to,
      dir,
      up,
      quat,
    } = buffers;

    // --- Auftritt ---------------------------------------------------
    //
    // Der Graph blendet nicht ein, er zieht sich zusammen: die Knoten
    // starten weit verstreut und finden in gut einer Sekunde ihre
    // Plaetze. Das ist der erste Eindruck der Seite, und ein Objekt,
    // das sich vor den Augen aufbaut, sagt mehr ueber die Seite als
    // eines, das einfach da ist.
    // Der Auftritt beginnt erst, wenn der Ladebildschirm weg ist.
    // Sonst laeuft er dahinter ab, und der eine Moment, fuer den er
    // gebaut ist, faellt genau in die Sekunde, in der ihn niemand
    // sehen kann.
    if (
      buffers.born === 0 &&
      !document.documentElement.classList.contains("booting")
    ) {
      buffers.born = t;
    }
    const age = reduced ? 99 : buffers.born === 0 ? 0 : t - buffers.born;
    const raw = Math.min(1, age / 1.3);
    // Weich am Ende, damit die Knoten einschwingen statt anzuschlagen.
    const build = 1 - Math.pow(1 - raw, 3);

    if (!reduced) {
      group.rotation.y = t * 0.055;
      group.rotation.x = Math.sin(t * 0.19) * 0.12;

      // Der Graph dreht sich zum Zeiger.
      //
      // Die Kamera hat schon eine leichte Parallaxe, aber die bewegt die
      // ganze Szene. Hier dreht sich das Objekt selbst, und das ist der
      // Unterschied zwischen "das Bild wackelt" und "das Ding reagiert
      // auf mich". Die Drehung laeuft der Zeigerbewegung entgegen, wie
      // bei etwas, das man in der Hand dreht.
      group.rotation.y += sceneState.pointer.x * 0.3;
      group.rotation.x += -sceneState.pointer.y * 0.22;
    }

    // --- Knoten driften leicht um ihre Ruhelage --------------------
    for (let i = 0; i < NODE_COUNT; i++) {
      const drift = reduced ? 0 : 0.16;
      const x = base[i * 3] + Math.sin(t * 0.4 + phase[i]) * drift;
      const y = base[i * 3 + 1] + Math.cos(t * 0.33 + phase[i] * 1.7) * drift;
      const z = base[i * 3 + 2] + Math.sin(t * 0.28 + phase[i] * 0.6) * drift;

      live[i * 3] = spawn[i * 3] + (x - spawn[i * 3]) * build;
      live[i * 3 + 1] = spawn[i * 3 + 1] + (y - spawn[i * 3 + 1]) * build;
      live[i * 3 + 2] = spawn[i * 3 + 2] + (z - spawn[i * 3 + 2]) * build;
    }

    // --- Kanten als Roehren ausrichten ------------------------------
    const tubes = tubesRef.current;
    if (tubes) {
      for (let e = 0; e < edges.length; e++) {
        const { a, b } = edges[e];
        from.set(live[a * 3], live[a * 3 + 1], live[a * 3 + 2]);
        to.set(live[b * 3], live[b * 3 + 1], live[b * 3 + 2]);

        dir.subVectors(to, from);
        const length = dir.length();

        edgeDummy.position.copy(from).addScaledVector(dir, 0.5);
        // Der Zylinder steht standardmaessig auf der Y-Achse; die
        // Quaternion dreht ihn auf die Kantenrichtung.
        quat.setFromUnitVectors(up, dir.normalize());
        edgeDummy.quaternion.copy(quat);
        edgeDummy.scale.set(1, length, 1);
        edgeDummy.updateMatrix();
        tubes.setMatrixAt(e, edgeDummy.matrix);
      }
      tubes.instanceMatrix.needsUpdate = true;
      (tubes.material as THREE.MeshStandardMaterial).opacity =
        eased * build * 0.8;
    }

    // --- Signale laufen ueber die Kanten ---------------------------
    const pulses = pulsesRef.current;
    if (pulses) {
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
        dummy.position.set(
          live[a * 3] + (live[b * 3] - live[a * 3]) * k,
          live[a * 3 + 1] + (live[b * 3 + 1] - live[a * 3 + 1]) * k,
          live[a * 3 + 2] + (live[b * 3 + 2] - live[a * 3 + 2]) * k,
        );
        // Am Anfang und Ende der Kante kleiner: der Puls taucht auf und
        // verschwindet, statt hart zu erscheinen.
        const fade = Math.sin(k * Math.PI);
        dummy.scale.setScalar(0.4 + fade * 0.8);
        dummy.updateMatrix();
        pulses.setMatrixAt(p, dummy.matrix);
      }
      pulses.instanceMatrix.needsUpdate = true;
      (pulses.material as THREE.MeshBasicMaterial).opacity = eased * build;
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
        dummy.scale.setScalar(major ? 1.8 : 1);
        dummy.rotation.set(t * 0.2 + i, t * 0.15 + i, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.copy(major ? COL_NODE_MAJOR : COL_NODE));
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity =
        eased * (0.25 + build * 0.75);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Kanten als duenne Metallroehren. `openEnded` spart die Deckel -
          die sieht bei diesem Durchmesser ohnehin niemand. */}
      <instancedMesh
        ref={tubesRef}
        args={[undefined, undefined, graph.edges.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.011, 0.011, 1, 6, 1, true]} />
        <meshStandardMaterial
          color="#2b6a88"
          metalness={0.9}
          roughness={0.35}
          transparent
          opacity={0}
        />
      </instancedMesh>

      {/* Knoten als glaenzende Koerper. Metalness hoch, Roughness niedrig:
          so faengt jeder Knoten die Leuchtflaechen der Umgebung als
          Glanzlicht ein - genau das unterscheidet eine gerenderte
          Oberflaeche von einer eingefaerbten Flaeche. */}
      <instancedMesh
        ref={nodesRef}
        args={[undefined, undefined, NODE_COUNT]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[0.075, 1]} />
        <meshStandardMaterial
          metalness={0.95}
          roughness={0.16}
          envMapIntensity={1.6}
          transparent
          opacity={0}
        />
      </instancedMesh>

      {/* Signale: kleine, sehr helle Kugeln. Sie liegen ueber der
          Bloom-Schwelle und bekommen dadurch ihren Schein. */}
      <instancedMesh
        ref={pulsesRef}
        args={[undefined, undefined, PULSE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#e0f2fe" toneMapped={false} transparent />
      </instancedMesh>
    </group>
  );
}
