import { NextResponse, type NextRequest } from "next/server";

/**
 * Deutsch bleibt die Wurzel.
 *
 * Die Seiten liegen unter app/[locale], also gibt es intern `/de` und
 * `/en`. Nach aussen soll Deutsch aber weiter auf `/` liegen - alle
 * bisher verschickten Links zeigen dorthin. Deshalb: `/` wird still auf
 * `/de` umgeschrieben (Adresse bleibt), und wer `/de` direkt eintippt,
 * wird auf `/` umgeleitet, damit es die deutsche Seite nur unter einer
 * Adresse gibt.
 *
 * Keine Umleitung nach Browser-Sprache, mit Absicht.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/de";
    return NextResponse.rewrite(url);
  }
  // Nur die Seite selbst, nicht ihre Metadaten-Routen: das Vorschaubild
  // liegt unter /de/opengraph-image und muss erreichbar bleiben, sonst
  // zeigt jede geteilte deutsche Adresse ein leeres Kaertchen.
  if (pathname === "/de" || pathname === "/de/") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Nur Seiten. Statische Dateien, Bilder, API und Metadaten-Routen
  // laufen am Middleware vorbei.
  matcher: ["/", "/de", "/de/"],
};
