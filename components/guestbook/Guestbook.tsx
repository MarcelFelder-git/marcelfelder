"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Radio, Send } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import type { GuestbookEntry } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Realtime-Gaestebuch.
 *
 * Ein einziger Postgres-Channel horcht auf INSERTs. Kein Polling, kein
 * Revalidate-Intervall: der Eintrag eines anderen Besuchers erscheint hier
 * in dem Moment, in dem die Transaktion committet.
 */

const MAX_MESSAGE = 280;

export function Guestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Lokale Bindung: TypeScript kann die Modul-Konstante innerhalb der
    // verschachtelten async-Closures sonst nicht als non-null fuehren.
    const db = supabase;
    if (!db) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await db
        .from("guestbook")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(24);

      if (cancelled) return;
      if (error) setError(error.message);
      else setEntries((data ?? []) as GuestbookEntry[]);
      setLoading(false);
    };
    void load();

    const channel = db
      .channel("guestbook-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "guestbook" },
        (payload) => {
          const entry = payload.new as GuestbookEntry;
          // Dedupe: der eigene Insert kommt auch ueber den Channel zurueck.
          setEntries((prev) =>
            prev.some((e) => e.id === entry.id)
              ? prev
              : [entry, ...prev].slice(0, 24),
          );
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      void db.removeChannel(channel);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const db = supabase;
    if (!db) return;

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      role: String(form.get("role") ?? "").trim() || null,
      message: String(form.get("message") ?? "").trim(),
    };

    if (payload.name.length < 2 || payload.message.length < 2) return;

    setPending(true);
    setError(null);

    const { data, error } = await db
      .from("guestbook")
      .insert(payload)
      .select()
      .single();

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }
    // Optimistisch einfuegen, damit der eigene Eintrag nicht auf den
    // Roundtrip des Realtime-Channels warten muss.
    if (data) {
      setEntries((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev
          : [data as GuestbookEntry, ...prev].slice(0, 24),
      );
    }
    formRef.current?.reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
      {/* --- Formular ------------------------------------------------ */}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="glass-panel rounded-panel p-5"
      >
        <div className="flex items-center justify-between">
          <span className="label-tech">Neuer Eintrag</span>
          <span className="flex items-center gap-1.5">
            <Radio
              className={cn(
                "size-3",
                connected ? "text-signal-cyan" : "text-ink-faint",
              )}
              strokeWidth={2}
            />
            <span className="label-tech">
              {connected ? "live" : isSupabaseConfigured ? "verbinde" : "offline"}
            </span>
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <input
            name="name"
            required
            minLength={2}
            maxLength={48}
            placeholder="Name"
            disabled={!isSupabaseConfigured}
            className="w-full rounded-lg border border-blueprint-line bg-blueprint-void/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-signal-cyan/50 disabled:opacity-40"
          />
          <input
            name="role"
            maxLength={64}
            placeholder="Rolle (optional)"
            disabled={!isSupabaseConfigured}
            className="w-full rounded-lg border border-blueprint-line bg-blueprint-void/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-signal-cyan/50 disabled:opacity-40"
          />
          <textarea
            name="message"
            required
            minLength={2}
            maxLength={MAX_MESSAGE}
            rows={3}
            placeholder="Nachricht"
            disabled={!isSupabaseConfigured}
            className="w-full resize-none rounded-lg border border-blueprint-line bg-blueprint-void/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-signal-cyan/50 disabled:opacity-40"
          />
        </div>

        <button
          type="submit"
          disabled={!isSupabaseConfigured || pending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-signal-cyan px-4 py-2.5 text-sm font-medium text-blueprint-void transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" strokeWidth={2} />
          )}
          Eintragen
        </button>

        {!isSupabaseConfigured && (
          <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-faint">
            Keine Supabase-Credentials gesetzt. Trage sie in{" "}
            <span className="text-ink-muted">.env.local</span> ein und führe{" "}
            <span className="text-ink-muted">
              supabase/migrations/0001_guestbook.sql
            </span>{" "}
            aus.
          </p>
        )}

        {error && (
          <p className="mt-3 font-mono text-[11px] text-red-400">{error}</p>
        )}
      </form>

      {/* --- Feed ---------------------------------------------------- */}
      <div className="space-y-3">
        {loading && (
          <div className="glass-panel flex items-center gap-2 rounded-panel px-5 py-4 font-mono text-xs text-ink-faint">
            <Loader2 className="size-3.5 animate-spin" />
            Lade Einträge…
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="glass-panel rounded-panel px-5 py-8 text-center">
            <p className="font-mono text-xs text-ink-faint">
              Noch keine Einträge — der erste Datensatz wartet auf dich.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.article
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="glass-panel rounded-panel px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-ink-primary">
                  {entry.name}
                </span>
                {entry.role && (
                  <span className="label-tech">{entry.role}</span>
                )}
                <time
                  dateTime={entry.created_at}
                  className="ml-auto font-mono text-[10px] text-ink-faint"
                >
                  {new Date(entry.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </time>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {entry.message}
              </p>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
