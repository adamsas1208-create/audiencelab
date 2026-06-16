-- ============================================================================
-- AudienceLab — system seed content
-- Keeps every room populated so the app never feels empty for early adopters.
-- Run ONCE to install; call seed_system_content() on demand or via pg_cron.
-- Idempotent.
-- ============================================================================

-- Mark which hooks are system-generated (vs. real creator submissions).
alter table public.hooks
  add column if not exists is_system boolean not null default false;

-- ----------------------------------------------------------------------------
-- seed_system_content(min_hooks) — tops every room up to `min_hooks` active
-- hooks by inserting system-owned placeholders. Returns how many it added.
-- ----------------------------------------------------------------------------
create or replace function public.seed_system_content(min_hooks int default 3)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r        record;
  deficit  int;
  i        int;
  added    int := 0;
  templates text[] := array[
    'You won''t believe what happens in the first 3 seconds.',
    'I tested this so you don''t have to — here''s the result.',
    'Stop scrolling. This is the one you needed today.',
    'Nobody is talking about this, but they should be.',
    'The mistake everyone makes (and the 10-second fix).',
    'I tried it for a week. Here''s the honest verdict.'
  ];
begin
  for r in select id from public.rooms loop
    select greatest(min_hooks - count(*), 0) into deficit
    from public.hooks
    where room_id = r.id and is_active;

    for i in 1..deficit loop
      insert into public.hooks (room_id, text, is_system, is_active)
      values (
        r.id,
        templates[1 + ((i + length(r.id)) % array_length(templates, 1))],
        true,
        true
      );
      added := added + 1;
    end loop;
  end loop;

  return added;
end;
$$;

-- Run once now to fill any thin rooms.
select public.seed_system_content(3);

-- ----------------------------------------------------------------------------
-- OPTIONAL: keep rooms topped up automatically with pg_cron.
-- Enable the extension under Database -> Extensions (or run the line below),
-- then schedule the job. Uncomment to use:
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'seed-system-content',
--     '*/30 * * * *',                       -- every 30 minutes
--     $$select public.seed_system_content(3)$$
--   );
-- ----------------------------------------------------------------------------
