-- Migration: Create scoring_results table
-- Up

CREATE TABLE scoring_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  ocean_raw_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  ocean_adjusted_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  ocean_sten_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  facet_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  kemenkeu_value_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  sjt_concordance_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  elaboration_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  suitability_score REAL NOT NULL DEFAULT 0,
  suitability_category VARCHAR(50) NOT NULL DEFAULT 'Not Suitable',
  confidence_level VARCHAR(50) NOT NULL DEFAULT 'Low Confidence',
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_suitability_category CHECK (suitability_category IN ('Highly Suitable', 'Suitable', 'Conditionally Suitable', 'Not Suitable')),
  CONSTRAINT chk_confidence_level CHECK (confidence_level IN ('High Confidence', 'Moderate Confidence', 'Low Confidence'))
);

CREATE INDEX idx_scoring_results_assessment_id ON scoring_results(assessment_id);
