"use client";

import { useAudioStore, FADERS } from "@/lib/store/useAudioStore";

type FaderSpec = (typeof FADERS)[number];

/**
 * Ein Kanalzug.
 *
 * Bewusst ein natives <input type="range"> mit vertikalem writing-mode:
 * ein selbstgebauter Slider muesste Tastatursteuerung, ARIA-Werte und
 * Touch-Handling komplett nachbauen - und wuerde es schlechter tun.
 * Das Styling passiert in globals.css ueber .fader-input.
 */
export function Fader({ spec }: { spec: FaderSpec }) {
  const value = useAudioStore((s) => s.params[spec.key]);
  const setParam = useAudioStore((s) => s.setParam);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="meta">{spec.label}</span>

      <div className="relative flex h-28 w-9 items-center justify-center">
        {/* Skalenstriche wie auf einem Mischpultzug */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 flex w-1.5 flex-col justify-between"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="h-px w-full bg-rule" />
          ))}
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          aria-label={`${spec.label} (${spec.unit})`}
          aria-valuetext={`${spec.format(value)} ${spec.unit}`}
          onChange={(e) => setParam(spec.key, Number(e.target.value))}
          className="fader-input"
          style={
            { "--fill": `${value * 100}%` } as React.CSSProperties
          }
        />
      </div>

      <span className="font-mono text-[10px] tabular-nums text-mute">
        {spec.format(value)}
        <span className="ml-0.5 text-faint">{spec.unit}</span>
      </span>
    </div>
  );
}
