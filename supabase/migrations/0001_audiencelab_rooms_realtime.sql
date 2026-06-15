-- ============================================================================
-- AudienceLab — Rooms, hooks, votes + realtime + RLS
-- Run this ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- It is idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- Voting rooms. `id` mirrors the sidebar room ids (e.g. 'hook-lab').
create table if not exists public.rooms (
  id          text primary key,
  label       text        not null,
  flagship    boolean     not null default false,
  sort_order  int         not null default 0,
  engagement  int         not null default 50, -- 0..100, drives activity bar
  created_at  timestamptz not null default now()
);

-- Hooks = the opening lines competing for votes inside a room.
create table if not exists public.hooks (
  id          uuid        primary key default gen_random_uuid(),
  room_id     text        not null references public.rooms(id) on delete cascade,
  text        text        not null,
  votes       int         not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists hooks_room_id_idx on public.hooks(room_id);

-- Individual vote events — the realtime interaction stream.
-- voter_id is an anonymous client-generated id (no PII).
create table if not exists public.votes (
  id          uuid        primary key default gen_random_uuid(),
  room_id     text        not null references public.rooms(id) on delete cascade,
  hook_id     uuid        not null references public.hooks(id) on delete cascade,
  voter_id    text,
  created_at  timestamptz not null default now()
);
create index if not exists votes_room_id_idx     on public.votes(room_id);
create index if not exists votes_created_at_idx   on public.votes(created_at);

-- ----------------------------------------------------------------------------
-- 2. Keep hooks.votes in sync as vote events arrive
-- ----------------------------------------------------------------------------
create or replace function public.bump_hook_votes()
returns trigger
language plpgsql
as $$
begin
  update public.hooks set votes = votes + 1 where id = new.hook_id;
  return new;
end;
$$;

drop trigger if exists votes_bump_hook on public.votes;
create trigger votes_bump_hook
  after insert on public.votes
  for each row execute function public.bump_hook_votes();

-- ----------------------------------------------------------------------------
-- 3. Aggregated per-room stats for the dashboard grid
--    security_invoker = on  => the caller's RLS applies (no privilege leak).
-- ----------------------------------------------------------------------------
create or replace view public.room_stats
with (security_invoker = on) as
select
  r.id,
  r.label,
  r.flagship,
  r.sort_order,
  r.engagement,
  count(h.id) filter (where h.is_active)                      as active_hooks,
  coalesce(sum(h.votes), 0)                                   as total_votes,
  (
    select count(*) from public.votes v
    where v.room_id = r.id
      and v.created_at >= date_trunc('day', now())
  )                                                            as votes_today,
  (
    select h2.text from public.hooks h2
    where h2.room_id = r.id and h2.is_active
    order by h2.votes desc, h2.created_at asc
    limit 1
  )                                                            as top_hook
from public.rooms r
left join public.hooks h on h.room_id = r.id
group by r.id;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
--    Public read for rooms/hooks/votes; anyone (anon) may cast a vote.
-- ----------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.hooks enable row level security;
alter table public.votes enable row level security;

drop policy if exists "rooms_public_read" on public.rooms;
create policy "rooms_public_read" on public.rooms
  for select using (true);

drop policy if exists "hooks_public_read" on public.hooks;
create policy "hooks_public_read" on public.hooks
  for select using (true);

drop policy if exists "votes_public_read" on public.votes;
create policy "votes_public_read" on public.votes
  for select using (true);

drop policy if exists "votes_public_insert" on public.votes;
create policy "votes_public_insert" on public.votes
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- 5. Realtime — add base tables to the supabase_realtime publication
-- ----------------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.votes';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.hooks';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.rooms';
  exception when duplicate_object then null; end;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Seed — the 11 rooms (must match the sidebar ids), hooks, and votes
-- ----------------------------------------------------------------------------
insert into public.rooms (id, label, flagship, sort_order, engagement) values
  ('hook-lab',            'Hook Lab',             true,  0, 88),
  ('gaming',              'Gaming',               false, 1, 72),
  ('tech-finance',        'Tech & Finance',       false, 2, 65),
  ('lifestyle-beauty',    'Lifestyle & Beauty',   false, 3, 70),
  ('fitness-health',      'Fitness & Health',     false, 4, 81),
  ('entertainment',       'Entertainment',        false, 5, 76),
  ('business-marketing',  'Business & Marketing', false, 6, 63),
  ('food-cooking',        'Food & Cooking',       false, 7, 74),
  ('travel-adventure',    'Travel & Adventure',   false, 8, 58),
  ('education-science',   'Education & Science',   false, 9, 60),
  ('general',             'General / Off-Topic',  false, 10, 52)
on conflict (id) do update
  set label      = excluded.label,
      flagship   = excluded.flagship,
      sort_order = excluded.sort_order,
      engagement = excluded.engagement;

-- Seed a few hooks per room only if a room has none yet (keeps re-runs clean).
insert into public.hooks (room_id, text)
select room_id, text from (
  values
    ('hook-lab',           'Stop scrolling — this one change doubled my watch time.'),
    ('hook-lab',           'I tested 100 hooks so you don''t have to. #1 shocked me.'),
    ('hook-lab',           'The first 3 seconds decide everything. Here''s the formula.'),
    ('gaming',             'I beat the game''s hardest boss using only this trick.'),
    ('gaming',             'This setting is on by default and it''s ruining your aim.'),
    ('tech-finance',       'The $0 budget that let me quit my job in 18 months.'),
    ('tech-finance',       'Nobody tells you this about your first $10k. So I will.'),
    ('lifestyle-beauty',   'The 10-second routine that replaced my entire shelf.'),
    ('lifestyle-beauty',   'I stopped doing this one thing and my skin changed.'),
    ('fitness-health',     'Stop doing cardio. Do this instead and watch what happens.'),
    ('fitness-health',     'The one stretch I wish I started 10 years ago.'),
    ('entertainment',      'This 2-minute scene rewrote the whole movie. Here''s how.'),
    ('entertainment',      'Nobody noticed this detail in the finale. Until now.'),
    ('business-marketing', 'I spent $50k on ads so you can copy what worked.'),
    ('business-marketing', 'This cold email got a 60% reply rate. Steal it.'),
    ('food-cooking',       'This is the only pasta recipe you''ll ever need. Full stop.'),
    ('food-cooking',       'A 3-star chef told me his cheapest meal. I wasn''t ready.'),
    ('travel-adventure',   'I traveled 3 countries on $300. Here''s the exact plan.'),
    ('travel-adventure',   'The airport hack that''s saved me 40+ hours this year.'),
    ('education-science',  'Your brain learns 3x faster if you do this first.'),
    ('education-science',  'This 1-minute experiment breaks everything you know.'),
    ('general',            'I asked 1,000 people this question. The answers stunned me.'),
    ('general',            'Read this before you post anything online again.')
) as seed(room_id, text)
where not exists (
  select 1 from public.hooks h where h.room_id = seed.room_id
);

-- Generate a realistic burst of recent votes per hook (the trigger updates
-- hooks.votes and this populates votes_today). Only runs when votes is empty.
insert into public.votes (room_id, hook_id, voter_id, created_at)
select h.room_id,
       h.id,
       'seed-' || gs,
       now() - (random() * interval '36 hours')
from public.hooks h
cross join lateral generate_series(1, (20 + floor(random() * 180))::int) as gs
where not exists (select 1 from public.votes);

-- ============================================================================
-- Done. The dashboard reads public.room_stats and subscribes to public.votes.
-- ============================================================================
