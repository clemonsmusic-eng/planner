-- Fix: infinite recursion in classrooms/characters RLS policies
--
-- The recursion chain was:
--   classrooms "Students read their classroom" → queries characters
--   characters "Teachers read classroom characters" → queries classrooms
--   → infinite loop on any SELECT touching classrooms or characters
--
-- Solution: a SECURITY DEFINER function that reads characters WITHOUT
-- triggering characters' RLS, breaking the circular dependency.

create or replace function public.my_classroom_id()
returns uuid language sql security definer stable as $$
  select classroom_id
  from public.characters
  where user_id = auth.uid()
  limit 1;
$$;

-- Fix classrooms: stop querying characters directly
drop policy if exists "Students read their classroom" on public.classrooms;
create policy "Students read their classroom"
  on public.classrooms for select
  using (id = public.my_classroom_id());

-- Fix characters: stop querying classrooms directly for the leaderboard policy
drop policy if exists "Students read classmates for leaderboard" on public.characters;
create policy "Students read classmates for leaderboard"
  on public.characters for select
  using (classroom_id = public.my_classroom_id());
