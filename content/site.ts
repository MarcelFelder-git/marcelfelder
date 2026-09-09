/**
 * Zentrale Stelle fuer alles, was im Text mehrfach auftaucht.
 *
 * Alle Felder, die leer bleiben duerfen, werden auch nicht angezeigt.
 * Das ist Absicht: auf einer Seite, mit der man sich bewirbt, ist eine
 * fehlende Zeile besser als eine Zeile, in der "eintragen" steht, und ein
 * fehlender Knopf besser als einer, der ins Leere fuehrt.
 */

/**
 * ACHTUNG: Diese Adresse muss existieren und Post empfangen, bevor die
 * Seite live geht. Sie ist der einzige Rueckkanal auf der ganzen Seite.
 */
export const CONTACT_EMAIL = "mail@marcelfelder.dev";

/** Wird unter der Mailadresse gezeigt. Leere Felder fallen weg. */
export const CONTACT_FACTS = {
  /** z. B. "Frankfurt am Main, Umzug moeglich" */
  location: "",
  /** z. B. "Ab sofort verfuegbar, Vollzeit" */
  availability: "",
} as const;

/** Eintraege ohne `href` werden nicht gerendert. */
export const SOCIALS = [
  { label: "GitHub", href: "https://github.com/MarcelFelder-git" },
  { label: "LinkedIn", href: "" },
] as const;
