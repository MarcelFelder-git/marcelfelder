"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePalette } from "@/lib/store/usePalette";
import { Command } from "cmdk";
import {
  ArrowDownToLine,
  AudioWaveform,
  Boxes,
  Braces,
  ExternalLink,
  FileText,
  FolderOpen,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Play,
  Square,
  TerminalSquare,
  User,
} from "lucide-react";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { useAudioStore } from "@/lib/store/useAudioStore";
import { useContent, type Content } from "@/lib/content";

/**
 * Dev Command Palette (Cmd/Ctrl + K).
 *
 * Zwei Zustaende: Befehlsliste und Ausgabe. Ein Terminal, das nach jedem
 * Befehl zuklappt, ist kein Terminal - `cat resume` schreibt deshalb in
 * eine Ausgabeansicht, aus der Escape zurueck zur Liste fuehrt.
 */

interface Cmd {
  id: string;
  label: string;
  hint: string;
  group: string;
  Icon: typeof Boxes;
  run: (ctx: CommandContext) => void;
}

interface CommandContext {
  setMode: (m: "structure" | "signal" | "code") => void;
  startAudio: () => void;
  stopAudio: () => void;
  print: (lines: string[]) => void;
  close: () => void;
}

/**
 * Sprung zu einem Abschnitt der Seite.
 *
 * Ueber die id, nicht ueber gemerkte Positionen: die Abschnitte sind
 * echte Sprungmarken (siehe Hud), und was fuer die Tastatur und die
 * Adresszeile gilt, gilt auch hier. Gibt es das Ziel nicht, passiert
 * nichts - besser als ein Sprung ins Leere.
 */
function jump(id: string, block: ScrollLogicalPosition = "start") {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block });
}

/**
 * Die Befehle spiegeln die Seite, wie sie jetzt ist.
 *
 * Hier stand noch "goto workshop" - der Abschnitt ist seit Rev 13 weg,
 * der Befehl fuehrte ins Leere. Und die Kapitelhinweise beschrieben
 * Modelle, die es nicht mehr gibt: "Spektrum-Modus" fuer ein Kapitel,
 * in dem inzwischen eine Chladni-Platte steht.
 *
 * Reihenfolge der Gruppen ist die Reihenfolge der Seite: erst wohin,
 * dann was hoeren, dann was nachlesen.
 */
function buildCommands(c: Content): Cmd[] {
  const { PROJECTS, CHAPTERS, RESUME_LINES, STACK_MARQUEE, CONTACT_EMAIL, SOCIALS, CV_PATH, CV_FILE } = c;
  const h = c.t.palette.hints;
  const g = c.t.palette.groups;
  return [
  // --- Navigation ------------------------------------------------
  {
    id: "goto start",
    label: "goto start",
    hint: h.start,
    group: g.nav,
    Icon: Home,
    run: (c) => {
      jump("start");
      c.close();
    },
  },
  {
    id: "goto projects",
    label: "goto projects",
    hint: h.projects,
    group: g.nav,
    Icon: FolderOpen,
    run: (c) => {
      jump("projects");
      c.close();
    },
  },
  {
    id: "goto profile",
    label: "goto profile",
    hint: h.profile,
    group: g.nav,
    Icon: User,
    run: (c) => {
      jump("fundament");
      c.close();
    },
  },
  {
    id: "goto code",
    label: "goto code",
    hint: h.code,
    group: g.nav,
    Icon: Braces,
    run: (c) => {
      c.setMode("code");
      c.close();
    },
  },
  {
    id: "goto signal",
    label: "goto signal",
    hint: h.signal,
    group: g.nav,
    Icon: AudioWaveform,
    run: (c) => {
      c.setMode("signal");
      c.close();
    },
  },
  {
    id: "goto structure",
    label: "goto structure",
    hint: h.structure,
    group: g.nav,
    Icon: Boxes,
    run: (c) => {
      c.setMode("structure");
      c.close();
    },
  },
  {
    id: "goto contact",
    label: "goto contact",
    hint: h.contact,
    group: g.nav,
    Icon: ArrowDownToLine,
    run: (c) => {
      jump("kontakt", "center");
      c.close();
    },
  },

  // --- Audio -----------------------------------------------------
  {
    id: "play audio",
    label: "play audio",
    hint: h.play,
    group: g.audio,
    Icon: Play,
    run: (c) => {
      c.startAudio();
      c.setMode("signal");
      c.close();
    },
  },
  {
    id: "stop audio",
    label: "stop audio",
    hint: h.stop,
    group: g.audio,
    Icon: Square,
    run: (c) => {
      c.stopAudio();
      c.close();
    },
  },

  // --- System ----------------------------------------------------
  {
    id: "cat resume",
    label: "cat resume",
    hint: h.resume,
    group: g.system,
    Icon: FileText,
    run: (c) => c.print(RESUME_LINES),
  },
  {
    id: "ls projects",
    label: "ls projects",
    hint: h.projectsList,
    group: g.system,
    Icon: FolderOpen,
    run: (c) =>
      c.print([
        "PROJECTS",
        "",
        ...PROJECTS.map(
          (p) =>
            `  ${p.index}  ${p.title.padEnd(20)} ${p.links.live ?? p.links.repo}`,
        ),
      ]),
  },
  {
    id: "view stack",
    label: "view stack",
    hint: h.stack,
    group: g.system,
    Icon: Layers,
    run: (c) =>
      c.print([
        "STACK",
        "",
        ...STACK_MARQUEE.map((item) => `  ${item}`),
      ]),
  },
  {
    id: "cat chapters",
    label: "cat chapters",
    hint: h.chapters,
    group: g.system,
    Icon: MessageSquare,
    run: (c) =>
      c.print([
        "CHAPTERS",
        "",
        ...CHAPTERS.map(
          (ch) => `  ${ch.index}  ${ch.label.padEnd(10)} ${ch.caption}`,
        ),
      ]),
  },
  {
    id: "download cv",
    label: "download cv",
    hint: h.cv,
    group: g.system,
    Icon: FileText,
    run: (c) => {
      const a = document.createElement("a");
      a.href = CV_PATH;
      a.download = CV_FILE;
      a.click();
      c.close();
    },
  },
  {
    id: "copy email",
    label: "copy email",
    hint: h.email,
    group: g.system,
    Icon: Mail,
    run: (c) => {
      void navigator.clipboard?.writeText(CONTACT_EMAIL);
      c.print([`copied to clipboard: ${CONTACT_EMAIL}`]);
    },
  },
  // Die Profile aus site.ts, damit hier nichts steht, was dort fehlt.
  ...SOCIALS.map(
    (social): Cmd => ({
      id: `open ${social.label.toLowerCase()}`,
      label: `open ${social.label.toLowerCase()}`,
      hint: h.open(social.label),
      group: g.system,
      Icon: ExternalLink,
      run: (c) => {
        window.open(social.href, "_blank", "noopener,noreferrer");
        c.close();
      },
    }),
  ),
  ];
}

export function CommandPalette() {
  // Im Store statt lokal, damit die Kopfzeile sie ebenfalls oeffnen
  // kann - siehe lib/store/usePalette.ts.
  const open = usePalette((s) => s.open);
  const setOpen = usePalette((s) => s.setOpen);
  const toggle = usePalette((s) => s.toggle);
  const [output, setOutput] = useState<string[] | null>(null);

  const setMode = useViewportMode((s) => s.setMode);
  const start = useAudioStore((s) => s.start);
  const stop = useAudioStore((s) => s.stop);
  const content = useContent();
  const COMMANDS = useMemo(() => buildCommands(content), [content]);
  const GROUPS = useMemo(() => [...new Set(COMMANDS.map((c) => c.group))], [COMMANDS]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  // Ausgabe verwerfen, sobald die Palette schliesst.
  useEffect(() => {
    if (!open) setOutput(null);
  }, [open]);

  const ctx: CommandContext = {
    setMode,
    startAudio: () => void start(),
    stopAudio: () => void stop(),
    print: setOutput,
    close: () => setOpen(false),
  };

  const handleEscape = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && output) {
        e.preventDefault();
        e.stopPropagation();
        setOutput(null);
      }
    },
    [output],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="fixed inset-0 z-50"
      overlayClassName="fixed inset-0 bg-paper/85"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-[92vw] max-w-xl -translate-x-1/2"
    >
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-rule/70 px-4">
          <TerminalSquare
            className="size-4 shrink-0 text-accent"
            strokeWidth={1.75}
          />
          {/* Escape haengt am Input, nicht am Dialog: dort abgefangen
              wuerde cmdk die Enter-Auswahl nicht mehr sehen. */}
          <Command.Input
            onKeyDown={handleEscape}
            placeholder={output ? content.t.palette.escBack : content.t.palette.placeholder}
            readOnly={!!output}
            className="w-full bg-transparent py-3.5 font-mono text-sm text-ink outline-none placeholder:text-faint"
          />
          <kbd className="meta shrink-0 border border-rule px-1.5 py-1">
            ESC
          </kbd>
        </div>

        {output ? (
          <pre className="max-h-[46vh] overflow-auto whitespace-pre-wrap px-4 py-4 font-mono text-[12.5px] leading-relaxed text-accent">
            {output.join("\n")}
          </pre>
        ) : (
          <Command.List className="max-h-[46vh] overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-center font-mono text-xs text-faint">
              command not found
            </Command.Empty>

            {GROUPS.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-faint"
              >
                {COMMANDS.filter((c) => c.group === group).map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => cmd.run(ctx)}
                    className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 font-mono text-sm text-mute data-[selected=true]:bg-accent data-[selected=true]:text-paper"
                  >
                    <cmd.Icon
                      className="size-4 shrink-0 text-faint group-data-[selected=true]:text-paper"
                      strokeWidth={1.75}
                    />
                    <span>{cmd.label}</span>
                    <span className="ml-auto text-[11px] text-faint group-data-[selected=true]:text-paper/70">
                      {cmd.hint}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        )}
      </div>
    </Command.Dialog>
  );
}
