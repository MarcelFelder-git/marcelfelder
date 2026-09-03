"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  solveBeam,
  type BeamInput,
  type LineLoad,
  type PointLoad,
} from "@/lib/beam/solve";
import { cn } from "@/lib/utils";

/**
 * Interaktive Trägerstatik.
 *
 * Auflager und Einzellasten lassen sich direkt im Diagramm ziehen; Querkraft,
 * Moment und Biegelinie werden bei jedem Frame neu gerechnet. Der Solver ist
 * bewusst rein und synchron — bei 400 Stützstellen liegt ein Durchlauf im
 * Bereich weniger Zehntel-Millisekunden, ein Worker wäre reine Zeremonie.
 */

const VW = 1000; // Breite des SVG-Koordinatensystems
const BAND = 150; // Höhe eines Diagrammbands

type DragTarget =
  | { kind: "support"; index: 0 | 1 }
  | { kind: "point"; id: string };

const INITIAL: BeamInput = {
  length: 8,
  supports: [0, 8],
  points: [{ id: "p1", x: 3, p: 25 }],
  lines: [{ id: "l1", x1: 0, x2: 8, w: 6 }],
};

export function BeamWorkbench() {
  const [beam, setBeam] = useState<BeamInput>(INITIAL);
  const [drag, setDrag] = useState<DragTarget | null>(null);
  const systemRef = useRef<SVGSVGElement>(null);

  const result = useMemo(() => solveBeam(beam), [beam]);

  const toBeamX = useCallback(
    (clientX: number) => {
      const svg = systemRef.current;
      if (!svg) return 0;
      const rect = svg.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(beam.length, Math.max(0, ratio * beam.length));
    },
    [beam.length],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    // Auf zwei Nachkommastellen gerastert: sonst tanzen die Zahlen in der
    // Tabelle bei jeder Mausbewegung um Tausendstel.
    const x = Math.round(toBeamX(e.clientX) * 100) / 100;

    setBeam((prev) => {
      if (drag.kind === "support") {
        const supports: [number, number] = [...prev.supports];
        supports[drag.index] = x;
        return { ...prev, supports };
      }
      return {
        ...prev,
        points: prev.points.map((p) => (p.id === drag.id ? { ...p, x } : p)),
      };
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag(null);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const startDrag = (e: React.PointerEvent, target: DragTarget) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDrag(target);
  };

  const px = (x: number) => (x / beam.length) * VW;

  return (
    <div className="grid gap-px bg-rule lg:grid-cols-[1fr_20rem]">
      {/* ================= Diagramme ================= */}
      <div className="bg-paper">
        <Band
          label="System"
          note={`L = ${beam.length.toFixed(2)} m · ziehen zum Verschieben`}
        >
          <svg
            ref={systemRef}
            viewBox={`0 0 ${VW} ${BAND}`}
            className="w-full touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            {/* Streckenlasten als Pfeilfeld */}
            {beam.lines.map((l) => {
              const a = px(Math.min(l.x1, l.x2));
              const b = px(Math.max(l.x1, l.x2));
              const count = Math.max(2, Math.round((b - a) / 34));
              return (
                <g key={l.id}>
                  <line
                    x1={a}
                    y1={26}
                    x2={b}
                    y2={26}
                    stroke="var(--color-accent)"
                    strokeWidth={1}
                  />
                  {Array.from({ length: count + 1 }).map((_, i) => {
                    const cx = a + ((b - a) / count) * i;
                    return (
                      <line
                        key={i}
                        x1={cx}
                        y1={26}
                        x2={cx}
                        y2={72}
                        stroke="var(--color-accent)"
                        strokeWidth={1}
                        opacity={0.45}
                      />
                    );
                  })}
                  <text
                    x={(a + b) / 2}
                    y={18}
                    textAnchor="middle"
                    className="fill-[var(--color-accent)] font-mono text-[11px]"
                  >
                    {l.w} kN/m
                  </text>
                </g>
              );
            })}

            {/* Träger */}
            <line
              x1={0}
              y1={82}
              x2={VW}
              y2={82}
              stroke="var(--color-ink)"
              strokeWidth={3}
            />

            {/* Einzellasten */}
            {beam.points.map((p) => (
              <g
                key={p.id}
                transform={`translate(${px(p.x)} 0)`}
                className="cursor-ew-resize"
                onPointerDown={(e) => startDrag(e, { kind: "point", id: p.id })}
              >
                <rect x={-16} y={16} width={32} height={70} fill="transparent" />
                <line
                  x1={0}
                  y1={24}
                  x2={0}
                  y2={74}
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                />
                <path d="M -6 66 L 0 80 L 6 66 Z" fill="var(--color-ink)" />
                <text
                  x={0}
                  y={16}
                  textAnchor="middle"
                  className="fill-[var(--color-ink)] font-mono text-[11px]"
                >
                  {p.p} kN
                </text>
              </g>
            ))}

            {/* Auflager */}
            {result.supports.map((s, i) => (
              <g
                key={i}
                transform={`translate(${px(s)} 0)`}
                className="cursor-ew-resize"
                onPointerDown={(e) =>
                  startDrag(e, { kind: "support", index: i as 0 | 1 })
                }
              >
                <rect x={-18} y={80} width={36} height={48} fill="transparent" />
                <path
                  d="M 0 82 L -12 106 L 12 106 Z"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
                <line
                  x1={-16}
                  y1={110}
                  x2={16}
                  y2={110}
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                />
                <text
                  x={0}
                  y={128}
                  textAnchor="middle"
                  className="fill-[var(--color-mute)] font-mono text-[10px]"
                >
                  {(i === 0 ? result.reactions.a : result.reactions.b).toFixed(1)} kN
                </text>
              </g>
            ))}
          </svg>
        </Band>

        <Diagram
          label="Querkraft V"
          unit="kN"
          xs={result.x}
          ys={result.shear}
          length={beam.length}
          color="var(--color-accent)"
          extremum={result.maxShear}
        />
        <Diagram
          label="Biegemoment M"
          unit="kNm"
          xs={result.x}
          ys={result.moment}
          length={beam.length}
          color="var(--color-data-tension)"
          extremum={result.maxMoment}
          /* Momentenlinie nach unten positiv — die Zeichenkonvention im
             Stahlbetonbau: die Linie steht auf der Zugseite. */
          flip
        />
        <Diagram
          label="Biegelinie"
          unit="EI = 1"
          xs={result.x}
          ys={result.deflection}
          length={beam.length}
          color="var(--color-ink)"
          extremum={result.maxDeflection}
        />
      </div>

      {/* ================= Bedienung ================= */}
      <aside className="bg-paper">
        <Section title="Kennwerte">
          <Row label="Auflagerkraft A" value={`${result.reactions.a.toFixed(2)} kN`} />
          <Row label="Auflagerkraft B" value={`${result.reactions.b.toFixed(2)} kN`} />
          <Row label="Summe Lasten" value={`${result.totalLoad.toFixed(2)} kN`} />
          <Row
            label="M max"
            value={`${result.maxMoment.value.toFixed(2)} kNm`}
            note={`bei x = ${result.maxMoment.x.toFixed(2)} m`}
            accent
          />
          <Row
            label="V max"
            value={`${result.maxShear.value.toFixed(2)} kN`}
            note={`bei x = ${result.maxShear.x.toFixed(2)} m`}
          />
        </Section>

        <Section title="Träger">
          <label className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="meta">Länge</span>
            <input
              type="number"
              min={1}
              max={30}
              step={0.5}
              value={beam.length}
              onChange={(e) => {
                const length = Math.min(30, Math.max(1, Number(e.target.value)));
                setBeam((prev) => ({
                  ...prev,
                  length,
                  supports: [
                    Math.min(prev.supports[0], length),
                    Math.min(prev.supports[1], length),
                  ],
                }));
              }}
              className="w-24 border border-rule bg-surface px-2 py-1 text-right font-mono text-sm outline-none focus:border-accent"
            />
          </label>
        </Section>

        <Section
          title="Einzellasten"
          action={
            <button
              onClick={() =>
                setBeam((prev) => ({
                  ...prev,
                  points: [
                    ...prev.points,
                    {
                      id: `p${Date.now()}`,
                      x: Math.round((prev.length / 2) * 10) / 10,
                      p: 20,
                    },
                  ],
                }))
              }
              className="meta invert-hover border border-rule px-2 py-1"
            >
              <Plus className="size-3" />
            </button>
          }
        >
          {beam.points.map((p) => (
            <LoadRow
              key={p.id}
              fields={[
                {
                  label: "x",
                  value: p.x,
                  step: 0.1,
                  onChange: (v) =>
                    updatePoint(setBeam, p.id, { x: clamp(v, 0, beam.length) }),
                },
                {
                  label: "P",
                  value: p.p,
                  step: 1,
                  onChange: (v) => updatePoint(setBeam, p.id, { p: v }),
                },
              ]}
              onRemove={() =>
                setBeam((prev) => ({
                  ...prev,
                  points: prev.points.filter((q) => q.id !== p.id),
                }))
              }
            />
          ))}
          {beam.points.length === 0 && <Empty>keine Einzellast</Empty>}
        </Section>

        <Section
          title="Streckenlasten"
          action={
            <button
              onClick={() =>
                setBeam((prev) => ({
                  ...prev,
                  lines: [
                    ...prev.lines,
                    { id: `l${Date.now()}`, x1: 0, x2: prev.length, w: 5 },
                  ],
                }))
              }
              className="meta invert-hover border border-rule px-2 py-1"
            >
              <Plus className="size-3" />
            </button>
          }
        >
          {beam.lines.map((l) => (
            <LoadRow
              key={l.id}
              fields={[
                {
                  label: "von",
                  value: l.x1,
                  step: 0.1,
                  onChange: (v) =>
                    updateLine(setBeam, l.id, { x1: clamp(v, 0, beam.length) }),
                },
                {
                  label: "bis",
                  value: l.x2,
                  step: 0.1,
                  onChange: (v) =>
                    updateLine(setBeam, l.id, { x2: clamp(v, 0, beam.length) }),
                },
                {
                  label: "w",
                  value: l.w,
                  step: 0.5,
                  onChange: (v) => updateLine(setBeam, l.id, { w: v }),
                },
              ]}
              onRemove={() =>
                setBeam((prev) => ({
                  ...prev,
                  lines: prev.lines.filter((q) => q.id !== l.id),
                }))
              }
            />
          ))}
          {beam.lines.length === 0 && <Empty>keine Streckenlast</Empty>}
        </Section>

        {result.warnings.length > 0 && (
          <div className="border-t border-rule bg-surface px-4 py-3">
            {result.warnings.map((w) => (
              <p key={w} className="font-mono text-[11px] text-[#f0a] ">
                {w}
              </p>
            ))}
          </div>
        )}

        <div className="border-t border-rule p-4">
          <button
            onClick={() => setBeam(INITIAL)}
            className="meta invert-hover flex w-full items-center justify-center gap-2 border border-rule px-3 py-2.5"
          >
            <RotateCcw className="size-3" />
            Zurücksetzen
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

function Band({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule">
      <header className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <h3 className="meta text-ink">{label}</h3>
        {note && <span className="meta">{note}</span>}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function Diagram({
  label,
  unit,
  xs,
  ys,
  length,
  color,
  extremum,
  flip = false,
}: {
  label: string;
  unit: string;
  xs: number[];
  ys: number[];
  length: number;
  color: string;
  extremum: { value: number; x: number };
  flip?: boolean;
}) {
  const peak = Math.max(1e-6, ...ys.map(Math.abs));
  const mid = BAND / 2;
  const sx = (x: number) => (x / length) * VW;
  const sy = (y: number) => mid - ((flip ? -y : y) / peak) * (mid - 18);

  // Geschlossene Fläche statt nackter Linie: Schnittgrößenbilder werden
  // schraffiert oder gefüllt gezeichnet, nicht als Funktionsgraph.
  const area =
    `M ${sx(xs[0])} ${mid} ` +
    xs.map((x, i) => `L ${sx(x)} ${sy(ys[i])}`).join(" ") +
    ` L ${sx(xs[xs.length - 1])} ${mid} Z`;

  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${sx(x)} ${sy(ys[i])}`).join(" ");

  return (
    <Band label={label} note={`max ${extremum.value.toFixed(2)} ${unit}`}>
      <svg viewBox={`0 0 ${VW} ${BAND}`} className="w-full">
        <line x1={0} y1={mid} x2={VW} y2={mid} stroke="var(--color-rule)" strokeWidth={1} />
        <path d={area} fill={color} opacity={0.14} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} />
        <g transform={`translate(${sx(extremum.x)} ${sy(extremum.value)})`}>
          <circle r={3.5} fill={color} />
          <line x1={0} y1={0} x2={0} y2={mid - sy(extremum.value)} stroke={color} strokeWidth={1} opacity={0.4} />
        </g>
      </svg>
    </Band>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule">
      <header className="flex items-center justify-between border-b border-rule-soft px-4 py-2.5">
        <h3 className="meta text-ink">{title}</h3>
        {action}
      </header>
      <div className="divide-y divide-[var(--color-rule-soft)]">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span className="meta">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            accent ? "text-accent" : "text-ink",
          )}
        >
          {value}
        </span>
        {note && <span className="meta block">{note}</span>}
      </span>
    </div>
  );
}

function LoadRow({
  fields,
  onRemove,
}: {
  fields: {
    label: string;
    value: number;
    step: number;
    onChange: (v: number) => void;
  }[];
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {fields.map((f) => (
        <label key={f.label} className="flex flex-1 items-center gap-1.5">
          <span className="meta">{f.label}</span>
          <input
            type="number"
            step={f.step}
            value={f.value}
            onChange={(e) => f.onChange(Number(e.target.value))}
            className="w-full min-w-0 border border-rule bg-surface px-1.5 py-1 text-right font-mono text-[12px] outline-none focus:border-accent"
          />
        </label>
      ))}
      <button
        onClick={onRemove}
        aria-label="Last entfernen"
        className="invert-hover border border-rule p-1.5 text-mute"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="meta px-4 py-4">{children}</p>;
}

/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function updatePoint(
  set: React.Dispatch<React.SetStateAction<BeamInput>>,
  id: string,
  patch: Partial<PointLoad>,
) {
  set((prev) => ({
    ...prev,
    points: prev.points.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  }));
}

function updateLine(
  set: React.Dispatch<React.SetStateAction<BeamInput>>,
  id: string,
  patch: Partial<LineLoad>,
) {
  set((prev) => ({
    ...prev,
    lines: prev.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  }));
}
