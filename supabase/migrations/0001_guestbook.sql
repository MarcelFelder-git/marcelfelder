-- Gaestebuch fuer das Portfolio.
-- Ausfuehren im Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

create table if not exists public.guestbook (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 48),
  role        text check (char_length(role) <= 64),
  message     text not null check (char_length(message) between 2 and 280),
  created_at  timestamptz not null default now()
);

create index if not exists guestbook_created_at_idx
  on public.guestbook (created_at desc);

-- Row Level Security: der anon-Key ist oeffentlich, die Absicherung
-- passiert hier und nicht durch Geheimhaltung des Schluessels.
alter table public.guestbook enable row level security;

drop policy if exists "guestbook_read_all" on public.guestbook;
create policy "guestbook_read_all"
  on public.guestbook for select
  to anon, authenticated
  using (true);

drop policy if exists "guestbook_insert_anon" on public.guestbook;
create policy "guestbook_insert_anon"
  on public.guestbook for insert
  to anon, authenticated
  with check (true);

-- Kein update/delete fuer anon: Eintraege sind unveraenderlich.

-- Realtime aktivieren, damit neue Eintraege per WebSocket ankommen.
alter publication supabase_realtime add table public.guestbook;
