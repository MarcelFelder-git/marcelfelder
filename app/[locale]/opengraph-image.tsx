import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UI_TEXT } from "@/content/ui";
import { isLocale } from "@/lib/locale";
import { PROFILE } from "@/content/resume";
import { PROFILE_EN } from "@/content/resume.en";

/**
 * Vorschaubild fuer LinkedIn, Mail-Clients, Messenger.
 *
 * Wird beim Build aus JSX gerendert, nicht als PNG eingecheckt: aendert
 * sich Name, Rolle oder Palette, aendert sich das Bild mit, statt als
 * veraltete Datei stehen zu bleiben.
 *
 * Bewusst ohne 3D und ohne Screenshot. Das Kaertchen ist 1200 x 630 und
 * wird auf dem Telefon auf Daumenbreite gestaucht - ein Screenshot des
 * Tunnels waere dort ein dunkles Rechteck. Was in der Groesse traegt,
 * ist Text auf der Palette der Seite, und ein Hinweis darauf, dass die
 * Seite selbst mehr kann als das Bild.
 *
 * Die Hausschrift kommt als Datei aus dem Repo, nicht per fetch beim
 * Build. Die mitgelieferte Schrift von `next/og` hat nur ein Gewicht,
 * und eine Headline in Regular sieht auf einem Vorschaukaertchen aus
 * wie ein Platzhalter. Space Grotesk Bold, OFL, 68 KB - einmal
 * eingecheckt, dann stabil.
 */

export const alt = "Marcel Felder, Frontend-Entwickler / frontend developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "de";
  const t = UI_TEXT[locale].meta;
  // Headline in zwei Zeilen, die zweite mit Akzent auf dem letzten
  // Wortpaar: "die man hoeren kann." / "you can hear."
  // Vorname weiss, Nachname im Akzent - wie im Hero.
  const [first, ...rest] = (locale === "de" ? PROFILE : PROFILE_EN).claim.split(" ");
  const secondAccent = rest.join(" ");
  const eyebrow = UI_TEXT[locale].hero.eyebrow.toUpperCase();
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(ellipse at 78% 30%, #123a55 0%, #0c1626 42%, #08090e 78%)",
          color: "#ededee",
          fontFamily: "Space Grotesk",
        }}
      >
        {/* Feines Raster, dieselbe Sprache wie die Seite. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 22,
            letterSpacing: "0.22em",
            color: "#38bdf8",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#38bdf8",
            }}
          />
          {eyebrow}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>{first}</span>
            {/* Satori zieht benachbarte Spans ohne Leerzeichen zusammen.
                Flex mit Abstand statt eines Leerzeichens, das nicht
                ankommt. */}
            <span style={{ display: "flex", gap: 24 }}>
              <span style={{ color: "#38bdf8" }}>{secondAccent}</span>
            </span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#b7bcc6",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {t.ogSub}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 22,
            color: "#8a919c",
            letterSpacing: "0.08em",
          }}
        >
          <span>{t.ogCity}</span>
          <span style={{ color: "#a855f7" }}>
            Next.js 15 · React Three Fiber · Web Audio API
          </span>
        </div>
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
