/**
 * Sprachen und Adressen, ohne React.
 *
 * Getrennt von lib/i18n.tsx, weil das ein Client-Modul ist: alles, was
 * eine "use client"-Datei exportiert, kommt in Server-Komponenten nur als
 * Verweis an, nicht als Wert - `LOCALES.map` war dort ploetzlich keine
 * Funktion mehr. Konstanten und Hilfsfunktionen leben deshalb hier und
 * werden von beiden Seiten importiert.
 */
export type Locale = "de" | "en";
export const LOCALES: Locale[] = ["de", "en"];
export const DEFAULT_LOCALE: Locale = "de";

export function isLocale(value: string): value is Locale {
  return value === "de" || value === "en";
}

/** Pfad der Startseite in einer Sprache. Deutsch bleibt die Wurzel. */
export function localePath(locale: Locale) {
  return locale === "de" ? "/" : "/en";
}
