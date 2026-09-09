"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio/engine";
import { sceneState } from "@/lib/scene/state";
import { applyEntry } from "@/lib/scene/entry";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Schwingende Membran.
 *
 * ## Warum nicht mehr die Balken
 *
 * Hier standen drei konzentrische Ringe aus 156 Balken, deren Hoehe aus
 * der FFT kam. Das funktionierte, war aber das abgenutzteste Bild, das
 * es fuer Ton gibt: ein Equalizer, im Kreis gelegt. Man erkennt es in
 * einer Zehntelsekunde und hat danach nichts mehr zu sehen. Ausserdem
 * war es aus der Kameraposition eine flache Scheibe mit Zaehnen, und ein
 * Balken ist ein Diagramm, kein Koerper.
 *
 * Ton ist aber physikalisch etwas anderes als ein Balkendiagramm: eine
 * Flaeche, die schwingt. Membran, Saite, Trommelfell. Das ist hier
 * gebaut - ein Gitter aus 150 mal 150 Punkten, das von der echten
 * 512-Punkt-FFT ausgelenkt wird. Die Wellen laufen von der Mitte nach
 * aussen, ueberlagern sich mit einem stehenden Muster ueber den Winkel
 * (wie bei Chladnischen Klangfiguren) und klingen zum Rand hin ab.
 *
 * ## Warum ein eigener Shader
 *
 * 22500 Punkte pro Frame in JavaScript zu verschieben und danach die
 * Normalen neu zu rechnen waere die eine Millisekunde, die wir hier
 * nicht haben. Auf der Grafikkarte kostet dasselbe nichts. Die Normale
 * wird analytisch aus derselben Formel gebildet, mit der auch die Hoehe
 * entsteht - dadurch stimmt die Beleuchtung exakt zur Auslenkung, statt
 * hinterherzuhinken.
 *
 * Das ist nebenbei der Beleg fuer "GLSL-Shader" im Code-Kapitel: die
 * Zeile steht nicht nur in der Liste, sie laeuft zwei Abschnitte weiter
 * unten.
 */

/** Aufloesung des Gitters. 150 x 150 sind 22500 Punkte. */
const SEGMENTS = 150;
const SIZE = 9.5;
/** Breite der Spektrumstextur. Mehr braucht die Kurve nicht. */
const BINS = 64;

const VERTEX = /* glsl */ `
  uniform sampler2D uSpectrum;
  uniform float uTime;
  uniform float uLevel;

  varying vec3 vNormalW;
  varying float vHeight;
  varying float vRadius;
  varying vec2 vUv;

  /**
   * Auslenkung an einer Stelle des Gitters.
   *
   * Drei Anteile: eine von der Mitte nach aussen laufende Welle, ein
   * stehendes Muster ueber den Winkel, und ein Grundhub aus dem Pegel.
   * Alles klingt mit exp() nach aussen ab, sonst schlaegt der Rand.
   */
  float displace(vec2 p) {
    float r = length(p);
    float bin = clamp(r / 4.6, 0.0, 1.0);
    float amp = texture2D(uSpectrum, vec2(bin, 0.5)).r;

    float ang = atan(p.y, p.x);
    float travel = sin(r * 3.4 - uTime * 2.1);
    float standing = sin(ang * 6.0 + uTime * 0.45) * cos(r * 2.2);

    float fall = exp(-r * 0.42);
    return (travel * amp * 1.7 + standing * amp * 0.7 + uLevel * 0.5) * fall;
  }

  void main() {
    vUv = uv;
    vec2 p = position.xy;
    vRadius = length(p) / (${(SIZE / 2).toFixed(2)});

    float h = displace(p);
    vHeight = h;

    // Normale analytisch: zwei Nachbarpunkte, dieselbe Formel. Der
    // Abstand ist bewusst die halbe Gitterweite - kleiner wird die
    // Ableitung numerisch unruhig, groesser verschmiert sie die Kanten.
    float d = ${(SIZE / SEGMENTS / 2).toFixed(4)};
    float hx = displace(p + vec2(d, 0.0));
    float hy = displace(p + vec2(0.0, d));
    vec3 n = normalize(vec3(-(hx - h) / d, -(hy - h) / d, 1.0));
    vNormalW = normalize(normalMatrix * n);

    vec3 displaced = vec3(p, h);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform float uOpacity;

  varying vec3 vNormalW;
  varying float vHeight;
  varying float vRadius;
  varying vec2 vUv;

  void main() {
    // Einfache Beleuchtung aus zwei Richtungen, passend zu den
    // Leuchtflaechen der Szene. Kein Standardmaterial, weil die Membran
    // ihre Normale selbst rechnet.
    vec3 n = normalize(vNormalW);
    float key = max(dot(n, normalize(vec3(0.4, 0.8, 0.45))), 0.0);
    float fill = max(dot(n, normalize(vec3(-0.6, -0.2, 0.5))), 0.0);

    float level = clamp(abs(vHeight) * 1.4, 0.0, 1.0);
    vec3 base = mix(uLow, uHigh, level);
    vec3 lit = base * (0.16 + key * 0.85) + uHigh * fill * 0.22;

    // Messgitter: dieselbe Sprache wie die Haarlinien der Oberflaeche.
    vec2 g = abs(fract(vUv * 48.0) - 0.5);
    float grid = 1.0 - smoothstep(0.0, 0.06, min(g.x, g.y));
    lit += base * grid * 0.55;

    // Zum Rand hin ausblenden, damit kein Quadrat im Raum steht.
    float edge = 1.0 - smoothstep(0.62, 1.0, vRadius);
    // Grundwert bewusst hoch: die Membran ist das Motiv des Kapitels
    // und darf nicht erst sichtbar werden, wenn jemand den Ton
    // einschaltet.
    float alpha = uOpacity * edge * (0.5 + level * 0.5 + grid * 0.3);

    gl_FragColor = vec4(lit, clamp(alpha, 0.0, 1.0));
  }
`;

export function SignalMode() {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const membraneRef = useRef<THREE.Mesh>(null);
  const reducedMotion = usePrefersReducedMotion();

  const { texture, data, uniforms, smoothed } = useMemo(() => {
    const data = new Uint8Array(BINS);
    const texture = new THREE.DataTexture(
      data,
      BINS,
      1,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    // Linear, damit die Membran zwischen den Baendern glatt bleibt
    // statt in 64 Stufen zu springen.
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return {
      texture,
      data,
      smoothed: new Float32Array(BINS),
      uniforms: {
        uSpectrum: { value: texture },
        uTime: { value: 0 },
        uLevel: { value: 0.05 },
        uOpacity: { value: 0 },
        uLow: { value: new THREE.Color("#0e7fb8") },
        uHigh: { value: new THREE.Color("#a855f7") },
      },
    };
  }, []);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS),
    [],
  );

  useFrame((state) => {
    const weight = sceneState.weights.signal;
    const group = groupRef.current;
    const membrane = membraneRef.current;
    if (!group || !membrane) return;

    group.visible = weight > 0.01;
    if (!group.visible) return;

    const eased = applyEntry(group, "signal", weight);
    const t = state.clock.elapsedTime;
    const spectrum = audioEngine.getSpectrum();
    const live = audioEngine.isRunning;

    // Nur die unteren Baender: der Drone steht auf 110 Hz und laeuft
    // durch einen Tiefpass, der bei rund 1 kHz zumacht. Wer das volle
    // Spektrum aufspannt, bekommt eine zur Haelfte tote Membran.
    const usable = 42;

    for (let i = 0; i < BINS; i++) {
      const src = Math.min(usable - 1, Math.floor((i / BINS) * usable));
      let target: number;
      if (live) {
        target = spectrum[src + 1] / 255;
      } else if (reducedMotion) {
        target = 0.1;
      } else {
        // Ruhesignal: die Membran soll atmen, bevor jemand den Ton
        // einschaltet. Zwei ueberlagerte Sinus, bewusst flach.
        target =
          0.1 +
          Math.abs(Math.sin(t * 0.55 + i * 0.16)) * 0.16 +
          Math.abs(Math.sin(t * 0.23 - i * 0.05)) * 0.1;
      }
      // Attack schnell, Release langsam: das Verhalten eines VU-Meters,
      // und der Grund, warum die Membran nachschwingt statt zu zappeln.
      const prev = smoothed[i];
      const rate = target > prev ? 0.4 : 0.1;
      smoothed[i] = prev + (target - prev) * rate;
      data[i] = Math.round(Math.min(1, smoothed[i]) * 255);
    }
    texture.needsUpdate = true;

    // WICHTIG: die Werte gehen an das Material, nicht an das Objekt aus
    // useMemo.
    //
    // three legt beim Anlegen eines ShaderMaterial eine KOPIE der
    // uebergebenen Uniforms an (UniformsUtils.clone). Wer danach sein
    // eigenes Objekt beschreibt, aendert nichts: die Membran blieb bei
    // uOpacity = 0 und damit unsichtbar, ohne dass irgendwo ein Fehler
    // aufgetaucht waere. Der Weg ueber `mesh.material.uniforms` ist der
    // einzige, der garantiert am echten Material landet.
    const material = membrane.material as THREE.ShaderMaterial;
    const u = material.uniforms;
    u.uSpectrum.value = texture;
    u.uTime.value = t;
    u.uLevel.value = live ? audioEngine.getLevel() : 0.14;
    u.uOpacity.value = eased;


    if (spinRef.current && !reducedMotion) {
      spinRef.current.rotation.z = t * 0.045;
    }

    if (coreRef.current) {
      const level = live ? audioEngine.getLevel() : 0.08;
      const s = 0.42 + level * 0.85;
      coreRef.current.scale.setScalar(s);
      coreRef.current.rotation.y = t * 0.2;
      coreRef.current.rotation.x = t * 0.12;
      (coreRef.current.material as THREE.MeshStandardMaterial).opacity =
        eased * 0.95;
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + level * 2.4;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Die Membran liegt flach und dreht sich langsam um ihre eigene
          Achse. Gedreht wird um Z, weil die Ebene erst danach in die
          Waagerechte gekippt wird. */}
      <group rotation={[-Math.PI / 2.35, 0, 0]}>
        <group ref={spinRef}>
          <mesh ref={membraneRef} geometry={geometry} frustumCulled={false}>
            <shaderMaterial
              uniforms={uniforms}
              vertexShader={VERTEX}
              fragmentShader={FRAGMENT}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* Die Quelle in der Mitte. Sie ist das einzige Teil, das nicht
          schwingt, sondern treibt - und das einzige, das echtes
          Studiolicht spiegelt. */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          color="#0c2c40"
          emissive="#38bdf8"
          emissiveIntensity={1}
          metalness={0.95}
          roughness={0.12}
          envMapIntensity={2}
          transparent
        />
      </mesh>
    </group>
  );
}
