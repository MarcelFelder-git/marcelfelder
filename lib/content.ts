"use client";

import { useMemo } from "react";
import { UI_TEXT, type UI } from "@/content/ui";
import { useLocale } from "@/lib/i18n";
import { contentFor, type Content } from "@/lib/content-data";

export type { Content } from "@/lib/content-data";

export function useContent(): Content {
  const locale = useLocale();
  return useMemo(() => contentFor(locale), [locale]);
}

/** Nur die Beschriftungen, fuer Komponenten ohne Inhalt. */
export function useT(): UI {
  return UI_TEXT[useLocale()];
}
