import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SceneLayer } from "@/components/canvas/SceneLayer";
import { CommandPalette } from "@/components/terminal/CommandPalette";
import { AmbientGlow } from "@/components/audio/AmbientGlow";
import { AudioBadge } from "@/components/audio/AudioBadge";
import { BootSequence } from "@/components/layout/BootSequence";
import { Hud, Reticle } from "@/components/layout/Hud";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://flagship-portfolio.vercel.app"),
  title: {
    default: "Marcel Felder — Structural, Signal & Software Engineering",
    template: "%s · Marcel Felder",
  },
  description:
    "Interaktives Engineering-Portfolio an der Schnittstelle von Bauingenieurwesen, Tontechnik und Fullstack-Entwicklung.",
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Marcel Felder",
    title: "Marcel Felder — Structural, Signal & Software Engineering",
    description:
      "Ein scrollgetriebenes 3D- und Audio-Showcase: Tragwerk, Frequenzspektrum und Komponenten-Matrix in einer Szene.",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${grotesk.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper font-sans antialiased">
        {/* Skip-Link: die Seite ist 3D- und animationslastig, Tastaturnutzer
            brauchen den Ausweg */}
        <a
          href="#top"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper"
        >
          Zum Inhalt springen
        </a>

        {/* Die 3D-Szene liegt hinter dem gesamten Inhalt */}
        <SceneLayer />

        {/* Ambient: Raster und audio-reaktiver Lichtkegel.
            Liegt jetzt UEBER dem Canvas statt dahinter - seit die Szene
            einen undurchsichtigen Grund hat (noetig fuer Bloom), waere
            hinter ihr nichts mehr davon zu sehen. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[2] mix-blend-screen"
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
      </body>
    </html>
  );
}
