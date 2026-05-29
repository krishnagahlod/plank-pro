-- Migration 001 — drop the college column from profiles and recreate the leaderboard view without it.
-- Run this in the Supabase SQL Editor if you already ran schema.sql before this change.
-- Safe to run more than once.

begin;

-- The view depends on profiles.college, so it must be dropped first.
drop view if exists leaderboard;

alter table profiles drop column if exists college;

create or replace view leaderboard as
  select
    p.id as user_id,
    p.full_name,
    p.city,
    a.valid_seconds,
    a.form_score,
    a.combined_score,
    a.created_at,
    exists(select 1 from shortlist s where s.user_id = p.id) as is_shortlisted
  from attempts a
  join profiles p on p.id = a.user_id
  where a.is_best = true
  order by a.combined_score desc;

commit;
