"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ElementType,
} from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/* ------------------------------------------------------------------ */
/* Reveal - der Standard-Auftritt fuer Bloecke                          */
/* ------------------------------------------------------------------ */

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // `once` ist Absicht: Bloecke, die bei jedem Vorbeiscrollen neu
      // einfliegen, machen ein Portfolio unruhig statt lebendig.
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* SplitHeading - Ueberschrift, die wortweise aus einer Maske faehrt     */
/* ------------------------------------------------------------------ */

export function SplitHeading({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  highlight,
  id,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Woerter, die im Verlauf Cyan→Violett gesetzt werden. */
  highlight?: string[];
  id?: string;
}) {
  // Ohne diese Einschraenkung kennt TypeScript die erlaubten Props des
  // dynamischen Tags nicht und lehnt className/id ab.
  const Heading = Tag as ElementType<{
    className?: string;
    id?: string;
    children?: ReactNode;
  }>;
  const words = useMemo(() => text.split(" "), [text]);
  const reduced = usePrefersReducedMotion();

  return (
    // Die Ueberschrift bleibt ein echtes Tag; animiert wird ein Span darin.
    // motion.create(Tag) im Render wuerde bei jedem Durchlauf einen neuen
    // Komponententyp erzeugen und die Kinder remounten.
    <Heading className={className} id={id}>
      <motion.span
        className="inline-block"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={{
          show: {
            transition: {
              staggerChildren: reduced ? 0 : 0.045,
              delayChildren: delay,
            },
          },
        }}
      >
        {words.map((word, i) => (
        // Zwei verschachtelte Spans: der aeussere maskiert, der innere
        // faehrt heraus. Ein blosses opacity-Fade sieht bei grosser Type
        // billig aus, eine Maske sieht nach Satz aus.
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            className={cn(
              "inline-block",
              highlight?.includes(word) && "text-gradient-signal",
            )}
            variants={{
              hidden: { y: "108%", opacity: 0 },
              show: {
                y: "0%",
                opacity: 1,
                transition: { duration: 0.85, ease: EASE_OUT },
              },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span>&nbsp;</span>}
          </span>
        ))}
      </motion.span>
    </Heading>
  );
}

/* ------------------------------------------------------------------ */
/* ScrambleText - Terminal-Entschluesselung                             */
/* ------------------------------------------------------------------ */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}#*+=-_";

export function ScrambleText({
  text,
  className,
  active = true,
}: {
  text: string;
  className?: string;
  active?: boolean;
}) {
  const [display, setDisplay] = useState(text);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !active) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    let raf = 0;
    // Jeder Buchstabe wird nach und nach "gefunden": bis dahin rotiert an
    // seiner Stelle ein zufaelliges Zeichen aus demselben Alphabet.
    const settle = 2.2;

    const tick = () => {
      frame++;
      const revealed = frame / settle;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") out += text[i];
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(out);
      if (revealed < text.length) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, reduced]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{display}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Counter - Zahl, die beim Eintreten hochlaeuft                        */
/* ------------------------------------------------------------------ */

export function Counter({
  to,
  decimals = 0,
  duration = 1400,
  className,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo - schnell los, langsam ankommen. Liest sich wie ein
      // Messgeraet, das sich einpendelt.
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(to * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value.toFixed(decimals)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* ParallaxY - Tiefe durch unterschiedliche Scrollgeschwindigkeit       */
/* ------------------------------------------------------------------ */

export function ParallaxY({
  children,
  distance = 60,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reduced ? [0, 0] : [distance, -distance],
  );

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee - endloses Laufband                                          */
/* ------------------------------------------------------------------ */

export function Marquee({
  items,
  reverse = false,
  duration = 42,
}: {
  items: readonly string[];
  reverse?: boolean;
  duration?: number;
}) {
  // Der Inhalt wird verdoppelt, damit die Schleife nahtlos umspringt:
  // sobald die erste Kopie durchgelaufen ist, steht die zweite exakt dort,
  // wo die erste begann.
  const run = [...items, ...items];

  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className="flex shrink-0 items-center gap-10 pr-10"
        style={{
          animation: `marquee ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {run.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-10 font-mono text-sm uppercase tracking-[0.18em] text-ink-faint"
          >
            {item}
            <span className="size-1 rounded-full bg-signal-cyan/40" />
          </span>
        ))}
      </div>
    </div>
  );
}
