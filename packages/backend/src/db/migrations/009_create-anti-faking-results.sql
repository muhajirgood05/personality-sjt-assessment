-- Migration: Create anti_faking_results table
-- Up

CREATE TABLE anti_faking_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  consistency_index REAL NOT NULL DEFAULT 0,
  inconsistent_pair_count INTEGER NOT NULL DEFAULT 0,
  total_evaluated_pairs INTEGER NOT NULL DEFAULT 0,
  social_desirability_score REAL NOT NULL DEFAULT 0,
  response_time_cv REAL NOT NULL DEFAULT 0,
  flagged_fast_count INTEGER NOT NULL DEFAULT 0,
  total_responses INTEGER NOT NULL DEFAULT 0,
  response_time_concern BOOLEAN NOT NULL DEFAULT FALSE,
  validity_flag VARCHAR(50) NOT NULL DEFAULT 'Valid',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_validity_flag CHECK (validity_flag IN ('Valid', 'Cautionary', 'Invalid'))
);

CREATE INDEX idx_anti_faking_results_assessment_id ON anti_faking_results(assessment_id);
