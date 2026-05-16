-- Migration: Create assessments table
-- Up

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  session_id UUID NOT NULL REFERENCES assessment_sessions(id) ON DELETE RESTRICT,
  section_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  item_order_seed INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  remaining_time_ms INTEGER,
  focus_loss_count INTEGER NOT NULL DEFAULT 0,
  navigation_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT chk_section_type CHECK (section_type IN ('personality', 'sjt')),
  CONSTRAINT chk_assessment_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'interrupted', 'expired'))
);

CREATE INDEX idx_assessments_candidate_id ON assessments(candidate_id);
CREATE INDEX idx_assessments_session_id ON assessments(session_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_candidate_session ON assessments(candidate_id, session_id);
