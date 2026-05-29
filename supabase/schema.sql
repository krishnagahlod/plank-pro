-- Plank-Pro selection portal — Supabase schema v0.1
-- Run this entire file once in the Supabase SQL Editor.
-- Idempotent-ish: drops are commented out; if you need a clean slate, uncomment the DROP block at the top.

-- ----------------------------------------------------------------------------
-- (Optional) Clean slate. Uncomment ONLY if you want to reset everything.
-- ----------------------------------------------------------------------------
-- drop view if exists leaderboard;
-- drop trigger if exists after_attempt_insert on attempts;
-- drop function if exists update_best_attempt();
-- drop table if exists shortlist;
-- drop table if exists attempts;
-- drop table if exists profiles;

-- ----------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  city text not null,
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Attempts
-- ----------------------------------------------------------------------------
create table if not exists attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  total_seconds numeric not null,
  valid_seconds numeric not null,
  form_score numeric not null check (form_score >= 0 and form_score <= 100),
  combined_score numeric not null,
  is_best boolean default false,
  created_at timestamptz default now()
);

alter table attempts enable row level security;

drop policy if exists "Users can read all attempts" on attempts;
create policy "Users can read all attempts"
  on attempts for select
  using (true);

drop policy if exists "Users can insert own attempts" on attempts;
create policy "Users can insert own attempts"
  on attempts for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Trigger: keep exactly one is_best=true row per user after each insert
-- ----------------------------------------------------------------------------
create or replace function update_best_attempt()
returns trigger as $$
begin
  update attempts set is_best = false
  where user_id = new.user_id and id != new.id;

  update attempts set is_best = true
  where id = (
    select id from attempts
    where user_id = new.user_id
    order by combined_score desc
    limit 1
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists after_attempt_insert on attempts;
create trigger after_attempt_insert
after insert on attempts
for each row execute procedure update_best_attempt();

-- ----------------------------------------------------------------------------
-- Shortlist
-- ----------------------------------------------------------------------------
create table if not exists shortlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  stage text default 'regional_qualifier',
  notes text,
  shortlisted_at timestamptz default now()
);

-- shortlist is admin-only (service_role bypasses RLS, no policies needed).
-- We still enable RLS so accidental anon access is blocked.
alter table shortlist enable row level security;

drop policy if exists "Public can read shortlist" on shortlist;
create policy "Public can read shortlist"
  on shortlist for select
  using (true);

-- ----------------------------------------------------------------------------
-- Leaderboard view
-- ----------------------------------------------------------------------------
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
