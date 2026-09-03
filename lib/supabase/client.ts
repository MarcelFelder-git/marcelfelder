import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Ohne Credentials laeuft die Seite weiter - das Gaestebuch zeigt dann
 * einen Offline-Zustand statt die halbe Seite mit einem Fehler zu killen.
 * Ein Portfolio darf nicht daran scheitern, dass eine Datenbank fehlt.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 4 } },
    })
  : null;
