import { Hero } from "@/components/sections/Hero";
import { Manifest } from "@/components/sections/Manifest";
import { Showcase } from "@/components/sections/Showcase";
import { ChapterSection } from "@/components/sections/ChapterSection";
import { Outro } from "@/components/sections/Closing";
import { ControlBar } from "@/components/audio/ControlBar";
import { CHAPTERS } from "@/content/resume";

/**
 * Server Component.
 *
 * Reihenfolge ist die eigentliche Aussage: Projekte kommen VOR den drei
 * Disziplinen-Kapiteln. Wer eine Entwicklerstelle zu besetzen hat, will
 * erst sehen, was gebaut wurde, und dann warum es anders gebaut wurde als
 * bei anderen. Die Kapitel selbst fuehren jetzt mit Entwicklung (01) und
 * stellen Tontechnik und Tragwerk als Fundament dahinter.
 *
 * Jedes Kapitel steuert ueber `data-chapter` das Modell im Hintergrund -
 * die DOM-Reihenfolge ist damit zugleich die Dramaturgie der 3D-Szene.
 */
export default function Home() {
  // Kapitel nach ihrer Nummer, nicht nach Position in der Datei: so bleibt
  // die inhaltliche Gruppierung in content/resume.ts unabhaengig von der
  // Reihenfolge auf der Seite.
  const ordered = [...CHAPTERS].sort((a, b) => a.index.localeCompare(b.index));

  return (
    <main id="top">
      <Hero />
      <Showcase />

      {/* Erst die Projekte, dann die These dahinter.
          Umgekehrt lagen zwischen "wer bin ich" und "was habe ich
          gebaut" zwei Ueberschriftenbloecke, und genau dazwischen will
          niemand lesen, der eine Stelle zu besetzen hat. */}
      <Manifest />

      {ordered.map((chapter, i) => (
        <ChapterSection
          key={chapter.id}
          chapter={chapter}
          // Seitenwechsel je Kapitel: der Blick springt, statt drei Mal
          // dieselbe Spalte herunterzulaufen.
          side={i % 2 === 0 ? "left" : "right"}
        >
          {/* Das Mischpult steht dort, wo man hoert, was es tut - nicht
              fest ueber der ganzen Seite. Ein Regler, dessen Wirkung man
              nicht sieht, ist kein Bedienelement, sondern Dekor. */}
          {chapter.id === "signal" ? <ControlBar /> : null}
        </ChapterSection>
      ))}

      {/* Die Werkstatt (Agent + Traeger-Solver) gibt es nicht mehr.
          Sie lag eine Weile ausgehaengt im Repo, "fuer den Fall". Der
          Fall kam nicht, dafuer zeigte die Befehlspalette weiter einen
          Sprung dorthin. Toter Code ist kein Vorrat, sondern ein Anlass
          fuer genau solche Fehler. Letzter Stand im Verlauf:
          git show e9f8a0c:components/sections/Workshop.tsx */}
      {/* Der Werdegang steht im Fundament, nicht hier.
          Als eigener Abschnitt am Ende war er eine hohe Zeitleiste
          zwischen der Fahrt und dem Kontakt, und er hat den Schluss von
          einer Seite mit einem klaren Ziel in eine mit zwei verwandelt.
          Jetzt endet die Seite dort, wo sie enden soll. */}
      <Outro />
    </main>
  );
}
