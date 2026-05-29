-- Migration 002 — richer scoring metrics.
-- Adds stability_score + breaks_count to the attempts table.
-- Existing rows are wiped per user direction (no athletes onboarded yet
-- and the formula for form_score / combined_score has changed materially).
-- Safe to run more than once.

begin;

truncate table attempts cascade;

alter table attempts
  add column if not exists stability_score numeric
    check (stability_score >= 0 and stability_score <= 100),
  add column if not exists breaks_count integer not null default 0;

commit;
