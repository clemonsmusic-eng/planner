-- An address on a contact.
--
-- A community is a place before it is a phone number: the Inputs tab copies
-- the community's address straight into a job's destination, so the book has
-- to be able to hold one. Free text in one column rather than street/city/
-- state/zip, matching the project's own address fields — these are postal
-- addresses to read and hand to a driver, not something queried by part.
--
-- Run this after 0003_project_files.sql.

alter table public.crm_contacts
  add column if not exists address text not null default '';


-- ─── Communities ─────────────────────────────────────────────────────────────

-- Communities moved into crm_contacts as entries of type 'Community', so
-- public.communities no longer has a client writing to it. The table and its
-- rows are deliberately left in place: dropping it would throw away the only
-- remote copy of a list some device may not have migrated yet. Drop it by hand
-- once every device has synced.
