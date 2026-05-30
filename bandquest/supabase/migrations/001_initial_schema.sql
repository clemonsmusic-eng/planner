-- Band Quest: Symphonica — Initial Schema
-- Supabase (PostgreSQL) with Row-Level Security

-- ── Enable extensions ────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with role and display name
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  role         text not null check (role in ('teacher', 'student')),
  school       text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ── Classrooms ────────────────────────────────────────────────────────────────
create table public.classrooms (
  id                    uuid primary key default uuid_generate_v4(),
  teacher_id            uuid not null references public.profiles(id) on delete cascade,
  name                  text not null,
  period                text,
  join_code             char(7) not null unique,  -- format: XXX-XXX
  current_zone          int not null default 1 check (current_zone between 1 and 12),
  base_instruments_only boolean not null default true,
  leaderboard_visible   boolean not null default true,
  created_at            timestamptz not null default now()
);

alter table public.classrooms enable row level security;

create policy "Teachers manage own classrooms"
  on public.classrooms for all
  using (auth.uid() = teacher_id);

-- NOTE: "Students read their classroom" policy is created after the
-- characters table below, because it references public.characters.

-- ── Characters ────────────────────────────────────────────────────────────────
create table public.characters (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  classroom_id         uuid not null references public.classrooms(id) on delete cascade,
  display_name         text not null,
  instrument           text not null,
  level                int not null default 1,
  xp                   int not null default 0,
  current_zone         int not null default 1 check (current_zone between 1 and 12),
  power                int not null default 10,
  accuracy             int not null default 10,
  technique            int not null default 10,
  endurance            int not null default 10,
  hp                   int not null default 100,
  max_hp               int not null default 100,
  resonance_points     int not null default 0,
  resonance_coins      int not null default 0,
  freed_allies         text[] not null default '{}',
  completed_challenges text[] not null default '{}',
  completed_quests     text[] not null default '{}',
  boot_camp_complete   boolean not null default false,
  practice_streak      int not null default 0,
  last_active_date     date,
  boss_victories       int not null default 0,
  ensemble_techs       int not null default 0,
  weekly_xp            int not null default 0,
  total_attempts       int not null default 0,
  gear                 jsonb not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique(user_id)  -- one character per user
);

alter table public.characters enable row level security;

create policy "Students manage own character"
  on public.characters for all
  using (auth.uid() = user_id);

create policy "Teachers read classroom characters"
  on public.characters for select
  using (
    exists (
      select 1 from public.classrooms cl
      where cl.id = characters.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy "Students read classmates for leaderboard"
  on public.characters for select
  using (
    exists (
      select 1 from public.characters my_char
      where my_char.user_id = auth.uid()
        and my_char.classroom_id = characters.classroom_id
    )
  );

-- Deferred classroom policy: references public.characters (now exists)
create policy "Students read their classroom"
  on public.classrooms for select
  using (
    exists (
      select 1 from public.characters c
      where c.classroom_id = classrooms.id
        and c.user_id = auth.uid()
    )
  );

-- ── Challenge Results ─────────────────────────────────────────────────────────
create table public.challenge_results (
  id              uuid primary key default uuid_generate_v4(),
  character_id    uuid not null references public.characters(id) on delete cascade,
  classroom_id    uuid not null references public.classrooms(id) on delete cascade,
  challenge_id    text not null,
  challenge_type  text not null,
  rating          text not null check (rating in ('superior','excellent','good','fair','poor')),
  score           numeric(5,2) not null default 0,
  xp_awarded      int not null default 0,
  rp_awarded      int not null default 0,
  override_rating text check (override_rating in ('superior','excellent','good','fair','poor')),
  override_note   text,
  override_by     uuid references public.profiles(id),
  override_at     timestamptz,
  recorded_at     timestamptz not null default now()
);

alter table public.challenge_results enable row level security;

create policy "Students read/write own results"
  on public.challenge_results for all
  using (
    exists (
      select 1 from public.characters c
      where c.id = challenge_results.character_id
        and c.user_id = auth.uid()
    )
  );

create policy "Teachers read classroom results"
  on public.challenge_results for select
  using (
    exists (
      select 1 from public.classrooms cl
      where cl.id = challenge_results.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy "Teachers override results"
  on public.challenge_results for update
  using (
    exists (
      select 1 from public.classrooms cl
      where cl.id = challenge_results.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );

-- ── Co-op Sessions ────────────────────────────────────────────────────────────
create table public.coop_sessions (
  id            uuid primary key default uuid_generate_v4(),
  classroom_id  uuid not null references public.classrooms(id) on delete cascade,
  session_type  text not null check (session_type in ('free_play','teacher_assigned','class_wide')),
  host_id       uuid not null references public.profiles(id),
  challenge_id  text,
  status        text not null default 'lobby' check (status in ('lobby','active','completed')),
  created_at    timestamptz not null default now()
);

create table public.coop_participants (
  session_id    uuid not null references public.coop_sessions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  result_rating text check (result_rating in ('superior','excellent','good','fair','poor')),
  submitted_at  timestamptz,
  primary key (session_id, user_id)
);

alter table public.coop_sessions enable row level security;
alter table public.coop_participants enable row level security;

create policy "Classroom members access sessions"
  on public.coop_sessions for all
  using (
    exists (
      select 1 from public.characters c
      where c.classroom_id = coop_sessions.classroom_id
        and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.classrooms cl
      where cl.id = coop_sessions.classroom_id
        and cl.teacher_id = auth.uid()
    )
  );

create policy "Session participants access their rows"
  on public.coop_participants for all
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.coop_sessions cs
      join public.classrooms cl on cl.id = cs.classroom_id
      where cs.id = coop_participants.session_id
        and cl.teacher_id = auth.uid()
    )
  );

-- ── Boot Camp Progress ────────────────────────────────────────────────────────
create table public.boot_camp_progress (
  id              uuid primary key default uuid_generate_v4(),
  character_id    uuid not null references public.characters(id) on delete cascade,
  step_id         text not null,
  completed       boolean not null default false,
  teacher_confirmed boolean not null default false,
  completed_at    timestamptz,
  unique(character_id, step_id)
);

alter table public.boot_camp_progress enable row level security;

create policy "Students manage own boot camp"
  on public.boot_camp_progress for all
  using (
    exists (
      select 1 from public.characters c
      where c.id = boot_camp_progress.character_id
        and c.user_id = auth.uid()
    )
  );

create policy "Teachers confirm boot camp steps"
  on public.boot_camp_progress for update
  using (
    exists (
      select 1 from public.characters c
      join public.classrooms cl on cl.id = c.classroom_id
      where c.id = boot_camp_progress.character_id
        and cl.teacher_id = auth.uid()
    )
  );

-- ── Leaderboard view (realtime-friendly) ─────────────────────────────────────
create or replace view public.leaderboard_view as
select
  c.user_id,
  c.classroom_id,
  c.display_name,
  c.instrument,
  c.level,
  c.weekly_xp,
  c.boss_victories,
  c.practice_streak,
  c.ensemble_techs
from public.characters c;

-- ── Helper: generate join code ────────────────────────────────────────────────
create or replace function public.generate_join_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..3 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  result := result || '-';
  for i in 1..3 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- ── Trigger: updated_at on characters ────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_updated_at
  before update on public.characters
  for each row execute function public.handle_updated_at();
