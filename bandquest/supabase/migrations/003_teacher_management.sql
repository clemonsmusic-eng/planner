-- Teacher dashboard management features + fix class joining
--
-- 1. Students can't read a classroom by join code until they've joined
--    (RLS chicken-and-egg). A SECURITY DEFINER lookup function fixes it.
-- 2. New columns: classrooms.archived, characters.suspended
-- 3. Teachers can UPDATE and DELETE characters in their own classrooms
--    (needed for: advance individual zone, suspend, remove student)

-- ── New columns (add before the function that references them) ────────────────
alter table public.classrooms  add column if not exists archived  boolean not null default false;
alter table public.characters  add column if not exists suspended boolean not null default false;

-- ── Look up a classroom by join code, bypassing RLS ───────────────────────────
create or replace function public.lookup_classroom_by_code(p_code text)
returns table (
  id                    uuid,
  name                  text,
  period                text,
  base_instruments_only boolean,
  archived              boolean
)
language sql security definer stable as $$
  select id, name, period, base_instruments_only, archived
  from public.classrooms
  where join_code = upper(p_code)
  limit 1;
$$;

-- ── Teachers manage student characters in their classrooms ────────────────────
drop policy if exists "Teachers update classroom characters" on public.characters;
create policy "Teachers update classroom characters"
  on public.characters for update
  using (
    exists (
      select 1 from public.classrooms cl
      where cl.id = characters.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers delete classroom characters" on public.characters;
create policy "Teachers delete classroom characters"
  on public.characters for delete
  using (
    exists (
      select 1 from public.classrooms cl
      where cl.id = characters.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );
