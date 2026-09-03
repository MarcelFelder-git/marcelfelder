import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CommandPalette } from "@/components/terminal/CommandPalette";
import { AmbientGlow } from "@/components/audio/AmbientGlow";
import { ControlBar } from "@/components/audio/ControlBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
      "Ein 3D- und Audio-Showcase: Tragwerk, Frequenzspektrum und Komponenten-Matrix in einem Viewport.",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-blueprint-void font-sans antialiased">
        {/* Skip-Link: die Seite ist 3D-lastig, Tastaturnutzer brauchen den Ausweg */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-signal-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-blueprint-void"
        >
          Zum Inhalt springen
        </a>

        {/* Ambient-Layer: Gitter + audio-reaktiver Lichtkegel, klick-transparent */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 blueprint-grid opacity-40" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(58rem 38rem at 50% -8%, rgb(var(--audio-glow, 56 189 248) / calc(0.10 + var(--audio-level, 0) * 0.22)), transparent 70%)",
            }}
          />
          {/* Vignette bewusst weich: dieser Layer ist fixed, ein harter
              Abfall wuerde das Raster auf jeder Scrollposition ab der
              halben Viewporthoehe komplett ausloeschen. */}
          <div className="absolute inset-0 bg-[radial-gradient(145%_120%_at_50%_0%,transparent_45%,rgba(5,7,13,0.55)_100%)]" />
        </div>

        <AmbientGlow />
        {children}
        <ControlBar />
        <CommandPalette />
      </body>
    </html>
  );
}
