"use client";

import { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/audio/engine";

/**
 * Kleiner 2D-Analyzer neben den Fadern.
 *
 * Canvas 2D statt DOM-Elementen: 48 Balken als divs zu animieren waere
 * 48 Layout-Invalidierungen pro Frame. Hier ist es ein einziger Draw-Call
 * auf eine Flaeche von 120x40 Pixeln.
 */
export function SpectrumMeter({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const BARS = 40;
    let frame = 0;
    const smooth = new Float32Array(BARS);

    const draw = () => {
      const spectrum = audioEngine.getSpectrum();
      ctx.clearRect(0, 0, w, h);

      const barW = w / BARS;
      for (let i = 0; i < BARS; i++) {
        // Logarithmische Bin-Auswahl, gleiche Logik wie im 3D-Spektrum.
        const bin = Math.min(
          spectrum.length - 1,
          Math.floor(Math.pow(i / BARS, 2.0) * spectrum.length * 0.8) + 1,
        );
        const target = running ? spectrum[bin] / 255 : 0;
        smooth[i] += (target - smooth[i]) * (target > smooth[i] ? 0.5 : 0.12);

        const barH = Math.max(1, smooth[i] * h);
        ctx.fillStyle =
          smooth[i] > 0.62
            ? "#a855f7"
            : smooth[i] > 0.28
              ? "#38bdf8"
              : "#1e3a5f";
        ctx.fillRect(i * barW, h - barH, barW - 1, barH);
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [running]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="h-10 w-[104px] rounded-sm bg-blueprint-void/60"
    />
  );
}
