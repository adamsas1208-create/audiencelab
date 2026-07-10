-- ============================================================================
-- AudienceLab — real persistence for contacts + polls
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk
-- (the project the app's .env actually points at). Idempotent: safe to re-run.
--
-- Fixes a pre-existing gap: 0006_creator_public_profiles.sql's capture_lead()
-- RPC already inserts into public.contacts, but that table was never created
-- — so lead capture from a public profile has been silently failing. This
-- migration creates it (+ owner RLS), and adds polls/poll_options/poll_votes
-- so a creator's /p/<handle> page works for real visitors on any device,
-- instead of the old same-browser localStorage trick.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. contacts — one row per audience member, owned by the creator
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  full_name         text        not null default 'Unknown',
  email             text        not null default '',
  platform          text        not null default 'Other',
  source            text        not null default 'manual',
  engagement_score  int,
  created_at        timestamptz not null default now()
);
create index if not exists contacts_user_id_idx on public.contacts(user_id);

alter table public.contacts enable row level security;

drop policy if exists "contacts_owner_select" on public.contacts;
create policy "contacts_owner_select" on public.contacts
  for select using (auth.uid() = user_id);

drop policy if exists "contacts_owner_insert" on public.contacts;
create policy "contacts_owner_insert" on public.contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists "contacts_owner_delete" on public.contacts;
create policy "contacts_owner_delete" on public.contacts
  for delete using (auth.uid() = user_id);

-- (No client UPDATE policy — engagement scoring is a future server-side
-- concern. capture_lead() bypasses RLS entirely via SECURITY DEFINER, so
-- anonymous lead capture still works without one.)

-- ----------------------------------------------------------------------------
-- 2. polls + poll_options — a creator's own visual/text polls
-- ----------------------------------------------------------------------------
create table if not exists public.polls (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  question    text        not null,
  active      boolean     not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists polls_user_id_idx on public.polls(user_id);
-- Only one active (live-on-public-page) poll per creator at a time.
create unique index if not exists polls_one_active_per_user
  on public.polls(user_id) where active;

create table if not exists public.poll_options (
  id          uuid        primary key default gen_random_uuid(),
  poll_id     uuid        not null references public.polls(id) on delete cascade,
  label       text        not null default '',
  image_url   text        not null default '',
  votes       int         not null default 0,
  sort_order  int         not null default 0
);
create index if not exists poll_options_poll_id_idx on public.poll_options(poll_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;

drop policy if exists "polls_owner_all" on public.polls;
create policy "polls_owner_all" on public.polls
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "poll_options_owner_all" on public.poll_options;
create policy "poll_options_owner_all" on public.poll_options
  for all using (
    exists (select 1 from public.polls p where p.id = poll_options.poll_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.polls p where p.id = poll_options.poll_id and p.user_id = auth.uid())
  );

-- No public/anon RLS read policy on polls or poll_options — anonymous
-- visitors only ever reach them through the two SECURITY DEFINER RPCs below,
-- matching the get_public_profile / capture_lead pattern from 0006.

-- ----------------------------------------------------------------------------
-- 3. poll_votes — anonymous vote events (mirrors public.votes from 0001)
-- ----------------------------------------------------------------------------
create table if not exists public.poll_votes (
  id          uuid        primary key default gen_random_uuid(),
  poll_id     uuid        not null references public.polls(id) on delete cascade,
  option_id   uuid        not null references public.poll_options(id) on delete cascade,
  voter_id    text,
  created_at  timestamptz not null default now()
);
create index if not exists poll_votes_poll_id_idx on public.poll_votes(poll_id);

alter table public.poll_votes enable row level security;

-- No direct client policies: all writes go through cast_public_poll_vote()
-- (SECURITY DEFINER), which validates the poll/option/handle before inserting.

drop policy if exists "poll_votes_owner_select" on public.poll_votes;
create policy "poll_votes_owner_select" on public.poll_votes
  for select using (
    exists (select 1 from public.polls p where p.id = poll_votes.poll_id and p.user_id = auth.uid())
  );

-- SECURITY DEFINER so the counter update bypasses RLS (poll_options has no
-- client UPDATE policy) — same fix pattern as 0002's bump_hook_votes.
create or replace function public.bump_poll_option_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.poll_options set votes = votes + 1 where id = new.option_id;
  return new;
end;
$$;

drop trigger if exists poll_votes_bump_option on public.poll_votes;
create trigger poll_votes_bump_option
  after insert on public.poll_votes
  for each row execute function public.bump_poll_option_votes();

-- ----------------------------------------------------------------------------
-- 4. get_public_active_poll — anon-safe read of a public creator's live poll
-- ----------------------------------------------------------------------------
create or replace function public.get_public_active_poll(p_handle text)
returns table (
  poll_id    uuid,
  question   text,
  option_id  uuid,
  label      text,
  image_url  text,
  votes      int
)
language sql
security definer
set search_path = ''
stable
as $$
  select po.id, po.question, o.id, o.label, o.image_url, o.votes
  from public.polls po
  join public.profiles pr on pr.id = po.user_id
  join public.poll_options o on o.poll_id = po.id
  where pr.is_public = true
    and lower(pr.handle) = lower(nullif(trim(p_handle), ''))
    and po.active = true
  order by o.sort_order asc;
$$;

revoke all on function public.get_public_active_poll(text) from public;
grant execute on function public.get_public_active_poll(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. cast_public_poll_vote — anonymous visitor votes on a public creator's poll
-- ----------------------------------------------------------------------------
create or replace function public.cast_public_poll_vote(
  p_handle    text,
  p_poll_id   uuid,
  p_option_id uuid,
  p_voter_id  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  select true into v_ok
  from public.polls po
  join public.profiles pr on pr.id = po.user_id
  join public.poll_options o on o.poll_id = po.id
  where pr.is_public = true
    and lower(pr.handle) = lower(nullif(trim(p_handle), ''))
    and po.id = p_poll_id
    and po.active = true
    and o.id = p_option_id;

  if v_ok is null then
    raise exception 'This poll is not available.';
  end if;

  insert into public.poll_votes (poll_id, option_id, voter_id)
  values (p_poll_id, p_option_id, p_voter_id);

  return true;
end;
$$;

revoke all on function public.cast_public_poll_vote(text, uuid, uuid, text) from public;
grant execute on function public.cast_public_poll_vote(text, uuid, uuid, text) to anon, authenticated;

-- ============================================================================
-- Done. contacts now exists (fixing capture_lead from 0006). Creators manage
-- their own polls privately (RLS, owner-only); the /p/<handle> page reads and
-- votes on the active poll via the two RPCs above, working for any visitor on
-- any device — no more same-browser-only demo behavior.
-- ============================================================================
