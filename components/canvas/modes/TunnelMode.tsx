"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { PROJECTS } from "@/content/projects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createTubeScratch, setTube } from "@/lib/scene/tube";
import { roundedPlane, roundedSlab } from "@/lib/scene/device";
import { STILL_FADE, STILL_HOLD } from "@/lib/scene/pacing";
import {
  RING_COUNT,
  RING_SPACING,
  activeStation,
  stationNearness,
  stationZ,
  tunnelExit,
  tunnelTravel,
} from "@/lib/scene/tunnel";

/**
 * Projekttunnel.
 *
 * Ein Korridor aus demselben Gitter, aus dem im Structure-Kapitel das
 * Fachwerk besteht — nur zur Roehre gerollt. Das ist der Grund, warum der
 * Tunnel hier nicht wie ein Fremdkoerper wirkt: es ist dieselbe
 * Formsprache, in einer anderen Anordnung.
 *
 * An den Waenden stehen die Projekte auf echten Geraeten. Die Kamera
 * faehrt beim Scrollen hindurch; die Texte dazu stehen als echtes DOM
 * darueber, nicht im Canvas — sonst waeren sie fuer Screenreader und
 * Suchmaschinen unsichtbar und nicht kopierbar.
 */

/**
 * Radius der Roehre.
 *
 * Von 5.2 auf 7.6 vergroessert, und das war keine Geschmacksfrage: eine
 * flache Tafel von 7.4 Einheiten Breite, an der Wand montiert und leicht
 * eingedreht, reichte in einer Roehre von 5.2 Radius zwei volle Einheiten
 * DURCH die Wand hindurch - die Streben liefen also quer ueber die
 * Screenshots, und zwar voellig zu Recht, weil sie tatsaechlich davor
 * lagen. Gleichzeitig stiess ihre Innenkante bis auf 0.01 an die
 * Fahrbahnachse, sodass die Kamera bei ihrem seitlichen Schlingern auf
 * der falschen Seite der Tafel vorbeikommen konnte.
 *
 * Beides ist Geometrie, kein Sortierproblem, und laesst sich nur mit
 * Zahlen loesen: groessere Roehre, schmalere Tafel, weiter aussen
 * montiert, weniger eingedreht. Siehe die Rechnung bei MONITOR.
 */
const RADIUS = 7.6;
const SIDES = 8;
/** Tiefe der Staubwolke vor der Kamera. */
const MOTE_DEPTH = 55;

/**
 * Der Korridor ist aus Stahl, nicht aus blauer Farbe.
 *
 * Vorher waren die Streben eingefaerbt (#2f6f9e) — und genau daran
 * erkennt man eine Zeichnung. Echtes Konstruktionsmetall ist grau; seine
 * Farbe kommt von dem, was es spiegelt. Ein blau lackiertes Rohr liest
 * sich als Diagramm, ein graues mit blauem Streiflicht als Bauteil.
 * Die Farbe im Tunnel machen jetzt das Gegenlicht der Szene und die
 * Lampe, die an der aktiven Station steht.
 *
 * Ein eingebackener Tiefenverlauf waere aus demselben Grund falsch wie
 * vorher: sobald die Kamera in die Roehre faehrt, laegen die "hinteren"
 * Ringe direkt vor der Nase und waeren trotzdem dunkel. Tiefe macht der
 * Fog — der rechnet gegen die Kameraposition und stimmt an jeder Stelle.
 */
const COL_STEEL = new THREE.Color("#5a626e");
/** Jeder vierte Ring heller: gibt der Fahrt einen Takt. */
const COL_MARKER = new THREE.Color("#88919f");
/** Spant auf Hoehe einer Tafel — das kraeftigste Bauteil im Korridor. */
const COL_STATION = new THREE.Color("#b3bdcb");

/** Die beiden Akzente der Oberflaeche, hier in 3D fortgesetzt. */
const ACCENTS = ["#38bdf8", "#a855f7"] as const;
const accentOf = (index: number) => ACCENTS[index % 2];

/** Radialer Lichtfleck als Textur - kein Asset, vom Canvas erzeugt. */
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/* ================================================================== */
/* Korridor                                                            */
/* ================================================================== */

/**
 * Gitterkorridor als Strebenliste: Ringe, Laengsverbindungen und drei
 * durchlaufende Trassen.
 *
 * Frueher war das eine einzige `lineSegments`-Geometrie. Linien sind aber
 * unbeleuchtet und sahen neben den beleuchteten Koerpern der uebrigen
 * Szene flach aus. Jetzt liefert die Funktion Streckenpaare, aus denen
 * eine InstancedMesh aus Zylindern gebaut wird - dieselbe Materialsprache
 * wie Fachwerk und Systemgraph.
 *
 * Der Korridor verformt sich nie, also werden die Matrizen genau einmal
 * gesetzt und danach nie wieder angefasst.
 */
interface Strut {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  radius: number;
  color: THREE.Color;
}

/** Die Ringnummer, die einer Station am naechsten liegt. */
function stationRings() {
  const set = new Set<number>();
  for (let i = 0; i < PROJECTS.length; i++) {
    set.add(Math.round(-stationZ(i) / RING_SPACING));
  }
  return set;
}

function vertex(ring: number, side: number, scale = 1) {
  const angle = (side / SIDES) * Math.PI * 2 + Math.PI / SIDES;
  return [
    Math.cos(angle) * RADIUS * scale,
    Math.sin(angle) * RADIUS * scale,
    -ring * RING_SPACING,
  ] as const;
}

function buildCorridor(): Strut[] {
  const stations = stationRings();
  const struts: Strut[] = [];

  for (let ring = 0; ring <= RING_COUNT; ring++) {
    // Auf Hoehe einer Tafel steht ein kraeftigeres Spant. Das gibt der
    // Roehre eine Gliederung, die zum Inhalt gehoert statt nur zum Takt:
    // man sieht schon von weitem, dass da vorne etwas kommt.
    const station = stations.has(ring);
    const marker = ring % 4 === 0;

    for (let side = 0; side < SIDES; side++) {
      const a = vertex(ring, side);
      const b = vertex(ring, (side + 1) % SIDES);
      struts.push({
        ax: a[0], ay: a[1], az: a[2],
        bx: b[0], by: b[1], bz: b[2],
        radius: station ? 3 : marker ? 2.1 : 1.5,
        color: station ? COL_STATION : marker ? COL_MARKER : COL_STEEL,
      });

      if (ring < RING_COUNT) {
        // Laengsverbindungen duenner als die Spanten. Ein Tragwerk hat
        // eine Hierarchie: die Ringe halten die Form, die Laengsstaebe
        // koppeln sie nur. Waren beide gleich dick, las sich das Ganze
        // als Drahtgitter statt als Konstruktion.
        const c = vertex(ring + 1, side);
        struts.push({
          ax: a[0], ay: a[1], az: a[2],
          bx: c[0], by: c[1], bz: c[2],
          radius: 0.85,
          color: COL_STEEL,
        });
      }
    }
  }

  // Drei durchlaufende Trassen, knapp innerhalb der Huelle. Sowas hat
  // jeder echte Tunnel — Kabel, Leitungen, Schienen. Sie kosten drei
  // Instanzen und sind das Bauteil, das aus einem geometrischen Muster
  // ein Bauwerk macht: etwas, das von irgendwo nach irgendwo fuehrt.
  for (const side of [0, 3, 5]) {
    const a = vertex(0, side, 0.94);
    const b = vertex(RING_COUNT, side, 0.94);
    struts.push({
      ax: a[0], ay: a[1], az: a[2],
      bx: b[0], by: b[1], bz: b[2],
      radius: 4.5,
      color: COL_STEEL,
    });
  }

  return struts;
}

/**
 * Leuchtbaender an zwei Positionen der Roehre.
 *
 * Ein Raum, in dem man Licht sieht, aber keine Lampe, wirkt gerechnet.
 * Diese Baender sind die Quelle, die der Betrachter erwartet — sie
 * leuchten selbst (also unbeleuchtet, `meshBasicMaterial`) und liegen
 * ueber der Bloom-Schwelle, damit sie einen Schein bekommen.
 */
function buildLamps() {
  const out: [number, number, number][] = [];
  for (let ring = 1; ring < RING_COUNT; ring += 3) {
    for (const side of [2, 6]) {
      const v = vertex(ring, side, 0.97);
      out.push([v[0], v[1], v[2]]);
    }
  }
  return out;
}

/* ================================================================== */
/* Gehaeuse                                                            */
/* ================================================================== */

/**
 * Masse der beiden Geraete.
 *
 * Die Seitenverhaeltnisse sind nicht frei gewaehlt: 2.06:1 fuer den
 * Monitor und 2.1:1 fuer das Telefon liegen dort, wo echte Geraete
 * liegen. Ein Telefon mit 16:9 sieht auf den ersten Blick falsch aus,
 * ohne dass man sagen koennte warum.
 */
/**
 * Masse so gewaehlt, dass die Tafel vollstaendig in die Roehre passt:
 *
 *   Halbe Breite 3.2, eingedreht um 0.28 rad  ->  seitlicher Ausschlag
 *   3.2 * cos(0.28) = 3.08.
 *   Aussenkante bei |x| = 4.0 + 3.08 = 7.08, mit halber Hoehe 1.55
 *   ergibt das Radius 7.24 — bleibt unter den 7.6 der Roehre.
 *   Innenkante bei |x| = 4.0 - 3.08 = 0.92 — bleibt vor dem
 *   Schlingerband der Kamera (+-0.3).
 *
 * Wer hier etwas aendert, muss beide Enden nachrechnen.
 */
const MONITOR = {
  w: 6.4,
  h: 3.1,
  /** Rundum gleich schmal — ein Wandpaneel hat kein Kinn. */
  bezel: 0.1,
  depth: 0.13,
};
const PHONE = { w: 3.0, h: 6.3, bezel: 0.11, depth: 0.13 };

const MONITOR_BODY_H = MONITOR.h + 2 * MONITOR.bezel;

/**
 * Geometrien einmal fuer alle Tafeln. Sie sind identisch und starr; sechs
 * eigene Kopien waeren sechsmal derselbe Speicher ohne jeden Unterschied.
 */
const GEO = {
  monitorBody: roundedSlab(
    MONITOR.w + 2 * MONITOR.bezel,
    MONITOR_BODY_H,
    MONITOR.depth,
    0.05,
  ),
  /**
   * Wandausleger statt Standfuss.
   *
   * Ein Monitor auf einem Tisch braucht einen Fuss - nur steht hier
   * kein Tisch, und ein Fuss, der auf nichts steht, macht aus dem
   * Geraet ein schwebendes Moebelstueck. In einer Roehre haengt ein
   * Bildschirm an der Wand. Der Ausleger ist deshalb das Bauteil, das
   * die Tafel mit dem Korridor verbindet, statt sie davor zu stellen.
   */
  monitorArm: new THREE.BoxGeometry(0.2, 0.2, 1.6),
  monitorScreen: new THREE.PlaneGeometry(MONITOR.w, MONITOR.h),
  monitorBar: new THREE.BoxGeometry(1.4, 0.028, 0.02),

  phoneBody: roundedSlab(
    PHONE.w + 2 * PHONE.bezel,
    PHONE.h + 2 * PHONE.bezel,
    PHONE.depth,
    0.46,
  ),
  phoneScreen: roundedPlane(PHONE.w, PHONE.h, 0.36),
  phoneIsland: roundedSlab(0.72, 0.17, 0.02, 0.085),
  phoneButton: new THREE.BoxGeometry(0.05, 0.5, 0.07),
};

export function TunnelMode() {
  const groupRef = useRef<THREE.Group>(null);
  /** Alles, was mit der Fahrt an der Kamera vorbeizieht. */
  const travelRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const strutsRef = useRef<THREE.InstancedMesh>(null);
  const lampsRef = useRef<THREE.InstancedMesh>(null);
  const motesRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const reduced = usePrefersReducedMotion();

  const corridor = useMemo(buildCorridor, []);
  const lamps = useMemo(buildLamps, []);

  // Der Korridor ist starr: Matrizen und Farben werden genau einmal
  // geschrieben, sobald das Mesh existiert - nicht in jedem Frame.
  const placeStruts = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      strutsRef.current = mesh;
      if (!mesh) return;
      const scratch = createTubeScratch();
      corridor.forEach((st, i) => {
        setTube(
          mesh, i, scratch,
          st.ax, st.ay, st.az,
          st.bx, st.by, st.bz,
          st.radius,
        );
        mesh.setColorAt(i, st.color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [corridor],
  );

  const placeLamps = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      lampsRef.current = mesh;
      if (!mesh) return;
      const dummy = new THREE.Object3D();
      lamps.forEach((p, i) => {
        dummy.position.set(p[0], p[1], p[2]);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    [lamps],
  );

  /**
   * Alle Standbilder aller Projekte in einer flachen Liste.
   *
   * `useTexture` ist ein Hook und darf deshalb nicht pro Tafel mit einer
   * variablen Liste aufgerufen werden. Also wird hier einmal alles
   * geladen und jede Tafel bekommt ihren Ausschnitt.
   */
  const { urls, ranges } = useMemo(() => {
    const urls: string[] = [];
    const ranges: [number, number][] = [];
    for (const project of PROJECTS) {
      const start = urls.length;
      urls.push(project.media.image, ...(project.media.stills ?? []));
      ranges.push([start, urls.length]);
    }
    return { urls, ranges };
  }, []);

  const textures = useTexture(urls);

  // Die Bildschirme stehen schraeg zur Fahrbahn - genau der Fall, in dem
  // Standard-Filterung Texturen matschig macht. Anisotrope Filterung
  // kostet fast nichts und ist hier der Unterschied zwischen lesbarem
  // und verwaschenem Screenshot.
  const gl = useThree((s) => s.gl);
  useMemo(() => {
    const max = gl.capabilities.getMaxAnisotropy();
    for (const texture of textures) {
      texture.anisotropy = max;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [gl, textures]);

  /** Staubkoerner, die traege durch den Korridor treiben. */
  const motes = useMemo(() => {
    const COUNT = 260;
    const pos = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = RADIUS * (0.25 + Math.random() * 0.7);
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(angle) * r;
      pos[i * 3 + 2] = -Math.random() * MOTE_DEPTH;
      speed[i] = 0.6 + Math.random() * 1.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geometry, speed, count: COUNT };
  }, []);

  const scratchColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const active = sceneState.weights.tunnel;
    group.visible = active > 0.01;
    if (!group.visible) return;

    const eased = active * active * (3 - 2 * active);

    // Die Fahrt: der Korridor laeuft auf die Kamera zu, statt dass die
    // Kamera durch ihn hindurchfaehrt. Relativ ist das dieselbe
    // Bewegung, aber die Kamera bleibt dabei in der Naehe der
    // Kapitelstationen, und der Wechsel zum naechsten Abschnitt ist ein
    // kurzer Weg statt einer Rueckfahrt ueber hundert Einheiten.
    const progress = sceneState.tunnelProgress;
    const exit = tunnelExit(progress);
    // Wie sichtbar der Korridor als Bauwerk ist: beim Hereinfahren
    // waechst er heran, auf dem letzten Stueck loest er sich auf.
    const corridor = eased * (1 - exit);

    if (travelRef.current) {
      // Der Zuschlag beim Einblenden ist der Auftritt: solange der
      // Tunnel noch halb durchsichtig ist, steht er weit hinten und
      // kommt auf die Kamera zu. Ohne ihn erschiene er einfach an Ort
      // und Stelle, und "erscheinen" ist keine Fahrt.
      travelRef.current.position.z = tunnelTravel(progress) - (1 - eased) * 34;
    }

    // Nur der Korridor dreht sich, nicht die Geraete.
    //
    // Vorher drehte sich die gesamte Gruppe - und damit auch die
    // Projektbilder. Ein Screenshot, der auf dem Kopf an einem
    // vorbeizieht, ist kein Effekt, sondern unlesbar. Die Drehung ist
    // aber genau das, was der Fahrt ihre Bewegung gibt, also bleibt sie
    // - beschraenkt auf das, was keine Information traegt.
    if (!reduced && spinRef.current) {
      spinRef.current.rotation.z = state.clock.elapsedTime * 0.018;
    }

    if (strutsRef.current) {
      (strutsRef.current.material as THREE.MeshStandardMaterial).opacity =
        corridor * 0.92;
    }
    if (lampsRef.current) {
      (lampsRef.current.material as THREE.MeshBasicMaterial).opacity =
        corridor * 0.6;
    }

    // Eine einzige Lampe wandert zu der Station, an der man gerade steht,
    // und nimmt deren Akzentfarbe an.
    //
    // Das ist der Unterschied zwischen "das Geraet leuchtet" und "das
    // Geraet beleuchtet den Raum": ihr Licht faellt jetzt tatsaechlich auf
    // die Streben ringsum und laeuft mit der Fahrt ueber das Gitter.
    // Eine Lampe pro Projekt waere physikalisch dasselbe und wuerde die
    // Lichter-Uniforms jedes Materials in der Szene aufblaehen - eine
    // wandernde reicht, weil man immer nur an einer Station steht.
    const light = lightRef.current;
    if (light) {
      const index = activeStation(progress);
      const nearness = stationNearness(progress, index);
      const side = index % 2 === 0 ? -1 : 1;
      // Gegenueber dem Geraet und ein Stueck hinter ihm.
      //
      // Direkt daneben stand die Lampe im Spiegelwinkel: ihr Glanzpunkt
      // lag mitten auf dem Screenshot und wurde vom Bloom zu einem
      // leuchtenden Fleck aufgeblasen. Von der Gegenseite und aus dem
      // Ruecken faellt ihr Licht auf das Gitter ringsum - das ist es,
      // was sie soll - und ihre Spiegelung geht am Betrachter vorbei.
      light.position.set(-side * 2.6, 0.4, stationZ(index) - 3);
      light.color.set(scratchColor.set(accentOf(index)));
      light.intensity = corridor * Math.pow(nearness, 2) * 22;
    }

    // Motes driften dem Betrachter entgegen und setzen am Ende neu an.
    const points = motesRef.current;
    if (points && !reduced) {
      const attr = points.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      // Kurzer Umlauf statt der vollen Korridorlaenge: der Staub haengt
      // jetzt an der Kamera, und was hinter ihr liegt, sieht niemand.
      for (let i = 0; i < motes.count; i++) {
        arr[i * 3 + 2] += motes.speed[i] * delta;
        if (arr[i * 3 + 2] > 5) arr[i * 3 + 2] = -MOTE_DEPTH;
      }
      attr.needsUpdate = true;
      (points.material as THREE.PointsMaterial).opacity = corridor * 0.55;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Sternfeld hinter dem Korridor.
          Der Korridor ist eine offene Gitterroehre - man sieht zwischen
          den Streben hindurch. Vorher lag dort nur der Grundton, was den
          Tunnel wie eine Zeichnung auf Papier wirken liess. Mit Sternen
          dahinter bekommt er einen Aussenraum, und die Fahrt liest sich
          als Bewegung durch etwas statt als Muster, das groesser wird.

          Die Sterne sitzen in der Gruppe, damit sie mit ihr ein- und
          ausblenden; sie stehen aber ausserhalb der drehenden
          Untergruppe - ein mitrotierender Sternenhimmel waere sofort als
          Kulisse erkennbar. */}
      <Stars
        radius={90}
        depth={60}
        count={2200}
        factor={3.2}
        saturation={0}
        fade
        speed={0.4}
      />

      {/* Staub bleibt bei der Kamera stehen, statt mit dem Korridor zu
          fahren. Er soll den Raum vor der Linse fuellen, nicht ein
          Bauteil des Tunnels sein. */}
      <points
        ref={motesRef}
        geometry={motes.geometry}
        frustumCulled={false}
        renderOrder={1}
      >
        <pointsMaterial
          size={0.055}
          color="#7dd3fc"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Alles, was an der Kamera vorbeizieht. Siehe useFrame. */}
      <group ref={travelRef}>
        {/* Wanderlicht, siehe useFrame. Steht ausserhalb der drehenden
            Gruppe, damit es an seiner Station bleibt. */}
        <pointLight ref={lightRef} intensity={0} distance={22} decay={2} />

        {/* Alles Drehende steckt in dieser Gruppe. Die Geraete liegen
            bewusst daneben und bleiben dadurch aufrecht. */}
        <group ref={spinRef}>
        {/* Streben des Korridors. renderOrder haelt sie hinter den
            Geraeten: transparente Objekte werden nach dem Abstand ihres
            Ursprungs sortiert, und der Ursprung dieser einen Instanz-
            Sammlung liegt am Tunneleingang - also scheinbar ganz vorne. */}
          <instancedMesh
            ref={placeStruts}
          args={[undefined, undefined, corridor.length]}
          frustumCulled={false}
          renderOrder={0}
        >
          <cylinderGeometry args={[0.023, 0.023, 1, 6, 1, true]} />
          <meshStandardMaterial
            metalness={0.9}
            roughness={0.34}
            envMapIntensity={1.4}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </instancedMesh>

        <instancedMesh
          ref={placeLamps}
          args={[undefined, undefined, lamps.length]}
          frustumCulled={false}
          renderOrder={1}
        >
          <boxGeometry args={[0.07, 0.07, RING_SPACING * 1.5]} />
          <meshBasicMaterial
            color="#cfe4ff"
            toneMapped={false}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </instancedMesh>

        </group>

        {PROJECTS.map((project, i) => (
          <Panel
            key={project.id}
            textures={textures.slice(ranges[i][0], ranges[i][1])}
            z={stationZ(i)}
            side={i % 2 === 0 ? -1 : 1}
            portrait={project.media.orientation === "portrait"}
            index={i}
            reduced={reduced}
          />
        ))}
      </group>
    </group>
  );
}

/* ================================================================== */
/* Geraet                                                              */
/* ================================================================== */

/**
 * Ein Projekt auf dem Geraet, fuer das es gebaut wurde.
 *
 * Querformat steht auf einem Monitor mit Fuss, Hochformat in einem
 * Telefon. Das ist mehr als Dekoration: die Silhouette sagt in einem
 * Sekundenbruchteil, ob hier ein Dashboard oder eine App laeuft — eine
 * Information, die sonst im Fliesstext daneben stehen muesste.
 *
 * Vorher war das eine Flaeche mit einem Rahmen aus vier Rohren. Die
 * Geraete sind der Schritt danach: geschlossene Gehaeuse mit Radien,
 * Fase und Tiefe. Eine gefaste Kante hat Flaeche, auf der die
 * Leuchtflaechen der Umgebung als Lichtlinie stehen — das ist der
 * Unterschied zwischen einem Koerper und einem Umriss.
 */
function Panel({
  textures,
  z,
  side,
  portrait,
  index,
  reduced,
}: {
  textures: THREE.Texture[];
  z: number;
  side: 1 | -1;
  portrait: boolean;
  index: number;
  reduced: boolean;
}) {
  const holderRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const fadeRef = useRef<THREE.Mesh>(null);
  const glassRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const barRef = useRef<THREE.Mesh>(null);

  const [w, h] = portrait ? [PHONE.w, PHONE.h] : [MONITOR.w, MONITOR.h];

  /**
   * Aufstellung im Korridor, abhaengig vom Format des Fensters.
   *
   * Im Querformat haengen die Geraete weit aussen an der Wand, wo sie
   * neben der Textspalte stehen. Auf einem Telefon ist die Textspalte
   * aber die ganze Breite, und was seitlich haengt, ist entweder
   * verdeckt oder ausserhalb des Bildes. Dort ruecken sie zur Achse und
   * nach oben - also genau in die Haelfte, die der Text freilaesst.
   */
  const size = useThree((s) => s.size);
  const narrow = size.width / Math.max(1, size.height) < 0.95;
  const offsetX = narrow ? 1.6 : portrait ? 3.4 : 4.0;
  // Hoch genug, dass das Geraet ueber der Karte steht statt hinter ihr.
  const offsetY = narrow ? (portrait ? 2.9 : 3.1) : portrait ? 0.2 : 0.45;
  /** Eingedreht wird nur, wenn das Geraet auch seitlich haengt. */
  const turn = narrow ? 0.12 : 0.28;
  const accent = accentOf(index);
  const screenGeometry = portrait ? GEO.phoneScreen : GEO.monitorScreen;
  /**
   * Vorderkante des Gehaeuses liegt knapp hinter der Bildflaeche.
   *
   * Die 0.045 sind nicht gegriffen: `roundedSlab` zieht die Kontur mit
   * einer Fase von 0.02 heraus, das Gehaeuse ist also an jeder Seite
   * zwei Hundertstel dicker als seine nominelle Tiefe. Ohne diesen
   * Zuschlag stand die Fase VOR dem Bildschirm und der Screenshot war
   * schwarz verdeckt.
   */
  const bodyZ = -(portrait ? PHONE.depth : MONITOR.depth) / 2 - 0.045;

  const glowTexture = useMemo(makeGlowTexture, []);

  /**
   * Ein Material fuer alle Gehaeuseteile.
   *
   * Nicht aus Sparsamkeit, sondern damit sie zusammen ein- und
   * ausblenden. Vorher war das Gehaeuse undurchsichtig, waehrend der
   * Bildschirm schon halb verschwunden war — waehrend eines Uebergangs
   * stand ein leeres Gestell im Raum.
   */
  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#14171d",
        metalness: 0.95,
        roughness: 0.26,
        envMapIntensity: 1.9,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  /** Schwarzglanz fuer die Insel im Telefon. */
  const inkMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#04060a",
        metalness: 0.2,
        roughness: 0.18,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  /**
   * Zustand des Bildwechsels. Liegt bewusst in einem Ref und nicht in
   * React-State: der Wechsel laeuft pro Frame, und State-Updates in
   * jedem Frame wuerden die gesamte Szene neu rendern.
   */
  const cycle = useRef({
    current: 0,
    next: 1 % textures.length,
    mix: 0,
    hold: 0,
  });

  useFrame((_, delta) => {
    const screen = screenRef.current;
    const holder = holderRef.current;
    if (!screen || !holder) return;

    const active = sceneState.weights.tunnel;
    const progress = sceneState.tunnelProgress;
    const nearness = stationNearness(progress, index);

    // Ankunft ist der letzte Teil der Annaeherung. Erst hier steht das
    // Geraet voll da, wird herangeholt und mit Licht hinterlegt - vorher
    // bleibt es erkennbar, aber zurueckhaltend. Ohne diese Trennung sind
    // alle gleich laut und keines ist das, an dem man gerade steht.
    const arrival = Math.max(0, (nearness - 0.55) / 0.45);

    const material = screen.material as THREE.MeshStandardMaterial;
    const c = cycle.current;

    // --- Bildwechsel ------------------------------------------------
    //
    // Bewusst nur an dem Geraet, an dem man steht. Wuerden alle
    // gleichzeitig durchwechseln, waere der Korridor ein Flackern und
    // man wuesste nicht mehr, wo man hinschauen soll - die Bewegung
    // wuerde von dem ablenken, wofuer sie da ist. So ist es das
    // Gegenteil: der Wechsel passiert genau dort, wo der Blick ohnehin
    // schon ist, und markiert die aktive Station zusaetzlich.
    const fade = fadeRef.current;
    if (fade && textures.length > 1 && !reduced) {
      const fadeMaterial = fade.material as THREE.MeshStandardMaterial;

      if (c.mix > 0) {
        c.mix = Math.min(1, c.mix + delta / STILL_FADE);
        if (c.mix >= 1) {
          // Uebernehmen und zurueckstellen: ab jetzt zeigt die Haupt-
          // flaeche das neue Bild und die Blende ist wieder leer.
          c.current = c.next;
          c.next = (c.next + 1) % textures.length;
          c.mix = 0;
          c.hold = 0;
          material.map = textures[c.current];
          material.emissiveMap = textures[c.current];
          material.needsUpdate = true;
        }
      } else if (nearness > 0.55) {
        // Bewusst an `nearness` und nicht an `arrival` gehaengt.
        // `arrival` steigt erst, wenn das Geraet fast neben der Kamera
        // liegt - dann sieht man es im spitzen Winkel und ein
        // Bildwechsel waere verschenkt. `nearness > 0.55` ist genau das
        // Fenster, in dem es gross und frontal im Bild steht.
        c.hold += delta;
        if (c.hold >= STILL_HOLD) {
          c.mix = 0.0001;
          fadeMaterial.map = textures[c.next];
          fadeMaterial.emissiveMap = textures[c.next];
          fadeMaterial.needsUpdate = true;
        }
      } else {
        // Weg von der Station laeuft die Uhr zurueck, damit der Wechsel
        // nicht sofort beim Ankommen kommt.
        c.hold = 0;
      }

      // Weiche Flanke, sonst ist der Wechsel an seinen Enden sichtbar.
      const k = c.mix * c.mix * (3 - 2 * c.mix);
      fade.visible = c.mix > 0;
      fadeMaterial.opacity = k;
      fadeMaterial.emissiveIntensity = material.emissiveIntensity;
    }

    // Der Bildschirm ist waehrend der ganzen Fahrt blickdicht.
    //
    // Vorher haing seine Deckkraft an der Entfernung: eine weit entfernte
    // Tafel war halbdurchsichtig, und der Korridor schien durch sie
    // hindurch. Ein Screenshot mit Gitterstreben quer darueber ist nicht
    // mehr zu erkennen.
    //
    // Entfernung regelt jetzt ausschliesslich das EIGENLEUCHTEN: weit weg
    // dunkel, nah hell. Das sieht genauso aus wie ein Bildschirm, den man
    // von weitem sieht, und laesst nichts durch. Die Deckkraft haengt nur
    // noch am Szenengewicht, also am Uebergang von und zu den
    // Nachbarabschnitten.
    material.opacity = active;
    material.emissiveIntensity = 0.34 + nearness * 0.95 + arrival * 0.4;

    // Sobald der Tunnel das Bild bestimmt: gar kein Blending mehr,
    // sondern echte Tiefenschreibung. Erst dadurch verdeckt der
    // Bildschirm die Streben hinter sich und die Streben davor
    // verdecken ihn - und zwar beide korrekt.
    const opaque = active > 0.985;
    if (material.transparent === opaque) {
      material.transparent = !opaque;
      material.depthWrite = opaque;
      material.needsUpdate = true;
    }

    // Gehaeuse blendet mit. Bei voller Sichtbarkeit auf undurchsichtig
    // umschalten: ein transparentes Gehaeuse wird nach dem Abstand
    // seines Ursprungs sortiert und kann dadurch vor seinem eigenen
    // Bildschirm landen.
    const bodySolid = active > 0.98;
    for (const m of [bodyMaterial, inkMaterial]) {
      m.opacity = active;
      if (m.transparent === bodySolid) {
        m.transparent = !bodySolid;
        m.needsUpdate = true;
      }
    }

    // Leicht herangefahren und aufgerichtet: das Geraet wendet sich dem
    // Betrachter zu, wenn er ankommt.
    holder.scale.setScalar(1 + arrival * 0.08);
    holder.rotation.y = side * (-turn + arrival * turn * 0.35);

    if (barRef.current) {
      // Statusleiste unter dem Kinn. Echte Monitore haben eine, glimmende
      // Rahmenkanten haben sie nicht - deshalb traegt sie hier den Akzent.
      (barRef.current.material as THREE.MeshBasicMaterial).opacity =
        active * (0.25 + arrival * 0.75);
    }
    if (glassRef.current) {
      (glassRef.current.material as THREE.MeshPhysicalMaterial).opacity =
        active * (0.25 + nearness * 0.75);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        active * arrival * 0.28;
    }
  });

  return (
    <group
      ref={holderRef}
      // Knapp ueber der Fahrbahnachse - die Hoehe, in der ein montierter
      // Bildschirm im Raum haengt.
      position={[side * offsetX, offsetY, z]}
      renderOrder={5}
    >
      {/* Lichtfleck hinter dem Geraet - erscheint erst bei Ankunft und
          hebt es aus dem Korridor heraus, ohne dass ein Postprocessing
          noetig waere. Nur wenig groesser als der Bildschirm: mit dem
          urspruenglichen Faktor 1.9 war die Flaeche direkt neben der
          Kamera 14 Einheiten breit und hat additiv das Bild ueberstrahlt. */}
      <mesh ref={glowRef} position={[0, 0, -0.6]} scale={[w * 1.3, h * 1.3, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color={accent}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {portrait ? (
        <>
          <mesh
            geometry={GEO.phoneBody}
            material={bodyMaterial}
            position={[0, 0, bodyZ]}
          />
          {/* Insel oben. Ein Telefon ohne sie liest sich als Tablet. */}
          <mesh
            geometry={GEO.phoneIsland}
            material={inkMaterial}
            position={[0, h / 2 - 0.34, 0.02]}
          />
          {/* Tasten an den Kanten: Lautstaerke links, Standby rechts. */}
          <mesh
            geometry={GEO.phoneButton}
            material={bodyMaterial}
            position={[-(w / 2 + PHONE.bezel), 1.5, bodyZ]}
          />
          <mesh
            geometry={GEO.phoneButton}
            material={bodyMaterial}
            position={[-(w / 2 + PHONE.bezel), 0.8, bodyZ]}
          />
          <mesh
            geometry={GEO.phoneButton}
            material={bodyMaterial}
            position={[w / 2 + PHONE.bezel, 1.2, bodyZ]}
            scale={[1, 0.7, 1]}
          />
        </>
      ) : (
        <>
          <mesh
            geometry={GEO.monitorBody}
            material={bodyMaterial}
            position={[0, 0, bodyZ]}
          />
          {/* Zwei Ausleger nach hinten. Sie zeigen zur Korridorwand und
              machen aus einer schwebenden Flaeche ein montiertes
              Bauteil - dieselbe Rolle, die vorher Hals und Fuss hatten,
              nur an dem Ort, an dem hier tatsaechlich etwas ist. */}
          <mesh
            geometry={GEO.monitorArm}
            material={bodyMaterial}
            position={[-1.35, 0, bodyZ - 0.85]}
          />
          <mesh
            geometry={GEO.monitorArm}
            material={bodyMaterial}
            position={[1.35, 0, bodyZ - 0.85]}
          />
          {/* Lichtleiste auf der Unterkante. Kein Kinn mehr, an dem eine
              Statusleuchte sitzen koennte - stattdessen liegt der Akzent
              als schmale Kante unter dem Bild, wie die Beleuchtung unter
              einem montierten Paneel. */}
          <mesh
            ref={barRef}
            geometry={GEO.monitorBar}
            position={[0, -(MONITOR.h / 2 + MONITOR.bezel * 0.5), 0.012]}
          >
            <meshBasicMaterial
              color={accent}
              toneMapped={false}
              transparent
              opacity={0}
            />
          </mesh>
        </>
      )}

      {/* Der Bildschirm leuchtet aus sich selbst: der Screenshot liegt
          zusaetzlich als Emissive-Map auf, haengt also nicht vom
          Studiolicht ab. Das ist der Grund, warum das Bild bei Ankunft
          klar und farbrichtig steht - und nebenbei die inhaltlich
          passende Metapher fuer ein Deployment. */}
      <mesh ref={screenRef} geometry={screenGeometry} renderOrder={5}>
        <meshStandardMaterial
          map={textures[0]}
          emissiveMap={textures[0]}
          emissive="#ffffff"
          emissiveIntensity={0.3}
          color="#0b0d13"
          // Matt. Die Spiegelung gehoert auf die Scheibe davor, nicht auf
          // das Bild selbst - eine glaenzende Bildflaeche faengt jede
          // Lampe im Korridor als Fleck mitten im Screenshot ein.
          metalness={0}
          roughness={0.9}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Zweite Flaeche fuer die Ueberblendung: sie liegt einen Hauch
          davor und blendet mit dem naechsten Bild darueber. Zwei Flaechen
          statt eines Shaders mit zwei Texturen, weil normales Alpha-
          Blending genau die richtige Rechnung macht - neu * a + alt *
          (1-a) - und das Material dabei ein gewoehnliches Standard-
          material bleibt. */}
      <mesh
        ref={fadeRef}
        geometry={screenGeometry}
        position={[0, 0, 0.004]}
        renderOrder={6}
        visible={false}
      >
        <meshStandardMaterial
          map={textures[1] ?? textures[0]}
          emissiveMap={textures[1] ?? textures[0]}
          emissive="#ffffff"
          emissiveIntensity={0.3}
          color="#0b0d13"
          metalness={0}
          roughness={0.9}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Scheibe davor.
          Kein `transmission` - das braeuchte einen eigenen Renderdurchgang
          pro Geraet. Was Glas hier ausmacht, ist ohnehin nicht die
          Brechung, sondern die Spiegelung: eine fast spiegelglatte
          Klarlackschicht faengt die Leuchtflaechen der Umgebung ein und
          ADDIERT sie auf das Bild - genau das tut eine echte Scheibe, und
          weil sie addiert statt zu deckeln, wird der Screenshot dadurch
          nicht milchig. Der Glanzstreifen wandert beim Vorbeifahren ueber
          das Geraet, was der Fahrt ihre Physik gibt.

          Dieselbe Geometrie wie der Bildschirm: beim Telefon muss die
          Scheibe dessen Radien folgen, sonst steht ein Rechteck in einer
          runden Oeffnung. */}
      <mesh
        ref={glassRef}
        geometry={screenGeometry}
        position={[0, 0, 0.03]}
        scale={1.01}
        renderOrder={7}
      >
        <meshPhysicalMaterial
          color="#000000"
          metalness={0}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={2.6}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
