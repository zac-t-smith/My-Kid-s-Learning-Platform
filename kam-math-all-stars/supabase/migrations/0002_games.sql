-- Finished Ballgame results (for the player card and, later, season standings).
create table if not exists public.games (
  id uuid primary key,
  family_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ts bigint not null,
  data jsonb not null,
  inserted_at timestamptz not null default now()
);
create index if not exists games_family_ts on public.games (family_id, ts);
alter table public.games enable row level security;
create policy "family reads own games" on public.games for select to authenticated using (family_id = (select auth.uid()));
create policy "family adds own games" on public.games for insert to authenticated with check (family_id = (select auth.uid()));
create policy "family erases own games" on public.games for delete to authenticated using (family_id = (select auth.uid()));
