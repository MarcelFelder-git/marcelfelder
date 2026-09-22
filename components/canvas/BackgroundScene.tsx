"use client";

import { Children, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  PerformanceMonitor,
  useProgress,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { Rig } from "./Rig";
import { StructureMode } from "./modes/StructureMode";
import { SignalMode } from "./modes/SignalMode";
import { CodeMode } from "./modes/CodeMode";
import { TunnelMode } from "./modes/TunnelMode";
import { HeroMode } from "./modes/HeroMode";
import { sceneState } from "@/lib/scene/state";
import { GROUND, RIM, blend } from "@/lib/scene/palette";
import { tunnelExit } from "@/lib/scene/tunnel";
import { useSceneLoad } from "@/lib/store/useSceneLoad";
import { guessTier, useQuality } from "@/lib/store/useQuality";

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
/**
 * Farbversatz in Bildschirmanteilen. Zwei Zehntausendstel klingen nach
 * nichts und sind genau richtig: darueber wird aus dem Linsenfehler ein
 * Effekt, und der Text im Vordergrund faengt an zu flimmern.
 */
const CHROMATIC_OFFSET = new THREE.Vector2(0.0006, 0.0004);

/**
 * Farbklima der Szene, gemischt aus denselben Gewichten wie Kamera und
 * Modelle.
 *
 * Grundton und Nebel bekommen denselben Wert - waeren sie verschieden,
 * loeste sich die Geometrie in der Ferne in eine andere Farbe auf als der
 * Grund dahinter, und man saehe einen Horizont, wo keiner ist.
 *
 * Das Fuehrungslicht bleibt weiss. Nur das Gegenlicht faerbt sich: es ist
 * das, was den Koerpern ihre Kante gibt, und genau dort faellt ein
 * Farbwechsel auf, ohne die Materialien umzufaerben.
 */
/**
 * Bildwinkel an das Format anpassen.
 *
 * Der Bildwinkel einer Perspektivkamera ist SENKRECHT definiert; wie
 * viel man in der Breite sieht, faellt aus dem Seitenverhaeltnis. Auf
 * einem Telefon ist das rund 0.43 statt 1.78 — die Szene wird also
 * seitlich beschnitten, und genau das, was links und rechts steht (die
 * Geraete im Tunnel, die Aussenknoten des Graphen), faellt heraus.
 *
 * Die Breite vollstaendig auszugleichen waere falsch: dafuer braeuchte
 * es rund 116 Grad senkrecht, und bei so einem Winkel kippen die
 * Fluchten so stark, dass alles wie durch ein Fischauge aussieht. Der
 * Exponent 0.55 gleicht deshalb nur gut die Haelfte aus, gedeckelt bei
 * 70 Grad — genug, damit nichts Wichtiges abgeschnitten wird, wenig
 * genug, dass die Perspektive glaubwuerdig bleibt.
 */
function Framing() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const fov =
      aspect >= 1.2
        ? 42
        : Math.min(70, 42 * Math.pow(1.2 / Math.max(0.2, aspect), 0.55));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);

  return null;
}

function SceneGrade() {
  const scene = useThree((s) => s.scene);
  const rimRef = useRef<THREE.DirectionalLight>(null);

  const v = useMemo(
    () => ({
      ground: [8, 9, 14] as [number, number, number],
      rim: [56, 189, 248] as [number, number, number],
    }),
    [],
  );

  useFrame(() => {
    const { weights } = sceneState;

    blend(GROUND, weights, v.ground);
    const background = scene.background as THREE.Color | null;
    if (background) {
      // setRGB rechnet aus dem angegebenen Raum in den Arbeitsraum um;
      // die Tabelle steht in sRGB, also muss das hier auch dranstehen.
      background.setRGB(
        v.ground[0] / 255,
        v.ground[1] / 255,
        v.ground[2] / 255,
        THREE.SRGBColorSpace,
      );
      if (scene.fog) {
        scene.fog.color.copy(background);
        // Auf der Ausfahrt aus dem Tunnel weicht der Nebel zurueck.
        // Sichtweite ist das einzige Mittel, mit dem sich ein Raum
        // oeffnen laesst, ohne etwas hinzuzufuegen: die Sterne stehen
        // die ganze Zeit da, sie waren nur verdeckt.
        const open = tunnelExit(sceneState.tunnelProgress) * weights.tunnel;
        (scene.fog as THREE.Fog).far = 62 + open * 110;
      }
    }

    blend(RIM, weights, v.rim);
    if (rimRef.current) {
      rimRef.current.color.setRGB(
        v.rim[0] / 255,
        v.rim[1] / 255,
        v.rim[2] / 255,
        THREE.SRGBColorSpace,
      );
    }
  });

  return (
    <directionalLight
      ref={rimRef}
      position={[-5, -2, -4]}
      intensity={0.6}
      color="#38bdf8"
    />
  );
}

/**
 * Meldet den Ladefortschritt an die Oberflaeche.
 *
 * Steht als eigene Komponente NEBEN dem Canvas, nicht darin: `useProgress`
 * loest bei jedem Fortschrittsschritt ein Rerender aus, und das soll die
 * Szene nicht treffen. Hier rendert nur diese eine Zeile neu.
 *
 * `total === 0` heisst "es hat noch nichts angefangen zu laden" - dann
 * meldet drei bereits 100 %, was ohne diese Unterscheidung zu einem
 * Ladebalken fuehrt, der voll startet.
 */
function LoadReporter() {
  const { progress, total, loaded } = useProgress();
  const report = useSceneLoad((s) => s.report);

  useEffect(() => {
    const started = total > 0;
    report(started ? progress / 100 : 0, started && loaded >= total);
  }, [progress, total, loaded, report]);

  return null;
}

/**
 * Waechter fuer die Bildrate. Muss innerhalb des Canvas stehen, weil
 * PerformanceMonitor ueber useFrame misst.
 *
 * Nur nach unten, nie zurueck: ein Rechner, der einmal eingebrochen
 * ist, bricht wieder ein, und ein Hin und Her zwischen den Stufen sieht
 * schlimmer aus als eine niedrige.
 */
function QualityGuard() {
  const tier = useQuality((s) => s.tier);
  const setTier = useQuality((s) => s.setTier);
  const done = useSceneLoad((s) => s.done);
  // Erst messen, wenn alles geladen ist und die Shader kompiliert sind:
  // die ersten Sekunden ruckeln auf jedem Rechner, und das ist kein
  // Urteil ueber die Grafikkarte.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setArmed(true), 2500);
    return () => window.clearTimeout(id);
  }, [done]);
  if (tier === "low" || !armed) return null;
  return (
    <PerformanceMonitor
      // Nach zwei Messfenstern von je 250 ms unter 45 fps geht es runter.
      // Kuerzer, und ein einzelner Ruckler beim Laden wuerde reichen.
      ms={250}
      iterations={4}
      bounds={() => [45, 200]}
      onDecline={({ fps }) => setTier("low", `${Math.round(fps)} fps`)}
      onFallback={({ fps }) => setTier("low", `Fallback, ${Math.round(fps)} fps`)}
    />
  );
}

/**
 * Haengt seine Kinder an den naechsten freien Moment.
 *
 * `requestIdleCallback` mit Frist: kommt der Browser nicht zur Ruhe -
 * auf einem langsamen Rechner durchaus moeglich -, wird nach 1,2
 * Sekunden trotzdem montiert. Safari kennt die Funktion nicht, dort
 * uebernimmt ein setTimeout.
 */
function Deferred({ children }: { children: React.ReactNode }) {
  const all = Children.toArray(children);
  const [mounted, setMounted] = useState(0);

  useEffect(() => {
    if (mounted >= all.length) return;
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    // Ein Modell je freiem Moment. Alle vier in einem Rutsch waren ein
    // Task von 900 Millisekunden; einzeln sind es vier kurze, zwischen
    // denen der Browser auf Eingaben reagieren kann.
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMounted((n) => n + 1), {
        timeout: 900,
      });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setMounted((n) => n + 1), 260);
    return () => window.clearTimeout(id);
  }, [mounted, all.length]);

  return <>{all.slice(0, mounted)}</>;
}

export default function BackgroundScene() {
  const tier = useQuality((s) => s.tier);
  const setTier = useQuality((s) => s.setTier);

  // Erste Einschaetzung vor dem ersten Frame, damit ein bekannt
  // schwacher Rechner gar nicht erst in voller Aufloesung anfaengt.
  useEffect(() => {
    const g = guessTier();
    if (g.tier === "low") setTier("low", g.reason);
  }, [setTier]);

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  // DPR gedeckelt: auf einem 3x-Display waere der Fuellratenbedarf
  // neunmal so hoch, sichtbar besser wird es nicht. Auf dem Telefon
  // enger, weil dort Bloom und Chromatic Aberration ueber das ganze
  // Bild laufen und die GPU passiv gekuehlt ist. In der niedrigen Stufe
  // genau 1: auf einem Retina-Display halbiert das die Pixel dreimal.
  const dpr: [number, number] = tier === "low" ? [1, 1] : [1, mobile ? 1.5 : 1.75];

  return (
    <>
    <LoadReporter />
    <Canvas
      dpr={dpr}
      gl={{
        // Kein Antialias auf dem Canvas: die Szene laeuft durch den
        // EffectComposer, und dessen Ziel hat eigenes Multisampling.
        // Das hier waere ein zweiter Multisample-Puffer, den nie jemand
        // sieht - auf einem Retina-Display ein paar Dutzend Megabyte.
        antialias: false,
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
        {/* Fuehrungslicht von schraeg oben; das Gegenlicht steckt in
            SceneGrade, weil es mit dem Abschnitt die Farbe wechselt. */}
        <directionalLight position={[4, 6, 3]} intensity={1.1} />
        <SceneGrade />

        {/* 128 statt 256.
            Die Karte wird beim Start sechsmal gerendert und danach
            gefiltert, und das ist eine der Rechnungen, die den langen
            Task beim Aufbau ausmachen. Sichtbar ist sie nur als weiches
            Spiegelbild auf Metall; die halbe Kantenlaenge kostet ein
            Viertel der Pixel und faellt im Glanzlicht nicht auf. */}
        <Environment resolution={128}>
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

        <Framing />
        <HeroMode />
        {/* Alles ausser dem Hero kommt erst, wenn der Hauptthread frei
            ist.

            Vorher wurden fuenf Modelle im selben Frame aufgebaut:
            Geometrien, Materialien und die erste Shader-Uebersetzung.
            Gemessen waren das zwei Tasks von 895 und 1253 Millisekunden
            am Stueck, und waehrend die laufen, reagiert die Seite auf
            keinen Klick. Genau das misst INP.

            Gesehen wird in dieser Zeit ohnehin nur der Hero; die
            anderen vier stehen erst nach dem ersten Scrollen im Bild.
            Nacheinander montiert werden aus zwei langen Tasks mehrere
            kurze, und keiner davon liegt im Weg. */}
        <Deferred>
          <StructureMode />
          <SignalMode />
          <CodeMode />
          <TunnelMode />
        </Deferred>
        <Rig />

        {/* Nur die hellsten Stellen glimmen: die Schwelle liegt bewusst
            hoch, damit Bloom die Kanten adelt statt alles zu vernebeln.
            Dazu zwei Linsenfehler, die es in jeder echten Optik gibt und
            deren Fehlen ein Bild "gerechnet" aussehen laesst: ein
            minimaler Farbversatz zu den Raendern hin und eine Vignette.
            Beide sind bewusst am unteren Rand der Wahrnehmbarkeit - man
            soll sie nicht sehen, sondern ihr Fehlen vermissen. */}
        {/* multisampling: der Standard des Composers ist 8. Bei DPR 1.75
            auf einem Retina-Display ist das ein Ziel mit 2520 x 1575
            Pixeln mal acht Samples - auf einer integrierten GPU allein
            eine Diashow, und der Bloom glaettet die Kanten ohnehin. Zwei
            Samples oben, keins unten. */}
        <EffectComposer multisampling={tier === "low" ? 0 : 2}>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
          {/* Der Farbversatz ist ein eigener Vollbild-Pass und liegt am
              unteren Rand der Wahrnehmbarkeit. In der niedrigen Stufe
              ist er das Erste, das gehen darf. */}
          {tier === "low" ? null : (
            <ChromaticAberration
              offset={CHROMATIC_OFFSET}
              radialModulation
              modulationOffset={0.4}
            />
          )}
          <Vignette eskil={false} offset={0.28} darkness={0.72} />
        </EffectComposer>
        <QualityGuard />
      </Suspense>
    </Canvas>
    </>
  );
}
