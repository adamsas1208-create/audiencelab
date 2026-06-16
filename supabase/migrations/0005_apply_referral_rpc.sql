-- ============================================================================
-- AudienceLab — apply_referral RPC (for OAuth / Google signups)
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk.
-- Idempotent.
--
-- Email/password signups carry the ref in raw_user_meta_data, so the
-- handle_new_user trigger applies the referral inline. OAuth signups (Google)
-- can't carry custom metadata, so the client calls this RPC once after login
-- to claim a pending referral code. SECURITY DEFINER + tight guards keep the
-- credit math on the backend.
-- ============================================================================

create or replace function public.apply_referral(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_me       public.profiles;
  v_referrer uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into v_me from public.profiles where id = v_uid;
  if v_me.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_profile');
  end if;

  -- Each account can be referred at most once...
  if v_me.referred_by is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;

  -- ...and only shortly after signup (anti-abuse window).
  if v_me.created_at < now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'window_expired');
  end if;

  select id into v_referrer
  from public.profiles
  where referral_code = upper(trim(p_code))
  limit 1;

  if v_referrer is null or v_referrer = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  -- Joiner: +100 on top of the 100 onboarding bonus => 200 total.
  update public.profiles
  set credits = credits + 100, referred_by = v_referrer
  where id = v_uid;

  -- Referrer: +100.
  update public.profiles
  set credits = credits + 100
  where id = v_referrer;

  return jsonb_build_object('ok', true);
end;
$$;

-- Only signed-in users may claim a referral.
revoke execute on function public.apply_referral(text) from anon;
grant execute on function public.apply_referral(text) to authenticated;
