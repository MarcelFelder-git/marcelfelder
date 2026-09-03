"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Rig } from "./Rig";
import { StructureMode } from "./modes/StructureMode";
import { SignalMode } from "./modes/SignalMode";
import { CodeMode } from "./modes/CodeMode";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Blendet einen frisch gemounteten Modus ueber Skalierung ein.
 * Materialien einzeln zu faden waere aufwendiger und bei InstancedMesh
 * mit vertexColors ohnehin unsauber - Skalierung liest sich als "Aufbau".
 */
function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    progress.current = Math.min(1, progress.current + delta * 2.6);
    // easeOutCubic
    const e = 1 - Math.pow(1 - progress.current, 3);
    ref.current.scale.setScalar(0.82 + e * 0.18);
  });

  return <group ref={ref}>{children}</group>;
}

function ActiveMode() {
  const mode = useViewportMode((s) => s.mode);

  return (
    // key erzwingt Remount -> Reveal laeuft bei jedem Moduswechsel neu an.
    <Reveal key={mode}>
      {mode === "structure" && <StructureMode />}
      {mode === "signal" && <SignalMode />}
      {mode === "code" && <CodeMode />}
    </Reveal>
  );
}

export default function SceneCanvas() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Canvas
      // DPR gedeckelt: auf einem 3x-Display waere der Fuellratenbedarf
      // neunmal so hoch, sichtbar besser wird es nicht.
      dpr={[1, 1.8]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: true,
      }}
      camera={{ position: [3.5, 3.0, 3.5], fov: 42, near: 0.1, far: 100 }}
      // Bei reduzierter Bewegung nur auf Anforderung rendern.
      frameloop={reducedMotion ? "demand" : "always"}
    >
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 7, 15]} />

      <Suspense fallback={null}>
        <ActiveMode />
        <Rig />

        {!reducedMotion && (
          <EffectComposer>
            <Bloom
              intensity={0.6}
              luminanceThreshold={0.4}
              luminanceSmoothing={0.6}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
