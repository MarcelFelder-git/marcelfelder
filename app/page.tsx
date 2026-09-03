import { TopBar } from "@/components/layout/TopBar";
import { Hero } from "@/components/sections/Hero";
import { Disciplines } from "@/components/sections/Disciplines";
import { Guestbook } from "@/components/guestbook/Guestbook";
import { STACK } from "@/content/resume";
import { CONTACT_EMAIL, SOCIALS } from "@/content/site";

/**
 * Server Component. Alles Interaktive (Viewport, Mixer, Palette, Gaestebuch)
 * ist in Client-Inseln gekapselt - der Rest wird als statisches HTML
 * ausgeliefert und braucht kein Javascript, um lesbar zu sein.
 */
export default function Home() {
  return (
    <main id="main" className="relative mx-auto max-w-7xl px-6 pb-40">
      <TopBar />

      <div id="viewport-anchor">
        <Hero />
      </div>

      <Disciplines />

      {/* --- Stack --------------------------------------------------- */}
      <section className="mt-28 border-t border-blueprint-line/60 pt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Womit gebaut wird
        </h2>

        <dl className="mt-8 grid gap-px overflow-hidden rounded-panel border border-blueprint-line/60 bg-blueprint-line/60 sm:grid-cols-2 lg:grid-cols-5">
          {STACK.map((group) => (
            <div key={group.group} className="bg-blueprint-deep p-6">
              <dt className="label-tech">{group.group}</dt>
              <dd className="mt-4 space-y-2">
                {group.items.map((item) => (
                  <p key={item} className="font-mono text-[13px] text-ink-muted">
                    {item}
                  </p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --- Gästebuch ----------------------------------------------- */}
      <section
        id="guestbook"
        className="mt-28 border-t border-blueprint-line/60 pt-16"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Gästebuch</h2>
          <span className="label-tech hidden sm:inline">
            Supabase Realtime · WebSocket
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Live über Postgres-Replikation. Neue Einträge erscheinen bei allen
          geöffneten Browsern im selben Moment — ohne Reload, ohne Polling.
        </p>

        <div className="mt-8">
          <Guestbook />
        </div>
      </section>

      {/* --- Footer --------------------------------------------------- */}
      <footer className="mt-28 flex flex-col gap-4 border-t border-blueprint-line/60 pt-10 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-mono text-sm text-ink-muted transition-colors hover:text-signal-cyan"
        >
          {CONTACT_EMAIL}
        </a>

        <div className="flex items-center gap-5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="label-tech transition-colors hover:text-signal-cyan"
            >
              {s.label}
            </a>
          ))}
          <span className="label-tech">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </main>
  );
}
