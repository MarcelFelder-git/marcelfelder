import { PROJECTS, projectsFor } from "@/content/projects";
import {
  CHAPTERS,
  MANIFEST,
  PROFILE,
  RESUME_LINES,
  STACK_MARQUEE,
  STACK_MARQUEE_B,
  VITA,
} from "@/content/resume";
import {
  CHAPTERS_EN,
  MANIFEST_EN,
  PROFILE_EN,
  RESUME_LINES_EN,
  STACK_MARQUEE_B_EN,
  VITA_EN,
} from "@/content/resume.en";
import {
  CONTACT_EMAIL,
  CONTACT_FACTS,
  CONTACT_FACTS_EN,
  CV_FILE,
  CV_PATH,
  CV_PATH_EN,
  HERO_FACTS,
  HERO_FACTS_EN,
  SOCIALS,
} from "@/content/site";
import { UI_TEXT, type UI } from "@/content/ui";
import type { Locale } from "@/lib/locale";

/**
 * Alle Inhalte einer Sprache an einer Stelle - ohne React, damit auch
 * Server-Komponenten (page.tsx, Metadaten) sie aufrufen koennen. Die
 * Hooks dazu stehen in lib/content.ts.
 *
 * Alle Inhalte einer Sprache an einer Stelle.
 *
 * Die Komponenten holen sich ueber `useContent()` genau das Objekt, das
 * zu ihrer Route gehoert, und muessen nicht wissen, dass es zwei gibt.
 * Fuer Server-Komponenten (page.tsx, Metadaten) gibt es `contentFor`.
 */
export function contentFor(locale: Locale) {
  const en = locale === "en";
  return {
    locale,
    PROJECTS: en ? projectsFor("en") : PROJECTS,
    PROFILE: en ? PROFILE_EN : PROFILE,
    MANIFEST: en ? MANIFEST_EN : MANIFEST,
    CHAPTERS: en ? CHAPTERS_EN : CHAPTERS,
    VITA: en ? VITA_EN : VITA,
    RESUME_LINES: en ? RESUME_LINES_EN : RESUME_LINES,
    STACK_MARQUEE,
    STACK_MARQUEE_B: en ? STACK_MARQUEE_B_EN : STACK_MARQUEE_B,
    HERO_FACTS: en ? HERO_FACTS_EN : HERO_FACTS,
    // Weit getypt, sonst haelt TypeScript die Literale fuer immer wahr
    // und markiert die Pruefung in Closing.tsx als unerreichbar.
    CONTACT_FACTS: (en ? CONTACT_FACTS_EN : CONTACT_FACTS) as {
      location: string;
      availability: string;
    },
    CONTACT_EMAIL,
    SOCIALS,
    CV_PATH: en ? CV_PATH_EN : CV_PATH,
    CV_FILE: CV_FILE[locale],
    t: UI_TEXT[locale] as UI,
  };
}

export type Content = ReturnType<typeof contentFor>;
