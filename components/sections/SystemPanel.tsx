"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { SplitHeading, Reveal } from "@/components/motion/primitives";
import { useVitals } from "@/lib/telemetry/useVitals";

const ENDPOINT = "https://flagship-portfolio.vercel.app/api/profile";

/**
 * Öffentliche API der Seite plus echte Web Vitals dieses Seitenaufrufs.
 *
 * Keine Beteuerung "diese Seite ist schnell" — eine Messung, die man selbst
 * live mitverfolgen kann, direkt aus der Performance-API des Browsers.
 */
export function SystemPanel() {
  return (
    <section className="relative py-[14vh]" aria-labelledby="system-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(var(--ground-rgb),0.94)_16%,rgba(var(--ground-rgb),0.94)_84%,transparent)]"
      />

      <div className="px-6 sm:px-10 lg:px-16">
        <p className="meta">System</p>
        <SplitHeading
          as="h2"
          id="system-heading"
          text="Diese Seite über sich selbst."
          className="mt-4 max-w-2xl text-balance text-[clamp(1.8rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.025em]"
        />
      </div>

      <div className="mt-10 grid gap-px bg-rule sm:grid-cols-2">
        <Reveal className="bg-surface p-6 sm:p-8">
          <ApiCard />
        </Reveal>
        <Reveal delay={0.06} className="bg-surface p-6 sm:p-8">
          <VitalsCard />
        </Reveal>
      </div>
    </section>
  );
}

function ApiCard() {
  const [copied, setCopied] = useState(false);
  const command = `curl ${ENDPOINT}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard-API kann in unsicheren Kontexten fehlen - dann bleibt
      // der Befehl einfach zum Abtippen stehen.
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium tracking-tight">Öffentliche API</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mute">
        Dieselben Daten, die die Kapitel rendern, unverändert als JSON. Keine
        zweite Quelle, die aus dem Takt geraten könnte.
      </p>

      <div className="mt-5 flex items-center gap-2 border border-rule bg-paper px-3 py-2.5">
        {/* Auf schmalen Schirmen umbrechen statt abschneiden. Ein
            abgeschnittener Befehl sieht aus wie ein Fehler, und
            abtippen laesst er sich auch nicht mehr - der Knopf daneben
            hilft nur, wo die Zwischenablage erreichbar ist. */}
        <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-accent sm:truncate sm:break-normal">
          {command}
        </code>
        <button
          onClick={copy}
          aria-label="Befehl kopieren"
          className="invert-hover shrink-0 border border-rule p-1.5"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      <dl className="mt-4 space-y-1.5 font-mono text-[11px] text-faint">
        <div className="flex justify-between gap-3">
          <dt>Methode</dt>
          <dd className="text-mute">GET</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Runtime</dt>
          <dd className="text-mute">Edge</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Cache</dt>
          <dd className="text-mute">300 s, SWR 3600 s</dd>
        </div>
      </dl>
    </div>
  );
}

function VitalsCard() {
  const vitals = useVitals();

  const rows: { label: string; value: number | null; unit: string; provisional?: boolean }[] = [
    { label: "TTFB", value: vitals.ttfb, unit: "ms" },
    { label: "FCP", value: vitals.fcp, unit: "ms" },
    { label: "LCP", value: vitals.lcp, unit: "ms", provisional: true },
    { label: "CLS", value: vitals.cls, unit: "", provisional: true },
  ];

  return (
    <div>
      <h3 className="text-lg font-medium tracking-tight">Web Vitals — live</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mute">
        Direkt aus der Performance-API deines Browsers, für diesen
        Seitenaufruf. LCP und CLS sind Zwischenstände — beide legen sich per
        Definition erst beim Verlassen der Seite endgültig fest.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-px border border-rule bg-rule">
        {rows.map((row) => (
          <div key={row.label} className="bg-paper p-4">
            <dt className="meta">{row.label}</dt>
            <dd className="mt-1.5 font-mono text-xl text-ink">
              {row.value === null ? (
                <span className="text-faint">—</span>
              ) : (
                <>
                  {row.unit === "ms" ? Math.round(row.value) : row.value.toFixed(3)}
                  <span className="ml-0.5 text-sm text-accent">{row.unit}</span>
                </>
              )}
            </dd>
            {row.provisional && row.value !== null && (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                laufend
              </p>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
