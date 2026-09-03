"use client";

import { useCallback, useEffect, useState } from "react";
import { Command } from "cmdk";
import {
  AudioWaveform,
  Boxes,
  Braces,
  Copy,
  FileText,
  Layers,
  MessageSquare,
  Play,
  Square,
  TerminalSquare,
} from "lucide-react";
import { useViewportMode } from "@/lib/store/useViewportMode";
import { useAudioStore } from "@/lib/store/useAudioStore";
import { RESUME_LINES, STACK } from "@/content/resume";
import { CONTACT_EMAIL } from "@/content/site";

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

const COMMANDS: Cmd[] = [
  {
    id: "view structure",
    label: "view structure",
    hint: "Fachwerk-Modus",
    group: "Viewport",
    Icon: Boxes,
    run: (c) => {
      c.setMode("structure");
      c.close();
    },
  },
  {
    id: "view signal",
    label: "view signal",
    hint: "Spektrum-Modus",
    group: "Viewport",
    Icon: AudioWaveform,
    run: (c) => {
      c.setMode("signal");
      c.close();
    },
  },
  {
    id: "view code",
    label: "view code",
    hint: "Komponenten-Matrix",
    group: "Viewport",
    Icon: Braces,
    run: (c) => {
      c.setMode("code");
      c.close();
    },
  },
  {
    id: "play audio",
    label: "play audio",
    hint: "Engine starten",
    group: "Audio",
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
    hint: "Engine anhalten",
    group: "Audio",
    Icon: Square,
    run: (c) => {
      c.stopAudio();
      c.close();
    },
  },
  {
    id: "cat resume",
    label: "cat resume",
    hint: "Kurzprofil ausgeben",
    group: "System",
    Icon: FileText,
    run: (c) => c.print(RESUME_LINES),
  },
  {
    id: "view stack",
    label: "view stack",
    hint: "Technologie-Stack ausgeben",
    group: "System",
    Icon: Layers,
    run: (c) =>
      c.print(
        STACK.flatMap((s) => [
          `${s.group.toUpperCase().padEnd(14)} ${s.items.join(" · ")}`,
        ]),
      ),
  },
  {
    id: "copy email",
    label: "copy email",
    hint: "Kontaktadresse kopieren",
    group: "System",
    Icon: Copy,
    run: (c) => {
      void navigator.clipboard?.writeText(CONTACT_EMAIL);
      c.print([`copied to clipboard: ${CONTACT_EMAIL}`]);
    },
  },
  {
    id: "goto guestbook",
    label: "goto guestbook",
    hint: "Zum Gästebuch springen",
    group: "Navigation",
    Icon: MessageSquare,
    run: (c) => {
      document
        .getElementById("guestbook")
        ?.scrollIntoView({ behavior: "smooth" });
      c.close();
    },
  },
];

const GROUPS = [...new Set(COMMANDS.map((c) => c.group))];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState<string[] | null>(null);

  const setMode = useViewportMode((s) => s.setMode);
  const start = useAudioStore((s) => s.start);
  const stop = useAudioStore((s) => s.stop);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
      overlayClassName="fixed inset-0 bg-blueprint-void/70 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-[92vw] max-w-xl -translate-x-1/2"
    >
      <div className="glass-panel overflow-hidden rounded-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-blueprint-line/70 px-4">
          <TerminalSquare
            className="size-4 shrink-0 text-signal-cyan"
            strokeWidth={1.75}
          />
          {/* Escape haengt am Input, nicht am Dialog: dort abgefangen
              wuerde cmdk die Enter-Auswahl nicht mehr sehen. */}
          <Command.Input
            onKeyDown={handleEscape}
            placeholder={output ? "Escape für zurück" : "Befehl eingeben…"}
            readOnly={!!output}
            className="w-full bg-transparent py-3.5 font-mono text-sm text-ink-primary outline-none placeholder:text-ink-faint"
          />
          <kbd className="label-tech shrink-0 rounded border border-blueprint-line px-1.5 py-1">
            ESC
          </kbd>
        </div>

        {output ? (
          <pre className="max-h-[46vh] overflow-auto whitespace-pre-wrap px-4 py-4 font-mono text-[12.5px] leading-relaxed text-signal-cyan">
            {output.join("\n")}
          </pre>
        ) : (
          <Command.List className="max-h-[46vh] overflow-auto p-2">
            <Command.Empty className="px-3 py-6 text-center font-mono text-xs text-ink-faint">
              command not found
            </Command.Empty>

            {GROUPS.map((group) => (
              <Command.Group
                key={group}
                heading={group}
                className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-ink-faint"
              >
                {COMMANDS.filter((c) => c.group === group).map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => cmd.run(ctx)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm text-ink-muted data-[selected=true]:bg-signal-cyan/10 data-[selected=true]:text-ink-primary"
                  >
                    <cmd.Icon
                      className="size-4 shrink-0 text-ink-faint"
                      strokeWidth={1.75}
                    />
                    <span>{cmd.label}</span>
                    <span className="ml-auto text-[11px] text-ink-faint">
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
