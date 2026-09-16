"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Zwei Sprachen, zwei Adressen.
 *
 * Deutsch liegt auf `/`, Englisch auf `/en`. Kein Umschalter, der die
 * Texte im Browser tauscht: ein Link in einer englischen Bewerbung muss
 * englisch aufgehen, ohne dass jemand erst einen Schalter sucht. Und
 * keine Umleitung nach Browser-Sprache: ein deutscher Recruiter mit
 * englischem Betriebssystem landet sonst auf der falschen Seite.
 *
 * Die Sprache kommt aus dem Routensegment (`app/[locale]`) und wird hier
 * per Kontext an alle Client-Komponenten gereicht. Inhalte holen sich
 * die Komponenten ueber `useContent()` und `useT()`.
 */
import { DEFAULT_LOCALE, type Locale } from "./locale";

export type { Locale } from "./locale";
export { LOCALES, DEFAULT_LOCALE, isLocale, localePath } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
