"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Power } from "lucide-react";
import { useAudioStore } from "@/lib/store/useAudioStore";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { useT } from "@/lib/content";
import { EASE_OUT } from "@/lib/motion";

/**
 * Notbremse fuer die Audio-Engine.
 *
 * Das Mischpult steht im Signal-Kapitel, wo man seine Wirkung sieht. Das
 * loest ein Problem und schafft ein neues: wer den Ton dort einschaltet
 * und weiterscrollt, hoert ihn ueberall, kann ihn aber nirgends mehr
 * ausmachen. Ein Klang, den man nicht abstellen kann, ist ein Fehler -
 * auch dann, wenn man ihn selbst gestartet hat.
 *
 * Deshalb genau ein festes Element, und zwar nur unter zwei Bedingungen:
 * die Engine laeuft, und man ist nicht in dem Kapitel, in dem das
 * Mischpult ohnehin steht. Ausserhalb dieser beiden Faelle ist der
 * Bildschirm frei.
 */
export function AudioBadge() {
  const isRunning = useAudioStore((s) => s.isRunning);
  const toggle = useAudioStore((s) => s.toggle);
  const mode = useViewportMode((s) => s.mode);
  const t = useT();

  const visible = isRunning && mode !== "signal";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
        >
          <button
            onClick={() => void toggle()}
            className="panel flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-raise"
          >
            <span
              aria-hidden
              className="size-1.5 animate-pulse rounded-full bg-accent"
            />
            <Power className="size-4" strokeWidth={2} />
            {t.audio.off}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
