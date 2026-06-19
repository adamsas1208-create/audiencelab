-- ============================================================================
-- AudienceLab — Creator Public Profile & Link Hub
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk
-- (the project the app's .env actually points at). Idempotent: safe to re-run.
--
-- Security model:
--   * profiles stays locked down (no blanket client UPDATE) so credits can
--     never be tampered with. Public-profile edits go through a SECURITY
--     DEFINER RPC that only ever touches the public-facing columns of the
--     caller's OWN row.
--   * The public page reads via get_public_profile() — a SECURITY DEFINER RPC
--     that returns ONLY public-safe fields and ONLY when is_public = true.
--     (No email / credits / referral data is ever exposed.)
--   * Anonymous followers submit the lead form via capture_lead(), which
--     inserts into the creator's contacts on the backend. Visitors never get
--     direct write access to anyone's contacts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Public-profile columns on profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists handle              text,
  add column if not exists display_name        text,
  add column if not exists bio                 text,
  add column if not exists avatar_url          text,
  add column if not exists featured_video_url  text,
  add column if not exists is_public           boolean not null default false;

-- Case-insensitive unique handle (only enforced for rows that set one).
create unique index if not exists profiles_handle_key
  on public.profiles (lower(handle))
  where handle is not null;

-- ----------------------------------------------------------------------------
-- 2. update_my_public_profile — edit ONLY the public columns of your own row
-- ----------------------------------------------------------------------------
create or replace function public.update_my_public_profile(
  p_handle             text,
  p_display_name       text,
  p_bio                text,
  p_avatar_url         text,
  p_featured_video_url text,
  p_is_public          boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text := nullif(trim(p_handle), '');
  v_row    public.profiles;
begin
  if v_uid is null then
    raise exception 'You must be signed in to edit your profile.';
  end if;

  -- Normalise + validate the handle when one is supplied.
  if v_handle is not null then
    v_handle := lower(v_handle);
    if v_handle !~ '^[a-z0-9_-]{3,30}$' then
      raise exception 'Handle must be 3-30 chars: letters, numbers, _ or -.';
    end if;
    if exists (
      select 1 from public.profiles
      where lower(handle) = v_handle and id <> v_uid
    ) then
      raise exception 'That handle is already taken.';
    end if;
  end if;

  -- A profile cannot be made public without a handle to reach it.
  if p_is_public and v_handle is null then
    raise exception 'Pick a handle before making your profile public.';
  end if;

  update public.profiles
  set handle             = v_handle,
      display_name       = nullif(trim(p_display_name), ''),
      bio                = nullif(trim(p_bio), ''),
      avatar_url         = nullif(trim(p_avatar_url), ''),
      featured_video_url = nullif(trim(p_featured_video_url), ''),
      is_public          = coalesce(p_is_public, false)
  where id = v_uid
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.update_my_public_profile(text, text, text, text, text, boolean) from public;
grant execute on function public.update_my_public_profile(text, text, text, text, text, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. get_public_profile — public-safe read, only for published profiles
-- ----------------------------------------------------------------------------
create or replace function public.get_public_profile(p_handle text)
returns table (
  handle             text,
  display_name       text,
  bio                text,
  avatar_url         text,
  featured_video_url text
)
language sql
security definer
set search_path = ''
stable
as $$
  select p.handle, p.display_name, p.bio, p.avatar_url, p.featured_video_url
  from public.profiles p
  where p.is_public = true
    and lower(p.handle) = lower(nullif(trim(p_handle), ''));
$$;

revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. capture_lead — anonymous follower joins a creator's audience
--    Inserts into the creator's contacts (bypassing RLS via DEFINER) only
--    when the target profile is public. Returns true on success.
-- ----------------------------------------------------------------------------
create or replace function public.capture_lead(
  p_handle    text,
  p_full_name text,
  p_email     text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name  text := nullif(trim(p_full_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
begin
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email is required.';
  end if;

  select id into v_owner
  from public.profiles
  where is_public = true
    and lower(handle) = lower(nullif(trim(p_handle), ''));

  if v_owner is null then
    raise exception 'This creator profile is not available.';
  end if;

  -- De-dupe: don't add the same email twice to one creator's audience.
  if exists (
    select 1 from public.contacts
    where user_id = v_owner and lower(email) = v_email
  ) then
    return true;
  end if;

  insert into public.contacts (user_id, full_name, email, platform)
  values (v_owner, coalesce(v_name, 'Profile lead'), v_email, 'Profile');

  return true;
end;
$$;

revoke all on function public.capture_lead(text, text, text) from public;
grant execute on function public.capture_lead(text, text, text) to anon, authenticated;

-- ============================================================================
-- Done. Creators set handle + bio + avatar + featured video and flip
-- is_public; /p/<handle> renders the public hub; followers join via the lead
-- form (capture_lead) — all without exposing any private profile data.
-- ============================================================================
