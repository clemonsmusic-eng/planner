-- Accounts and roles for the Move Planner.
--
-- Step one of centralising the app: the access levels stop being a flag in a
-- browser's local storage and become a column on a row the browser cannot
-- write. Nothing else moves yet — projects, the team roster and the contact
-- book all still live on the device — so this migration is only about who
-- someone is and what they are allowed to be.
--
-- Run this once, in the Supabase SQL editor, against a fresh project.

-- ─── Roles ───────────────────────────────────────────────────────────────────

-- The same three levels the app has always had. An enum rather than free text,
-- so a typo in a role is a failed insert rather than a silently powerless
-- account.
create type public.access_level as enum ('team', 'pm', 'admin');


-- ─── Profiles ────────────────────────────────────────────────────────────────

-- One row per account, carrying the role. Separate from auth.users because
-- that table belongs to Supabase and is not ours to add columns to.
--
-- The role here is a *ceiling*, not a current state: the app still lets a
-- device drop below it without a password, so a phone handed to a mover shows
-- a mover's app. What it cannot do is climb above this row.
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text        not null,
  full_name   text        not null default '',
  role        public.access_level not null default 'team',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;


-- ─── Am I an admin? ──────────────────────────────────────────────────────────

-- Defined before the policies that call it, and before the invitations table
-- that does the same.
--
-- Reading profiles from inside a profiles policy would recurse, so this is
-- security definer: it runs as the owner and sidesteps RLS for that one lookup.
-- Locked down accordingly — a fixed search_path, and no arguments to confuse.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;


-- ─── Who may read and write a profile ────────────────────────────────────────

-- Everyone signed in can read the roster: the app names who is on a shift, and
-- a PM needs to see that Gabe is a PM. Nobody reads it signed out.
create policy "profiles are readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

-- Your own name is yours to fix. Your role is not — that is left to admins by
-- the policy below, and the trigger further down stops this one being used to
-- sneak a role change through.
create policy "a user may update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins may change anyone's role, including demoting another admin.
create policy "admins may update any profile"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── Nobody promotes themselves ──────────────────────────────────────────────

-- The self-update policy has to allow writing the row so someone can fix their
-- own name, and a policy cannot say "every column but this one". So the role
-- column is guarded here instead: an update that changes it is rejected unless
-- an admin is making it.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only an admin may change a role';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();


-- ─── Invitations ─────────────────────────────────────────────────────────────

-- The app is invite-only: signing up is not open, it is the completion of an
-- invitation an admin already made. The row is what makes an account possible
-- and what decides the role it lands on, so creating one is an admin act.
create table public.invitations (
  email       text primary key,
  role        public.access_level not null default 'team',
  full_name   text        not null default '',
  invited_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.invitations enable row level security;

create policy "admins may read invitations"
  on public.invitations for select
  to authenticated
  using (public.is_admin());

create policy "admins may write invitations"
  on public.invitations for insert
  to authenticated
  with check (public.is_admin());

create policy "admins may revoke invitations"
  on public.invitations for delete
  to authenticated
  using (public.is_admin());


-- ─── Signing up completes an invitation ──────────────────────────────────────

-- Runs when Supabase inserts into auth.users. An address nobody invited gets
-- an exception, which fails the sign-up: this is what keeps the app closed
-- without needing a private sign-up URL or an edge function holding a service
-- key. An invited address gets a profile carrying the role from the invite.
--
-- The first account is the exception. A brand new database has no admins, so
-- nobody can issue the first invitation — the first person to sign up becomes
-- the admin, and the door shuts behind them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.invitations%rowtype;
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;

  if first_user then
    insert into public.profiles (id, email, full_name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'admin');
    return new;
  end if;

  select * into invite from public.invitations
  where lower(email) = lower(new.email) and accepted_at is null;

  if invite.email is null then
    raise exception 'That address has not been invited. Ask an admin to add you.';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), invite.full_name, ''),
    invite.role
  );

  update public.invitations set accepted_at = now() where email = invite.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
