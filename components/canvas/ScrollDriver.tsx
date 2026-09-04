"use client";

import { useEffect } from "react";
import { SCENE_KEYS, damp, sceneState, type SceneKey } from "@/lib/scene/state";
import { useViewportMode } from "@/lib/store/useViewportMode";
import type { ViewportMode } from "@/types";

const CHAPTERS: ViewportMode[] = ["structure", "signal", "code"];

/**
 * Uebersetzt Scrollposition und Mauszeiger in Szenengewichte.
 *
 * Ein einziger rAF-Loop, ein einziger passiver Zeiger-Listener.
 *
 * Der Ablauf ist bewusst dreistufig:
 *
 *   1. Rohanspruch messen — wie sehr beansprucht jeder Abschnitt gerade
 *      den Bildschirm.
 *   2. Normieren — die Summe ist immer 1, damit sich Szenen gegenseitig
 *      verdraengen statt sich zu addieren.
 *   3. Daempfen — die Gewichte laufen zeitabhaengig auf ihr Ziel zu.
 *
 * Schritt 3 ist der Grund, warum auch ein Sprung in der Scrollposition
 * (Anker-Link, Pos1-Taste, schnelles Rad) als Bewegung ankommt und nicht
 * als Schnitt. Ohne ihn springt das Bild mit dem Scrollwert mit.
 */
export function ScrollDriver() {
  const setMode = useViewportMode.setState;

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let announced: ViewportMode = "structure";

    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    /** Wie stark ein Abschnitt den Bildschirm beansprucht, 0..1. */
    const claim = (el: HTMLElement, vh: number) => {
      const r = el.getBoundingClientRect();
      const centre = r.top + r.height / 2;
      // Dreiecksfenster um die Bildschirmmitte. Fuer sehr hohe
      // Abschnitte (Tunnel, Kapitel) greift zusaetzlich die
      // Ueberlappungsregel darunter.
      const distance = Math.abs(centre - vh / 2) / (vh * 0.7);
      const window_ = Math.max(0, 1 - distance);

      // Anteil des Bildschirms, den der Abschnitt tatsaechlich bedeckt.
      // Ein 500vh hoher Tunnel hat seine Mitte fast nie in der
      // Bildschirmmitte, fuellt den Blick aber die ganze Zeit.
      const covered =
        Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh;

      return Math.max(window_, covered);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const vh = window.innerHeight;
      const doc = document.documentElement;
      const max = doc.scrollHeight - vh;
      sceneState.progress = max > 0 ? window.scrollY / max : 0;

      const raw: Record<SceneKey, number> = {
        hero: 0,
        structure: 0,
        signal: 0,
        code: 0,
        tunnel: 0,
      };

      // --- Hero (Hero-Sektion und Manifest teilen sich den Graphen) ---
      for (const el of document.querySelectorAll<HTMLElement>("[data-hero]")) {
        raw.hero = Math.max(raw.hero, claim(el, vh));
      }

      // --- Tunnel ------------------------------------------------------
      const tunnelEl = document.querySelector<HTMLElement>("[data-tunnel]");
      if (tunnelEl) {
        const r = tunnelEl.getBoundingClientRect();
        const travel = Math.max(1, r.height - vh);
        sceneState.tunnelProgress = Math.min(1, Math.max(0, -r.top / travel));
        raw.tunnel = claim(tunnelEl, vh);
      }

      // --- Kapitel ------------------------------------------------------
      let best: ViewportMode = announced;
      let bestScore = -Infinity;

      for (const id of CHAPTERS) {
        let value = 0;
        for (const el of document.querySelectorAll<HTMLElement>(
          `[data-chapter="${id}"]`,
        )) {
          value = Math.max(value, claim(el, vh));
        }
        raw[id] = value;
        if (value > bestScore) {
          bestScore = value;
          best = id;
        }
      }

      // --- Normieren ----------------------------------------------------
      // Ohne diesen Schritt koennen sich zwei Ansprueche addieren und beide
      // Szenen stehen gleichzeitig voll da. Mit ihm teilen sie sich den
      // Bildschirm und der Uebergang ist eine Ueberblendung.
      let sum = 0;
      for (const key of SCENE_KEYS) sum += raw[key];

      if (sum > 0.001) {
        for (const key of SCENE_KEYS) {
          sceneState.targets[key] = raw[key] / sum;
        }
      }
      // Bei sum ~ 0 (zwischen zwei Abschnitten) bleiben die letzten Ziele
      // stehen - das haelt die Szene, statt sie kurz leer zu zeigen.

      // --- Daempfen -----------------------------------------------------
      for (const key of SCENE_KEYS) {
        sceneState.weights[key] = damp(
          sceneState.weights[key],
          sceneState.targets[key],
          6,
          dt,
        );
      }

      // Fortschritt im aktiven Kapitel, fuer Feinheiten in den Szenen.
      const matches = document.querySelectorAll<HTMLElement>(
        `[data-chapter="${best}"]`,
      );
      const activeEl = matches[matches.length - 1];
      if (activeEl) {
        const r = activeEl.getBoundingClientRect();
        sceneState.chapterProgress = Math.min(
          1,
          Math.max(0, -r.top / Math.max(1, r.height - vh)),
        );
      }

      if (best !== announced) {
        announced = best;
        setMode({ mode: best });
      }

      // Zeiger traege nachziehen: harte Werte lassen die Kamera zittern.
      sceneState.pointer.x = damp(sceneState.pointer.x, target.x, 4, dt);
      sceneState.pointer.y = damp(sceneState.pointer.y, target.y, 4, dt);

      // Szene gegen Ende zurueckfahren: der Kontaktabschnitt ist der
      // einzige Moment, in dem sie nicht mehr erzaehlt, sondern stoert.
      const fade =
        1 - Math.min(1, Math.max(0, (sceneState.progress - 0.9) / 0.1)) * 0.8;
      doc.style.setProperty("--scene-opacity", (0.78 * fade).toFixed(3));

      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [setMode]);

  return null;
}
