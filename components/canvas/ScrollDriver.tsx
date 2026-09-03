"use client";

import { useEffect } from "react";
import { sceneState } from "@/lib/scene/state";
import { useViewportMode } from "@/lib/store/useViewportMode";
import type { ViewportMode } from "@/types";

const CHAPTERS: ViewportMode[] = ["structure", "signal", "code"];

/**
 * Uebersetzt Scrollposition und Mauszeiger in Szenengewichte.
 *
 * Ein einziger rAF-Loop, ein einziger passiver Scroll-Listener. Die Gewichte
 * ergeben sich daraus, wie nah die Mitte eines Kapitels an der Bildschirmmitte
 * liegt - dadurch sind waehrend eines Uebergangs zwei Modelle gleichzeitig
 * teilweise sichtbar, und der Wechsel liest sich als Umbau statt als Schnitt.
 */
export function ScrollDriver() {
  const setMode = useViewportMode.setState;

  useEffect(() => {
    let frame = 0;
    let announced: ViewportMode = "structure";

    // Zielwerte, auf die der rAF-Loop zufaehrt.
    const target = { x: 0, y: 0 };

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const tick = () => {
      const vh = window.innerHeight;
      const doc = document.documentElement;

      const max = doc.scrollHeight - vh;
      sceneState.progress = max > 0 ? window.scrollY / max : 0;

      // --- Kapitelgewichte ------------------------------------------
      let best: ViewportMode = announced;
      let bestScore = -1;
      let sum = 0;

      for (const id of CHAPTERS) {
        // Mehrere Abschnitte koennen dasselbe Modell beanspruchen - der
        // Hero zeigt bereits das Tragwerk, bevor Kapitel 01 beginnt. Es
        // zaehlt der naechstgelegene, nicht die Summe.
        const els = document.querySelectorAll<HTMLElement>(
          `[data-chapter="${id}"]`,
        );
        // Ungeklemmt mitgefuehrt: oberhalb und unterhalb aller Kapitel sind
        // alle Gewichte 0, und nur der rohe Wert verraet noch, welches
        // Kapitel am naechsten liegt.
        let raw = -Infinity;
        for (const el of els) {
          const r = el.getBoundingClientRect();
          const centre = r.top + r.height / 2;
          // Dreiecksfenster um die Bildschirmmitte, Breite ~1.4 Viewporthoehen.
          const distance = Math.abs(centre - vh / 2) / (vh * 0.7);
          raw = Math.max(raw, 1 - distance);
        }
        const w = Math.max(0, raw);
        sceneState.weights[id] = w;
        sum += w;

        if (raw > bestScore) {
          bestScore = raw;
          best = id;
        }
      }

      // Ausserhalb aller Kapitel (Intro, Outro) haelt das naechstgelegene
      // Modell die Szene - ein leerer Hintergrund waere ein Loch.
      if (sum < 0.05) sceneState.weights[best] = 1;

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

      // Gegen Ende zurueckfahren: der Kontaktabschnitt ist der einzige
      // Moment, in dem die Szene nicht mehr erzaehlt, sondern nur noch
      // stoert. Als CSS-Variable geschrieben, damit kein Re-Render anfaellt.
      const fade = 1 - Math.min(1, Math.max(0, (sceneState.progress - 0.9) / 0.1)) * 0.8;
      doc.style.setProperty("--scene-opacity", (0.78 * fade).toFixed(3));

      // Zeiger traege nachziehen: harte Werte lassen die Kamera zittern.
      sceneState.pointer.x += (target.x - sceneState.pointer.x) * 0.06;
      sceneState.pointer.y += (target.y - sceneState.pointer.y) * 0.06;

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
