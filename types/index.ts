export type ViewportMode = "structure" | "signal" | "code";

export interface ChapterMetric {
  label: string;
  value: number;
  suffix: string;
  /**
   * Statt der festen Zahl wird gemessen.
   *
   * "fps" liest die tatsaechliche Bildrate der laufenden Szene. Eine
   * gemessene Zahl ist auf einer Seite, die ihre eigene Technik zeigt,
   * mehr wert als eine behauptete: sie kann auch mal schlecht aussehen,
   * und genau deshalb glaubt man ihr. `value` bleibt trotzdem gesetzt
   * und wird angezeigt, bis die erste Messung da ist.
   */
  live?: "fps";
}

export interface Chapter {
  id: ViewportMode;
  /** Zweistellige Kapitelnummer, als Outline-Type gesetzt. */
  index: string;
  label: string;
  caption: string;
  headline: string;
  body: string;
  /** Was die 3D-Szene in diesem Kapitel gerade tut. */
  aside: string;
  skills: string[];
  metrics: ChapterMetric[];
}
