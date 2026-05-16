-- Migration: Create assessment_sessions table
-- Up

CREATE TABLE assessment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES administrators(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  personality_timer_seconds INTEGER NOT NULL DEFAULT 2700,
  sjt_timer_seconds INTEGER NOT NULL DEFAULT 3600,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_session_dates CHECK (end_date > start_date),
  CONSTRAINT chk_personality_timer CHECK (personality_timer_seconds >= 60 AND personality_timer_seconds <= 7200),
  CONSTRAINT chk_sjt_timer CHECK (sjt_timer_seconds >= 60 AND sjt_timer_seconds <= 7200)
);

CREATE INDEX idx_assessment_sessions_admin_id ON assessment_sessions(admin_id);
CREATE INDEX idx_assessment_sessions_status ON assessment_sessions(status);
