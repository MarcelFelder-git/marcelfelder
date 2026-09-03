"use client";

import { useEffect, useState } from "react";

/**
 * Ein 3D-Viewport mit Dauerbewegung ist fuer bewegungsempfindliche Nutzer
 * ein Ausschlusskriterium. Wir respektieren die OS-Einstellung und frieren
 * die Szene dann auf einen statischen Frame ein.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
