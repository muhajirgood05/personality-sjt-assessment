/**
 * SJT Item Repository
 *
 * Provides data access for Situational Judgement Test scenarios,
 * including CRUD operations and deterministic randomization per candidate.
 */

import { Database, getDatabase } from '../db/connection';
import {
  KemenkeuValue,
  SectionType,
  SjtOption,
  SjtScenarioContent,
} from '@assessment/shared';

export interface SjtScenarioRow {
  id: string;
  sectionType: SectionType;
  dimension: KemenkeuValue;
  facet: string | null;
  itemPosition: number;
  content: SjtScenarioContent;
  socialDesirabilityRating: number | null;
  isReverseScored: boolean;
  isConsistencyCheck: boolean;
  matchedPairId: string | null;
  isSocialDesirabilityItem: boolean;
  expertRanking: number[] | null;
}

export interface CreateSjtScenarioInput {
  dimension: KemenkeuValue;
  itemPosition: number;
  content: SjtScenarioContent;
  expertRanking: number[];
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences for a given seed.
 */
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded RNG for deterministic ordering.
 */
function seededShuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Maps a database row to the SjtScenarioRow interface.
 */
function mapRow(row: Record<string, unknown>): SjtScenarioRow {
  return {
    id: row['id'] as string,
    sectionType: row['section_type'] as SectionType,
    dimension: row['dimension'] as KemenkeuValue,
    facet: row['facet'] as string | null,
    itemPosition: row['item_position'] as number,
    content: row['content'] as SjtScenarioContent,
    socialDesirabilityRating: row['social_desirability_rating'] as number | null,
    isReverseScored: row['is_reverse_scored'] as boolean,
    isConsistencyCheck: row['is_consistency_check'] as boolean,
    matchedPairId: row['matched_pair_id'] as string | null,
    isSocialDesirabilityItem: row['is_social_desirability_item'] as boolean,
    expertRanking: row['expert_ranking'] as number[] | null,
  };
}

export class SjtRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db ?? getDatabase();
  }

  /**
   * Get all SJT scenarios from the item bank.
   */
  async findAllScenarios(): Promise<SjtScenarioRow[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM items WHERE section_type = $1 ORDER BY item_position`,
      [SectionType.SJT]
    );
    return rows.map(mapRow);
  }

  /**
   * Get SJT scenarios filtered by Kemenkeu value.
   */
  async findByValue(kemenkeuValue: KemenkeuValue): Promise<SjtScenarioRow[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM items WHERE section_type = $1 AND dimension = $2 ORDER BY item_position`,
      [SectionType.SJT, kemenkeuValue]
    );
    return rows.map(mapRow);
  }

  /**
   * Get a single SJT scenario by ID.
   */
  async findById(id: string): Promise<SjtScenarioRow | null> {
    const { rows } = await this.db.query(
      `SELECT * FROM items WHERE id = $1 AND section_type = $2`,
      [id, SectionType.SJT]
    );
    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  /**
   * Insert a single SJT scenario.
   */
  async create(input: CreateSjtScenarioInput): Promise<SjtScenarioRow> {
    const { rows } = await this.db.query(
      `INSERT INTO items (section_type, dimension, item_position, content, expert_ranking, is_reverse_scored, is_consistency_check, is_social_desirability_item)
       VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, FALSE)
       RETURNING *`,
      [
        SectionType.SJT,
        input.dimension,
        input.itemPosition,
        JSON.stringify(input.content),
        JSON.stringify(input.expertRanking),
      ]
    );
    return mapRow(rows[0]!);
  }

  /**
   * Bulk insert SJT scenarios.
   */
  async createBatch(inputs: CreateSjtScenarioInput[]): Promise<SjtScenarioRow[]> {
    if (inputs.length === 0) return [];

    const results: SjtScenarioRow[] = [];

    await this.db.transaction(async (client) => {
      for (const input of inputs) {
        const { rows } = await client.query(
          `INSERT INTO items (section_type, dimension, item_position, content, expert_ranking, is_reverse_scored, is_consistency_check, is_social_desirability_item)
           VALUES ($1, $2, $3, $4, $5, FALSE, FALSE, FALSE)
           RETURNING *`,
          [
            SectionType.SJT,
            input.dimension,
            input.itemPosition,
            JSON.stringify(input.content),
            JSON.stringify(input.expertRanking),
          ]
        );
        results.push(mapRow(rows[0] as Record<string, unknown>));
      }
    });

    return results;
  }

  /**
   * Get all SJT scenarios in a deterministic randomized order based on a seed.
   * The seed is typically the candidate's itemOrderSeed from their assessment record.
   */
  async getRandomizedScenarios(seed: number): Promise<SjtScenarioRow[]> {
    const scenarios = await this.findAllScenarios();
    const rng = seededRng(seed);
    return seededShuffle(scenarios, rng);
  }

  /**
   * Get options for a specific scenario in a deterministic randomized order based on a seed.
   * Returns the options with their original expertRank preserved but in shuffled display order.
   */
  async getRandomizedOptions(scenarioId: string, seed: number): Promise<SjtOption[]> {
    const scenario = await this.findById(scenarioId);
    if (!scenario) return [];

    const options = scenario.content.options;
    // Combine scenario ID hash with seed for unique per-scenario randomization
    const combinedSeed = seed ^ hashString(scenarioId);
    const rng = seededRng(combinedSeed);
    return seededShuffle(options, rng);
  }
}

/**
 * Simple string hash for combining with numeric seed.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
