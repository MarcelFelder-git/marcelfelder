import { Hero } from "@/components/sections/Hero";
import { Manifest } from "@/components/sections/Manifest";
import { ChapterSection } from "@/components/sections/ChapterSection";
import { Workshop } from "@/components/sections/Workshop";
import { Capabilities } from "@/components/sections/Capabilities";
import { SystemPanel } from "@/components/sections/SystemPanel";
import { Vita, Outro } from "@/components/sections/Closing";
import { CHAPTERS } from "@/content/resume";

/**
 * Server Component. Die Seite ist eine durchgehende Fahrt: Hero, Prinzip,
 * drei Kapitel, Werkstatt, Werkzeugkasten, System, Werdegang, Kontakt. Jedes
 * Kapitel steuert ueber `data-chapter` das Modell im Hintergrund - die
 * Reihenfolge im DOM ist damit zugleich die Dramaturgie der 3D-Szene.
 */
export default function Home() {
  return (
    <main id="top">
      <Hero />
      <Manifest />

      {CHAPTERS.map((chapter, i) => (
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
