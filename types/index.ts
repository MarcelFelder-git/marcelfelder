export type ViewportMode = "structure" | "signal" | "code";

export interface ChapterMetric {
  label: string;
  value: number;
  suffix: string;
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
