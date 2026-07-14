-- ============================================================================
-- AudienceLab — one vote per visitor per poll (spam/abuse protection)
-- Run ONCE in the Supabase SQL Editor of project ixhqlhkpblrzocptvlqk
-- (the project the app's .env actually points at). Idempotent: safe to re-run.
--
-- Closes a gap in 0007_contacts_and_polls.sql: cast_public_poll_vote() accepts
-- a client-generated voter_id (localStorage al_voter_id, see
-- src/lib/rooms.js getVoterId()) but nothing stopped the same voter_id from
-- voting on the same poll more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. De-dupe any pre-existing repeat votes before adding the constraint
--    (keeps the earliest vote per poll_id/voter_id pair; no-op if there are
--    none). Only touches rows with a non-null voter_id — Postgres unique
--    indexes treat NULL as distinct from every other NULL, so a null
--    voter_id is never caught by the index below. The app always supplies a
--    voter_id via getVoterId() before calling cast_public_poll_vote, so a
--    null voter_id is an accepted, unreachable-in-practice edge case.
-- ----------------------------------------------------------------------------
delete from public.poll_votes a
using public.poll_votes b
where a.poll_id = b.poll_id
  and a.voter_id = b.voter_id
  and a.voter_id is not null
  and a.created_at > b.created_at
  and a.id <> b.id;

-- ----------------------------------------------------------------------------
-- 2. One vote per (poll_id, voter_id)
-- ----------------------------------------------------------------------------
create unique index if not exists poll_votes_one_per_voter
  on public.poll_votes(poll_id, voter_id);

-- ----------------------------------------------------------------------------
-- 3. cast_public_poll_vote — surface a friendly, catchable error on a repeat
--    vote instead of a raw duplicate-key exception
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

  begin
    insert into public.poll_votes (poll_id, option_id, voter_id)
    values (p_poll_id, p_option_id, p_voter_id);
  exception when unique_violation then
    raise exception 'You already voted on this poll.';
  end;

  return true;
end;
$$;

revoke all on function public.cast_public_poll_vote(text, uuid, uuid, text) from public;
grant execute on function public.cast_public_poll_vote(text, uuid, uuid, text) to anon, authenticated;

-- ============================================================================
-- Done. The same voter_id can no longer add a second row to poll_votes for a
-- poll it already voted on; the RPC raises a friendly, catchable message
-- instead of a raw Postgres duplicate-key error.
-- ============================================================================
