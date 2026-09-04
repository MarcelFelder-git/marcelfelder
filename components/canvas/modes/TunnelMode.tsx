"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { PROJECTS } from "@/content/projects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { createTubeScratch, setTube } from "@/lib/scene/tube";
import {
  RING_COUNT,
  RING_SPACING,
  TUNNEL_LENGTH,
  nearestStation,
  stationNearness,
  stationZ,
} from "@/lib/scene/tunnel";

/**
 * Projekttunnel.
 *
 * Ein Korridor aus demselben Gitter, aus dem im Structure-Kapitel das
 * Fachwerk besteht — nur zur Roehre gerollt. Das ist der Grund, warum der
 * Tunnel hier nicht wie ein Fremdkoerper wirkt: es ist dieselbe
 * Formsprache, in einer anderen Anordnung.
 *
 * An den Waenden haengen die Projekte als Tafeln. Die Kamera faehrt beim
 * Scrollen hindurch; die Texte dazu stehen als echtes DOM darueber, nicht
 * im Canvas — sonst waeren sie fuer Screenreader und Suchmaschinen
 * unsichtbar und nicht kopierbar.
 */

const RADIUS = 5.2;
const SIDES = 8;
const LENGTH = TUNNEL_LENGTH;

/**
 * Der Korridor bekommt eine einzige Farbe, keinen eingebackenen
 * Tiefenverlauf. Ein Verlauf nach Ringnummer waere falsch, sobald die
 * Kamera in die Roehre hineinfaehrt: dann liegen die "hinteren" Ringe
 * direkt vor der Nase und waeren trotzdem dunkel. Die Tiefe macht der
 * Fog der Szene — der rechnet gegen die Kameraposition und stimmt
 * deshalb an jeder Stelle der Fahrt.
 */
const COL_CORRIDOR = new THREE.Color("#2f6f9e");
/** Jeder vierte Ring heller: gibt der Fahrt einen Takt. */
const COL_MARKER = new THREE.Color("#5cc8f5");

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

/**
 * Gitterkorridor als Strebenliste: Ringe plus Laengsverbindungen.
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
  /** 0 = normal, 1 = Taktring, 2 = Ring auf Hoehe einer Projekttafel. */
  rank: 0 | 1 | 2;
}

/** Die Ringnummer, die einer Station am naechsten liegt. */
function stationRings() {
  const set = new Set<number>();
  for (let i = 0; i < PROJECTS.length; i++) {
    set.add(Math.round(-stationZ(i) / RING_SPACING));
  }
  return set;
}

function buildCorridor(): Strut[] {
  const vertex = (ring: number, side: number) => {
    const angle = (side / SIDES) * Math.PI * 2 + Math.PI / SIDES;
    return [
      Math.cos(angle) * RADIUS,
      Math.sin(angle) * RADIUS,
      -ring * RING_SPACING,
    ] as const;
  };

  const stations = stationRings();
  const struts: Strut[] = [];

  for (let ring = 0; ring <= RING_COUNT; ring++) {
    // Auf Hoehe einer Tafel steht ein kraeftigeres Spant. Das gibt der
    // Roehre eine Gliederung, die zum Inhalt gehoert statt nur zum Takt:
    // man sieht schon von weitem, dass da vorne etwas kommt.
    const rank: 0 | 1 | 2 = stations.has(ring) ? 2 : ring % 4 === 0 ? 1 : 0;
    for (let side = 0; side < SIDES; side++) {
      const a = vertex(ring, side);
      const b = vertex(ring, (side + 1) % SIDES);
      struts.push({
        ax: a[0], ay: a[1], az: a[2],
        bx: b[0], by: b[1], bz: b[2],
        rank,
      });

      if (ring < RING_COUNT) {
        const c = vertex(ring + 1, side);
        struts.push({
          ax: a[0], ay: a[1], az: a[2],
          bx: c[0], by: c[1], bz: c[2],
          rank: 0,
        });
      }
    }
  }

  return struts;
}

export function TunnelMode() {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const strutsRef = useRef<THREE.InstancedMesh>(null);
  const motesRef = useRef<THREE.Points>(null);
  const lampRef = useRef<THREE.PointLight>(null);
  const reduced = usePrefersReducedMotion();

  const corridor = useMemo(buildCorridor, []);

  // Der Korridor ist starr: Matrizen und Farben werden genau einmal
  // geschrieben, sobald das Mesh existiert - nicht in jedem Frame.
  const placeStruts = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      strutsRef.current = mesh;
      if (!mesh) return;
      const scratch = createTubeScratch();
      const color = new THREE.Color();
      corridor.forEach((st, i) => {
        setTube(
          mesh, i, scratch,
          st.ax, st.ay, st.az,
          st.bx, st.by, st.bz,
          st.rank === 2 ? 2.2 : st.rank === 1 ? 1.5 : 1,
        );
        mesh.setColorAt(
          i,
          color.copy(st.rank === 0 ? COL_CORRIDOR : COL_MARKER),
        );
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [corridor],
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

  // Die Tafeln haengen schraeg zur Fahrbahn - genau der Fall, in dem
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
      pos[i * 3 + 2] = -Math.random() * LENGTH;
      speed[i] = 0.6 + Math.random() * 1.8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { geometry, speed, count: COUNT };
  }, []);

  const lampColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const active = sceneState.weights.tunnel;
    group.visible = active > 0.01;
    if (!group.visible) return;

    const eased = active * active * (3 - 2 * active);

    // Nur der Korridor dreht sich, nicht die Tafeln.
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
        eased * 0.92;
    }

    // Eine einzige Lampe wandert zur Tafel, an der man gerade steht, und
    // nimmt deren Akzentfarbe an.
    //
    // Das ist der Unterschied zwischen "die Tafel leuchtet" und "die
    // Tafel beleuchtet den Raum": ihr Licht faellt jetzt tatsaechlich auf
    // die Streben ringsum und laeuft mit der Fahrt ueber das Gitter.
    // Eine Lampe pro Projekt waere physikalisch dasselbe und wuerde die
    // Lichter-Uniforms jedes Materials in der Szene aufblaehen - eine
    // wandernde reicht, weil man immer nur an einer Station steht.
    const lamp = lampRef.current;
    if (lamp) {
      const progress = sceneState.tunnelProgress;
      const index = nearestStation(progress);
      const nearness = stationNearness(progress, index);
      const side = index % 2 === 0 ? -1 : 1;
      // Gegenueber der Tafel und ein Stueck hinter ihr.
      //
      // Direkt neben der Tafel stand die Lampe im Spiegelwinkel: ihr
      // Glanzpunkt lag mitten auf dem Screenshot und wurde vom Bloom zu
      // einem leuchtenden Fleck aufgeblasen. Von der Gegenseite und aus
      // dem Ruecken der Tafel faellt ihr Licht auf das Gitter ringsum -
      // das ist es, was sie soll - und ihre Spiegelung geht am
      // Betrachter vorbei.
      lamp.position.set(-side * 2.6, 0.4, stationZ(index) - 3);
      lamp.color.set(lampColor.set(accentOf(index)));
      lamp.intensity = eased * Math.pow(nearness, 2) * 22;
    }

    // Motes driften dem Betrachter entgegen und setzen am Ende neu an.
    const points = motesRef.current;
    if (points && !reduced) {
      const attr = points.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < motes.count; i++) {
        arr[i * 3 + 2] += motes.speed[i] * delta;
        if (arr[i * 3 + 2] > 4) arr[i * 3 + 2] = -LENGTH;
      }
      attr.needsUpdate = true;
      (points.material as THREE.PointsMaterial).opacity = eased * 0.55;
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

      {/* Wanderlicht, siehe useFrame. Steht ausserhalb der drehenden
          Gruppe, damit es an seiner Station bleibt. */}
      <pointLight ref={lampRef} intensity={0} distance={22} decay={2} />

      {/* Alles Drehende steckt in dieser Gruppe. Die Tafeln liegen
          bewusst daneben und bleiben dadurch aufrecht. */}
      <group ref={spinRef}>
        {/* Streben des Korridors. renderOrder haelt sie hinter den
            Tafeln: transparente Objekte werden nach dem Abstand ihres
            Ursprungs sortiert, und der Ursprung dieser einen Instanz-
            Sammlung liegt am Tunneleingang - also scheinbar ganz vorne. */}
        <instancedMesh
          ref={placeStruts}
          args={[undefined, undefined, corridor.length]}
          frustumCulled={false}
          renderOrder={0}
        >
          <cylinderGeometry args={[0.018, 0.018, 1, 5, 1, true]} />
          <meshStandardMaterial
            metalness={0.85}
            roughness={0.4}
            envMapIntensity={1.1}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </instancedMesh>

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
  );
}

/* ================================================================== */
/* Tafel                                                               */
/* ================================================================== */

/** Wie lange ein Bild steht, bevor das naechste einblendet. */
const STILL_HOLD = 2.6;
/** Dauer der Ueberblendung. */
const STILL_FADE = 0.9;

/**
 * Eine Projekttafel an der Korridorwand, leicht zur Fahrbahn eingedreht.
 *
 * Die Tafel ist bewusst ein Koerper und kein Aufkleber: Gehaeuse mit
 * Tiefe, Metallprofil ringsum, davor eine Scheibe. Vorher war sie eine
 * Flaeche mit einem 1px-Rahmen aus `lineSegments` - und eine Linie kann
 * kein Licht reflektieren. Genau daran erkennt man den Unterschied
 * zwischen einem gerenderten Objekt und einer eingefaerbten Flaeche,
 * und im Vorbeifahren sieht man jetzt die Kante des Gehaeuses.
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
  const frameRef = useRef<THREE.InstancedMesh>(null);
  const glassRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const [w, h] = portrait ? [3.1, 6.4] : [7.4, 3.6];
  const accent = accentOf(index);

  const glowTexture = useMemo(makeGlowTexture, []);

  /**
   * Der Rahmen als vier Metallprofile statt als Kantenlinie. Er verformt
   * sich nie, also einmal setzen und nie wieder anfassen.
   */
  const placeFrame = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      frameRef.current = mesh;
      if (!mesh) return;
      const s = createTubeScratch();
      const x = w / 2 + 0.06;
      const y = h / 2 + 0.06;
      // Waagerechte Profile laufen ueber die Ecken hinaus, damit dort
      // keine Luecke steht - bei diesem Durchmesser sieht die
      // Ueberlappung niemand.
      setTube(mesh, 0, s, -x - 0.05, y, 0, x + 0.05, y, 0);
      setTube(mesh, 1, s, -x - 0.05, -y, 0, x + 0.05, -y, 0);
      setTube(mesh, 2, s, -x, -y, 0, -x, y, 0);
      setTube(mesh, 3, s, x, -y, 0, x, y, 0);
      mesh.instanceMatrix.needsUpdate = true;
    },
    [w, h],
  );

  /**
   * Zustand des Bildwechsels. Liegt bewusst in einem Ref und nicht in
   * React-State: der Wechsel laeuft pro Frame, und State-Updates in
   * jedem Frame wuerden die gesamte Szene neu rendern.
   */
  const cycle = useRef({ current: 0, next: 1 % textures.length, mix: 0, hold: 0 });

  useFrame((_, delta) => {
    const screen = screenRef.current;
    const holder = holderRef.current;
    if (!screen || !holder) return;

    const active = sceneState.weights.tunnel;
    const progress = sceneState.tunnelProgress;
    const nearness = stationNearness(progress, index);

    // Ankunft ist der letzte Teil der Annaeherung. Erst hier steht die
    // Tafel voll da, wird herangeholt und mit Licht hinterlegt - vorher
    // bleibt sie erkennbar, aber zurueckhaltend. Ohne diese Trennung sind
    // alle Tafeln gleich laut und keine ist die, an der man gerade steht.
    const arrival = Math.max(0, (nearness - 0.55) / 0.45);

    const material = screen.material as THREE.MeshStandardMaterial;

    const c = cycle.current;

    // --- Bildwechsel ------------------------------------------------
    //
    // Bewusst nur an der Tafel, an der man steht. Wuerden alle Tafeln
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
        // `arrival` steigt erst, wenn die Tafel fast neben der Kamera
        // liegt - dann sieht man sie im spitzen Winkel und ein
        // Bildwechsel waere verschenkt. `nearness > 0.55` ist genau das
        // Fenster, in dem sie gross und frontal im Bild steht.
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

    // Deckkraft und Helligkeit sind bewusst getrennt:
    //
    // Sichtbarkeit wird ueber das EIGENLEUCHTEN geregelt, nicht ueber
    // Transparenz. Eine halbdurchsichtige Tafel laesst den Korridor
    // durchscheinen, und ein Screenshot mit Gitterstreben quer darueber
    // ist nicht mehr zu erkennen - genau das war das Problem. Ab
    // Ankunftsbeginn steht die Tafel deshalb blickdicht und wird nur noch
    // heller oder dunkler.
    const solid = Math.min(1, nearness / 0.45);
    material.opacity = active * (0.35 + solid * 0.65);
    material.emissiveIntensity = 0.25 + nearness * 0.75 + arrival * 0.35;

    // Voll angekommen: kein Blending mehr, damit garantiert nichts
    // durchscheint.
    const opaque = arrival > 0.35 && active > 0.9;
    if (material.transparent === opaque) {
      material.transparent = !opaque;
      material.depthWrite = opaque;
      material.needsUpdate = true;
    }

    // Leicht herangefahren und aufgerichtet: die Tafel wendet sich dem
    // Betrachter zu, wenn er ankommt.
    const scale = 1 + arrival * 0.08;
    holder.scale.setScalar(scale);
    holder.rotation.y = side * (-0.34 + arrival * 0.12);

    if (frameRef.current) {
      const frameMaterial = frameRef.current
        .material as THREE.MeshStandardMaterial;
      frameMaterial.opacity = active * (0.45 + nearness * 0.55);
      // Das Profil glimmt bei Ankunft leicht auf - genug, um ueber der
      // Bloom-Schwelle zu liegen und die Kante zu adeln.
      frameMaterial.emissiveIntensity = 0.12 + arrival * 0.9;
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
      position={[side * 3.5, portrait ? 0.2 : 0.4, z]}
      // Ueber dem Korridor, damit keine Gitterlinie ueber dem Screenshot liegt.
      renderOrder={5}
    >
      {/* Lichtfleck hinter der Tafel - erscheint erst bei Ankunft und
          hebt sie aus dem Korridor heraus, ohne dass ein Postprocessing
          noetig waere. */}
      {/* Nur wenig groesser als die Tafel. Mit dem urspruenglichen Faktor
          1.9 war die Flaeche direkt neben der Kamera 14 Einheiten breit
          und hat additiv das gesamte Bild ueberstrahlt. */}
      <mesh ref={glowRef} position={[0, 0, -0.5]} scale={[w * 1.3, h * 1.3, 1]}>
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

      {/* Gehaeuse. Gibt der Tafel Tiefe: im Vorbeifahren sieht man die
          Kante, und das Studiolicht aus BackgroundScene laeuft als
          Glanzlicht ueber das Profil. Eine Flaeche allein kann das nicht,
          weil sie von der Seite verschwindet. */}
      {/* Vorderkante bewusst 0.03 hinter der Bildflaeche: buendig waeren
          beide koplanar, und zwei Flaechen auf derselben Tiefe kaempfen
          um den Tiefentest - das gibt flackernde Flecken statt einer
          Kante. */}
      <mesh position={[0, 0, -0.13]}>
        <boxGeometry args={[w + 0.34, h + 0.34, 0.2]} />
        <meshStandardMaterial
          color="#0d1017"
          metalness={0.92}
          roughness={0.32}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Die Tafel ist ein Bildschirm, kein Poster: der Screenshot liegt
          als Emissive-Map auf, das Objekt leuchtet also aus sich selbst
          statt vom Studiolicht abzuhaengen. Das ist der Grund, warum das
          Bild bei Ankunft klar und farbrichtig steht - und nebenbei die
          inhaltlich passende Metapher fuer ein Deployment. */}
      <mesh ref={screenRef} renderOrder={5}>
        <planeGeometry args={[w, h]} />
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
      <mesh ref={fadeRef} position={[0, 0, 0.004]} renderOrder={6} visible={false}>
        <planeGeometry args={[w, h]} />
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
          pro Tafel. Was Glas hier ausmacht, ist ohnehin nicht die
          Brechung, sondern die Spiegelung: eine fast spiegelglatte
          Klarlackschicht faengt die Leuchtflaechen der Umgebung ein und
          ADDIERT sie auf das Bild - genau das tut eine echte Scheibe, und
          weil sie addiert statt zu deckeln, wird der Screenshot dadurch
          nicht milchig. Der Glanzstreifen wandert beim Vorbeifahren ueber
          die Tafel, was der Fahrt ihre Physik gibt. */}
      <mesh ref={glassRef} position={[0, 0, 0.075]} renderOrder={7}>
        <planeGeometry args={[w + 0.12, h + 0.12]} />
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

      {/* Rahmenprofil in der Akzentfarbe, abwechselnd Cyan und Violett. */}
      <instancedMesh
        ref={placeFrame}
        args={[undefined, undefined, 4]}
        frustumCulled={false}
        renderOrder={6}
      >
        <cylinderGeometry args={[0.045, 0.045, 1, 8, 1, true]} />
        <meshStandardMaterial
          color="#161a22"
          emissive={accent}
          emissiveIntensity={0.12}
          metalness={0.95}
          roughness={0.22}
          envMapIntensity={1.8}
          transparent
          opacity={0}
        />
      </instancedMesh>
    </group>
  );
}
