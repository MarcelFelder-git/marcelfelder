"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio/engine";
import { sceneState } from "@/lib/scene/state";
import { applyEntry } from "@/lib/scene/entry";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Chladnischer Klangversuch.
 *
 * ## Was hier steht
 *
 * Eine Metallplatte auf einem Erregerstab, angetrieben von einem Ton,
 * und Sand darauf. Der Sand bleibt dort liegen, wo die Platte still
 * steht, und wird von dort weggeschuettelt, wo sie schwingt. Uebrig
 * bleiben die Knotenlinien - das Muster, das Ernst Chladni 1787
 * veroeffentlicht hat und das seitdem das schoenste Bild fuer die Frage
 * ist, wie ein Ton eigentlich aussieht.
 *
 * Das ist kein Effekt, sondern ein Versuchsaufbau. Vorher standen hier
 * eine schwingende Membran und eine leuchtende Kugel in der Mitte, und
 * die Kugel war das Problem: sie hatte keinen Grund, da zu sein. Ein
 * Erregerstab hat einen - er treibt die Platte an, das sieht man, und
 * damit wird aus zwei abstrakten Koerpern ein Geraet.
 *
 * ## Warum die Platte jetzt ein Standardmaterial ist
 *
 * Sie hatte einen eigenen ShaderMaterial mit zwei fest verdrahteten
 * Lichtrichtungen. Damit war sie das einzige Objekt der Seite, das
 * nicht im selben Studio stand: alles andere faengt die Leuchtflaechen
 * aus `BackgroundScene` als Glanzlicht ein, sie nicht. Genau daher kam
 * der Eindruck, dass sie weniger echt wirkt als der Tunnel.
 *
 * Jetzt ist es ein MeshStandardMaterial, in das die Auslenkung per
 * `onBeforeCompile` eingehaengt wird. Beleuchtung, Umgebungsspiegelung
 * und Tonwertkurve macht three, die Verformung machen wir - und die
 * Platte bekommt endlich Reflexe, die sich mit ihr bewegen.
 *
 * Die Normale wird weiterhin analytisch aus derselben Formel gebildet,
 * mit der auch die Hoehe entsteht. Dadurch stimmt die Beleuchtung exakt
 * zur Auslenkung, statt ihr hinterherzuhinken.
 *
 * Das bleibt der Beleg fuer "GLSL-Shader" im Code-Kapitel: die Zeile
 * steht nicht nur in der Liste, sie laeuft zwei Abschnitte weiter unten.
 */

/** Aufloesung des Gitters. 150 x 150 sind 22500 Punkte. */
const SEGMENTS = 150;
const SIZE = 9.5;
/** Breite der Spektrumstextur. Mehr braucht die Kurve nicht. */
const BINS = 64;

/**
 * Sandkoerner.
 *
 * 2600 reichen, um die Linien zu zeichnen, und kosten pro Bild rund
 * achtzehntausend Winkelfunktionen - messbar, aber unter einer halben
 * Millisekunde. Mehr Koerner machen das Muster nicht schaerfer, sondern
 * nur den Teller voller.
 */
const GRAIN_COUNT = 2600;
/** Bis hierhin liegt Sand. Weiter aussen blendet die Platte schon aus. */
const GRAIN_RADIUS = 3.5;

/** Radiale Wellenzahl des stehenden Musters, in GLSL und JS dieselbe. */
const RINGS = 2.2;

const VERTEX_HEAD = /* glsl */ `
  uniform sampler2D uSpectrum;
  uniform float uTime;
  uniform float uLevel;
  /** Ordnung des stehenden Musters, vom Zeiger gesteuert. */
  uniform float uOrder;

  varying float vHeight;
  varying float vRadius;
  varying vec2 vPlate;

  /**
   * Auslenkung an einer Stelle der Platte.
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
    float standing = sin(ang * uOrder + uTime * 0.45) * cos(r * ${RINGS.toFixed(
      1,
    )});

    float fall = exp(-r * 0.42);
    return (travel * amp * 1.7 + standing * amp * 0.7 + uLevel * 0.5) * fall;
  }

  // Zwischen den beiden Einhaengepunkten weitergereicht: die Normale
  // wird vor der Position gerechnet, braucht aber dieselben Werte.
  vec2 gPlate;
  float gHeight;
`;

/**
 * Normale aus der Formel statt aus der Geometrie.
 *
 * Zwei Nachbarpunkte, dieselbe Funktion. Der Abstand ist bewusst die
 * halbe Gitterweite: kleiner wird die Ableitung numerisch unruhig,
 * groesser verschmiert sie die Kanten.
 */
const VERTEX_NORMAL = /* glsl */ `
  gPlate = position.xy;
  gHeight = displace(gPlate);

  float dStep = ${(SIZE / SEGMENTS / 2).toFixed(4)};
  float hx = displace(gPlate + vec2(dStep, 0.0));
  float hy = displace(gPlate + vec2(0.0, dStep));
  vec3 objectNormal = normalize(
    vec3(-(hx - gHeight) / dStep, -(hy - gHeight) / dStep, 1.0)
  );
`;

const VERTEX_POSITION = /* glsl */ `
  vHeight = gHeight;
  vRadius = length(gPlate) / ${(SIZE / 2).toFixed(2)};
  vPlate = gPlate;
  vec3 transformed = vec3(gPlate, gHeight);
`;

const FRAGMENT_HEAD = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;

  varying float vHeight;
  varying float vRadius;
  varying vec2 vPlate;
`;

/**
 * Farbe und Rand.
 *
 * Der Ton haengt an der Auslenkung, nicht an der Position: eine ruhige
 * Platte ist blau, eine ausgelenkte violett. Bei einem Metall faerbt
 * diffuseColor die Spiegelung - man sieht die Farbe also im Reflex und
 * nicht im Anstrich, und genau das unterscheidet lackiertes Blech von
 * eingefaerbter Flaeche.
 */
const FRAGMENT_COLOR = /* glsl */ `
  float lvl = clamp(abs(vHeight) * 1.4, 0.0, 1.0);
  diffuseColor.rgb *= mix(uLow, uHigh, lvl);

  // Zum Rand hin ausblenden, damit kein Quadrat im Raum steht.
  diffuseColor.a *= 1.0 - smoothstep(0.62, 1.0, vRadius);
`;

/** Haarlinien im Blech, dieselbe Sprache wie die Raster der Seite. */
const FRAGMENT_EMISSIVE = /* glsl */ `
  vec2 gLine = abs(fract(vPlate * 2.6) - 0.5);
  float grid = 1.0 - smoothstep(0.0, 0.045, min(gLine.x, gLine.y));
  float lvlE = clamp(abs(vHeight) * 1.4, 0.0, 1.0);
  totalEmissiveRadiance += mix(uLow, uHigh, lvlE) * (grid * 0.45 + lvlE * 0.3);
`;

/** Weiches rundes Korn, im Canvas gezeichnet statt geladen. */
function makeGrainTexture() {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function SignalMode() {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const driverRef = useRef<THREE.Group>(null);
  const grainsRef = useRef<THREE.Points>(null);
  const plateRef = useRef<THREE.Mesh>(null);
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
    // Linear, damit die Platte zwischen den Baendern glatt bleibt
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
        uOrder: { value: 6 },
        uLow: { value: new THREE.Color("#0e7fb8") },
        uHigh: { value: new THREE.Color("#a855f7") },
      },
    };
  }, []);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS),
    [],
  );

  /**
   * Das Material der Platte.
   *
   * `Object.assign` statt Zuweisung: die Uniform-Objekte werden per
   * Referenz uebernommen, und weil dieselben Objekte danach in
   * `shader.uniforms` stehen, kommt jede Aenderung an `uniforms.uTime`
   * beim Programm an.
   *
   * Das ist genau der Punkt, an dem die alte Fassung gescheitert ist:
   * `new ShaderMaterial({ uniforms })` legt intern eine Kopie an, und
   * Schreiben auf das eigene Objekt lief danach ins Leere - ohne
   * Fehlermeldung, die Platte blieb einfach unsichtbar.
   */
  const material = useMemo(() => {
    // Standard statt Physical.
    //
    // Gesetzt werden hier nur Farbe, Metalness, Roughness und
    // Umgebungsstaerke - alles davon kann auch das Standardmaterial.
    // Physical bringt zusaetzlich Clearcoat, Transmission, Sheen,
    // Iridescence und Anisotropie mit, und zwar als Shader-Code, der
    // beim ersten Zeichnen uebersetzt werden muss. Im Profil war das
    // einer der teuersten Posten beim Aufbau der Szene, fuer
    // Eigenschaften, die diese Platte nie benutzt.
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.92,
      roughness: 0.24,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
        .replace("#include <beginnormal_vertex>", VERTEX_NORMAL)
        .replace("#include <begin_vertex>", VERTEX_POSITION);
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>\n${FRAGMENT_COLOR}`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>\n${FRAGMENT_EMISSIVE}`,
        );
    };
    m.customProgramCacheKey = () => "chladni-plate";
    return m;
  }, [uniforms]);

  const grainTexture = useMemo(makeGrainTexture, []);

  /**
   * Der Sand.
   *
   * Gleichmaessig ueber die Scheibe verteilt, deshalb die Wurzel: ohne
   * sie waeren die Koerner in der Mitte gedraengt, weil ein Ring mit
   * doppeltem Radius die doppelte Flaeche hat.
   */
  const grains = useMemo(() => {
    const pos = new Float32Array(GRAIN_COUNT * 3);
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const r = GRAIN_RADIUS * Math.sqrt(Math.random());
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state, delta) => {
    const weight = sceneState.weights.signal;
    const group = groupRef.current;
    const plate = plateRef.current;
    if (!group || !plate) return;

    group.visible = weight > 0.01;
    if (!group.visible) return;

    const eased = applyEntry(group, "signal", weight);
    const t = state.clock.elapsedTime;
    const spectrum = audioEngine.getSpectrum();
    const live = audioEngine.isRunning;

    // Nur die unteren Baender: der Drone steht auf 110 Hz und laeuft
    // durch einen Tiefpass, der bei rund 1 kHz zumacht. Wer das volle
    // Spektrum aufspannt, bekommt eine zur Haelfte tote Platte.
    const usable = 42;

    for (let i = 0; i < BINS; i++) {
      const src = Math.min(usable - 1, Math.floor((i / BINS) * usable));
      let target: number;
      if (live) {
        target = spectrum[src + 1] / 255;
      } else if (reducedMotion) {
        target = 0.1;
      } else {
        // Ruhesignal: die Platte soll atmen, bevor jemand den Ton
        // einschaltet. Zwei ueberlagerte Sinus, bewusst flach.
        target =
          0.1 +
          Math.abs(Math.sin(t * 0.55 + i * 0.16)) * 0.16 +
          Math.abs(Math.sin(t * 0.23 - i * 0.05)) * 0.1;
      }
      // Attack schnell, Release langsam: das Verhalten eines VU-Meters,
      // und der Grund, warum die Platte nachschwingt statt zu zappeln.
      const prev = smoothed[i];
      const rate = target > prev ? 0.4 : 0.1;
      smoothed[i] = prev + (target - prev) * rate;
      data[i] = Math.round(Math.min(1, smoothed[i]) * 255);
    }
    texture.needsUpdate = true;

    const level = live ? audioEngine.getLevel() : 0.14;
    uniforms.uTime.value = t;
    uniforms.uLevel.value = level;
    material.opacity = eased * 0.94;

    // Der Zeiger steuert die Ordnung des stehenden Musters.
    //
    // Chladnische Klangfiguren aendern ihre Form mit der Frequenz: bei
    // 300 Hz liegen vier Knotenlinien auf der Platte, bei 800 Hz zwoelf.
    // Genau das passiert hier, nur mit der Maus statt mit dem Generator.
    // Weich nachgezogen, sonst springt das Muster - und der Sand kaeme
    // ohnehin nicht hinterher.
    const wanted = 4 + (sceneState.pointer.x * 0.5 + 0.5) * 7;
    uniforms.uOrder.value += (wanted - uniforms.uOrder.value) * 0.06;
    const order = uniforms.uOrder.value;

    if (spinRef.current && !reducedMotion) {
      // Grunddrehung plus Zeiger: die Platte laesst sich anschauen wie
      // ein Objekt auf einem Drehteller. Ein echtes Ziehen mit der Maus
      // waere schoener, ginge hier aber nur, wenn der Canvas Klicks
      // annaehme - und dann liesse sich der Text darueber nicht mehr
      // markieren.
      spinRef.current.rotation.z = t * 0.045 + sceneState.pointer.x * 0.5;
    }

    if (tiltRef.current && !reducedMotion) {
      // Neigung folgt der Hoehe des Zeigers: von fast aufgesichtig bis
      // beinahe streifend. Erst dadurch sieht man, dass es eine Platte
      // im Raum ist und keine Grafik.
      const tilt = -Math.PI / 2.35 + sceneState.pointer.y * 0.28;
      tiltRef.current.rotation.x += (tilt - tiltRef.current.rotation.x) * 0.06;
    }

    // --- Der Sand wandert auf die Knotenlinien ----------------------
    //
    // Nur der stehende Anteil zaehlt, nicht die laufende Welle. Das ist
    // kein Versehen: eine laufende Welle hat keine festen Knoten, ihre
    // Nullstellen wandern nach aussen, und Sand darauf wuerde einfach
    // vom Teller geschoben. Sand zeigt, was stehen bleibt.
    //
    // Der Gradient wird abgeleitet und nicht abgetastet. Mit Differenzen
    // waeren es drei Auswertungen je Korn, analytisch ist es eine - und
    // sie ist exakt, statt von der Schrittweite abzuhaengen.
    //
    //   A(r, w) = sin(w * order + phase) * cos(r * RINGS)
    //   dw/dx = -y / r^2      dr/dx = x / r
    //
    // Bewegt wird gegen den Gradienten von |A|, also bergab in Richtung
    // der naechsten Nullstelle.
    const grainMesh = grainsRef.current;
    if (grainMesh) {
      const attr = grainMesh.geometry.attributes
        .position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const phase = t * 0.45;

      for (let i = 0; i < GRAIN_COUNT; i++) {
        let x = arr[i * 3];
        let y = arr[i * 3 + 1];
        let r = Math.sqrt(x * x + y * y);
        // In der Mitte ist der Winkel nicht definiert; ein Korn genau
        // auf der Achse bekaeme eine unendliche Ableitung.
        if (r < 0.08) {
          const a = Math.random() * Math.PI * 2;
          x = Math.cos(a) * 0.08;
          y = Math.sin(a) * 0.08;
          r = 0.08;
        }

        const ang = Math.atan2(y, x);
        const sa = Math.sin(ang * order + phase);
        const ca = Math.cos(ang * order + phase);
        const sr = Math.sin(r * RINGS);
        const cr = Math.cos(r * RINGS);

        const amp = smoothed[Math.min(BINS - 1, ((r / 4.6) * BINS) | 0)];
        const fall = Math.exp(-r * 0.42);
        const A = sa * cr;

        if (!reducedMotion) {
          const invR = 1 / r;
          const invR2 = invR * invR;
          const dAdx = ca * order * -y * invR2 * cr - sa * sr * RINGS * x * invR;
          const dAdy = ca * order * x * invR2 * cr - sa * sr * RINGS * y * invR;
          const sgn = A < 0 ? -1 : 1;
          let gx = sgn * dAdx;
          let gy = sgn * dAdy;
          const gl = Math.sqrt(gx * gx + gy * gy) || 1;
          gx /= gl;
          gy /= gl;

          // Wie stark die Platte hier gerade schuettelt. Auf einer
          // Knotenlinie ist das null, und genau deshalb kommt der Sand
          // dort zur Ruhe, ohne dass man ihn anhalten muesste.
          const drive = Math.abs(A) * amp * fall * (0.4 + level * 1.6);
          const step = drive * 3.2 * delta;
          x -= gx * step;
          y -= gy * step;
          // Ein wenig Zittern, sonst sehen die Linien gezeichnet aus
          // statt geschuettelt.
          x += (Math.random() - 0.5) * drive * 1.6 * delta;
          y += (Math.random() - 0.5) * drive * 1.6 * delta;

          const rr = Math.sqrt(x * x + y * y);
          if (rr > GRAIN_RADIUS) {
            x *= GRAIN_RADIUS / rr;
            y *= GRAIN_RADIUS / rr;
          }
        }

        // Auf der Oberflaeche liegen, nicht daneben: dieselbe Formel wie
        // im Shader, plus ein Korndurchmesser Abstand.
        const travel = Math.sin(r * 3.4 - t * 2.1);
        const h = (travel * amp * 1.7 + A * amp * 0.7 + level * 0.5) * fall;

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
        arr[i * 3 + 2] = h + 0.035;
      }
      attr.needsUpdate = true;
      (grainMesh.material as THREE.PointsMaterial).opacity = eased * 0.9;
    }

    // --- Der Erregerstab -------------------------------------------
    //
    // Er zittert mit dem Pegel, in der Achse der Platte. Sechs Hertz
    // sind schneller als alles andere im Bild und trotzdem nicht so
    // schnell, dass es flimmert - man sieht, dass hier etwas angetrieben
    // wird, ohne dass es unruhig wird.
    if (driverRef.current) {
      const shake = reducedMotion ? 0 : Math.sin(t * 38) * level * 0.03;
      driverRef.current.position.z = shake;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Die Platte liegt flach und dreht sich langsam um ihre eigene
          Achse. Gedreht wird um Z, weil die Ebene erst danach in die
          Waagerechte gekippt wird. */}
      <group ref={tiltRef} rotation={[-Math.PI / 2.35, 0, 0]}>
        {/* Der Erregerstab steht ausserhalb der Drehung: er treibt die
            Platte an, er faehrt nicht mit ihr im Kreis. Gekippt wird er
            allerdings mit, denn er steht senkrecht auf ihr. */}
        <group ref={driverRef}>
          {/* Der Teller, auf dem die Platte aufliegt. */}
          <mesh position={[0, 0, -0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.34, 0.26, 0.2, 28]} />
            <meshStandardMaterial
              color="#98a2b1"
              metalness={0.96}
              roughness={0.2}
              envMapIntensity={1.8}
            />
          </mesh>

          {/* Der Stab. */}
          <mesh position={[0, 0, -1.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.2, 16]} />
            <meshStandardMaterial
              color="#6d7786"
              metalness={0.95}
              roughness={0.3}
              envMapIntensity={1.4}
            />
          </mesh>

          {/* Der Fuss, damit der Stab nicht im Nichts endet. */}
          <mesh position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.72, 0.82, 0.22, 32]} />
            <meshStandardMaterial
              color="#464f5b"
              metalness={0.9}
              roughness={0.45}
              envMapIntensity={1.1}
            />
          </mesh>
        </group>

        <group ref={spinRef}>
          <mesh ref={plateRef} geometry={geometry} frustumCulled={false}>
            <primitive object={material} attach="material" />
          </mesh>

          {/* Der Sand liegt auf der Platte und dreht sich deshalb mit
              ihr. `renderOrder`, damit er nach dem Blech gezeichnet
              wird - beide sind durchsichtig, und ohne die Ansage
              entscheidet der Abstand zur Kamera, was oben liegt. */}
          <points
            ref={grainsRef}
            geometry={grains}
            frustumCulled={false}
            renderOrder={2}
          >
            <pointsMaterial
              map={grainTexture}
              size={0.055}
              color="#e8eef6"
              transparent
              opacity={0}
              sizeAttenuation
              depthWrite={false}
            />
          </points>
        </group>
      </group>
    </group>
  );
}
