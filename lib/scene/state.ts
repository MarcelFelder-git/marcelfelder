/**
 * Der Draht zwischen Scrollposition und 3D-Szene.
 *
 * Bewusst ein mutierbares Modul-Objekt und kein React-State: diese Werte
 * aendern sich in jedem einzelnen Frame. Ein setState pro Frame wuerde den
 * kompletten Komponentenbaum durchrendern, waehrend useFrame hier einfach
 * die aktuellen Zahlen liest - null Renderkosten, null Allokationen.
 *
 * ## Ein Gewicht fuer alles
 *
 * Frueher hatten Hero und Tunnel eigene `active`-Werte neben den
 * Kapitelgewichten, und die Kamera schaltete an Schwellen zwischen drei
 * Zweigen um (`if (hero.active > 0.5) ... return`). Das kann nicht weich
 * sein: in dem Moment, in dem ein Zweig uebernimmt, springt das Ziel der
 * Kamera. Zusaetzlich wurden die Kapitelgewichte schlagartig auf null
 * gezogen, sobald Hero oder Tunnel "gewannen" - die Modelle sind dadurch
 * hart erschienen und verschwunden, was sich anfuehlt, als wuerde die
 * Szene jedes Mal neu geladen.
 *
 * Jetzt liegen alle fuenf Szenen in EINEM normierten Gewichtsvektor. Es
 * gibt keinen Umschaltpunkt mehr, nur noch eine Mischung - und die wird
 * zusaetzlich zeitlich gedaempft, damit auch ein Sprung in der
 * Scrollposition (Anker-Link, Tastatur, Maus-Rad-Salve) nicht als Sprung
 * im Bild ankommt.
 */

export type SceneKey = "hero" | "structure" | "signal" | "code" | "tunnel";

export const SCENE_KEYS: SceneKey[] = [
  "hero",
  "structure",
  "signal",
  "code",
  "tunnel",
];

export interface SceneState {
  /** Globaler Scrollfortschritt 0..1 ueber das gesamte Dokument. */
  progress: number;
  /**
   * Normierte, zeitlich geglaettete Gewichte. Summe ist 1, solange
   * ueberhaupt eine Szene beansprucht wird.
   */
  weights: Record<SceneKey, number>;
  /** Rohe Zielgewichte aus der Scrollmessung, vor der Daempfung. */
  targets: Record<SceneKey, number>;
  /** Zeigerposition in NDC (-1..1), geglaettet. */
  pointer: { x: number; y: number };
  /** Fortschritt innerhalb des aktiven Kapitels, 0..1. */
  chapterProgress: number;
  /** Position auf der Fahrt durch den Korridor, 0 = Eingang, 1 = Ende. */
  tunnelProgress: number;
}

export const sceneState: SceneState = {
  progress: 0,
  // Startwert: beim ersten Frame steht man oben, und der Graph soll
  // sofort da sein statt erst nach dem ersten Scroll-Tick einzublenden.
  weights: { hero: 1, structure: 0, signal: 0, code: 0, tunnel: 0 },
  targets: { hero: 1, structure: 0, signal: 0, code: 0, tunnel: 0 },
  pointer: { x: 0, y: 0 },
  chapterProgress: 0,
  tunnelProgress: 0,
};

/**
 * Framerate-unabhaengige Annaeherung.
 *
 * Ein fester Faktor pro Frame (`v += (ziel - v) * 0.1`) haengt an der
 * Bildrate: auf 144 Hz waere dieselbe Bewegung mehr als doppelt so
 * schnell wie auf 60 Hz. Die Exponentialform bindet sie an die Zeit.
 */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number,
) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
