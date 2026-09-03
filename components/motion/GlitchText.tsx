"use client";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Text mit Übertragungsfehler.
 *
 * Die beiden versetzten Farbklone kommen aus `data-text` und werden per
 * CSS-Pseudoelement erzeugt — im DOM steht der Text also genau einmal.
 * Würde man die Klone als echte Spans rendern, läse ein Screenreader
 * dieselbe Überschrift dreimal vor.
 *
 * Bei `prefers-reduced-motion` entfällt der Effekt vollständig: ein
 * zuckender Text ist genau die Art von Bewegung, gegen die diese
 * Einstellung existiert.
 */
export function GlitchText({
  text,
  as: Tag = "span",
  className,
  onHoverOnly = false,
  chromatic = true,
}: {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  /** Störung nur bei Hover statt im Dauerintervall. */
  onHoverOnly?: boolean;
  chromatic?: boolean;
}) {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag
      data-text={text}
      className={cn(
        "glitch",
        onHoverOnly && "glitch-hover",
        chromatic && "chromatic",
        className,
      )}
    >
      {text}
    </Tag>
  );
}
