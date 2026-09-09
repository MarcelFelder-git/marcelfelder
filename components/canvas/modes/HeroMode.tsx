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

/**
 * Wie der Hero Tiefe bekommt.
 *
 * Der Graph stand bisher in schwarzer Leere. Ein Objekt ohne etwas
 * dahinter hat keinen Massstab: man sieht, dass es da ist, aber nicht,
 * wie gross oder wie weit weg. Zwei Zutaten aendern das, beide billig:
 *
 *   1. Ein Fernfeld aus vielen kleinen, sehr dunklen Punkten. Sie
 *      gehoeren sichtbar zum selben Netz, liegen aber drei- bis fuenfmal
 *      so weit hinten. Beim Drehen laufen sie langsamer als der Graph,
 *      und diese Parallaxe ist es, die aus einer Flaeche einen Raum
 *      macht.
 *   2. Eine grosse, sehr weiche Lichtflaeche dahinter. Der Graph steht
 *      dadurch IN Licht statt vor Nichts, und die glaenzenden Knoten
 *      haben endlich etwas, das sie spiegeln koennen.
 */
const NODE_COUNT = 58;
const FIELD_COUNT = 340;
const FIELD_RADIUS = 15;
/**
 * Zwei weitere Ebenen, damit aus zwei Tiefen drei werden.
 *
 * Tiefe entsteht nicht durch ein Hintergrundbild, sondern dadurch, dass
 * sich Dinge in verschiedenen Entfernungen VERSCHIEDEN SCHNELL bewegen.
 * Mit Graph und Fernfeld gab es zwei Geschwindigkeiten, also genau eine
 * Beziehung. Drei Ebenen ergeben drei, und das ist der Punkt, ab dem das
 * Auge einen Raum liest statt einer Staffelung.
 *
 * Ein Nahfeld gab es hier auch einmal: grosse, unscharfe Punkte, die
 * quer vor dem Motiv durchzogen. Als Tiefenmittel ist das eigentlich
 * das staerkste, was es gibt - aber vor einer aufgeraeumten Szene liest
 * sich ein weicher Fleck, der durchs Bild wandert, nicht als Staub,
 * sondern als Fehler. Wieder raus. Drei Ebenen ohne Irritation sind
 * besser als vier mit.
 */
const DEEP_COUNT = 300;
const DEEP_RADIUS = 38;
/** Wie viele nächste Nachbarn jeder Knoten verbindet. */
const NEIGHBOURS = 3;
const PULSE_COUNT = 18;
/**
 * Glieder je Signal. Das vorderste ist der Puls, die drei dahinter sind
 * sein Nachzieher.
 *
 * Ein einzelner Punkt, der eine Kante entlangfaehrt, ist bei dieser
 * Geschwindigkeit kaum als Bewegung zu lesen - das Auge sieht ihn mal
 * hier, mal da. Mit Schleif entsteht eine Richtung, und aus einem
 * springenden Punkt wird etwas, das fliesst. Kostet drei zusaetzliche
 * Instanzen pro Signal, also 54 insgesamt, und keinen einzigen weiteren
 * Draw Call.
 */
const TRAIL = 4;
/** Abstand der Glieder, gemessen im Fortschritt entlang der Kante. */
const TRAIL_GAP = 0.05;
const RADIUS = 3.4;

const COL_NODE = new THREE.Color("#5eb7e8");
const COL_NODE_MAJOR = new THREE.Color("#c084fc");
/** Knoten, an dem gerade ein Signal ankommt oder der Zeiger steht. */
const COL_NODE_HOT = new THREE.Color("#e8f6ff");
const COL_PULSE = new THREE.Color("#dceeff");

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

/** Radialer Lichtfleck als Textur, vom Canvas erzeugt statt geladen. */
function makeHaloTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function HeroMode() {
  const groupRef = useRef<THREE.Group>(null);
  /** Nur der Graph dreht sich. Fernfeld und Licht liegen daneben. */
  const spinRef = useRef<THREE.Group>(null);
  const fieldRef = useRef<THREE.Points>(null);
  const deepRef = useRef<THREE.Points>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const haloAltRef = useRef<THREE.Mesh>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const tubesRef = useRef<THREE.InstancedMesh>(null);
  const pulsesRef = useRef<THREE.InstancedMesh>(null);
  const reduced = usePrefersReducedMotion();

  const graph = useMemo(buildGraph, []);
  const haloTexture = useMemo(makeHaloTexture, []);

  /**
   * Fernfeld: dieselbe Fibonacci-Verteilung wie der Graph, nur weiter
   * draussen und mit zufaelliger Tiefe. Dadurch gehoert es sichtbar
   * dazu, ohne den Graphen zu wiederholen.
   */
  const field = useMemo(() => {
    const pos = new Float32Array(FIELD_COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < FIELD_COUNT; i++) {
      const y = 1 - (i / (FIELD_COUNT - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const scale = FIELD_RADIUS * (0.55 + Math.random() * 0.75);
      pos[i * 3] = Math.cos(theta) * r * scale;
      pos[i * 3 + 1] = y * scale * 0.7;
      pos[i * 3 + 2] = Math.sin(theta) * r * scale;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geometry;
  }, []);

  /** Ganz hinten: nur noch Andeutung, praktisch unbewegt. */
  const deep = useMemo(() => {
    const pos = new Float32Array(DEEP_COUNT * 3);
    for (let i = 0; i < DEEP_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = DEEP_RADIUS * (0.6 + Math.random() * 0.8);
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      pos[i * 3 + 1] = Math.cos(phi) * r * 0.5;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geometry;
  }, []);


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
      /**
       * Wie hell ein Knoten gerade aufblitzt, 0..1.
       *
       * Wird auf 1 gesetzt, wenn ein Signal ihn erreicht, und klingt
       * danach ab. Erst dadurch wird aus der Bewegung ein Vorgang: man
       * sieht nicht nur, dass etwas laeuft, sondern dass es ankommt.
       */
      flash: new Float32Array(NODE_COUNT),
      /** Naehe zum Zeiger, 0..1, traege nachgezogen. */
      near: new Float32Array(NODE_COUNT),
      ndc: new THREE.Vector3(),
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
      flash,
      near,
      ndc,
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

    // Blitze klingen ab. 2.6 pro Sekunde heisst: gut vier Zehntel
    // sichtbar, lang genug zum Wahrnehmen und kurz genug, dass bei 18
    // Signalen nicht der halbe Graph dauerhaft leuchtet.
    for (let i = 0; i < NODE_COUNT; i++) {
      if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - delta * 2.6);
    }

    const spin = spinRef.current;
    if (!reduced && spin) {
      spin.rotation.y = t * 0.055;
      spin.rotation.x = Math.sin(t * 0.19) * 0.12;

      // Der Graph dreht sich zum Zeiger.
      //
      // Die Kamera hat schon eine leichte Parallaxe, aber die bewegt die
      // ganze Szene. Hier dreht sich das Objekt selbst, und das ist der
      // Unterschied zwischen "das Bild wackelt" und "das Ding reagiert
      // auf mich". Die Drehung laeuft der Zeigerbewegung entgegen, wie
      // bei etwas, das man in der Hand dreht.
      spin.rotation.y += sceneState.pointer.x * 0.3;
      spin.rotation.x += -sceneState.pointer.y * 0.22;
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

    // --- Naehe zum Zeiger -------------------------------------------
    //
    // Jeder Knoten wird auf den Bildschirm projiziert und mit der
    // Zeigerposition verglichen. 58 Projektionen pro Frame kosten
    // nichts, und es ist der einzige Weg, der auch dann stimmt, wenn
    // sich der Graph gerade dreht: im Raum ist "nah am Cursor" keine
    // definierte Groesse, auf dem Schirm schon.
    //
    // Kein Raycasting, weil der Canvas keine Zeigerereignisse annimmt -
    // sonst liesse sich der Text darueber nicht mehr markieren.
    if (spin && !reduced) {
      const px = sceneState.pointer.x;
      const py = sceneState.pointer.y;
      for (let i = 0; i < NODE_COUNT; i++) {
        ndc
          .set(live[i * 3], live[i * 3 + 1], live[i * 3 + 2])
          .applyMatrix4(spin.matrixWorld)
          .project(state.camera);
        const dx = ndc.x - px;
        const dy = ndc.y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        const target = Math.max(0, 1 - d / 0.34);
        // Quadriert: der Uebergang soll eng sein, sonst leuchtet der
        // halbe Graph, sobald die Maus im Bild ist.
        near[i] += (target * target - near[i]) * 0.16;
      }
    } else {
      for (let i = 0; i < NODE_COUNT; i++) near[i] *= 0.88;
    }

    // Nahe Knoten heben sich leicht aus dem Verbund heraus. Die Kanten
    // folgen von selbst, weil sie aus `live` gebaut werden - genau
    // deshalb steht das hier VOR der Kantenschleife.
    for (let i = 0; i < NODE_COUNT; i++) {
      const lift = near[i];
      if (lift < 0.002) continue;
      const f = 1 + lift * 0.15;
      live[i * 3] *= f;
      live[i * 3 + 1] *= f;
      live[i * 3 + 2] *= f;
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
          // Angekommen: der Zielknoten blitzt auf. Das ist der
          // Unterschied zwischen "da bewegt sich etwas" und "da wird
          // etwas uebertragen".
          flash[edges[pulseEdge[p]].b] = 1;
          pulseT[p] = 0;
          // Neue Kante: so wirkt es wie Verkehr im Netz und nicht wie
          // eine feste Rundstrecke.
          pulseEdge[p] = Math.floor(Math.random() * edges.length);
        }
        const { a, b } = edges[pulseEdge[p]];

        for (let s = 0; s < TRAIL; s++) {
          const k = pulseT[p] - s * TRAIL_GAP;
          const idx = p * TRAIL + s;
          const shrink = 1 - s / TRAIL;

          if (k <= 0) {
            // Noch nicht losgelaufen: Glied unsichtbar schalten, statt
            // es am Kantenanfang stapeln zu lassen.
            dummy.scale.setScalar(0);
            dummy.position.set(0, 0, 0);
            dummy.updateMatrix();
            pulses.setMatrixAt(idx, dummy.matrix);
            pulses.setColorAt(idx, color.setScalar(0));
            continue;
          }

          dummy.position.set(
            live[a * 3] + (live[b * 3] - live[a * 3]) * k,
            live[a * 3 + 1] + (live[b * 3 + 1] - live[a * 3 + 1]) * k,
            live[a * 3 + 2] + (live[b * 3 + 2] - live[a * 3 + 2]) * k,
          );
          // Am Anfang und Ende der Kante kleiner: der Puls taucht auf und
          // verschwindet, statt hart zu erscheinen.
          const fade = Math.sin(k * Math.PI);
          dummy.scale.setScalar((0.4 + fade * 0.8) * shrink);
          dummy.updateMatrix();
          pulses.setMatrixAt(idx, dummy.matrix);
          // Der Schleif verblasst quadratisch. Linear sieht aus wie eine
          // Perlenkette, quadratisch wie eine Spur.
          pulses.setColorAt(
            idx,
            color.copy(COL_PULSE).multiplyScalar(shrink * shrink),
          );
        }
      }
      pulses.instanceMatrix.needsUpdate = true;
      if (pulses.instanceColor) pulses.instanceColor.needsUpdate = true;
      (pulses.material as THREE.MeshBasicMaterial).opacity = eased * build;
    }

    // --- Fernfeld und Licht ----------------------------------------
    //
    // Das Fernfeld dreht sich langsamer als der Graph. Genau darin liegt
    // seine Wirkung: gleich schnell waere es Teil desselben Koerpers,
    // gar nicht waere es eine Tapete. Ein Drittel der Geschwindigkeit
    // liest sich als "weiter weg".
    if (fieldRef.current) {
      if (!reduced) {
        // Ein Drittel der Graphengeschwindigkeit. Gleich schnell waere
        // es Teil desselben Koerpers, gar nicht waere es eine Tapete.
        fieldRef.current.rotation.y = t * 0.018;
        fieldRef.current.rotation.x = Math.sin(t * 0.07) * 0.05;
        fieldRef.current.rotation.y += sceneState.pointer.x * 0.1;
      }
      (fieldRef.current.material as THREE.PointsMaterial).opacity =
        eased * build * 0.5;
    }
    if (deepRef.current) {
      if (!reduced) deepRef.current.rotation.y = t * 0.006;
      (deepRef.current.material as THREE.PointsMaterial).opacity =
        eased * build * 0.55;
    }
    if (haloRef.current) {
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        eased * build * 0.5;
    }
    if (haloAltRef.current) {
      (haloAltRef.current.material as THREE.MeshBasicMaterial).opacity =
        eased * build * 0.3;
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
        // Ankunft und Zeigernaehe zaehlen auf denselben Wert ein: beide
        // heissen "hier passiert gerade etwas", und zwei getrennte
        // Hervorhebungen waeren eine zu viel.
        const boost = Math.min(1, flash[i] + near[i]);
        dummy.scale.setScalar((major ? 1.8 : 1) * (1 + boost * 0.8));
        dummy.rotation.set(t * 0.2 + i, t * 0.15 + i, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(
          i,
          color.copy(major ? COL_NODE_MAJOR : COL_NODE).lerp(COL_NODE_HOT, boost),
        );
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity =
        eased * (0.25 + build * 0.75);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Weiche Lichtflaeche hinter allem. Additiv, damit sie nur
          aufhellt und nichts verdeckt, und weit genug hinten, dass sie
          als Raum und nicht als Scheibe gelesen wird. */}
      <mesh ref={haloRef} position={[0.6, 0.2, -9]} scale={[26, 20, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={haloTexture}
          color="#2a6f9e"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Gegenlicht in der zweiten Akzentfarbe, von der anderen Seite.
          Eine einzelne Lichtquelle laesst einen Koerper flach wirken;
          zwei aus verschiedenen Richtungen modellieren ihn. */}
      <mesh ref={haloAltRef} position={[-7, -2.5, -13]} scale={[22, 16, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={haloTexture}
          color="#5b2f8a"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Ganz hinten, praktisch unbewegt. */}
      <points ref={deepRef} geometry={deep} frustumCulled={false}>
        <pointsMaterial
          size={0.042}
          color="#3a6a91"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Fernfeld. Steht ausserhalb der drehenden Gruppe, damit es sich
          langsamer bewegen kann als der Graph. */}
      <points ref={fieldRef} geometry={field} frustumCulled={false}>
        <pointsMaterial
          size={0.05}
          color="#4a7fa8"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Alles, was sich dreht. Fernfeld und Licht stehen bewusst
          daneben: nur so koennen sie sich langsamer bewegen und die
          Parallaxe erzeugen, die dem Bild seine Tiefe gibt. */}
      <group ref={spinRef}>
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
        args={[undefined, undefined, PULSE_COUNT * TRAIL]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.045, 12, 12]} />
        {/* Weiss als Grundfarbe: die Faerbung und das Verblassen des
            Schleifs kommen aus der Instanzfarbe und wuerden sich sonst
            mit dem Materialton multiplizieren. */}
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent />
      </instancedMesh>
      </group>
    </group>
  );
}
