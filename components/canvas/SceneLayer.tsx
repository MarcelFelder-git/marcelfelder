"use client";

import dynamic from "next/dynamic";
import { ScrollDriver } from "./ScrollDriver";

/**
 * Three.js kennt kein Server-Rendering, und das WebGL-Bundle darf den First
 * Paint nicht blockieren - deshalb ssr:false.
 *
 * `pointer-events-none` ist hier keine Nebensache: die Szene liegt hinter
 * dem gesamten Inhalt, und der muss klickbar bleiben. Die Interaktion mit
 * dem Fachwerk laeuft deshalb ueber die globale Zeigerposition statt ueber
 * Raycasting auf dem Canvas.
 */
const BackgroundScene = dynamic(() => import("./BackgroundScene"), {
  ssr: false,
});

export function SceneLayer() {
  return (
    <>
      <ScrollDriver />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        // Deckkraft kommt aus dem ScrollDriver: die Szene faehrt zum
        // Kontaktabschnitt hin zurueck.
        style={{ opacity: "var(--scene-opacity, 0.78)" }}
      >
        <BackgroundScene />
      </div>

      {/* Vignette ueber der Szene, unter dem Inhalt: haelt den Blick in der
          Mitte und nimmt den Raendern genug Helligkeit, damit Text darauf
          lesbar bleibt. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(78%_78%_at_50%_48%,transparent_30%,rgba(var(--ground-rgb),0.8)_100%)]"
      />
    </>
  );
}
