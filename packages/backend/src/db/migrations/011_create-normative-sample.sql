-- Migration: Create normative_sample table
-- Up

CREATE TABLE normative_sample (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dimension VARCHAR(50) NOT NULL,
  facet VARCHAR(100),
  mean REAL NOT NULL,
  std_dev REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  percentile_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_normative_dimension_facet UNIQUE (dimension, facet)
);

CREATE INDEX idx_normative_sample_dimension ON normative_sample(dimension);
