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
  if (pathname === "/de" || pathname.startsWith("/de/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/de/, "") || "/";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Nur Seiten. Statische Dateien, Bilder, API und Metadaten-Routen
  // laufen am Middleware vorbei.
  matcher: ["/", "/de", "/de/:path*", "/en", "/en/:path*"],
};
