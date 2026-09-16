/**
 * Zentrale Stelle fuer alles, was im Text mehrfach auftaucht.
 *
 * Alle Felder, die leer bleiben duerfen, werden auch nicht angezeigt.
 * Das ist Absicht: auf einer Seite, mit der man sich bewirbt, ist eine
 * fehlende Zeile besser als eine Zeile, in der "eintragen" steht, und ein
 * fehlender Knopf besser als einer, der ins Leere fuehrt.
 */

/**
 * ACHTUNG: Diese Adresse muss existieren und Post empfangen, bevor die
 * Seite live geht. Sie ist der einzige Rueckkanal auf der ganzen Seite.
 */
export const CONTACT_EMAIL = "marcel.felder.bln@gmail.com";

/**
 * Der Lebenslauf zum Herunterladen.
 *
 * Der meistgenannte Punkt im Recruiter-Gutachten: Firma, Zeitraum, Rolle
 * in zehn Sekunden, nicht aus Fliesstext gefiltert. Die Datei liegt unter
 * public/lebenslauf und enthaelt keine Adresse und keine Telefonnummer -
 * nur das, was ohnehin auf der Seite steht.
 */
export const CV_PATH = "/lebenslauf/Marcel-Felder-Lebenslauf.pdf";
export const CV_PATH_EN = "/lebenslauf/Marcel-Felder-CV-EN.pdf";
export const CV_FILE = { de: "Marcel-Felder-Lebenslauf.pdf", en: "Marcel-Felder-CV-EN.pdf" } as const;

/**
 * Die nuechterne Zeile unter der Headline.
 *
 * Rolle, Stack, Standort, Verfuegbarkeit - ohne Bild und ohne Satz. Der
 * Recruiter im Gutachten hat genau das gesucht und in der Headline nicht
 * gefunden: "Was kann die Person, und kann ich sie ueberhaupt
 * einstellen?" Beides steht jetzt in einer Zeile, bevor der Text anfaengt.
 */
export const HERO_FACTS = [
  "Frontend-Entwickler",
  "React · Next.js · TypeScript",
  "Vollzeit",
  "Köln oder remote",
  "ab sofort",
] as const;

/** Wird unter der Mailadresse gezeigt. Leere Felder fallen weg. */
export const CONTACT_FACTS = {
  /** z. B. "Frankfurt am Main, Umzug moeglich" */
  location: "Köln",
  availability: "Vollzeit, Köln oder remote, ab sofort",
} as const;

export const HERO_FACTS_EN = [
  "Frontend developer",
  "React · Next.js · TypeScript",
  "Full-time",
  "Cologne or remote",
  "available now",
] as const;

export const CONTACT_FACTS_EN = {
  location: "Cologne",
  availability: "Full-time, Cologne or remote, available now",
} as const;

/** Eintraege ohne `href` werden nicht gerendert. */
export const SOCIALS = [
  { label: "GitHub", href: "https://github.com/MarcelFelder-git" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/marcel-felder-036481384/",
  },
] as const;
