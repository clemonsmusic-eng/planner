-- The data itself: everything the app currently keeps in a browser.
--
-- Step two of centralising. This creates the tables and the rules about who
-- may read and write them. It does **not** change the app: nothing reads from
-- or writes to these tables yet, and every install still works off its own
-- local storage. That comes next, and doing it in two passes means the schema
-- can be reviewed, corrected and re-run without anyone's data riding on it.
--
-- Run this in the Supabase SQL editor, after 0001_auth_and_roles.sql.


-- ─── Why every id is text ────────────────────────────────────────────────────
--
-- The app already generates its own ids, and not in one format: projects get a
-- uuid, team members are slugs ('gabe', 'cheryl'), phase templates are
-- 'phase-4-1'. They are also referenced from inside jsonb — a project's inputs
-- name their PM by team-member id — so rewriting them on the way in would mean
-- rewriting the documents that point at them, and any one missed would be a
-- silently broken link. Text keys accept what already exists, which makes the
-- migration in step three a copy rather than a translation.


-- ─── Who am I ────────────────────────────────────────────────────────────────

create or replace function public.my_role()
returns public.access_level
language sql security definer stable set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

grant execute on function public.my_role() to authenticated;

-- ─── Reference data ──────────────────────────────────────────────────────────
--
-- The things every project is built from. One rule covers all of them:
-- everyone signed in may read, only an admin may write. That is the Settings
-- capability the app already enforces in its UI, restated somewhere the
-- browser cannot talk its way past.
--
-- Reading is deliberately open to every level, including Team Member. These
-- are not secrets — they are the phase names on a schedule, the community a
-- job is at, the supply list a PM draws from — and a level that could not read
-- them could not render the screens it is allowed to see.

create table public.team_members (
  id                  text primary key,
  name                text not null,
  phase_roles         jsonb not null default '{}'::jsonb,
  availability        jsonb not null default '{}'::jsonb,
  min_hours_per_week  numeric not null default 0,
  max_hours_per_week  numeric not null default 40,
  is_priority         boolean not null default false,
  experience          jsonb,
  time_off            jsonb not null default '[]'::jsonb,
  -- Set by an admin on the Team Members panel. Null for someone who is
  -- schedulable but has no login, which is most of a moving crew.
  profile_id          uuid unique references public.profiles(id) on delete set null,
  sort_order          integer not null default 0,
  updated_at          timestamptz not null default now()
);

create table public.communities (
  id          text primary key,
  name        text not null,
  sort_order  integer not null default 0
);

-- The editable pick-lists in Settings — flexibility, priority, CRM contact
-- type and the rest. Items stay a json array because they are a short ordered
-- list of plain strings that the app reorders as a unit; rows would buy a
-- sort_order column and nothing else.
create table public.lists (
  id          text primary key,
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0
);

create table public.phase_templates (
  id             text primary key,
  name           text not null,
  phase_order    text not null default '',
  min_hours      numeric not null default 0,
  max_hours      numeric not null default 0,
  min_team_size  integer not null default 1,
  max_team_size  integer not null default 1,
  roles          jsonb not null default '[]'::jsonb,
  shift          text not null default 'AM',
  is_am          boolean,
  is_pm          boolean,
  sort_order     integer not null default 0
);

create table public.service_categories (
  id          text primary key,
  category    text not null,
  services    jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0
);

create table public.supply_categories (
  id          text primary key,
  name        text not null,
  sort_order  integer not null default 0
);

create table public.supply_items (
  id             text primary key,
  name           text not null,
  category       text not null default '',
  unit           text not null default '',
  description    text not null default '',
  stocked        numeric not null default 0,
  cost_per_unit  numeric,
  consumable     boolean not null default true,
  sort_order     integer not null default 0,
  updated_at     timestamptz not null default now()
);

-- One row per section of the standing checklist; the items inside stay json
-- for the same reason as list items — they are edited and reordered as a unit.
create table public.checklist_sections (
  id             text primary key,
  name           text not null,
  description    text,
  move_types     jsonb,
  requires       jsonb,
  items          jsonb not null default '[]'::jsonb,
  sort_order     integer not null default 0
);

-- The handful of singletons: shift times, auction defaults. A key/value table
-- rather than a one-row table each, because they are read together, written
-- rarely, and adding the next one should not need a migration.
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

/*
 * The contact book.
 *
 * Written only by admins — the CRM page is admin-only in the app — but read by
 * everyone, because a project's contacts are links into this table and a PM
 * has to be able to render the ones on their own job.
 */
create table public.crm_contacts (
  id                   text primary key,
  contact_type         text not null default '',
  company              text not null default '',
  name                 text not null default '',
  work_phone           text not null default '',
  cell_phone           text not null default '',
  email                text not null default '',
  service_description  text not null default '',
  notes                text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ─── Projects ────────────────────────────────────────────────────────────────

/*
 * A project stays one document.
 *
 * The inputs, the generated schedule, the checklist progress and the file
 * metadata are written as a unit by an app that regenerates the whole schedule
 * whenever anything about it changes, so a row per shift would be torn down
 * and rebuilt on every replan and buy nothing. When cross-project reporting
 * wants real columns — hours per person across a month, which the logged-hours
 * cards are the beginning of — the schedule can be normalised out from under
 * this without moving anything else.
 */
create table public.projects (
  id          text primary key,
  inputs      jsonb not null default '{}'::jsonb,
  schedule    jsonb,
  checklist   jsonb,
  documents   jsonb,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Pulled out of the document so the ownership rule and the project list can
  -- use them without parsing json on every row. Generated rather than kept in
  -- step by a trigger, so they cannot drift from the document they describe.
  client_name text generated always as (inputs ->> 'clientName') stored,
  status      text generated always as (coalesce(inputs ->> 'status', 'active')) stored,
  project_manager_id text generated always as (inputs ->> 'projectManagerId') stored
);

create index projects_pm_idx on public.projects (project_manager_id);
create index projects_status_idx on public.projects (status);

/*
 * Who may change a project.
 *
 * An admin, or the PM it belongs to. A project with nobody set as PM is
 * editable by any PM rather than by none — otherwise a job created without one
 * would be stranded where only an admin could touch it, and the input form
 * does not require one.
 *
 * Reading is separate and open to everyone signed in. That is deliberate: the
 * calendar reads across every project to show what else is booked and to catch
 * a crew double-booked between two jobs, and a PM who could only see their own
 * work would lose exactly the conflicts that matter most.
 */
/*
 * The team member this account is, where an admin has said so.
 *
 * Schedulable people and sign-ins are separate lists on purpose: a mover who
 * never opens the app is still on the roster, and an office account is not
 * someone you can put on a shift. The link is what lets a project know which
 * signed-in person its PM is.
 */
create or replace function public.my_team_member_id()
returns text
language sql security definer stable set search_path = public
as $$ select id from public.team_members where profile_id = auth.uid() limit 1; $$;

grant execute on function public.my_team_member_id() to authenticated;


create or replace function public.can_edit_project(pm_id text)
returns boolean
language sql security definer stable set search_path = public
as $$
  select public.my_role() = 'admin'
      or (
        public.my_role() = 'pm'
        and (pm_id is null or pm_id = public.my_team_member_id())
      );
$$;

grant execute on function public.can_edit_project(text) to authenticated;


-- ─── Row-level security ──────────────────────────────────────────────────────

-- Reference data: read by all, written by admins.
do $$
declare t text;
begin
  foreach t in array array[
    'team_members', 'communities', 'lists', 'phase_templates', 'service_categories',
    'supply_categories', 'supply_items', 'checklist_sections', 'app_settings', 'crm_contacts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "read by any signed-in user" on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy "written by admins" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.projects enable row level security;

create policy "projects are readable by any signed-in user"
  on public.projects for select to authenticated using (true);

-- A new project must be one the creator would be allowed to edit, which stops
-- a PM filing a job under someone else's name and then not being able to
-- touch it.
create policy "projects are created by pms and admins"
  on public.projects for insert to authenticated
  with check (public.can_edit_project(inputs ->> 'projectManagerId'));

-- Both sides checked: you may not edit a project you do not own, and you may
-- not hand one to someone else on the way out.
create policy "projects are edited by their pm or an admin"
  on public.projects for update to authenticated
  using (public.can_edit_project(project_manager_id))
  with check (public.can_edit_project(inputs ->> 'projectManagerId'));

-- Deleting is an admin act. It was already the one thing a PM could not do.
create policy "projects are deleted by admins"
  on public.projects for delete to authenticated
  using (public.is_admin());


-- ─── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['team_members', 'supply_items', 'crm_contacts', 'app_settings', 'projects'] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t);
  end loop;
end $$;
