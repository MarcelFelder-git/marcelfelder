import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SceneLayer } from "@/components/canvas/SceneLayer";
import { CommandPalette } from "@/components/terminal/CommandPalette";
import { AmbientGlow } from "@/components/audio/AmbientGlow";
import { AudioBadge } from "@/components/audio/AudioBadge";
import { BootSequence } from "@/components/layout/BootSequence";
import { Hud, Reticle } from "@/components/layout/Hud";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";
import { SITE_URL } from "@/lib/siteUrl";
import { notFound } from "next/navigation";
import { LocaleProvider } from "@/lib/i18n";
import { LOCALES, isLocale, localePath, type Locale } from "@/lib/locale";
import { UI_TEXT } from "@/content/ui";

// Space Grotesk statt Inter: eckiger, geometrischer, technischer -
// die Display-Groessen dieser Seite tragen die eigentliche Gestaltung,
// eine humanistische Groteske wie Inter wuerde das wieder abrunden.
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-stack",
  display: "swap",
});

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Metadaten je Sprache, mit Verweis auf die jeweils andere.
 *
 * `alternates.languages` ist das hreflang: Google lernt daraus, dass
 * `/` und `/en` dieselbe Seite in zwei Sprachen sind, statt sie als
 * doppelten Inhalt zu werten. x-default zeigt auf Deutsch, weil das die
 * Adresse ist, die bisher verschickt wurde.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "de";
  const t = UI_TEXT[locale].meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.title, template: "%s · Marcel Felder" },
    description: t.description,
    alternates: {
      canonical: localePath(locale),
      languages: { de: "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      locale: locale === "de" ? "de_DE" : "en_GB",
      alternateLocale: locale === "de" ? "en_GB" : "de_DE",
      siteName: "Marcel Felder",
      title: t.title,
      description: t.ogDescription,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#08090e",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Params }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper font-sans antialiased">
        <LocaleProvider locale={locale}>
        {/* Skip-Link: die Seite ist 3D- und animationslastig, Tastaturnutzer
            brauchen den Ausweg */}
        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper"
        >
          {locale === "de" ? "Zum Inhalt springen" : "Skip to content"}
        </a>

        {/* Die 3D-Szene liegt hinter dem gesamten Inhalt */}
        <SceneLayer />

        {/* Ambient: Raster und audio-reaktiver Lichtkegel.
            Liegt jetzt UEBER dem Canvas statt dahinter - seit die Szene
            einen undurchsichtigen Grund hat (noetig fuer Bloom), waere
            hinter ihr nichts mehr davon zu sehen. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[2]"
        >
          <div className="absolute inset-0 column-grid opacity-40" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(58rem 38rem at 50% 0%, rgb(var(--audio-glow, 56 189 248) / calc(0.05 + var(--audio-level, 0) * 0.18)), transparent 70%)",
            }}
          />
        </div>

        <AmbientGlow />
        <Hud />
        <Reticle />

        <div className="relative z-10">{children}</div>

        {/* Filmkorn ganz oben auf dem Stapel, aber unter Overlays wie
            Palette und Boot-Sequenz. Ohne diese Ebene sieht die Seite
            aus wie ein Entwurf; mit ihr wie ein Bild. */}
        <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[45]" />

        {/* Das Mischpult selbst steht im Signal-Kapitel. Hier bleibt nur
            die Notbremse: solange die Engine laeuft, muss man sie von
            jeder Stelle der Seite aus wieder ausschalten koennen. */}
        <AudioBadge />
        <CommandPalette />
        <BootSequence />

        {/* Beide cookielos, deshalb ohne Banner. Analytics zaehlt Besuche
            und Herkunft; Speed Insights liefert Core Web Vitals von echten
            Geraeten, nach Browser aufgeschluesselt - die einzige Messung,
            die sagt, ob die Seite auf einem fremden MacBook laeuft, ohne
            eines zu haben. Beide laden erst nach dem Inhalt. */}
        <Analytics />
        <SpeedInsights />
        </LocaleProvider>
      </body>
    </html>
  );
}
