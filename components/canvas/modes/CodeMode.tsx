"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneState } from "@/lib/scene/state";
import { applyEntry } from "@/lib/scene/entry";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Komponenten-Matrix.
 *
 * Drei gestaffelte Ebenen aus Token-Balken - jeder Balken steht fuer ein
 * Symbol im Quelltext, die Einrueckung fuer die Verschachtelungstiefe.
 * Ein Compile-Sweep laeuft von unten nach oben und laesst die Tokens
 * aufleuchten, die er gerade passiert.
 *
 * Dahinter liegt eine Shader-Ebene mit Raster und Scanlines: reines GLSL,
 * kein Texture-Fetch, damit die Ebene auch auf schwachen GPUs frei laeuft.
 */

const LAYERS = [-1.25, 0, 1.25]; // z-Positionen der drei Ebenen
const LINES = 20;
const LINE_HEIGHT = 0.175;
const TOKEN_HEIGHT = 0.072;

const COL_IDLE = new THREE.Color("#243044");
const COL_ACTIVE = new THREE.Color("#38bdf8");
const COL_ACCENT = new THREE.Color("#a855f7");

interface Token {
  x: number;
  y: number;
  z: number;
  width: number;
  /** Schluesselwoerter werden im Sweep violett statt cyan. */
  accent: boolean;
}

/**
 * Deterministischer PRNG (Mulberry32). Math.random() waere hier fatal:
 * Server- und Client-Render muessten dasselbe Layout erzeugen, sonst
 * flackert die Szene beim Hydrieren.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTokens(): Token[] {
  const rand = mulberry32(0x5eed);
  const tokens: Token[] = [];

  for (let l = 0; l < LAYERS.length; l++) {
    for (let line = 0; line < LINES; line++) {
      // Einrueckungstiefe wandert wie in echtem Code: rein, halten, raus.
      const depth = Math.floor(Math.abs(Math.sin(line * 0.55 + l) * 3));
      let cursor = -2.0 + depth * 0.22;
      const count = 1 + Math.floor(rand() * 3);

      for (let t = 0; t < count; t++) {
        const width = 0.16 + rand() * 0.68;
        if (cursor + width > 2.0) break;
        tokens.push({
          x: cursor + width / 2,
          y: (line - LINES / 2) * LINE_HEIGHT,
          z: LAYERS[l],
          width,
          accent: rand() > 0.78,
        });
        cursor += width + 0.1;
      }
    }
  }
  return tokens;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;

  // Weiches Raster: Ableitung als Linienbreite, damit es nicht aliast.
  float grid(vec2 uv, float divisions) {
    vec2 g = abs(fract(uv * divisions - 0.5) - 0.5) / fwidth(uv * divisions);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    float g = grid(vUv, 24.0) * 0.16 + grid(vUv, 4.0) * 0.22;

    // Compile-Sweep: eine schmale Bande, die nach oben wandert.
    float sweep = fract(vUv.y - uTime * 0.14);
    float band = smoothstep(0.0, 0.06, sweep) * smoothstep(0.16, 0.06, sweep);

    // Feine Scanlines - das CRT-Zitat, sehr dezent dosiert.
    float scan = sin(vUv.y * 620.0) * 0.5 + 0.5;

    vec3 col = mix(uColorA, uColorB, vUv.y);
    // Drei Ebenen liegen hintereinander, ihre Alphas addieren sich im
    // Blick des Betrachters - und der Bloom hebt das Ergebnis noch einmal
    // an. Der Sweep muss deshalb pro Ebene deutlich schwaecher sein, als
    // er sich einzeln betrachtet anfuehlen wuerde.
    float alpha = g * 0.42 + band * 0.15 + scan * 0.012;

    // Vignette: Raender ausblenden, damit die Ebene nicht hart abschneidet.
    vec2 d = abs(vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.55, 1.0, max(d.x, d.y));

    gl_FragColor = vec4(col, alpha * edge * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function CodeMode() {
  const tokens = useMemo(buildTokens, []);
  const reducedMotion = usePrefersReducedMotion();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);

  const scratch = useMemo(
    () => ({ dummy: new THREE.Object3D(), color: new THREE.Color() }),
    [],
  );

  // Eine Kantengeometrie fuer alle drei Rahmen - sie unterscheiden sich
  // nur in der Skalierung.
  const boxEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    [],
  );

  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color("#38bdf8") },
          uColorB: { value: new THREE.Color("#a855f7") },
          uOpacity: { value: 1 },
        },
      }),
    [],
  );

  useFrame((state) => {
    const weight = sceneState.weights.code;
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    group.visible = weight > 0.01;
    if (!group.visible) return;

    // Siehe lib/scene/entry.ts.
    const eased = applyEntry(group, "code", weight);
    shader.uniforms.uOpacity.value = eased;

    const t = state.clock.elapsedTime;
    shader.uniforms.uTime.value = reducedMotion ? 0 : t;

    const { dummy, color } = scratch;
    const span = LINES * LINE_HEIGHT;
    // Sweep-Hoehe in Weltkoordinaten, synchron zum Shader-Band.
    const sweepY = reducedMotion
      ? 0
      : (((t * 0.14) % 1) - 0.5) * span * 1.6;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      dummy.position.set(tok.x, tok.y, tok.z);
      dummy.scale.set(tok.width, TOKEN_HEIGHT, 0.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Naehe zum Sweep bestimmt die Helligkeit.
      const dist = Math.abs(tok.y - sweepY);
      const glow = Math.max(0, 1 - dist / 0.42);
      color
        .copy(COL_IDLE)
        .lerp(tok.accent ? COL_ACCENT : COL_ACTIVE, glow * glow);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (spinRef.current && !reducedMotion) {
      // Minimale Eigenrotation, damit die Staffelung der Ebenen lesbar wird.
      spinRef.current.rotation.y = Math.sin(t * 0.18) * 0.24;
    }
    (mesh.material as THREE.MeshBasicMaterial).opacity = eased;
  });

  return (
    <group ref={groupRef}>
      <group ref={spinRef}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, tokens.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          metalness={0.8}
          roughness={0.28}
          envMapIntensity={1.4}
          transparent
        />
      </instancedMesh>

      {/* Shader-Ebenen hinter jeder Token-Schicht */}
      {LAYERS.map((z) => (
        <mesh key={z} position={[0, 0, z - 0.06]} material={shader}>
          <planeGeometry args={[4.8, 4.0]} />
        </mesh>
      ))}

      {/* Komponentengrenzen: verschachtelte Rahmen.
          EdgesGeometry statt wireframe - letzteres zeichnet die Kanten der
          Dreiecke und legt damit ueber jede Boxflaeche eine Diagonale.
          Was als Rahmen gemeint war, liest sich dann als Kritzelei. */}
      {[0.62, 0.8, 0.98].map((s, i) => (
        <lineSegments
          key={s}
          geometry={boxEdges}
          scale={[s * 4.5, s * 3.7, s * 2.8]}
        >
          <lineBasicMaterial
            color={i === 1 ? "#a855f7" : "#38bdf8"}
            transparent
            opacity={0.3 - i * 0.07}
            toneMapped={false}
          />
        </lineSegments>
      ))}
      </group>
    </group>
  );
}
