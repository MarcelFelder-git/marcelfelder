"use client";

import { useEffect, useState } from "react";

/**
 * Wie die Befehlstaste auf diesem Rechner heisst.
 *
 * Auf dem Mac ist es Cmd, ueberall sonst Strg. Der Tastendruck selbst
 * nimmt beide (metaKey || ctrlKey), aber die Beschriftung muss sich
 * entscheiden - und "⌘K" auf einem Windows-Rechner ist ein Schild in
 * der falschen Sprache.
 *
 * Erst nach dem Mount bekannt: auf dem Server gibt es keinen Navigator,
 * und wer dort raten wuerde, liefert der Haelfte der Besucher fuer
 * einen Moment die falsche Taste. Bis dahin `null`, und der Aufrufer
 * zeigt in der Zeit nichts.
 */
export function useModifierKey(): "⌘" | "Strg" | null {
  const [key, setKey] = useState<"⌘" | "Strg" | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
    const apple = /mac|iphone|ipad|ipod/i.test(platform);
    setKey(apple ? "⌘" : "Strg");
  }, []);

  return key;
}
