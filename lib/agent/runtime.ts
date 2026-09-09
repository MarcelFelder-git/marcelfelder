import { TOOLS } from "./tools";

/**
 * Agent-Laufzeit.
 *
 * Die Schleife ist echt: planen → Werkzeug aufrufen → Ergebnis beobachten →
 * antworten. Jeder Schritt wird als Ereignis nach draußen gemeldet, damit die
 * Oberfläche den Ablauf zeigen kann statt nur das Endergebnis.
 *
 * Der Planner ist derzeit lokal und regelbasiert — kein LLM, keine API-Kosten,
 * keine Netzabhängigkeit. Die Schnittstelle `AgentBackend` ist aber genau die,
 * die ein Claude-Backend implementieren würde: es müsste lediglich `plan`
 * ersetzen und die Tool-Definitionen aus `tools.ts` als Tool-Schema
 * übergeben. Die gesamte UI bleibt unberührt.
 */

export type AgentEvent =
  | { kind: "user"; text: string }
  | { kind: "thought"; text: string }
  | { kind: "tool_call"; callId: string; tool: string; args: Record<string, unknown> }
  | {
      kind: "tool_result";
      callId: string;
      tool: string;
      ok: boolean;
      result: unknown;
      ms: number;
    }
  | { kind: "answer"; text: string }
  | { kind: "error"; text: string };

export interface AgentBackend {
  id: string;
  label: string;
  run(input: string, emit: (event: AgentEvent) => void, signal: AbortSignal): Promise<void>;
}

interface Step {
  thought: string;
  tool: string;
  args: Record<string, unknown>;
  /** Formuliert die Antwort aus dem Werkzeugergebnis. */
  answer: (result: unknown) => string;
}

const TOOL_TIMEOUT_MS = 3000;

/* ------------------------------------------------------------------ */
/* Eingabeanalyse                                                      */
/* ------------------------------------------------------------------ */

/** Zahl mit Einheit finden, z. B. "6 m", "20kN", "3,5 m". */
function findQuantity(text: string, units: string[]): number | null {
  for (const unit of units) {
    const re = new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`, "i");
    const match = text.match(re);
    if (match) return Number(match[1].replace(",", "."));
  }
  return null;
}

const DARK_WORDS = ["dunkler", "dunkel", "wärmer", "warm", "tiefer", "dumpf"];
const BRIGHT_WORDS = ["heller", "hell", "brillant", "offener", "schärfer", "höher"];
const WIDE_WORDS = ["weiter", "raum", "hall", "größer", "breiter"];
const NARROW_WORDS = ["trocken", "enger", "direkt"];

function has(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function plan(raw: string): Step[] {
  const text = raw.toLowerCase();
  const steps: Step[] = [];

  // --- Statik -------------------------------------------------------
  const wantsBeam =
    /träger|traeger|balken|statik|moment|querkraft|auflager|biege|kn\b/.test(text);

  if (wantsBeam) {
    const span = findQuantity(text, ["m", "meter"]) ?? 6;
    const load = findQuantity(text, ["kn", "kilonewton"]) ?? 20;
    const udl = findQuantity(text, ["kn/m", "kn\\/m"]);

    steps.push({
      thought: `Statikfrage erkannt. Stützweite ${span} m, Last ${load} kN. Ich rufe den Solver auf.`,
      tool: "solve_beam",
      args: udl !== null ? { span, load, udl } : { span, load },
      answer: (result) => {
        const r = result as Record<string, number>;
        return [
          `Einfeldträger, Stützweite ${r.span} m, Einzellast ${r.load} kN bei x = ${r.position} m.`,
          `Auflagerkräfte: A = ${r.reactionA} kN, B = ${r.reactionB} kN.`,
          `Maximales Biegemoment ${r.maxMoment} kNm bei x = ${r.maxMomentAt} m, maximale Querkraft ${r.maxShear} kN.`,
          `Gerechnet mit demselben Solver wie auf der Trägerseite. Statisch bestimmt, keine Näherung bei den Auflagerkräften.`,
        ].join(" ");
      },
    });
  }

  // --- Klang --------------------------------------------------------
  const wantsSynth = /klang|sound|ton|synth|audio|hören|hoeren|filter/.test(text);

  if (wantsSynth) {
    const args: Record<string, number> = {};
    if (has(text, DARK_WORDS)) args.cutoff = 0.22;
    if (has(text, BRIGHT_WORDS)) args.cutoff = 0.78;
    if (has(text, WIDE_WORDS)) args.space = 0.85;
    if (has(text, NARROW_WORDS)) args.space = 0.1;
    if (/rau|dreckig|kantig|aggressiv/.test(text)) args.resonance = 0.8;
    if (/weich|rund|sanft/.test(text)) args.resonance = 0.15;
    if (Object.keys(args).length === 0) args.cutoff = 0.5;

    const described = Object.entries(args)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");

    steps.push({
      thought: `Klangbeschreibung erkannt. Ich übersetze sie in Filterwerte (${described}) und schreibe sie in den laufenden Audiographen.`,
      tool: "set_synth",
      args,
      answer: (result) => {
        const r = result as { applied: Record<string, number>; running: boolean };
        const list = Object.entries(r.applied)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ");
        return r.running
          ? `Gesetzt: ${list}. Die Engine läuft, du hörst das Ergebnis sofort. Die Filterfrequenz färbt zusätzlich das Licht der Seite.`
          : `Werte gesetzt (${list}), aber der Audiokontext ist noch blockiert. Ein Klick irgendwo auf der Seite gibt ihn frei.`;
      },
    });
  }

  // --- Stack --------------------------------------------------------
  if (/stack|technolog|tooling|womit|welche tools/.test(text)) {
    steps.push({
      thought: "Frage nach dem Stack, direkt aus dem Register beantwortbar.",
      tool: "list_stack",
      args: {},
      answer: (result) => {
        const r = result as { web: string[]; engineering: string[] };
        return `Web: ${r.web.join(", ")}. Ingenieurseite: ${r.engineering.join(", ")}.`;
      },
    });
  }

  // --- Fallback: Profilsuche ----------------------------------------
  if (steps.length === 0) {
    // Füllwörter raus, damit die Suche auf dem inhaltlichen Kern läuft.
    const stop =
      /\b(was|wie|kann|kannst|er|du|mit|und|der|die|das|ist|sind|hat|von|über|ueber|für|fuer|im|in|ein|eine|zeig|zeige|mir|bitte|dir)\b/g;
    const query = text.replace(/[?!.,]/g, " ").replace(stop, " ").trim().split(/\s+/)[0] ?? text;

    steps.push({
      thought: `Keine Werkzeugabsicht erkennbar. Ich durchsuche das Profil nach "${query}".`,
      tool: "search_profile",
      args: { query },
      answer: (result) => {
        const r = result as {
          query: string;
          matches: { source: string; text: string }[];
          total: number;
        };
        if (r.matches.length === 0) {
          return `Zu "${r.query}" steht nichts im Profil. Probier eine Statikfrage ("Träger 6 m, 20 kN"), eine Klangbeschreibung ("mach den Klang dunkler") oder frage nach dem Stack.`;
        }
        return (
          `${r.total} Treffer zu "${r.query}": ` +
          r.matches.map((m) => `${m.text} (${m.source})`).join("; ") +
          "."
        );
      },
    });
  }

  return steps;
}

/* ------------------------------------------------------------------ */
/* Backend                                                             */
/* ------------------------------------------------------------------ */

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Werkzeug antwortet nicht (> ${ms} ms)`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export const localBackend: AgentBackend = {
  id: "local",
  label: "Lokaler Planner",

  async run(input, emit, signal) {
    emit({ kind: "user", text: input });

    const steps = plan(input);
    const answers: string[] = [];

    for (const [index, step] of steps.entries()) {
      if (signal.aborted) return;

      // Die Pausen sind bewusst gesetzt: ohne sie erscheint die gesamte
      // Schleife in einem Frame und man sieht nicht, dass es eine ist.
      await sleep(index === 0 ? 260 : 420, signal);
      emit({ kind: "thought", text: step.thought });

      const callId = `${step.tool}-${Date.now()}-${index}`;
      await sleep(280, signal);
      emit({ kind: "tool_call", callId, tool: step.tool, args: step.args });

      const tool = TOOLS[step.tool];
      const started = performance.now();

      try {
        if (!tool) throw new Error(`Unbekanntes Werkzeug: ${step.tool}`);
        const result = await withTimeout(
          Promise.resolve(tool.run(step.args)),
          TOOL_TIMEOUT_MS,
        );
        const ms = Math.round(performance.now() - started);

        emit({ kind: "tool_result", callId, tool: step.tool, ok: true, result, ms });
        answers.push(step.answer(result));
      } catch (error) {
        const ms = Math.round(performance.now() - started);
        const message = error instanceof Error ? error.message : String(error);
        emit({
          kind: "tool_result",
          callId,
          tool: step.tool,
          ok: false,
          result: message,
          ms,
        });
        // Ein fehlgeschlagenes Werkzeug beendet die Schleife nicht — der
        // Agent berichtet den Fehler und macht mit dem nächsten Schritt
        // weiter. Ein Agent, der bei jedem Fehler stumm abbricht, ist im
        // Betrieb unbrauchbar.
        answers.push(`Werkzeug ${step.tool} ist fehlgeschlagen: ${message}`);
      }
    }

    if (signal.aborted) return;
    await sleep(300, signal);
    emit({ kind: "answer", text: answers.join("\n\n") });
  },
};

export const SUGGESTIONS = [
  "Träger 6 m, 20 kN in Feldmitte",
  "Balken 8 m mit 12 kN/m Streckenlast",
  "Mach den Klang dunkler und weiter",
  "Was kann er mit React?",
  "Welchen Stack benutzt er?",
];
