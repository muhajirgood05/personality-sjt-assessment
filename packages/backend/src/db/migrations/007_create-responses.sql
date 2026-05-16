-- Migration: Create responses table
-- Up

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  sequence_number INTEGER NOT NULL,
  response_value JSONB NOT NULL,
  elaboration TEXT,
  response_time_ms INTEGER NOT NULL,
  is_flagged_fast BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_response_assessment_item UNIQUE (assessment_id, item_id),
  CONSTRAINT uq_response_assessment_sequence UNIQUE (assessment_id, sequence_number)
);

CREATE INDEX idx_responses_assessment_id ON responses(assessment_id);
CREATE INDEX idx_responses_item_id ON responses(item_id);
CREATE INDEX idx_responses_submitted_at ON responses(submitted_at);
