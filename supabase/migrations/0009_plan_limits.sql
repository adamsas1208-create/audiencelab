-- ============================================================================
-- AudienceLab — free-tier quantity limits (contacts, polls) + plan column
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk.
-- Idempotent: safe to re-run.
--
-- No billing exists yet. `plan` defaults to 'free' for everyone; nothing here
-- ever sets it to 'pro' — that's a manual
-- `update public.profiles set plan = 'pro' where id = ...` (or a future
-- Stripe webhook) until a real payment flow ships. This is enforcement
-- infrastructure only. Client-side limits live in src/lib/limits.js and
-- mirror the numbers below — these triggers are the actual non-bypassable
-- backstop, since a client-side-only check is trivially skipped by anyone
-- calling the Supabase REST API directly. hook_tests has no Supabase table
-- (Creator Studio persists it to localStorage only), so it is NOT covered
-- here — see src/lib/limits.js / DataProvider.jsx for its client-only cap.
-- ============================================================================

alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'pro'));

-- ----------------------------------------------------------------------------
-- contacts: free plan capped at 250 total rows per owner. Manual adds AND
-- capture_lead() leads both count — the trigger fires regardless of the
-- calling role, so this also bounds a burst of anonymous public-page leads.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_contacts_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  text;
  v_count int;
  v_limit constant int := 250;
begin
  select plan into v_plan from public.profiles where id = new.user_id;
  if v_plan = 'pro' then
    return new;
  end if;

  select count(*) into v_count from public.contacts where user_id = new.user_id;
  if v_count >= v_limit then
    raise exception 'Free plan is capped at % contacts. Upgrade to Pro for unlimited.', v_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists contacts_enforce_limit on public.contacts;
create trigger contacts_enforce_limit
  before insert on public.contacts
  for each row execute function public.enforce_contacts_limit();

-- ----------------------------------------------------------------------------
-- polls: free plan capped at 3 total polls per owner. Only one poll can ever
-- be `active` at a time regardless of plan (polls_one_active_per_user, see
-- 0007), so this caps the total library size, not simultaneous live polls.
-- The app has no "create new poll" UI as of this migration — DataProvider's
-- one-time signup seed creates exactly 3 polls per new account, which this
-- trigger does not block (3 seeded polls hits, but never exceeds, the cap).
-- Added now so the backstop exists whenever a create-poll feature ships.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_polls_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  text;
  v_count int;
  v_limit constant int := 3;
begin
  select plan into v_plan from public.profiles where id = new.user_id;
  if v_plan = 'pro' then
    return new;
  end if;

  select count(*) into v_count from public.polls where user_id = new.user_id;
  if v_count >= v_limit then
    raise exception 'Free plan is capped at % polls. Upgrade to Pro for unlimited.', v_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists polls_enforce_limit on public.polls;
create trigger polls_enforce_limit
  before insert on public.polls
  for each row execute function public.enforce_polls_limit();

-- ============================================================================
-- Done. Free-tier accounts are hard-capped at the DB layer even if a client
-- bypasses DataProvider's own limit check.
-- ============================================================================
