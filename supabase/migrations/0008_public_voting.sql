-- ============================================================================
-- "Which One?" — public idea/thumbnail voting community
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk.
-- Idempotent: safe to re-run.
--
-- This is the schema for the rebuilt app. It does NOT touch or drop any of
-- the previous app's tables (rooms, hooks, votes, contacts, polls,
-- poll_options, poll_votes, profiles' public/credit/referral columns) —
-- those are left in place, unused. Dropping them is a separate, explicit,
-- confirmed step if ever wanted.
--
-- The model: a signed-in user posts a submission (a prompt + 2-4 options,
-- each a text label and/or an image). ANY visitor — no account needed — can
-- vote on ONE option per submission, using an anonymous voter_id persisted
-- client-side (src/lib/voterId.js). A poster returns to see live results.
--
-- Security model mirrors 0001_audiencelab_rooms_realtime.sql's proven
-- pattern: an open, anon-insertable votes table, a SECURITY DEFINER trigger
-- that bumps a denormalized counter on the parent row (bypassing RLS, since
-- anon has no UPDATE rights on submission_options), and realtime publication
-- for live vote counts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.submissions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  prompt      text        not null,
  status      text        not null default 'active',
  created_at  timestamptz not null default now()
);
create index if not exists submissions_user_id_idx on public.submissions(user_id);
create index if not exists submissions_created_at_idx on public.submissions(created_at desc);

create table if not exists public.submission_options (
  id             uuid    primary key default gen_random_uuid(),
  submission_id  uuid    not null references public.submissions(id) on delete cascade,
  label          text,
  image_url      text,
  votes          int     not null default 0,
  sort_order     int     not null default 0,
  constraint option_has_content check (label is not null or image_url is not null)
);
create index if not exists submission_options_submission_id_idx
  on public.submission_options(submission_id);

-- Anonymous vote events — one row per (submission, voter). The unique
-- constraint is what actually blocks double-voting; the app just disables
-- the UI as a courtesy once a vote is recorded.
create table if not exists public.submission_votes (
  id             uuid        primary key default gen_random_uuid(),
  submission_id  uuid        not null references public.submissions(id) on delete cascade,
  option_id      uuid        not null references public.submission_options(id) on delete cascade,
  voter_id       text        not null,
  created_at     timestamptz not null default now(),
  unique (submission_id, voter_id)
);
create index if not exists submission_votes_submission_id_idx
  on public.submission_votes(submission_id);

-- ----------------------------------------------------------------------------
-- 2. Keep submission_options.votes in sync as vote events arrive
-- ----------------------------------------------------------------------------
create or replace function public.bump_submission_option_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submission_options set votes = votes + 1 where id = new.option_id;
  return new;
end;
$$;

drop trigger if exists submission_votes_bump_option on public.submission_votes;
create trigger submission_votes_bump_option
  after insert on public.submission_votes
  for each row execute function public.bump_submission_option_votes();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.submissions enable row level security;
alter table public.submission_options enable row level security;
alter table public.submission_votes enable row level security;

-- submissions: public read; only the owner may create/edit/delete their own.
drop policy if exists "submissions_public_read" on public.submissions;
create policy "submissions_public_read" on public.submissions
  for select using (true);

drop policy if exists "submissions_owner_insert" on public.submissions;
create policy "submissions_owner_insert" on public.submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "submissions_owner_update" on public.submissions;
create policy "submissions_owner_update" on public.submissions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "submissions_owner_delete" on public.submissions;
create policy "submissions_owner_delete" on public.submissions
  for delete using (auth.uid() = user_id);

-- submission_options: public read; write only by the parent submission's
-- owner (votes are updated exclusively via the SECURITY DEFINER trigger
-- above, so there is deliberately no general client UPDATE policy here).
drop policy if exists "submission_options_public_read" on public.submission_options;
create policy "submission_options_public_read" on public.submission_options
  for select using (true);

drop policy if exists "submission_options_owner_insert" on public.submission_options;
create policy "submission_options_owner_insert" on public.submission_options
  for insert with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_options.submission_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "submission_options_owner_delete" on public.submission_options;
create policy "submission_options_owner_delete" on public.submission_options
  for delete using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_options.submission_id and s.user_id = auth.uid()
    )
  );

-- submission_votes: anyone (including anon) may cast a vote; public read so
-- the client can check "have I already voted on this submission."
drop policy if exists "submission_votes_public_read" on public.submission_votes;
create policy "submission_votes_public_read" on public.submission_votes
  for select using (true);

drop policy if exists "submission_votes_public_insert" on public.submission_votes;
create policy "submission_votes_public_insert" on public.submission_votes
  for insert with check (true);

-- ----------------------------------------------------------------------------
-- 4. Realtime — live vote counts on the feed / detail page
-- ----------------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.submission_options';
  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.submission_votes';
  exception when duplicate_object then null; end;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Storage — public bucket for uploaded option images
-- ----------------------------------------------------------------------------
-- `public: true` already serves every object via its public URL WITHOUT
-- going through RLS — so no SELECT policy is added here. An earlier version
-- of this migration added one anyway; the Supabase security advisor flagged
-- it as `public_bucket_allows_listing` (it let any client enumerate every
-- file in the bucket via the Storage API's LIST operation, not just fetch a
-- known URL) and it was removed. Do not re-add a SELECT policy for public
-- read access to a public bucket.
insert into storage.buckets (id, name, public)
values ('submission-images', 'submission-images', true)
on conflict (id) do nothing;

drop policy if exists "submission_images_public_read" on storage.objects;

drop policy if exists "submission_images_authenticated_insert" on storage.objects;
create policy "submission_images_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'submission-images');

-- ============================================================================
-- Done. Signed-in users post via submissions + submission_options (+ upload
-- to the submission-images bucket); anyone can vote via submission_votes;
-- the trigger keeps vote counts live for the feed and My Submissions.
-- ============================================================================
