"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Reveal, SplitHeading } from "@/components/motion/primitives";
import { CHAPTERS } from "@/content/resume";
import { CONTACT_EMAIL, CONTACT_FACTS, SOCIALS } from "@/content/site";
import { EASE_OUT } from "@/lib/motion";

/**
 * Abbinder. Die Mailadresse ist das groesste Element der Seite - wer bis
 * hierher gescrollt hat, soll nicht nach einem Kontaktformular suchen.
 */
export function Outro() {
  return (
    <footer
      id="kontakt"
      data-tone="light"
      className="relative px-6 pb-28 pt-[24vh] sm:px-10 sm:pb-16 lg:px-16"
      aria-labelledby="outro-heading"
    >
      {/* Verlauf statt Kante.
          Solange der Werdegang darueber stand, hat der seinen Uebergang
          ins Helle mitgebracht. Faellt er weg, weil er noch nicht
          ausgefuellt ist, stiess der Kontakt mit einer harten Linie an
          den dunklen Abschnitt darueber. Der Verlauf gehoert deshalb
          hierher, wo er in jedem Fall greift. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,rgba(var(--ground-rgb),1)_16vh)]"
      />

      <div className="flex items-baseline gap-4 border-t border-rule pt-5">
        <p className="meta-accent shrink-0">Kontakt</p>
        <span aria-hidden className="h-px flex-1 bg-rule-soft" />
      </div>

      <SplitHeading
        as="h2"
        id="outro-heading"
        text="Reden wir über das nächste System."
        className="chromatic mt-10 max-w-3xl text-balance text-[clamp(2rem,5vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
        highlight={["System."]}
      />

      <Reveal delay={0.1}>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group mt-10 inline-flex items-center gap-4 border-b border-rule pb-3 transition-colors hover:border-accent"
        >
          <span className="font-mono text-[clamp(1rem,2.4vw,1.75rem)] text-ink transition-colors group-hover:text-accent">
            {CONTACT_EMAIL}
          </span>
          <motion.span
            className="text-accent"
            initial={{ x: 0, y: 0 }}
            whileHover={{ x: 3, y: -3 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <ArrowUpRight className="size-6" strokeWidth={1.75} />
          </motion.span>
        </a>
      </Reveal>

      {/* Fakten, die ein Recruiter als erstes sucht. Was nicht gesetzt
          ist, steht auch nicht da. */}
      {(CONTACT_FACTS.location || CONTACT_FACTS.availability) && (
        <Reveal delay={0.14}>
          <dl className="mt-10 flex flex-col gap-x-12 gap-y-2 sm:flex-row">
            {CONTACT_FACTS.location && (
              <div className="flex items-baseline gap-3">
                <dt className="meta">Standort</dt>
                <dd className="text-[15px] text-mute">
                  {CONTACT_FACTS.location}
                </dd>
              </div>
            )}
            {CONTACT_FACTS.availability && (
              <div className="flex items-baseline gap-3">
                <dt className="meta">Verfügbar</dt>
                <dd className="text-[15px] text-mute">
                  {CONTACT_FACTS.availability}
                </dd>
              </div>
            )}
          </dl>
        </Reveal>
      )}

      {/* Kurzfassung der drei Disziplinen.
          Der helle Abschnitt war vorher fast leer, und eine grosse
          leere Flaeche wirkt nicht ruhig, sondern unfertig. Hier steht
          jetzt in drei Spalten, was oben ueber drei Kapitel verteilt
          war. Wer bis hierher gescrollt ist, hat es gelesen; wer direkt
          hierher gesprungen ist, bekommt es in fuenf Sekunden. Die
          Inhalte kommen aus denselben Kapiteldaten, es gibt also keine
          zweite Wahrheit, die veralten koennte. */}
      <Reveal delay={0.17}>
        <dl className="mt-16 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {[...CHAPTERS]
            .sort((a, b) => a.index.localeCompare(b.index))
            .map((chapter) => (
              <div key={chapter.id} className="bg-paper p-6">
                <dt className="text-sm font-medium text-ink">
                  {chapter.caption}
                </dt>
                <dd className="mt-3 flex flex-wrap gap-1.5">
                  {chapter.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="border border-rule-soft px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mute"
                    >
                      {skill}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
        </dl>
      </Reveal>

      {/* Profile als richtige Schaltflaechen statt als Kleingedrucktes
          in der Fusszeile. Wer sich das Portfolio ansieht, will danach
          in den Quellcode, und das soll ein Ziel sein, kein Suchspiel.
          Eintraege ohne Adresse fallen weg: ein Knopf, der auf "#"
          zeigt, ist schlechter als kein Knopf. */}
      <Reveal delay={0.2}>
        <div className="mt-12 flex flex-wrap gap-3">
          {SOCIALS.filter((s) => s.href).map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="invert-hover flex items-center gap-2 border border-rule px-5 py-3 text-sm text-ink"
            >
              {s.label}
              <ArrowUpRight className="size-4" strokeWidth={1.75} />
            </a>
          ))}
        </div>
      </Reveal>

      <div className="mt-20 flex flex-col gap-4 border-t border-rule/70 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="meta">
          © {new Date().getFullYear()} Marcel Felder. Gebaut mit Next.js,
          Three.js und der Web Audio API, im Pair-Programming mit Claude
          Code.
        </span>
        <a href="#top" className="meta transition-colors hover:text-accent">
          Zurück nach oben
        </a>
      </div>
    </footer>
  );
}
