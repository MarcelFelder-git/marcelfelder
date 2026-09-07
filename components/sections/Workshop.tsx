"use client";

import { useRef, useState } from "react";
import { SplitHeading, Reveal } from "@/components/motion/primitives";
import { BeamWorkbench } from "@/components/beam/BeamWorkbench";
import { AgentConsole } from "@/components/agent/AgentConsole";
import { cn } from "@/lib/utils";

type Tool = "beam" | "agent";

/**
 * Die Werkstatt.
 *
 * Zwei echte Werkzeuge statt Screenshots davon: der Träger-Solver, den auch
 * der Agent aufruft, und der Agent selbst. Ein Tab-Wechsel statt zweier
 * Sektionen - beide Werkzeuge teilen sich denselben Zustand (der Agent
 * rechnet mit demselben Solver), das soll man auch bedienen können, ohne
 * die Seite zweimal aufzubauen.
 */
const TOOLS: { id: Tool; index: string; label: string }[] = [
  { id: "agent", index: "01", label: "Agent" },
  { id: "beam", index: "02", label: "Träger-Solver" },
];

export function Workshop() {
  const [tool, setTool] = useState<Tool>("agent");
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Pfeiltasten im Reiterband.
   *
   * Ein `role="tablist"` ist ein Versprechen: wer es vergibt, sagt
   * Screenreader und Tastatur zu, dass sich die Reiter mit den
   * Pfeiltasten durchgehen lassen und nur der aktive im Tabstopp liegt.
   * Vorher stand hier nur die Rolle - also das Versprechen ohne die
   * Umsetzung, und das ist schlechter als gar keine Rolle: die
   * Ansage stimmt dann nicht mehr mit dem Verhalten ueberein.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = TOOLS.findIndex((t) => t.id === tool);
    let next = at;
    if (e.key === "ArrowRight") next = (at + 1) % TOOLS.length;
    else if (e.key === "ArrowLeft") next = (at - 1 + TOOLS.length) % TOOLS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TOOLS.length - 1;
    else return;
    e.preventDefault();
    setTool(TOOLS[next].id);
    tabsRef.current[next]?.focus();
  };

  return (
    <section className="relative py-[10vh]" aria-labelledby="workshop-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(var(--ground-rgb),0.95)_14%,rgba(var(--ground-rgb),0.95)_86%,transparent)]"
      />

      <div className="px-6 sm:px-10 lg:px-16">
        <p className="meta">Werkstatt</p>
        <SplitHeading
          as="h2"
          id="workshop-heading"
          text="Zwei Werkzeuge, ein Unterbau."
          className="mt-4 max-w-2xl text-balance text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em]"
        />
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mute">
          Der Agent rechnet mit demselben Solver, der hier auch direkt
          bedienbar ist — kein LLM im Hintergrund, ein lokaler Planner mit
          echten Werkzeugen.
        </p>

        <div
          role="tablist"
          aria-label="Werkzeug wählen"
          onKeyDown={onKeyDown}
          className="mt-6 flex border border-rule"
        >
          {TOOLS.map((t, i) => (
            <TabButton
              key={t.id}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              tool={t.id}
              active={tool === t.id}
              onClick={() => setTool(t.id)}
              index={t.index}
            >
              {t.label}
            </TabButton>
          ))}
        </div>
      </div>

      <Reveal delay={0.06} className="mt-px">
        {/* Ein Panel je Reiter statt eines gemeinsamen: `aria-controls`
            zeigt sonst auf denselben Kasten, und ein Screenreader liest
            beim Umschalten dieselbe Region noch einmal vor. Beide
            Werkzeuge bleiben gemountet - ein Reiterwechsel darf keinen
            laufenden Agent-Vorgang abbrechen oder Traegerlasten
            zuruecksetzen -, das inaktive ist nur `hidden`. */}
        <div className="border-y border-rule">
          {TOOLS.map((t) => (
            <div
              key={t.id}
              id={`panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              hidden={tool !== t.id}
            >
              {t.id === "agent" ? <AgentConsole /> : <BeamWorkbench />}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function TabButton({
  ref,
  tool,
  active,
  onClick,
  index,
  children,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  tool: Tool;
  active: boolean;
  onClick: () => void;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={ref}
      role="tab"
      id={`tab-${tool}`}
      aria-selected={active}
      aria-controls={`panel-${tool}`}
      // Nur der aktive Reiter liegt im Tabstopp; zwischen den Reitern
      // fuehren die Pfeiltasten. So verlangt es das Muster, und so
      // erwartet es jeder, der die Seite mit der Tastatur bedient.
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        "flex-1 border-r border-rule px-5 py-3 text-left font-mono text-sm transition-colors last:border-r-0",
        active ? "bg-accent text-paper" : "text-mute hover:bg-raise",
      )}
    >
      <span className={cn("mr-2", active ? "text-paper/70" : "text-faint")}>
        {index}
      </span>
      {children}
    </button>
  );
}
