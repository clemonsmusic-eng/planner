-- Somewhere for the files to live.
--
-- Step five: photos, floor plans and anything else attached to a job. Until
-- now the metadata travelled with the project and the bytes did not, so a
-- device that pulled a job saw a grid of photo tiles it could never open.
--
-- Run this after 0002_shared_data.sql.


-- ─── The bucket ──────────────────────────────────────────────────────────────

-- Private. These are photographs of the inside of somebody's home, taken while
-- they are moving out of it; a public bucket would put them behind a URL that
-- works for anyone who ever sees it, forever. Reads go through short-lived
-- signed links instead.
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;


-- ─── Who may touch them ──────────────────────────────────────────────────────
--
-- Files are stored as `<project id>/<file id>`, so the rules can be the same
-- ones the project itself has: anyone signed in may look, and only the PM it
-- belongs to or an admin may change it. Keying off the folder also means the
-- Supabase dashboard lists them by job, which is worth something the first
-- time somebody has to go looking for one.

/**
 * May the person signed in change this file?
 *
 * One security-definer function rather than a subquery inside each policy.
 * A policy that reads public.projects directly depends on the caller having
 * been granted that table and on the project being visible to them under its
 * own row-level security — and where that lookup comes back empty, the
 * "unowned projects are editable by any PM" rule quietly applies to a project
 * that is merely hidden. Doing it here reads the row regardless and asks the
 * same question the projects table would.
 */
create or replace function public.can_edit_project_files(object_name text)
returns boolean
language plpgsql security definer stable set search_path = public
as $$
declare
  owner_id text;
  found boolean;
begin
  select p.project_manager_id, true into owner_id, found
  from public.projects p
  where p.id = split_part(object_name, '/', 1);

  -- A path that names no project at all belongs to nobody, so only an admin
  -- may write it. Without this a stray upload would land under the PM rule for
  -- an unowned project and be allowed.
  if not coalesce(found, false) then
    return public.my_role() = 'admin';
  end if;
  return public.can_edit_project(owner_id);
end;
$$;

grant execute on function public.can_edit_project_files(text) to authenticated;


create policy "project files are readable by any signed-in user"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-files');

create policy "project files are added by the project's pm or an admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'project-files'
    and public.can_edit_project_files(name)
  );

create policy "project files are replaced by the project's pm or an admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_edit_project_files(name)
  );

create policy "project files are removed by the project's pm or an admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'project-files'
    and public.can_edit_project_files(name)
  );
