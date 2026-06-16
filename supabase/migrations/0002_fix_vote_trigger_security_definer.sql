-- ============================================================================
-- Fix: vote counts not incrementing for anonymous voters.
--
-- bump_hook_votes() was created SECURITY INVOKER, so the trigger's
-- `update public.hooks ...` ran with the anon role's permissions. Anon has no
-- UPDATE policy on public.hooks, so RLS silently matched 0 rows: the vote row
-- inserted fine, but hooks.votes never changed (and no realtime UPDATE fired).
--
-- Recreating the function as SECURITY DEFINER runs it as the owner, bypassing
-- RLS for this trusted counter update. set search_path = '' is required for
-- SECURITY DEFINER safety, so all objects are schema-qualified.
--
-- Idempotent: safe to run on top of 0001.
-- ============================================================================

create or replace function public.bump_hook_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.hooks set votes = votes + 1 where id = new.hook_id;
  return new;
end;
$$;

-- Backfill hooks.votes for any votes inserted before this fix was applied.
update public.hooks h
set votes = (select count(*) from public.votes v where v.hook_id = h.id);
