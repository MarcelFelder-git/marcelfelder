/**
 * Basisadresse fuer Vorschaubilder, kanonische Links, robots und sitemap.
 *
 * Hier stand einmal eine feste URL, geraten aus dem Projektnamen. Stimmt
 * sie nicht mit dem echten Deployment ueberein, zeigen alle
 * Vorschaubilder beim Teilen ins Leere - und das faellt frueh niemandem
 * auf, weil die Seite selbst tadellos aussieht.
 *
 * Vercel setzt beim Bauen `VERCEL_PROJECT_PRODUCTION_URL` auf die
 * Produktionsadresse des Projekts, egal wie es heisst. Damit stimmt die
 * Angabe von selbst, auch nach einer Umbenennung. NEXT_PUBLIC_SITE_URL
 * sticht das, falls spaeter eine eigene Domain dazukommt.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
