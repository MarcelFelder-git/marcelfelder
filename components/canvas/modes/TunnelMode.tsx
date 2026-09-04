"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { PROJECTS } from "@/content/projects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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

/** Gitterkorridor: Ringe plus Laengsverbindungen an jeder Ecke. */
function buildCorridor() {
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();

  const vertex = (ring: number, side: number) => {
    const angle = (side / SIDES) * Math.PI * 2 + Math.PI / SIDES;
    return [
      Math.cos(angle) * RADIUS,
      Math.sin(angle) * RADIUS,
      -ring * RING_SPACING,
    ] as const;
  };

  const push = (p: readonly number[], ring: number) => {
    positions.push(p[0], p[1], p[2]);
    color.copy(ring % 4 === 0 ? COL_MARKER : COL_CORRIDOR);
    colors.push(color.r, color.g, color.b);
  };

  for (let ring = 0; ring <= RING_COUNT; ring++) {
    for (let side = 0; side < SIDES; side++) {
      const a = vertex(ring, side);
      const b = vertex(ring, (side + 1) % SIDES);
      push(a, ring);
      push(b, ring);

      if (ring < RING_COUNT) {
        const c = vertex(ring + 1, side);
        push(a, ring);
        push(c, ring + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export function TunnelMode() {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const motesRef = useRef<THREE.Points>(null);
  const reduced = usePrefersReducedMotion();

  const corridor = useMemo(buildCorridor, []);

  const textures = useTexture(PROJECTS.map((p) => p.media.image));

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

    const { active } = sceneState.tunnel;
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

    if (linesRef.current) {
      (linesRef.current.material as THREE.LineBasicMaterial).opacity =
        eased * 0.9;
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
      {/* Alles Drehende steckt in dieser Gruppe. Die Tafeln liegen
          bewusst daneben und bleiben dadurch aufrecht. */}
      <group ref={spinRef}>
        <lineSegments
          ref={linesRef}
          geometry={corridor}
          frustumCulled={false}
          // Ohne diese beiden Angaben zeichnet der Korridor ueber den
          // Tafeln: transparente Objekte werden nach dem Abstand ihres
          // Ursprungs sortiert, und der Ursprung dieser einen grossen
          // Geometrie liegt am Tunneleingang - also scheinbar ganz vorne.
          // renderOrder erzwingt die richtige Reihenfolge, depthWrite
          // verhindert, dass die Linien den Tiefenpuffer blockieren.
          renderOrder={0}
        >
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
          />
        </lineSegments>

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

    const { active, progress } = sceneState.tunnel;
    const nearness = stationNearness(progress, index);

    // Ankunft ist der letzte Teil der Annaeherung. Erst hier wird die
    // Tafel voll aufgeblendet, herangeholt und mit Licht hinterlegt -
    // vorher bleibt sie erkennbar, aber zurueckhaltend. Ohne diese
    // Trennung sind alle fuenf Tafeln gleich laut und keine ist die,
    // an der man gerade steht.
    const arrival = Math.max(0, (nearness - 0.55) / 0.45);
    const intensity = 0.4 + nearness * nearness * 0.45 + arrival * 0.15;

    (mesh.material as THREE.MeshBasicMaterial).opacity = active * intensity;

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

      <mesh ref={meshRef}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rahmen in der Akzentfarbe, abwechselnd Cyan und Violett - das
          Duoton aus der Oberflaeche, hier in 3D fortgesetzt. */}
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
