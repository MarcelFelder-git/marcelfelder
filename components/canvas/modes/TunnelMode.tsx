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
 * An den Wänden haengen die Projekte als Tafeln. Die Kamera faehrt beim
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
  marker: boolean;
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

  const struts: Strut[] = [];

  for (let ring = 0; ring <= RING_COUNT; ring++) {
    const marker = ring % 4 === 0;
    for (let side = 0; side < SIDES; side++) {
      const a = vertex(ring, side);
      const b = vertex(ring, (side + 1) % SIDES);
      struts.push({
        ax: a[0], ay: a[1], az: a[2],
        bx: b[0], by: b[1], bz: b[2],
        marker,
      });

      if (ring < RING_COUNT) {
        const c = vertex(ring + 1, side);
        struts.push({
          ax: a[0], ay: a[1], az: a[2],
          bx: c[0], by: c[1], bz: c[2],
          marker: false,
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
          st.marker ? 1.5 : 1,
        );
        mesh.setColorAt(i, color.copy(st.marker ? COL_MARKER : COL_CORRIDOR));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [corridor],
  );

  const textures = useTexture(PROJECTS.map((p) => p.media.image));

  // Die Tafeln haengen schraeg zur Fahrbahn - genau der Fall, in dem
  // Standard-Filterung Texturen matschig macht. Anisotrope Filterung
  // kostet fast nichts und ist hier der Unterschied zwischen lesbarem
  // und verwaschenem Screenshot.
  const gl = useThree((s) => s.gl);
  useMemo(() => {
    const max = gl.capabilities.getMaxAnisotropy();
    for (const texture of textures) {
      texture.anisotropy = max;
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
          texture={textures[i]}
          z={stationZ(i)}
          side={i % 2 === 0 ? -1 : 1}
          portrait={project.media.orientation === "portrait"}
          index={i}
        />
      ))}
    </group>
  );
}

/**
 * Eine Projekttafel an der Korridorwand, leicht zur Fahrbahn eingedreht.
 * Wird heller, waehrend die Kamera sie passiert.
 */
function Panel({
  texture,
  z,
  side,
  portrait,
  index,
}: {
  texture: THREE.Texture;
  z: number;
  side: 1 | -1;
  portrait: boolean;
  index: number;
}) {
  const holderRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const [w, h] = portrait ? [3.1, 6.4] : [7.4, 3.6];

  const frameGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    [w, h],
  );
  const glowTexture = useMemo(makeGlowTexture, []);

  useFrame(() => {
    const mesh = meshRef.current;
    const holder = holderRef.current;
    if (!mesh || !holder) return;

    const active = sceneState.weights.tunnel;
    const progress = sceneState.tunnelProgress;
    const nearness = stationNearness(progress, index);

    // Ankunft ist der letzte Teil der Annaeherung. Erst hier steht die
    // Tafel voll da, wird herangeholt und mit Licht hinterlegt - vorher
    // bleibt sie erkennbar, aber zurueckhaltend. Ohne diese Trennung sind
    // alle fuenf gleich laut und keine ist die, an der man gerade steht.
    const arrival = Math.max(0, (nearness - 0.55) / 0.45);

    const material = mesh.material as THREE.MeshStandardMaterial;

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
      (frameRef.current.material as THREE.LineBasicMaterial).opacity =
        active * (0.3 + nearness * 0.4 + arrival * 0.3);
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
      <mesh ref={glowRef} position={[0, 0, -0.35]} scale={[w * 1.25, h * 1.25, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color={index % 2 === 0 ? "#38bdf8" : "#a855f7"}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Die Tafel ist ein Bildschirm, kein Poster: der Screenshot liegt
          als Emissive-Map auf, das Objekt leuchtet also aus sich selbst
          statt vom Studiolicht abzuhaengen. Das ist der Grund, warum das
          Bild bei Ankunft klar und farbrichtig steht - und nebenbei die
          inhaltlich passende Metapher fuer ein Deployment. */}
      <mesh ref={meshRef}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#ffffff"
          emissiveIntensity={0.3}
          color="#0b0d13"
          metalness={0.1}
          roughness={0.6}
          toneMapped={false}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rahmen als Metallprofil in der Akzentfarbe, abwechselnd Cyan und
          Violett - das Duoton aus der Oberflaeche, hier in 3D fortgesetzt. */}
      <lineSegments ref={frameRef} geometry={frameGeometry}>
        <lineBasicMaterial
          color={index % 2 === 0 ? "#38bdf8" : "#a855f7"}
          transparent
          opacity={0}
        />
      </lineSegments>
    </group>
  );
}
