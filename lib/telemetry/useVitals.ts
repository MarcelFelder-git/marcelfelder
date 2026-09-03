"use client";

import { useEffect, useState } from "react";

/**
 * Handgeschriebene Web-Vitals-Erfassung, kein `web-vitals`-Paket.
 *
 * Vier Werte, alle direkt aus der Performance-API dieses Seitenaufrufs -
 * keine historischen Aggregate, keine erfundenen Zahlen. TTFB und FCP stehen
 * fest, sobald sie eintreten; LCP und CLS sind "bisheriger Wert", weil beide
 * sich per Definition erst beim Verlassen der Seite endgueltig festlegen.
 * Genau das steht auch so im UI, nicht als Kleingedrucktes irgendwo.
 */
export interface Vitals {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
}

export function useVitals(): Vitals {
  const [vitals, setVitals] = useState<Vitals>({
    ttfb: null,
    fcp: null,
    lcp: null,
    cls: null,
  });

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return;

    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      setVitals((v) => ({ ...v, ttfb: nav.responseStart }));
    }

    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          setVitals((v) => ({ ...v, fcp: entry.startTime }));
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) setVitals((v) => ({ ...v, lcp: last.startTime }));
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Layout-Shifts direkt nach einer Nutzereingabe zaehlen laut
        // Spezifikation nicht mit - sonst wuerde jeder Klick, der Inhalt
        // nachlaedt, faelschlich als Instabilitaet gewertet.
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        if (!shift.hadRecentInput) clsValue += shift.value;
      }
      setVitals((v) => ({ ...v, cls: clsValue }));
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });

    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  return vitals;
}
