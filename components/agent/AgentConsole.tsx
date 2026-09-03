"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Check, Loader2, Square, X } from "lucide-react";
import { localBackend, SUGGESTIONS, type AgentEvent } from "@/lib/agent/runtime";
import { TOOLS } from "@/lib/agent/tools";

/**
 * Sichtbarer Agent-Loop.
 *
 * Der Punkt dieser Komponente ist nicht der Chat - Chatfenster hat inzwischen
 * jedes Portfolio. Der Punkt ist, dass man SIEHT, wie der Agent denkt: welches
 * Werkzeug er waehlt, mit welchen Argumenten, wie lange es braucht, und was
 * zurueckkommt. Ein Ergebnis ohne diesen Weg waere nur ein weiteres
 * Textfeld mit Antwort.
 *
 * Barrierefrei bewusst mitgedacht: die Ereignisliste ist eine echte
 * `role="log"`-Region mit `aria-live="polite"`, jedes Ereignis ist normales
 * Text-DOM - ein Screenreader bekommt denselben Ablauf zu hoeren, den man
 * hier sieht.
 */
export function AgentConsole() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || running) return;

    setInput("");
    setRunning(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    void localBackend
      .run(trimmed, (event) => setEvents((prev) => [...prev, event]), controller.signal)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEvents((prev) => [
          ...prev,
          { kind: "error", text: error instanceof Error ? error.message : String(error) },
        ]);
      })
      .finally(() => setRunning(false));
  };

  const stop = () => controllerRef.current?.abort();

  return (
    <div className="grid gap-px bg-rule lg:grid-cols-[1fr_18rem]">
      {/* ================= Verlauf ================= */}
      <div className="flex flex-col bg-paper">
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Agent-Verlauf"
          className="max-h-[26rem] min-h-[16rem] flex-1 overflow-y-auto p-5"
        >
          {events.length === 0 && (
            <p className="meta max-w-sm leading-relaxed">
              Kein Verlauf. Frag etwas — der Agent zeigt jeden Schritt: welches
              Werkzeug er wählt, mit welchen Argumenten, was zurückkommt.
            </p>
          )}

          <ol className="space-y-3">
            <AnimatePresence initial={false}>
              {events.map((event, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <EventRow event={event} />
                </motion.li>
              ))}
            </AnimatePresence>

            {running && (
              <li className="flex items-center gap-2 py-1 font-mono text-[11px] text-faint">
                <Loader2 className="size-3 animate-spin" />
                läuft…
              </li>
            )}
          </ol>
        </div>

        {/* --- Eingabe -------------------------------------------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 border-t border-rule p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Träger 6 m, 20 kN — oder: mach den Klang dunkler"
            disabled={running}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-sm text-ink outline-none placeholder:text-faint disabled:opacity-50"
          />
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="invert-hover flex items-center gap-1.5 border border-rule px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-mute"
            >
              <Square className="size-3" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Senden"
              className="bg-accent p-2 text-paper transition-opacity disabled:opacity-30"
            >
              <ArrowUp className="size-4" strokeWidth={2.25} />
            </button>
          )}
        </form>
      </div>

      {/* ================= Werkzeuge & Vorschläge ================= */}
      <aside className="bg-paper">
        <section className="border-b border-rule">
          <header className="border-b border-rule-soft px-4 py-2.5">
            <h3 className="meta text-ink">Vorschläge</h3>
          </header>
          <div className="flex flex-col divide-y divide-[var(--color-rule-soft)]">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={running}
                className="invert-hover px-4 py-2.5 text-left font-mono text-[12px] text-mute disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <header className="border-b border-rule-soft px-4 py-2.5">
            <h3 className="meta text-ink">Register</h3>
          </header>
          <div className="divide-y divide-[var(--color-rule-soft)]">
            {Object.values(TOOLS).map((tool) => (
              <div key={tool.name} className="px-4 py-2.5">
                <p className="font-mono text-[11px] text-accent">{tool.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-faint">
                  {tool.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EventRow({ event }: { event: AgentEvent }) {
  switch (event.kind) {
    case "user":
      return (
        <p className="font-mono text-sm text-ink">
          <span className="text-faint">›</span> {event.text}
        </p>
      );

    case "thought":
      return (
        <p className="max-w-lg border-l-2 border-rule pl-3 text-[13px] italic leading-relaxed text-mute">
          {event.text}
        </p>
      );

    case "tool_call":
      return (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[12px]">
          <span className="text-faint">→</span>
          <span className="bg-surface px-1.5 py-0.5 text-accent">
            {event.tool}
          </span>
          <span className="text-faint">
            {Object.entries(event.args)
              .map(([k, v]) => `${k}=${v}`)
              .join(" · ") || "—"}
          </span>
        </div>
      );

    case "tool_result":
      return (
        <div className="flex items-start gap-2 font-mono text-[12px]">
          {event.ok ? (
            <Check className="mt-0.5 size-3 shrink-0 text-accent" />
          ) : (
            <X className="mt-0.5 size-3 shrink-0 text-[#f0a]" />
          )}
          <div className="min-w-0">
            <span className="text-faint">{event.ms} ms · </span>
            <ResultPreview result={event.result} />
          </div>
        </div>
      );

    case "answer":
      return (
        <p className="max-w-lg whitespace-pre-line text-[14px] leading-relaxed text-ink">
          {event.text}
        </p>
      );

    case "error":
      return <p className="text-[13px] text-[#f0a]">{event.text}</p>;
  }
}

function ResultPreview({ result }: { result: unknown }) {
  if (typeof result === "string") return <span className="text-mute">{result}</span>;
  if (!result || typeof result !== "object") {
    return <span className="text-mute">{String(result)}</span>;
  }
  const entries = Object.entries(result as Record<string, unknown>).slice(0, 6);
  return (
    <span className="text-mute">
      {entries
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
        .join(" · ")}
    </span>
  );
}
