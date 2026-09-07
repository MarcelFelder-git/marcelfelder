/**
 * Das Tempo der Seite — alle Stellschrauben an einem Ort.
 *
 * Diese Zahlen lagen vorher verstreut: eine in einer Tailwind-Klasse
 * (`min-h-[130vh]`), eine in einem Template-String in `Showcase`, zwei
 * mitten im rAF-Loop des `ScrollDriver`. Zusammen bestimmen sie, wie lang
 * sich die Seite anfuehlt — und genau deshalb waren sie nicht zu finden,
 * wenn man sie suchte.
 *
 * Hier stehen nur Zahlen, keine Abhaengigkeiten: dieses Modul wird sowohl
 * vom DOM (Hauptbundle) als auch von der Szene geladen, und ein einziger
 * Import aus three wuerde die gesamte 3D-Kette ins Hauptbundle ziehen.
 *
 * ## Was welche Zahl tut
 *
 * Es gibt zwei voellig verschiedene Arten von "Uebergang", und sie haben
 * nichts miteinander zu tun:
 *
 *   1. WIE WEIT man scrollen muss, bis der naechste Abschnitt dran ist.
 *      Das sind `TUNNEL_VH_PER_PROJECT`, `TUNNEL_VH_LEAD` und
 *      `CHAPTER_VH`. Sie bestimmen die Hoehe der Abschnitte im DOM. Kuerzer
 *      heisst: dasselbe passiert auf weniger Strecke, die Fahrt wird
 *      schneller. Die Kamera haengt am Fortschritt, nicht an Pixeln — das
 *      Bild wird also nicht abgeschnitten, es laeuft nur zuegiger.
 *
 *   2. WIE LANGE zwei Hintergruende ineinander stehen, waehrend man die
 *      Grenze passiert. Das sind `SCENE_BLEND` und `SCENE_WINDOW`. Kuerzer
 *      heisst: die Ueberblendung ist schneller vorbei, die Szenen stehen
 *      frueher wieder allein.
 *
 * Wer die Seite kuerzer haben will, dreht an (1). Wer die Ueberblendungen
 * knackiger haben will, an (2).
 */

/* --- 1. Scrollstrecke ---------------------------------------------- */

/**
 * Bildschirmhoehen, die jedes Projekt im Tunnel bekommt.
 *
 * Das ist der groesste einzelne Hebel auf die Laenge der Seite: bei sechs
 * Projekten kostet jede Einheit hier sechs Einheiten Gesamtlaenge.
 * Darunter wird die Fahrt hektisch — man kommt an einer Tafel an, bevor
 * man die vorige gelesen hat.
 */
export const TUNNEL_VH_PER_PROJECT = 52;

/** Vor- und Nachlauf des Tunnels: Einfahrt und Ausfahrt. */
export const TUNNEL_VH_LEAD = 40;

/**
 * Hoehe eines Disziplin-Kapitels.
 *
 * Muss deutlich ueber 100 liegen: der Textblock klebt waehrend der Fahrt
 * (sticky), und bei genau einer Bildschirmhoehe gaebe es keinen Weg, den
 * er kleben koennte — der Uebergang waere ein Sprung statt einer
 * Uebergabe.
 */
export const CHAPTER_VH = 105;

/* --- 2. Ueberblendung ---------------------------------------------- */

/**
 * Wie schnell die Szenengewichte auf ihr Ziel zulaufen.
 *
 * Zeitkonstante einer exponentiellen Annaeherung: nach 1/LAMBDA Sekunden
 * ist rund zwei Drittel des Weges zurueckgelegt. Bei 9 also nach gut
 * einer Zehntelsekunde.
 *
 * Groesser = kuerzer. Ueber etwa 14 verschwindet die Daempfung praktisch,
 * und dann klebt das Bild wieder direkt am Scrollwert — ein Sprung in der
 * Scrollposition (Anker-Link, Pos1-Taste) kommt dann als Schnitt an
 * statt als Bewegung. Genau das war frueher das Problem.
 */
export const SCENE_BLEND = 9;

/**
 * Breite des Fensters, in dem ein Abschnitt Anspruch auf den Hintergrund
 * erhebt, in Bildschirmhoehen.
 *
 * Kleiner = kuerzer: die Abschnitte ueberlappen sich weniger lang, die
 * Uebergabe faellt knapper aus. Unter etwa 0.35 entstehen Luecken, in
 * denen kein Abschnitt Anspruch hat — dann bleibt das letzte Bild stehen,
 * bis der naechste greift, und das sieht aus wie ein Haenger.
 */
export const SCENE_WINDOW = 0.5;
