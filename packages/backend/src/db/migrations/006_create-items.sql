-- Migration: Create items table
-- Up

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_type VARCHAR(50) NOT NULL,
  dimension VARCHAR(50),
  facet VARCHAR(100),
  item_position INTEGER NOT NULL,
  content JSONB NOT NULL,
  social_desirability_rating REAL,
  is_reverse_scored BOOLEAN NOT NULL DEFAULT FALSE,
  is_consistency_check BOOLEAN NOT NULL DEFAULT FALSE,
  matched_pair_id UUID REFERENCES items(id),
  is_social_desirability_item BOOLEAN NOT NULL DEFAULT FALSE,
  expert_ranking JSONB,
  CONSTRAINT chk_item_section_type CHECK (section_type IN ('personality', 'sjt'))
);

CREATE INDEX idx_items_section_type ON items(section_type);
CREATE INDEX idx_items_dimension ON items(dimension);
CREATE INDEX idx_items_matched_pair_id ON items(matched_pair_id);
