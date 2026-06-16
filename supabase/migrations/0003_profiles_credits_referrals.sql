-- ============================================================================
-- AudienceLab — profiles, credits, and the viral referral system
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk.
-- Idempotent: safe to re-run.
--
-- Security model: ALL credit math happens in a SECURITY DEFINER trigger on
-- auth.users. The client can never write its own credit balance — the only
-- client-supplied input is the referral code (passed as signup metadata),
-- which the trigger validates against existing profiles on the backend.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles — one row per auth user
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  credits       int  not null default 100,              -- onboarding bonus
  referral_code text not null unique,
  referred_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read (only) their own profile. Credits are managed server-side,
-- so there is intentionally NO client INSERT/UPDATE policy.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Unique referral-code generator (unambiguous alphabet, 8 chars)
-- ----------------------------------------------------------------------------
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I/L
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (
      select 1 from public.profiles where referral_code = code
    );
  end loop;
  return code;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. handle_new_user — create the profile + apply referral logic on signup
--    Joiner with valid ref: 200 credits (100 base + 100 bonus)
--    Referrer: +100 credits instantly
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref      text;
  v_referrer uuid;
  v_credits  int := 100; -- standard onboarding bonus
begin
  -- Referral code is passed via supabase.auth.signUp({ options: { data: { ref } } })
  v_ref := nullif(trim(new.raw_user_meta_data ->> 'ref'), '');

  if v_ref is not null then
    select id into v_referrer
    from public.profiles
    where referral_code = upper(v_ref)
    limit 1;
  end if;

  -- Valid referrer (and not self) => joiner gets the extra 100.
  if v_referrer is not null and v_referrer <> new.id then
    v_credits := 200;
  else
    v_referrer := null;
  end if;

  insert into public.profiles (id, email, credits, referral_code, referred_by)
  values (
    new.id,
    new.email,
    v_credits,
    public.generate_referral_code(),
    v_referrer
  );

  -- Reward the referrer.
  if v_referrer is not null then
    update public.profiles
    set credits = credits + 100
    where id = v_referrer;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. Backfill profiles for any users created before this migration
-- ----------------------------------------------------------------------------
insert into public.profiles (id, email, credits, referral_code)
select u.id, u.email, 100, public.generate_referral_code()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ============================================================================
-- Done. New signups now get a profile + credits automatically; signups with a
-- valid ?ref=CODE reward both the joiner (200) and the referrer (+100).
-- ============================================================================
