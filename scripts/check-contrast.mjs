/**
 * Prueft die Textfarben gegen jeden Grundton, den die Szene annehmen kann.
 *
 * Seit die Abschnitte ihr eigenes Farbklima haben, ist "der Hintergrund"
 * kein einzelner Wert mehr — Text steht je nach Scrollposition auf einem
 * von fuenf Grundtoenen und auf jeder Mischung dazwischen. Weil die
 * Mischung eine Interpolation zwischen zwei Ecken ist und Kontrast in der
 * Luminanz monoton laeuft, genuegt es, die Ecken zu pruefen: was auf allen
 * fuenf besteht, besteht auch dazwischen.
 *
 *   node scripts/check-contrast.mjs
 *
 * Beendet sich mit Code 1, sobald eine Paarung unter ihrer Schwelle liegt.
 */

/** Grundtoene aus lib/scene/palette.ts, sRGB 0..255. */
const GROUND = {
  hero: [8, 9, 14],
  structure: [14, 12, 9],
  signal: [12, 8, 20],
  code: [6, 16, 15],
  tunnel: [4, 5, 13],
};

/** Textfarben aus app/globals.css mit ihrer jeweiligen Mindestschwelle. */
const TEXT = {
  "--color-ink    #ededee": { hex: "#ededee", min: 4.5 },
  "--color-mute   #8b8b94": { hex: "#8b8b94", min: 4.5 },
  "--color-faint  #808088": { hex: "#808088", min: 4.5 },
  // Cyan traegt Links und aktive Zustaende, ist also Text.
  "--color-accent #38bdf8": { hex: "#38bdf8", min: 4.5 },
};

/**
 * Der helle Abschnitt am Seitenende hat seinen eigenen Satz Tokens. Er
 * steht auf genau einem Grund, deshalb ist das hier eine einzelne
 * Paarungsliste statt einer Matrix.
 */
const LIGHT_GROUND = [236, 238, 242];
const LIGHT_TEXT = {
  "--color-ink        #0c0e13": { hex: "#0c0e13", min: 4.5 },
  "--color-mute       #4b5058": { hex: "#4b5058", min: 4.5 },
  "--color-faint      #5c626c": { hex: "#5c626c", min: 4.5 },
  "--color-accent     #0369a1": { hex: "#0369a1", min: 4.5 },
  "--color-accent-alt #6d28d9": { hex: "#6d28d9", min: 4.5 },
};

const channel = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const luminance = ([r, g, b]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const parse = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;
for (const [label, { hex, min }] of Object.entries(TEXT)) {
  const fg = parse(hex);
  const row = [];
  for (const [scene, bg] of Object.entries(GROUND)) {
    const ratio = contrast(fg, bg);
    const ok = ratio >= min;
    if (!ok) failed++;
    row.push(`${scene} ${ratio.toFixed(2)}${ok ? "" : "  ZU WENIG"}`);
  }
  console.log(`${label}  (min ${min})`);
  for (const entry of row) console.log(`   ${entry}`);
}

console.log('\nHeller Abschnitt (data-tone="light")');
for (const [label, { hex, min }] of Object.entries(LIGHT_TEXT)) {
  const ratio = contrast(parse(hex), LIGHT_GROUND);
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(
    `   ${label}  ${ratio.toFixed(2)}  (min ${min})${ok ? "" : "  ZU WENIG"}`,
  );
}

if (failed > 0) {
  console.error(`\n${failed} Paarung(en) unter der Schwelle.`);
  process.exit(1);
}
console.log("\nAlle Paarungen bestehen WCAG AA.");
