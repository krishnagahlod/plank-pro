-- Migration 003: Events table
-- Creates the events table required by /events and /admin/events routes.
-- Run this in the Supabase SQL editor after migrations 001 and 002.

CREATE TABLE IF NOT EXISTS events (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug             text        NOT NULL UNIQUE,
  title            text        NOT NULL,
  summary          text        NOT NULL,
  description      text,
  mode             text        NOT NULL DEFAULT 'online'
                   CHECK (mode IN ('online', 'offline')),
  location         text,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz,
  registration_url text,
  cover_image_url  text,
  is_published     boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_slug        ON events (slug);
CREATE INDEX IF NOT EXISTS idx_events_starts_at   ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_published   ON events (is_published);

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public users can read published events only.
-- Admin CRUD is performed via the service-role client which bypasses RLS.
DROP POLICY IF EXISTS "Public can read published events" ON events;
CREATE POLICY "Public can read published events"
  ON events FOR SELECT
  USING (is_published = true);
