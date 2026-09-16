import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Zwei Eintraege, eine Seite: Deutsch auf der Wurzel, Englisch auf /en.
 * Die Anker sind keine Seiten. `alternates` sagt Google, dass beide
 * dieselbe Seite in zwei Sprachen sind.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { de: SITE_URL, en: `${SITE_URL}/en` };
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, priority: 1, alternates: { languages } },
    { url: `${SITE_URL}/en`, lastModified, priority: 0.9, alternates: { languages } },
  ];
}
