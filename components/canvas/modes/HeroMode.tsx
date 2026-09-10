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
const RADIUS = 3.4;

const COL_NODE = new THREE.Color("#5eb7e8");
const COL_NODE_MAJOR = new THREE.Color("#c084fc");
const COL_EDGE = new THREE.Color("#2b6a88");
/**
 * Luftperspektive: wohin ein Koerper geht, je weiter er hinten steht.
 *
 * Der Graph war durchgehend gleich hell. Damit lagen vordere und hintere
 * Haelfte gleichberechtigt uebereinander, und das Auge hatte 58 Knoten
 * und 140 Kanten in einer Ebene zu sortieren - viel Betrieb auf wenig
 * Flaeche. Perspektive allein loest das nicht: sie macht Entferntes
 * kleiner, nicht ruhiger.
 *
 * Was Entferntes ruhig macht, ist die Luft dazwischen. Sie nimmt
 * Kontrast weg und zieht die Farbe zum Ton des Dunstes - deshalb wird
 * hier nicht abgedunkelt, sondern zu einem Ton hin gemischt. Abdunkeln
 * allein sieht aus wie Schatten; die Verschiebung ins Blau des Grundes
 * sieht aus wie Entfernung.
 *
 * Der Ton liegt bewusst ueber dem Grundton der Szene ([8, 9, 14]):
 * hinten soll etwas zurueckweichen, nicht verschwinden.
 */
const COL_DEPTH = new THREE.Color("#102a3d");
/** Wie weit die hinterste Reihe in den Dunst geht, 0..1. */
const DEPTH_NODE = 0.8;
/** Kanten gehen weiter zurueck als Knoten: sie sind der Betrieb. */
const DEPTH_EDGE = 0.92;
/** Signale am wenigsten - sie sollen auch hinten noch lesbar sein. */
const DEPTH_PULSE = 0.5;

/**
 * Hoehe des Bodens, im Koordinatensystem der Gruppe.
 *
 * Knapp unter dem tiefsten Knoten (RADIUS * 0.62 plus Drift plus
 * Knotenradius), damit nichts hindurchsticht, und knapp genug darunter,
 * dass das Spiegelbild noch ins Bild passt: die Kamera steht fast auf
 * Hoehe der Mitte, also bleibt nach unten nur ein schmales Band.
 */
const FLOOR_Y = -2.4;
/** Ueber welche Strecke das Spiegelbild ausgeht. */
const REFL_FADE = 4.0;

/** Farbe des Lichts, das durch die Leitungen laeuft. */
const COL_GLOW = new THREE.Color("#bfe4ff");

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
  /** Spiegelbild: dieselben Matrizen, nur unter dem Boden. */
  const nodesReflRef = useRef<THREE.InstancedMesh>(null);
  const tubesReflRef = useRef<THREE.InstancedMesh>(null);
  const mirrorSpinRef = useRef<THREE.Group>(null);
  const reduced = usePrefersReducedMotion();

  const graph = useMemo(buildGraph, []);
  const haloTexture = useMemo(makeHaloTexture, []);

  /**
   * Die Leitungen, mit einem Platz fuer das Licht darin.
   *
   * Frueher rutschten hier 18 kleine Kugeln ueber die Kanten. Das ist
   * die Bildsprache von Netzwerk-Animationen aus Baukaesten, und mit
   * Bloom darauf wirken Kugeln eher spielig als technisch. Jetzt gibt
   * es die Kugeln nicht mehr: das Signal ist ein heller Abschnitt IN
   * der Roehre, so wie Licht in einer Glasfaser.
   *
   * Das ist die seltene Aenderung, die etwas wegnimmt statt etwas
   * hinzuzufuegen - eine ganze Objektklasse samt ihrem Draw Call faellt
   * weg, und uebrig bleibt eine Eigenschaft der Leitung selbst.
   *
   * Getragen wird das von einem Instanzattribut mit drei Zahlen je
   * Kante: wo das Licht steht (0..1), wie hell es ist, und wie lang die
   * Kante ist. Die Laenge braucht es, damit der Lichtabschnitt auf
   * einer kurzen und einer langen Kante gleich lang ausfaellt - ohne
   * sie waere er auf langen Kanten ein Streifen und auf kurzen ein
   * Fleck.
   */
  const tubeGeometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.013, 0.013, 1, 6, 1, true);
    const attr = new THREE.InstancedBufferAttribute(
      new Float32Array(graph.edges.length * 3),
      3,
    );
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aPulse", attr);
    return g;
  }, [graph]);

  /**
   * Standardmaterial mit einem Einschub statt eines eigenen Shaders.
   *
   * Einen ShaderMaterial von Hand zu schreiben hiesse, Beleuchtung,
   * Umgebungsspiegelung und Tonwertkurve selbst nachzubauen - und die
   * Roehren wuerden ihr Studiolicht verlieren, das sie ueberhaupt erst
   * nach Metall aussehen laesst. `onBeforeCompile` haengt sich stattdessen
   * in den fertigen Shader ein: alles bleibt, dazu kommt ein Summand auf
   * die Eigenleuchtkraft.
   *
   * Der Glanz wird im Fragment gerechnet, nicht im Vertex. Die Roehre
   * hat nur zwei Ringe aus Punkten - ein im Vertex berechneter Wert
   * koennte zwischen ihnen nur linear ueberblenden und haette gar keine
   * Aufloesung fuer einen begrenzten Lichtfleck.
   */
  const tubeMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.35,
      transparent: true,
      opacity: 0,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uGlow = { value: COL_GLOW };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           attribute vec3 aPulse;
           varying float vAlong;
           varying vec3 vPulse;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           // Der Zylinder liegt in seinem eigenen System von -0.5 bis
           // 0.5 auf der Y-Achse, unabhaengig davon, wie lang die
           // Instanz spaeter skaliert wird.
           vAlong = position.y + 0.5;
           vPulse = aPulse;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform vec3 uGlow;
           varying float vAlong;
           varying vec3 vPulse;`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           // Abstand zum Licht, umgerechnet in Welteinheiten: erst
           // dadurch ist der Lichtabschnitt ueberall gleich lang.
           float dGlow = abs(vAlong - vPulse.x) * vPulse.z;
           totalEmissiveRadiance +=
             uGlow * exp(-dGlow * dGlow * 26.0) * vPulse.y;`,
        );
    };
    // Ohne eigenen Schluessel gaebe three dem Material das compilierte
    // Programm eines anderen Standardmaterials - ohne den Einschub.
    m.customProgramCacheKey = () => "hero-tube-glow";
    return m;
  }, []);

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
      /** Wie weit vorn ein Knoten gerade steht, 0 = hinten, 1 = vorn. */
      depth: new Float32Array(NODE_COUNT),
      /** Laenge jeder Kante, in der Kantenschleife nebenbei gemessen. */
      edgeLen: new Float32Array(graph.edges.length),
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
  }, [graph]);

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
      depth,
      edgeLen,
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

    // --- Tiefe jedes Knotens messen ---------------------------------
    //
    // Gebraucht wird die z-Lage NACH der Drehung, denn welcher Teil des
    // Graphen gerade hinten steht, aendert sich mit jeder Umdrehung.
    // Die volle Matrix darauf anzuwenden waere Verschwendung: von den
    // sechzehn Zahlen tragen genau drei zur z-Komponente bei, und die
    // Verschiebung faellt heraus, weil hier die Lage IM Graphen zaehlt
    // und nicht die im Raum. Drei Multiplikationen pro Knoten.
    //
    // matrixWorld stammt aus dem vorigen Bild - der Renderer aktualisiert
    // die Matrizen erst nach diesem Aufruf. Bei 0.055 rad/s sind das
    // drei Tausendstel Grad Rueckstand.
    const m = spinRef.current?.matrixWorld.elements;
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = live[i * 3];
      const y = live[i * 3 + 1];
      const z = live[i * 3 + 2];
      const dz = m ? m[2] * x + m[6] * y + m[10] * z : z;
      depth[i] = Math.min(1, Math.max(0, (dz + RADIUS) / (2 * RADIUS)));
    }

    // --- Kanten als Roehren ausrichten ------------------------------
    const tubes = tubesRef.current;
    const tubesRefl = tubesReflRef.current;
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
        // Gebraucht wird sie gleich fuer das Licht in der Leitung: der
        // Lichtabschnitt soll in Welteinheiten gemessen werden und
        // nicht in Bruchteilen einer Kante.
        edgeLen[e] = length;

        // Eine Kante bekommt die mittlere Tiefe ihrer beiden Enden. Sie
        // ueber ihre Laenge zu staffeln ginge nur mit einem eigenen
        // Shader, und bei elf Millimetern Durchmesser saehe das niemand.
        const n = (depth[a] + depth[b]) * 0.5;
        tubes.setColorAt(
          e,
          color.copy(COL_EDGE).lerp(COL_DEPTH, (1 - n) * DEPTH_EDGE),
        );

        if (tubesRefl) {
          tubesRefl.setMatrixAt(e, edgeDummy.matrix);
          // Das Spiegelbild verliert mit dem Abstand zum Boden. Der
          // Bezugspunkt ist die Mitte der Kante, also genau die Hoehe,
          // die schon in edgeDummy steht.
          const fade = Math.max(
            0,
            1 - (edgeDummy.position.y - FLOOR_Y) / REFL_FADE,
          );
          tubesRefl.setColorAt(e, color.multiplyScalar(fade * fade));
        }
      }
      tubes.instanceMatrix.needsUpdate = true;
      if (tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
      (tubes.material as THREE.MeshStandardMaterial).opacity =
        eased * build * 0.8;

      if (tubesRefl) {
        tubesRefl.instanceMatrix.needsUpdate = true;
        if (tubesRefl.instanceColor) tubesRefl.instanceColor.needsUpdate = true;
        (tubesRefl.material as THREE.MeshStandardMaterial).opacity =
          eased * build * 0.36;
      }
    }

    // --- Signale laufen durch die Leitungen ------------------------
    //
    // Kein eigenes Objekt mehr, sondern ein Zustand der Kante: drei
    // Zahlen pro Kante, die der Shader in einen Lichtabschnitt
    // uebersetzt. Zuerst alles auf dunkel, dann schreiben die achtzehn
    // Signale ihre Kante hell - 140 Nullen kosten weniger als eine
    // einzige der Matrixrechnungen, die hier vorher standen.
    const pulseAttr = tubeGeometry.getAttribute(
      "aPulse",
    ) as THREE.InstancedBufferAttribute;
    const pa = pulseAttr.array as Float32Array;
    for (let e = 0; e < edges.length; e++) pa[e * 3 + 1] = 0;

    for (let p = 0; p < PULSE_COUNT; p++) {
      if (!reduced) pulseT[p] += pulseSpeed[p] * delta;
      if (pulseT[p] >= 1) {
        pulseT[p] = 0;
        // Neue Kante: so wirkt es wie Verkehr im Netz und nicht wie
        // eine feste Rundstrecke.
        pulseEdge[p] = Math.floor(Math.random() * edges.length);
      }
      const e = pulseEdge[p];
      const { a, b } = edges[e];
      const k = pulseT[p];

      // Am Anfang und Ende schwaecher, damit das Licht aus dem Knoten
      // heraustritt und in den naechsten hineinlaeuft, statt an der
      // Kante zu erscheinen und zu verschwinden.
      const fade = 0.35 + Math.sin(k * Math.PI) * 0.65;
      // Dieselbe Luftperspektive wie fuer alles andere, hier auf die
      // Leuchtkraft statt auf die Farbe: hinten leuchtet es schwaecher.
      const n = depth[a] + (depth[b] - depth[a]) * k;
      const air = 1 - (1 - n) * DEPTH_PULSE;

      pa[e * 3] = k;
      pa[e * 3 + 1] = fade * air * eased * build * 6.0;
      pa[e * 3 + 2] = edgeLen[e];
    }
    pulseAttr.needsUpdate = true;

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
    const meshRefl = nodesReflRef.current;
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
        mesh.setColorAt(
          i,
          color
            .copy(major ? COL_NODE_MAJOR : COL_NODE)
            .lerp(COL_DEPTH, (1 - depth[i]) * DEPTH_NODE),
        );

        if (meshRefl) {
          // Dieselbe Matrix; gespiegelt wird auf Ebene der Gruppe.
          meshRefl.setMatrixAt(i, dummy.matrix);
          // Quadratisch ausgeblendet: ein Spiegelbild wird nach unten
          // hin nicht gleichmaessig schwaecher, sondern schnell.
          const fade = Math.max(
            0,
            1 - (live[i * 3 + 1] - FLOOR_Y) / REFL_FADE,
          );
          meshRefl.setColorAt(i, color.multiplyScalar(fade * fade));
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      (mesh.material as THREE.MeshStandardMaterial).opacity =
        eased * (0.25 + build * 0.75);

      if (meshRefl) {
        meshRefl.instanceMatrix.needsUpdate = true;
        if (meshRefl.instanceColor) meshRefl.instanceColor.needsUpdate = true;
        (meshRefl.material as THREE.MeshStandardMaterial).opacity =
          eased * build * 0.5;
      }
    }

    // Das Spiegelbild dreht sich mit. Die Spiegelung selbst steckt in
    // der Skalierung der Elterngruppe, deshalb reicht es, die Drehung
    // zu uebernehmen.
    if (mirrorSpinRef.current && spinRef.current) {
      mirrorSpinRef.current.rotation.copy(spinRef.current.rotation);
    }
  });

  return (
    // Ein halbe Einheit angehoben.
    // Die Kamera steht fast auf Hoehe der Mitte, also blieb unter dem
    // Graphen kein Platz: ein Boden auf Hoehe des tiefsten Knotens lag
    // genau am unteren Bildrand, und alles, was er spiegelt, faellt
    // per Definition darunter. Mit dem Anheben entsteht das Band, in
    // dem ueberhaupt etwas zu sehen ist.
    <group ref={groupRef} visible={false} position={[0, 0.5, 0]}>
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

      {/* Der Boden.
          Kein Spiegelmaterial, sondern eine additive Lichtpfuetze: eine
          echte Spiegelung braucht ein zweites Rendering pro Bild, und
          das waere fuer die zwei Zentimeter Flaeche, die hier unten ins
          Bild ragen, nicht zu rechtfertigen. Was den Boden lesbar macht,
          ist ohnehin nicht die Flaeche selbst, sondern das Licht, das
          der Graph auf sie wirft. */}
      <mesh
        position={[0, FLOOR_Y, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[16, 16, 1]}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={haloTexture}
          color="#1d5a80"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Das Spiegelbild.
          Dieselben Matrizen wie oben, nur haengt die Gruppe an einer
          negativen Y-Skalierung: damit ist die Spiegelung eine Sache
          der Transformation und nicht der Rechnung, und es gibt keine
          zweite Stelle, an der Positionen entstehen koennen.

          Die Verschiebung ist das Doppelte der Bodenhoehe, weil das
          Spiegeln an einer Ebene aus Umklappen plus Verschieben
          besteht: y' = 2f - y.

          `side` muss beidseitig sein - eine negative Skalierung dreht
          den Umlaufsinn der Dreiecke um, und einseitige Flaechen waeren
          danach alle weggeschnitten. */}
      <group position={[0, FLOOR_Y * 2, 0]} scale={[1, -1, 1]}>
        <group ref={mirrorSpinRef}>
          {/* Eigene Geometrie, obwohl die Roehren oben dieselbe Form
              haben.
              Beide Netze auf tubeGeometry zu setzen hat im Bild lange
              helle Keile erzeugt - so sieht es aus, wenn Instanzmatrizen
              nicht die sind, fuer die der Zeichenaufruf sie haelt.
              Naheliegender Verdaechtiger ist das Instanzattribut auf
              jener Geometrie: sie gehoert dann zwei Netzen mit
              verschiedenen Programmen gleichzeitig. Nachgemessen habe
              ich nur den Zusammenhang, nicht die Ursache im Renderer -
              eine eigene Geometrie kostet ein paar hundert Byte und
              nimmt die Frage aus dem Weg. */}
          <instancedMesh
            ref={tubesReflRef}
            args={[undefined, undefined, graph.edges.length]}
            frustumCulled={false}
          >
            <cylinderGeometry args={[0.013, 0.013, 1, 6, 1, true]} />
            <meshStandardMaterial
              color="#ffffff"
              metalness={0.6}
              roughness={0.6}
              side={THREE.DoubleSide}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </instancedMesh>

          <instancedMesh
            ref={nodesReflRef}
            args={[undefined, undefined, NODE_COUNT]}
            frustumCulled={false}
          >
            <icosahedronGeometry args={[0.075, 1]} />
            <meshStandardMaterial
              metalness={0.6}
              roughness={0.55}
              side={THREE.DoubleSide}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </instancedMesh>
        </group>
      </group>

      {/* Alles, was sich dreht. Fernfeld und Licht stehen bewusst
          daneben: nur so koennen sie sich langsamer bewegen und die
          Parallaxe erzeugen, die dem Bild seine Tiefe gibt. */}
      <group ref={spinRef}>
        {/* Kanten als duenne Metallroehren. `openEnded` spart die
            Deckel - die sieht bei diesem Durchmesser ohnehin niemand.
            Geometrie und Material kommen aus useMemo, weil beide mehr
            koennen als die deklarative Kurzform hergibt: die Geometrie
            traegt das Instanzattribut fuer das Licht, das Material den
            Einschub in den Shader. */}
        <instancedMesh
          ref={tubesRef}
          args={[undefined, undefined, graph.edges.length]}
          frustumCulled={false}
        >
          <primitive object={tubeGeometry} attach="geometry" />
          <primitive object={tubeMaterial} attach="material" />
        </instancedMesh>

        {/* Knoten als glaenzende Koerper. Metalness hoch, Roughness
            niedrig: so faengt jeder Knoten die Leuchtflaechen der
            Umgebung als Glanzlicht ein - genau das unterscheidet eine
            gerenderte Oberflaeche von einer eingefaerbten Flaeche. */}
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
      </group>
    </group>
  );
}
