import { solveBeam } from "@/lib/beam/solve";
import { audioEngine, type ParamKey } from "@/lib/audio/engine";
import { CHAPTERS, STACK_MARQUEE, STACK_MARQUEE_B, VITA } from "@/content/resume";

/**
 * Werkzeugregister des Agenten.
 *
 * Das sind keine Attrappen: `solve_beam` ruft denselben Solver auf, den die
 * Trägerseite benutzt, und `set_synth` greift in denselben Web-Audio-Graphen,
 * der die Seite beschallt. Ein Agent, dessen Werkzeuge nur Text zurückgeben,
 * beweist nichts.
 *
 * Die Beschreibungen und Parameterlisten sind bewusst so geschrieben, dass
 * sie unverändert als Tool-Definitionen an ein LLM gehen können.
 */

export interface ToolParam {
  name: string;
  type: "number" | "string";
  required: boolean;
  description: string;
}

export interface Tool {
  name: string;
  summary: string;
  params: ToolParam[];
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

const num = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const TOOLS: Record<string, Tool> = {
  solve_beam: {
    name: "solve_beam",
    summary:
      "Rechnet einen Einfeldträger: Auflagerkräfte, maximales Biegemoment, maximale Querkraft.",
    params: [
      { name: "span", type: "number", required: true, description: "Stützweite in m" },
      { name: "load", type: "number", required: true, description: "Einzellast in kN" },
      {
        name: "position",
        type: "number",
        required: false,
        description: "Angriffspunkt in m; ohne Angabe Feldmitte",
      },
      {
        name: "udl",
        type: "number",
        required: false,
        description: "Gleichstreckenlast in kN/m über die ganze Länge",
      },
    ],
    async run(args) {
      const span = Math.min(40, Math.max(0.5, num(args.span, 6)));
      const load = num(args.load, 0);
      const position = Math.min(span, Math.max(0, num(args.position, span / 2)));
      const udl = num(args.udl, 0);

      const result = solveBeam({
        length: span,
        supports: [0, span],
        points: load !== 0 ? [{ id: "agent", x: position, p: load }] : [],
        lines: udl !== 0 ? [{ id: "agent-udl", x1: 0, x2: span, w: udl }] : [],
      });

      return {
        span,
        load,
        position,
        udl,
        reactionA: round(result.reactions.a),
        reactionB: round(result.reactions.b),
        maxMoment: round(result.maxMoment.value),
        maxMomentAt: round(result.maxMoment.x),
        maxShear: round(result.maxShear.value),
      };
    },
  },

  set_synth: {
    name: "set_synth",
    summary:
      "Stellt den Synthesizer der Seite ein und startet ihn, falls er still ist.",
    params: [
      { name: "cutoff", type: "number", required: false, description: "Filterfrequenz 0..1" },
      { name: "resonance", type: "number", required: false, description: "Güte 0..1" },
      { name: "drift", type: "number", required: false, description: "Verstimmung 0..1" },
      { name: "space", type: "number", required: false, description: "Delay-Anteil 0..1" },
      { name: "level", type: "number", required: false, description: "Pegel 0..1" },
    ],
    async run(args) {
      const applied: Partial<Record<ParamKey, number>> = {};
      const keys: ParamKey[] = ["cutoff", "resonance", "drift", "space", "level"];

      for (const key of keys) {
        if (args[key] === undefined) continue;
        const value = Math.min(1, Math.max(0, num(args[key], 0.5)));
        audioEngine.setParam(key, value);
        applied[key] = round(value);
      }

      // Ohne laufenden Kontext hört niemand das Ergebnis — der Toolaufruf
      // selbst zählt als Nutzergeste, die Autoplay-Sperre greift also nicht.
      if (!audioEngine.isRunning) await audioEngine.start();

      return { applied, running: audioEngine.isRunning };
    },
  },

  search_profile: {
    name: "search_profile",
    summary:
      "Durchsucht Kompetenzen, Kapiteltexte und Werdegang nach einem Stichwort.",
    params: [
      { name: "query", type: "string", required: true, description: "Suchbegriff" },
    ],
    async run(args) {
      const query = String(args.query ?? "").toLowerCase().trim();
      if (!query) return { query, matches: [] };

      const matches: { source: string; text: string }[] = [];

      for (const chapter of CHAPTERS) {
        for (const skill of chapter.skills) {
          if (skill.toLowerCase().includes(query)) {
            matches.push({ source: `${chapter.label} · Kompetenz`, text: skill });
          }
        }
        if (
          chapter.body.toLowerCase().includes(query) ||
          chapter.headline.toLowerCase().includes(query)
        ) {
          matches.push({ source: `${chapter.label} · Kapitel`, text: chapter.headline });
        }
      }
      for (const entry of VITA) {
        if (
          entry.title.toLowerCase().includes(query) ||
          entry.body.toLowerCase().includes(query)
        ) {
          matches.push({ source: "Werdegang", text: `${entry.title} — ${entry.period}` });
        }
      }
      for (const item of [...STACK_MARQUEE, ...STACK_MARQUEE_B]) {
        if (item.toLowerCase().includes(query)) {
          matches.push({ source: "Stack", text: item });
        }
      }

      return { query, matches: matches.slice(0, 8), total: matches.length };
    },
  },

  list_stack: {
    name: "list_stack",
    summary: "Gibt den kompletten Technologie- und Methodenstack zurück.",
    params: [],
    async run() {
      return {
        web: [...STACK_MARQUEE],
        engineering: [...STACK_MARQUEE_B],
      };
    },
  },
};

export const TOOL_NAMES = Object.keys(TOOLS);

function round(v: number) {
  return Math.round(v * 100) / 100;
}
