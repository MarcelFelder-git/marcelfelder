"use client";

import { motion } from "framer-motion";
import { AudioWaveform, Boxes, Braces } from "lucide-react";
import { DISCIPLINES } from "@/content/resume";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { cn } from "@/lib/utils";
import type { ViewportMode } from "@/types";

const ICONS: Record<ViewportMode, typeof Boxes> = {
  structure: Boxes,
  signal: AudioWaveform,
  code: Braces,
};

/**
 * Die drei Karten sind keine Deko: ein Klick schaltet den Viewport oben
 * um. Text und 3D-Szene erzaehlen damit dieselbe Geschichte, statt
 * nebeneinander her zu laufen.
 */
export function Disciplines() {
  const mode = useViewportMode((s) => s.mode);
  const setMode = useViewportMode((s) => s.setMode);

  return (
    <section
      id="disciplines"
      className="mt-28 border-t border-blueprint-line/60 pt-16"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Drei Disziplinen, ein Prinzip
        </h2>
        <span className="label-tech hidden sm:inline">
          Karte wählen → Viewport folgt
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {DISCIPLINES.map((d, i) => {
          const Icon = ICONS[d.id];
          const active = mode === d.id;

          return (
            <motion.button
              key={d.id}
              type="button"
              onClick={() => {
                setMode(d.id);
                document
                  .getElementById("viewport-anchor")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              aria-pressed={active}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={cn(
                "glass-panel group relative overflow-hidden rounded-panel p-7 text-left transition-colors",
                active
                  ? "border-signal-cyan/40"
                  : "hover:border-signal-cyan/25",
              )}
            >
              {active && (
                <motion.span
                  layoutId="discipline-marker"
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal-cyan to-transparent"
                />
              )}

              <div className="flex items-start justify-between">
                <Icon
                  className={cn(
                    "size-5 transition-colors",
                    active ? "text-signal-cyan" : "text-ink-muted",
                  )}
                  strokeWidth={1.5}
                />
                <span className="label-tech">0{i + 1}</span>
              </div>

              <h3 className="mt-5 text-xl font-medium">{d.label}</h3>
              <p className="mt-1 label-tech">{d.caption}</p>

              <p className="mt-5 text-[15px] font-medium leading-snug text-ink-primary">
                {d.headline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {d.body}
              </p>

              <dl className="mt-6 space-y-1.5 border-t border-blueprint-line/60 pt-4">
                {d.metrics.map((m) => (
                  <div key={m.label} className="flex justify-between gap-3">
                    <dt className="label-tech">{m.label}</dt>
                    <dd className="font-mono text-[11px] text-ink-muted">
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
