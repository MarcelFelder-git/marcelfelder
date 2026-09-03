"use client";

import { useEffect, useState } from "react";

/**
 * Statuszeile im Kopf. Client-Komponente aus genau einem Grund: das
 * Tastenkuerzel muss auf macOS anders lauten als auf Windows, und das
 * weiss der Server nicht.
 */
export function TopBar() {
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform ?? "")) setModKey("⌘");
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-blueprint-line/60 py-5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm font-medium tracking-tight text-ink-primary">
          MF
        </span>
        <span className="label-tech hidden sm:inline">
          Structural · Signal · Software
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-2 sm:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-signal-cyan" />
          <span className="label-tech">System Online</span>
        </span>
        <kbd className="rounded border border-blueprint-line px-2 py-1 font-mono text-[10px] text-ink-muted">
          {modKey} K
        </kbd>
      </div>
    </header>
  );
}
