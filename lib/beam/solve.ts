/**
 * Statik eines Einfeldträgers mit optionalen Kragarmen.
 *
 * Zwei Auflager, frei positionierbar; Einzellasten und Gleichstreckenlasten.
 * Gerechnet wird statisch bestimmt über Gleichgewicht — kein Solver, keine
 * Näherung bei den Auflagerkräften.
 *
 * Vorzeichen: Lasten nach unten positiv, Auflagerkräfte nach oben positiv,
 * Feldmoment (Sagging) positiv. Kontrolle am Lehrbuchfall — Einzellast P in
 * Feldmitte, Stützweite L: R = P/2, M_max = P·L/4, V = ±P/2.
 */

export interface PointLoad {
  id: string;
  /** Angriffspunkt in m vom linken Trägerende. */
  x: number;
  /** Last in kN, nach unten positiv. */
  p: number;
}

export interface LineLoad {
  id: string;
  x1: number;
  x2: number;
  /** Streckenlast in kN/m, nach unten positiv. */
  w: number;
}

export interface BeamInput {
  /** Trägerlänge in m. */
  length: number;
  /** Auflagerpositionen in m. */
  supports: [number, number];
  points: PointLoad[];
  lines: LineLoad[];
}

export interface Extremum {
  value: number;
  x: number;
}

export interface BeamResult {
  x: number[];
  shear: number[];
  moment: number[];
  /** Biegelinie für EI = 1 — die Form stimmt, der Absolutwert skaliert mit EI. */
  deflection: number[];
  reactions: { a: number; b: number };
  supports: [number, number];
  totalLoad: number;
  maxMoment: Extremum;
  minMoment: Extremum;
  maxShear: Extremum;
  maxDeflection: Extremum;
  warnings: string[];
}

const EPS = 1e-7;

/** Überdeckte Länge einer Streckenlast links von x. */
function covered(line: LineLoad, x: number) {
  const from = Math.min(line.x1, line.x2);
  const to = Math.max(line.x1, line.x2);
  return Math.max(0, Math.min(x, to) - from);
}

export function solveBeam(input: BeamInput): BeamResult {
  const warnings: string[] = [];
  const L = input.length;

  const [sA, sB] = [...input.supports].sort((a, b) => a - b) as [number, number];
  const span = sB - sA;

  if (span < 0.05) {
    warnings.push("Auflager liegen zu dicht beieinander — System ist labil.");
  }
  if (sA < -EPS || sB > L + EPS) {
    warnings.push("Auflager liegt außerhalb des Trägers.");
  }

  const points = input.points.filter((p) => p.x >= -EPS && p.x <= L + EPS);
  const lines = input.lines.filter((l) => Math.abs(l.x2 - l.x1) > EPS);

  // --- Auflagerkräfte aus Gleichgewicht ------------------------------
  // ΣV = 0 und ΣM um A = 0. Mehr braucht ein statisch bestimmtes
  // System nicht.
  let totalLoad = 0;
  let momentAboutA = 0;

  for (const p of points) {
    totalLoad += p.p;
    momentAboutA += p.p * (p.x - sA);
  }
  for (const l of lines) {
    const from = Math.min(l.x1, l.x2);
    const to = Math.max(l.x1, l.x2);
    const len = to - from;
    const resultant = l.w * len;
    const centroid = (from + to) / 2;
    totalLoad += resultant;
    momentAboutA += resultant * (centroid - sA);
  }

  const rB = span > EPS ? momentAboutA / span : 0;
  const rA = totalLoad - rB;

  // --- Stützstellen ---------------------------------------------------
  // An jeder Unstetigkeit (Auflager, Einzellast, Rand einer Streckenlast)
  // werden zwei Punkte dicht nebeneinander gesetzt. Ohne das zeichnet die
  // Querkraftlinie eine Schräge, wo in Wahrheit ein Sprung ist.
  const breaks = new Set<number>([0, L, sA, sB]);
  for (const p of points) breaks.add(p.x);
  for (const l of lines) {
    breaks.add(Math.min(l.x1, l.x2));
    breaks.add(Math.max(l.x1, l.x2));
  }

  const SAMPLES = 400;
  const xs: number[] = [];
  for (let i = 0; i <= SAMPLES; i++) xs.push((i / SAMPLES) * L);
  for (const b of breaks) {
    if (b > EPS) xs.push(b - EPS);
    if (b < L - EPS) xs.push(b + EPS);
    xs.push(b);
  }
  xs.sort((a, b) => a - b);

  const x: number[] = [];
  for (const v of xs) {
    const clamped = Math.min(L, Math.max(0, v));
    if (x.length === 0 || clamped - x[x.length - 1] > 1e-9) x.push(clamped);
  }

  // --- Schnittgrößen --------------------------------------------------
  const shear: number[] = [];
  const moment: number[] = [];

  for (const xi of x) {
    let v = 0;
    let m = 0;

    if (sA <= xi + EPS) {
      v += rA;
      m += rA * (xi - sA);
    }
    if (sB <= xi + EPS) {
      v += rB;
      m += rB * (xi - sB);
    }
    for (const p of points) {
      if (p.x <= xi + EPS) {
        v -= p.p;
        m -= p.p * (xi - p.x);
      }
    }
    for (const l of lines) {
      const c = covered(l, xi);
      if (c > 0) {
        v -= l.w * c;
        // Schwerpunkt des überdeckten Teils liegt c/2 hinter dem Schnitt.
        m -= l.w * c * (c / 2);
      }
    }

    shear.push(v);
    moment.push(m);
  }

  // --- Biegelinie -----------------------------------------------------
  // EI·v'' = M, zweifach numerisch integriert (Trapez), anschließend
  // linear korrigiert, sodass v an beiden Auflagern null wird. Das ist
  // exakt die Randbedingung des Systems — die Form stimmt damit ohne
  // dass EI bekannt sein müsste.
  const theta: number[] = [0];
  for (let i = 1; i < x.length; i++) {
    const dx = x[i] - x[i - 1];
    theta.push(theta[i - 1] + ((moment[i - 1] + moment[i]) / 2) * dx);
  }
  const raw: number[] = [0];
  for (let i = 1; i < x.length; i++) {
    const dx = x[i] - x[i - 1];
    raw.push(raw[i - 1] + ((theta[i - 1] + theta[i]) / 2) * dx);
  }

  const vAtA = interpolate(x, raw, sA);
  const vAtB = interpolate(x, raw, sB);
  const slope = span > EPS ? (vAtB - vAtA) / span : 0;
  const offset = vAtA - slope * sA;
  const deflection = raw.map((v, i) => v - (slope * x[i] + offset));

  return {
    x,
    shear,
    moment,
    deflection,
    reactions: { a: rA, b: rB },
    supports: [sA, sB],
    totalLoad,
    maxMoment: extremum(x, moment, "max"),
    minMoment: extremum(x, moment, "min"),
    maxShear: extremum(x, shear, "abs"),
    maxDeflection: extremum(x, deflection, "abs"),
    warnings,
  };
}

function interpolate(xs: number[], ys: number[], at: number) {
  if (at <= xs[0]) return ys[0];
  if (at >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] >= at) {
      const t = (at - xs[i - 1]) / Math.max(1e-12, xs[i] - xs[i - 1]);
      return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
    }
  }
  return ys[ys.length - 1];
}

function extremum(
  xs: number[],
  ys: number[],
  mode: "max" | "min" | "abs",
): Extremum {
  let bestIndex = 0;
  let best = mode === "abs" ? -Infinity : ys[0];

  for (let i = 0; i < ys.length; i++) {
    const candidate = mode === "abs" ? Math.abs(ys[i]) : ys[i];
    const better =
      mode === "min" ? candidate < best : candidate > best;
    if (better) {
      best = candidate;
      bestIndex = i;
    }
  }
  return { value: ys[bestIndex], x: xs[bestIndex] };
}

/**
 * Kontrollrechnung gegen den geschlossenen Lehrbuchfall.
 * Wird vom Agenten und von der Systemseite aufgerufen, damit die Behauptung
 * "das rechnet richtig" auf der Seite selbst belegt ist statt behauptet.
 */
export function selfCheck() {
  const L = 6;
  const P = 20;
  const result = solveBeam({
    length: L,
    supports: [0, L],
    points: [{ id: "p", x: L / 2, p: P }],
    lines: [],
  });

  const expectedReaction = P / 2;
  const expectedMoment = (P * L) / 4;

  return {
    reaction: { got: result.reactions.a, expected: expectedReaction },
    moment: { got: result.maxMoment.value, expected: expectedMoment },
    passed:
      Math.abs(result.reactions.a - expectedReaction) < 1e-6 &&
      Math.abs(result.maxMoment.value - expectedMoment) < 1e-3,
  };
}
