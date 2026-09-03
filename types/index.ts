export type ViewportMode = "structure" | "signal" | "code";

export interface Discipline {
  id: ViewportMode;
  label: string;
  caption: string;
  headline: string;
  body: string;
  metrics: { label: string; value: string }[];
}

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  role: string | null;
  created_at: string;
}
