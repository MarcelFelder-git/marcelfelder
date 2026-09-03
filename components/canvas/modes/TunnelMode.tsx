"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { PROJECTS } from "@/content/projects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

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

const RING_COUNT = 42;
const RING_SPACING = 2.5;
const RADIUS = 5.2;
const SIDES = 8;
/** Laenge des Korridors in Weltkoordinaten. Das Rig braucht denselben
 *  Wert fuer die Kamerafahrt - deshalb exportiert statt zweimal getippt. */
export const TUNNEL_LENGTH = RING_COUNT * RING_SPACING;
const LENGTH = TUNNEL_LENGTH;

/** Erste Tafel etwas hinter dem Eingang, dann gleichmaessig verteilt. */
const STATION_START = -12;
const STATION_GAP = 17;

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

function stationZ(i: number) {
  return STATION_START - i * STATION_GAP;
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

    // Der ganze Korridor dreht sich extrem langsam um die Fahrtachse. Das
    // ist der Unterschied zwischen "Standbild mit bewegter Kamera" und
    // "man faehrt durch etwas".
    if (!reduced) {
      group.rotation.z = state.clock.elapsedTime * 0.018;
    }

    const lines = group.children[0] as THREE.LineSegments;
    if (lines?.material) {
      (lines.material as THREE.LineBasicMaterial).opacity = eased * 0.9;
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
      <lineSegments geometry={corridor} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent opacity={0} />
      </lineSegments>

      <points ref={motesRef} geometry={motes.geometry} frustumCulled={false}>
        <pointsMaterial
          size={0.055}
          color="#7dd3fc"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

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
  const meshRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<THREE.LineSegments>(null);

  const [w, h] = portrait ? [3.1, 6.4] : [7.4, 3.6];

  const frameGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
    [w, h],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Die Kameraposition auf der Fahrt, aus demselben Fortschritt
    // gerechnet wie im Rig - so bleiben Bild und Beleuchtung synchron.
    const camZ = 4 - sceneState.tunnel.progress * (LENGTH - 6);
    const distance = Math.abs(camZ - z);

    // Weiter Anlauf und hoeherer Grundwert als zuerst gebaut: die Tafeln
    // sind der Inhalt, nicht die Dekoration. Bei 14 Einheiten Reichweite
    // und 0.25 Grundhelligkeit waren sie waehrend der Annaeherung kaum zu
    // erkennen - man sah einen huebschen Korridor und verpasste die
    // Projekte darin.
    const nearness = Math.max(0, 1 - distance / 22);
    const intensity = 0.45 + nearness * nearness * 0.55;

    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = sceneState.tunnel.active * intensity;

    if (frameRef.current) {
      (frameRef.current.material as THREE.LineBasicMaterial).opacity =
        sceneState.tunnel.active * (0.4 + nearness * 0.6);
    }
  });

  return (
    <group
      position={[side * 3.5, portrait ? 0.2 : 0.4, z]}
      rotation={[0, side * -0.34, 0]}
    >
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
