import { Hero } from "@/components/sections/Hero";
import { Manifest } from "@/components/sections/Manifest";
import { Showcase } from "@/components/sections/Showcase";
import { ChapterSection } from "@/components/sections/ChapterSection";
import { Workshop } from "@/components/sections/Workshop";
import { Capabilities } from "@/components/sections/Capabilities";
import { SystemPanel } from "@/components/sections/SystemPanel";
import { Vita, Outro } from "@/components/sections/Closing";
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
      <Manifest />
      <Showcase />

      {ordered.map((chapter, i) => (
        <ChapterSection
          key={chapter.id}
          chapter={chapter}
          // Seitenwechsel je Kapitel: der Blick springt, statt drei Mal
          // dieselbe Spalte herunterzulaufen.
          side={i % 2 === 0 ? "left" : "right"}
        />
      ))}

      <Workshop />
      <Capabilities />
      <SystemPanel />
      <Vita />
      <Outro />
    </main>
  );
}
