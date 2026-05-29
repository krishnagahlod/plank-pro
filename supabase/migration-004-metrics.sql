-- Migration 004: Telemetry and audit archiving
-- Adds scoring_version, model_version, and metrics jsonb column
-- to enable granular coaching details and dispute audits.

BEGIN;

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS scoring_version VARCHAR(24) DEFAULT '1.2.0',
  ADD COLUMN IF NOT EXISTS model_version VARCHAR(64) DEFAULT 'movenet_lightning_v1',
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;

COMMIT;
