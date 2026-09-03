"use client";

import { useState } from "react";
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
export function Workshop() {
  const [tool, setTool] = useState<Tool>("agent");

  return (
    <section className="relative py-[14vh]" aria-labelledby="workshop-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(8,9,14,0.95)_14%,rgba(8,9,14,0.95)_86%,transparent)]"
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
          bedienbar ist — kein LLM im Hintergrund, ein lokaler Planner, der
          echte Werkzeuge aufruft. Anfragen an ein Sprachmodell zu leiten ist
          derselbe Umbau: die Werkzeuge bleiben, nur der Planer wechselt.
        </p>

        <div
          role="tablist"
          aria-label="Werkzeug wählen"
          className="mt-8 flex border border-rule"
        >
          <TabButton
            active={tool === "agent"}
            onClick={() => setTool("agent")}
            index="01"
          >
            Agent
          </TabButton>
          <TabButton
            active={tool === "beam"}
            onClick={() => setTool("beam")}
            index="02"
          >
            Träger-Solver
          </TabButton>
        </div>
      </div>

      <Reveal delay={0.06} className="mt-px">
        <div
          role="tabpanel"
          className="border-y border-rule"
          // Beide Werkzeuge bleiben gemountet - ein Tab-Wechsel darf keinen
          // laufenden Agent-Vorgang abbrechen oder Trägerlasten zurücksetzen.
        >
          <div className={cn(tool === "agent" ? "block" : "hidden")}>
            <AgentConsole />
          </div>
          <div className={cn(tool === "beam" ? "block" : "hidden")}>
            <BeamWorkbench />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  index,
  children,
}: {
  active: boolean;
  onClick: () => void;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
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
