import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Tab-Icon.
 *
 * Bis hierher lag in app/ die favicon.ico aus create-next-app - das
 * Next.js-Dreieck, 25.931 Byte, in jedem Tab neben dem eigenen Namen.
 * Jetzt: das Monogramm aus dem Header, auf dem Grundton der Seite,
 * beim Build gerendert wie das Vorschaubild.
 *
 * 32 Pixel sind wenig. Zwei Buchstaben in Fettschrift sind das, was in
 * der Groesse noch als Form lesbar bleibt; ein Logo waere ein Fleck.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const grotesk = await readFile(
    join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090e",
          borderRadius: 7,
          color: "#38bdf8",
          fontFamily: "Space Grotesk",
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: "-0.06em",
        }}
      >
        MF
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Grotesk", data: grotesk, weight: 700, style: "normal" },
      ],
    },
  );
}
