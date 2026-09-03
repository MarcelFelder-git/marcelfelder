"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Rig } from "./Rig";
import { StructureMode } from "./modes/StructureMode";
import { SignalMode } from "./modes/SignalMode";
import { CodeMode } from "./modes/CodeMode";

/**
 * Die Szene liegt vollflaechig HINTER der Seite, nicht in einer Kachel
 * daneben. Alle drei Modelle sind gleichzeitig montiert und werden ueber
 * ihre Gewichte ein- und ausgeblendet - nur so lassen sich zwei Kapitel
 * ineinander ueberblenden. Was unsichtbar ist, springt in useFrame sofort
 * heraus und kostet nichts.
 *
 * Bewusst OHNE EffectComposer: postprocessing reicht bei einem
 * transparenten Canvas kein Alpha durch - der Bloom-Pass schreibt ein
 * opakes Bild und legt seinen Halo als grauen Schleier ueber die gesamte
 * Flaeche. In einer kleinen Kachel faellt das nicht auf, vollflaechig
 * ruiniert es die Seite. Das Leuchten kommt stattdessen aus den Farben
 * selbst: ungetonte Basismaterialien auf fast schwarzem Grund.
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
        alpha: true,
      }}
      camera={{ position: [5, 4.1, 5], fov: 42, near: 0.1, far: 100 }}
    >
      <fog attach="fog" args={["#05070d", 9, 20]} />

      <Suspense fallback={null}>
        <StructureMode />
        <SignalMode />
        <CodeMode />
        <Rig />
      </Suspense>
    </Canvas>
  );
}
