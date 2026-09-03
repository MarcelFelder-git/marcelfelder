import { NextResponse } from "next/server";
import { CHAPTERS, PROFILE, STACK_MARQUEE, STACK_MARQUEE_B, SYSTEM_SPECS } from "@/content/resume";

/**
 * Öffentliche JSON-Ansicht dieser Seite.
 *
 * Kein separates CMS, kein zweiter Datensatz zum Pflegen: dieselben
 * `content/resume.ts`-Exporte, die die Kapitel rendern, werden hier
 * unverändert als JSON ausgeliefert. Was auf der Seite steht, steht auch
 * hier - eine Abweichung zwischen beiden wäre ein Bug, kein Redaktionsfall.
 *
 * Edge-Runtime, weil hier nichts passiert, was Node braucht.
 */
export const runtime = "edge";

export async function GET() {
  return NextResponse.json(
    {
      profile: PROFILE,
      chapters: CHAPTERS.map((c) => ({
        id: c.id,
        label: c.label,
        caption: c.caption,
        headline: c.headline,
        skills: c.skills,
      })),
      stack: { web: STACK_MARQUEE, engineering: STACK_MARQUEE_B },
      specs: SYSTEM_SPECS,
    },
    {
      headers: {
        // Am Edge cachebar, aber kurz - das hier ist eine Visitenkarte,
        // keine Preisliste, aber es soll auch nicht ewig hinterherhinken.
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    },
  );
}
