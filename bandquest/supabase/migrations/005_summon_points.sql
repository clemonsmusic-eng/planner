-- Add summon_points column to characters table
alter table characters
  add column if not exists summon_points integer not null default 0;
