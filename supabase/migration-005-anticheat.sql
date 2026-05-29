-- Migration 005: Anti-Cheat Schema and Session Tracking
-- Adds practice vs official modes, session checks, and telemetry logging.

BEGIN;

-- 1. Extend attempts table with anticheat parameters
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS attempt_type VARCHAR(12) NOT NULL DEFAULT 'practice' CHECK (attempt_type IN ('practice', 'official')),
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(12) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected')),
  ADD COLUMN IF NOT EXISTS risk_score NUMERIC DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_reasons TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS device_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Create attempt_sessions table for signed session starts
CREATE TABLE IF NOT EXISTS attempt_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE attempt_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Enable SELECT & INSERT policy for event registrations
DROP POLICY IF EXISTS "Users can read own registrations" ON event_registrations;
CREATE POLICY "Users can read own registrations"
  ON event_registrations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can register themselves" ON event_registrations;
CREATE POLICY "Users can register themselves"
  ON event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Update the best attempt trigger to partition by type and event ID
CREATE OR REPLACE FUNCTION update_best_attempt()
RETURNS trigger as $$
BEGIN
  -- Reset is_best for existing attempts of this type and event
  UPDATE attempts SET is_best = false
  WHERE user_id = new.user_id 
    AND attempt_type = new.attempt_type
    AND (event_id = new.event_id OR (event_id IS NULL AND new.event_id IS NULL))
    AND id != new.id;

  -- Mark the highest scoring attempt of this type and event as is_best = true
  UPDATE attempts set is_best = true
  WHERE id = (
    SELECT id FROM attempts
    WHERE user_id = new.user_id
      AND attempt_type = new.attempt_type
      AND (event_id = new.event_id OR (event_id IS NULL AND new.event_id IS NULL))
    ORDER BY combined_score DESC
    LIMIT 1
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS after_attempt_insert ON attempts;
CREATE TRIGGER after_attempt_insert
AFTER INSERT ON attempts
FOR EACH ROW EXECUTE PROCEDURE update_best_attempt();

-- 5. Partition the public leaderboard to only show verified/flagged official attempts
DROP VIEW IF EXISTS leaderboard CASCADE;
CREATE VIEW leaderboard as
  SELECT
    p.id as user_id,
    p.full_name,
    p.city,
    a.event_id,
    a.valid_seconds,
    a.form_score,
    a.combined_score,
    a.created_at,
    exists(SELECT 1 FROM shortlist s WHERE s.user_id = p.id) as is_shortlisted
  FROM attempts a
  JOIN profiles p on p.id = a.user_id
  WHERE a.is_best = true
    AND a.attempt_type = 'official'
    AND a.verification_status != 'rejected'
  ORDER BY a.combined_score DESC;

COMMIT;
