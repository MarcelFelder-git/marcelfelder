"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Rig } from "./Rig";
import { StructureMode } from "./modes/StructureMode";
import { SignalMode } from "./modes/SignalMode";
import { CodeMode } from "./modes/CodeMode";
import { TunnelMode } from "./modes/TunnelMode";
import { HeroMode } from "./modes/HeroMode";

/**
 * Die Szene liegt vollflaechig HINTER der Seite, nicht in einer Kachel
 * daneben. Alle Modelle sind gleichzeitig montiert und werden ueber ihre
 * Gewichte ein- und ausgeblendet - nur so lassen sich zwei Abschnitte
 * ineinander ueberblenden. Was unsichtbar ist, springt in useFrame sofort
 * heraus und kostet nichts.
 *
 * ## Warum der Canvas jetzt undurchsichtig ist
 *
 * Frueher lag hier ein transparenter Canvas ohne Postprocessing, weil der
 * EffectComposer bei transparentem Hintergrund kein Alpha durchreicht und
 * seinen Bloom-Halo als grauen Schleier ueber die ganze Flaeche legt.
 * Ohne Bloom sehen ungetonte Materialien allerdings flach und billig aus -
 * genau das war der Grund, warum die Szene "wie ein Schulprojekt" wirkte.
 *
 * Die Loesung ist nicht, auf Bloom zu verzichten, sondern dem Composer
 * einen undurchsichtigen Grund zu geben. Der Grundton wird deshalb hier
 * im Canvas gesetzt statt per CSS dahinter, und die CSS-Ebenen, die vorher
 * durchschienen (Raster, Audio-Licht), liegen jetzt DARUEBER.
 *
 * ## Warum kein HDR aus dem Netz
 *
 * `<Environment preset="...">` laedt eine HDR-Datei von einer fremden CDN.
 * Fuer eine Seite, die von sich behauptet, alles selbst zu tragen, ist eine
 * Laufzeitabhaengigkeit zu github.io die falsche Wahl - und wenn sie
 * ausfaellt, sind alle Materialien schwarz. Die Umgebung wird deshalb aus
 * ein paar Leuchtflaechen selbst gebaut: drei Lichter, die reflektiert
 * werden koennen, mehr braucht es fuer glaenzende Oberflaechen nicht.
 */
export default function BackgroundScene() {
  return (
    <Canvas
      // DPR gedeckelt: auf einem 3x-Display waere der Fuellratenbedarf
      // neunmal so hoch, sichtbar besser wird es nicht.
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [0, 0.25, 7.6], fov: 42, near: 0.1, far: 140 }}
    >
      <color attach="background" args={["#08090e"]} />
      {/* Weiter gefasst als fuer die Kapitelmodelle noetig: der Tunnel ist
          rund 100 Einheiten lang und lebt davon, dass sich sein Ende im
          Grund verliert statt hart abzuschneiden. */}
      <fog attach="fog" args={["#08090e", 12, 62]} />

      <Suspense fallback={null}>
        {/* Grundhelligkeit, damit unbeleuchtete Seiten nicht absaufen */}
        <ambientLight intensity={0.35} />
        {/* Fuehrungslicht von schraeg oben, Gegenlicht in der Akzentfarbe */}
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <directionalLight position={[-5, -2, -4]} intensity={0.6} color="#38bdf8" />

        <Environment resolution={256}>
          {/* Ein Studio aus drei Leuchtflaechen: gross und weich von oben,
              zwei schmale Streifen als Kanten-Reflexe links und rechts.
              Das ist es, was glaenzende Oberflaechen ueberhaupt erst
              sichtbar macht - ohne Reflexionsziel sieht Metall aus wie
              matter Kunststoff. */}
          <Lightformer
            intensity={2.2}
            position={[0, 5, -2]}
            scale={[12, 6, 1]}
            color="#dbeafe"
          />
          <Lightformer
            intensity={3.4}
            position={[-6, 1, 2]}
            scale={[1, 8, 1]}
            color="#38bdf8"
          />
          <Lightformer
            intensity={2.6}
            position={[6, 0, 1]}
            scale={[1, 8, 1]}
            color="#a855f7"
          />
        </Environment>

        <HeroMode />
        <StructureMode />
        <SignalMode />
        <CodeMode />
        <TunnelMode />
        <Rig />

        {/* Nur die hellsten Stellen glimmen: die Schwelle liegt bewusst
            hoch, damit Bloom die Kanten adelt statt alles zu vernebeln. */}
        <EffectComposer>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
