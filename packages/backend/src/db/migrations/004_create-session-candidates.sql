-- Migration: Create session_candidates junction table (many-to-many)
-- Up

CREATE TABLE session_candidates (
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, candidate_id)
);

CREATE INDEX idx_session_candidates_session_id ON session_candidates(session_id);
CREATE INDEX idx_session_candidates_candidate_id ON session_candidates(candidate_id);
