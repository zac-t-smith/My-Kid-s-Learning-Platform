-- Kam's Math All-Stars: cloud copy of the family's progress.
-- One family account (Supabase Auth user). Every row belongs to that user; nobody else can read it.

create table if not exists public.family_profile (
  family_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key,
  family_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ts bigint not null,              -- when it was answered (ms since epoch, device clock)
  data jsonb not null,             -- the full attempt record
  inserted_at timestamptz not null default now()  -- server time, used as the download cursor
);
create index if not exists attempts_family_inserted on public.attempts (family_id, inserted_at, id);
create index if not exists attempts_family_ts on public.attempts (family_id, ts);

alter table public.family_profile enable row level security;
alter table public.attempts enable row level security;

create policy "family reads own profile" on public.family_profile for select to authenticated using (family_id = (select auth.uid()));
create policy "family writes own profile" on public.family_profile for insert to authenticated with check (family_id = (select auth.uid()));
create policy "family updates own profile" on public.family_profile for update to authenticated using (family_id = (select auth.uid())) with check (family_id = (select auth.uid()));

create policy "family reads own attempts" on public.attempts for select to authenticated using (family_id = (select auth.uid()));
create policy "family adds own attempts" on public.attempts for insert to authenticated with check (family_id = (select auth.uid()));
create policy "family erases own attempts" on public.attempts for delete to authenticated using (family_id = (select auth.uid()));
