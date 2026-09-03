"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ViewportShell } from "@/components/canvas/ViewportShell";
import { PROFILE } from "@/content/resume";
import { EASE_OUT } from "@/lib/motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: EASE_OUT },
  }),
};

export function Hero() {
  return (
    <section className="grid gap-12 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pt-24">
      <div>
        <motion.p
          custom={0}
          initial="hidden"
          animate="show"
          variants={fade}
          className="font-mono text-xs uppercase tracking-[0.28em] text-signal-cyan"
        >
          Rev. 01 — Structure · Signal · Code
        </motion.p>

        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fade}
          className="mt-6 text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]"
        >
          Ich baue Systeme,{" "}
          <span className="text-gradient-signal">die man hören kann.</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fade}
          className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-ink-muted"
        >
          {PROFILE.summary}
        </motion.p>

        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={fade}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <a
            href="#disciplines"
            className="group inline-flex items-center gap-2 rounded-lg bg-signal-cyan px-6 py-3 text-sm font-medium text-blueprint-void transition-transform hover:-translate-y-0.5"
          >
            Disziplinen ansehen
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href="#guestbook"
            className="inline-flex items-center gap-2 rounded-lg border border-blueprint-line px-6 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-signal-cyan/40 hover:text-ink-primary"
          >
            Gästebuch
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <ViewportShell />
      </motion.div>
    </section>
  );
}
