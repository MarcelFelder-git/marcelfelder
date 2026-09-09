"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Loader2, Monitor, Smartphone, X } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Live-Vorschau eines Deployments in einem Overlay.
 *
 * Bewusst NICHT als dauerhaft eingebetteter Rahmen in der Seite. Ein
 * iframe mitten im Scrollfluss fängt das Rad ein: man scrollt die Seite,
 * der Zeiger gerät über den Rahmen, und plötzlich scrollt die fremde Seite
 * statt dieser. Das ist der schnellste Weg, eine Seite unbedienbar zu
 * machen. Fünf gleichzeitig geladene Deployments wären zusätzlich fünf
 * vollständige Anwendungen im Speicher.
 *
 * Als Overlay dagegen ist das Scrollen im Rahmen genau das, was man
 * erwartet — und geladen wird erst, wenn jemand es ausdrücklich will.
 */
export function LivePreview({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Hintergrund festhalten, solange das Overlay offen ist - sonst scrollt
  // die Seite darunter weiter, wenn der Zeiger den Rahmen verlässt.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="fixed inset-0 z-[70] flex flex-col bg-paper/95"
        role="dialog"
        aria-modal="true"
        aria-label={`Live-Vorschau: ${title}`}
      >
        {/* --- Leiste -------------------------------------------------- */}
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3 sm:px-6">
          <span className="meta-accent shrink-0">Live</span>
          <span className="truncate font-mono text-sm text-ink">{title}</span>
          <span className="hidden truncate font-mono text-[11px] text-faint sm:inline">
            {url.replace(/^https?:\/\//, "")}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Der Umschalter ist kein Spielzeug: eine PWA in einem
                Desktop-Rahmen zu beurteilen wäre unfair gegenüber dem
                Projekt. */}
            <div className="hidden border border-rule sm:flex">
              <button
                onClick={() => setDevice("desktop")}
                aria-pressed={device === "desktop"}
                aria-label="Desktop-Breite"
                className={cn(
                  "p-2 transition-colors",
                  device === "desktop"
                    ? "bg-accent text-paper"
                    : "text-mute hover:bg-raise",
                )}
              >
                <Monitor className="size-3.5" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                aria-pressed={device === "mobile"}
                aria-label="Mobile Breite"
                className={cn(
                  "p-2 transition-colors",
                  device === "mobile"
                    ? "bg-accent text-paper"
                    : "text-mute hover:bg-raise",
                )}
              >
                <Smartphone className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="invert-hover flex items-center gap-1.5 border border-rule px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-mute"
            >
              Neuer Tab
              <ArrowUpRight className="size-3" strokeWidth={2} />
            </a>

            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Vorschau schließen"
              className="bg-accent p-2 text-paper"
            >
              <X className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {/* --- Rahmen -------------------------------------------------- */}
        <div className="relative flex flex-1 justify-center overflow-hidden bg-surface p-3 sm:p-6">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-[12px] text-faint">
              <Loader2 className="size-4 animate-spin" />
              Deployment wird geladen…
            </div>
          )}

          <iframe
            src={url}
            title={`Live-Vorschau von ${title}`}
            onLoad={() => setLoaded(true)}
            // sandbox erlaubt genau so viel, wie eine Vorschau braucht.
            // Ohne allow-same-origin liefe kein Deployment, das Storage
            // oder Auth benutzt; ohne allow-scripts liefe gar keine
            // Next.js-Anwendung.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
            className={cn(
              "h-full border border-rule bg-paper transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
              device === "mobile" ? "w-[390px] max-w-full" : "w-full",
            )}
          />
        </div>

        <p className="border-t border-rule px-4 py-2.5 text-center font-mono text-[11px] text-faint sm:px-6">
          Fremde Seite in einem Rahmen. Escape schließt, &bdquo;Neuer
          Tab&ldquo; öffnet sie richtig.
        </p>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
