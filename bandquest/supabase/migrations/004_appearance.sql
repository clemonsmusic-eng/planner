-- Band Quest: Symphonica — Character Appearance Customization
-- Adds an `appearance` jsonb blob to both characters (students) and
-- profiles (teachers) so every user can customize their avatar.

alter table public.characters
  add column if not exists appearance jsonb not null default '{}';

alter table public.profiles
  add column if not exists appearance jsonb not null default '{}';

-- profiles already allows users to update their own row (see 001), so the
-- existing "Users update own profile" policy covers appearance edits for
-- teachers. Students update their own character via the existing
-- "Students manage own character" policy. No new policies required.
