/**
 * Item repository with CRUD operations for assessment items.
 * Supports personality forced-choice items, consistency-check pairs,
 * and social desirability items.
 */

import { Database } from '../db/index.js';
import {
  ItemEntity,
  SectionType,
  OceanDimension,
  ItemContent,
} from '@assessment/shared';

/**
 * Input for creating a new item (id is auto-generated).
 */
export interface CreateItemInput {
  sectionType: SectionType;
  dimension: OceanDimension | null;
  facet: string | null;
  itemPosition: number;
  content: ItemContent;
  socialDesirabilityRating: number | null;
  isReverseScored: boolean;
  isConsistencyCheck: boolean;
  matchedPairId: string | null;
  isSocialDesirabilityItem: boolean;
  expertRanking: number[] | null;
}

/**
 * Maps a database row (snake_case) to an ItemEntity (camelCase).
 */
function mapRowToEntity(row: Record<string, unknown>): ItemEntity {
  return {
    id: row.id as string,
    sectionType: row.section_type as SectionType,
    dimension: (row.dimension as OceanDimension | null) ?? null,
    facet: (row.facet as string | null) ?? null,
    itemPosition: row.item_position as number,
    content: row.content as ItemContent,
    socialDesirabilityRating: row.social_desirability_rating as number | null,
    isReverseScored: row.is_reverse_scored as boolean,
    isConsistencyCheck: row.is_consistency_check as boolean,
    matchedPairId: (row.matched_pair_id as string | null) ?? null,
    isSocialDesirabilityItem: row.is_social_desirability_item as boolean,
    expertRanking: (row.expert_ranking as number[] | null) ?? null,
  };
}

export class ItemRepository {
  constructor(private db: Database) {}

  /**
   * Get all items for a given section type.
   */
  async findAll(sectionType: SectionType): Promise<ItemEntity[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM items WHERE section_type = $1 ORDER BY item_position ASC',
      [sectionType]
    );
    return rows.map(mapRowToEntity);
  }

  /**
   * Get a single item by ID.
   */
  async findById(id: string): Promise<ItemEntity | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM items WHERE id = $1',
      [id]
    );
    if (rows.length === 0) return null;
    return mapRowToEntity(rows[0]);
  }

  /**
   * Get items by OCEAN dimension.
   */
  async findByDimension(dimension: OceanDimension): Promise<ItemEntity[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM items WHERE dimension = $1 ORDER BY item_position ASC',
      [dimension]
    );
    return rows.map(mapRowToEntity);
  }

  /**
   * Get all consistency-check item pairs.
   * Returns items where is_consistency_check = true.
   */
  async findConsistencyPairs(): Promise<ItemEntity[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM items WHERE is_consistency_check = true ORDER BY item_position ASC',
      []
    );
    return rows.map(mapRowToEntity);
  }

  /**
   * Get all social desirability scale items.
   */
  async findSocialDesirabilityItems(): Promise<ItemEntity[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM items WHERE is_social_desirability_item = true ORDER BY item_position ASC',
      []
    );
    return rows.map(mapRowToEntity);
  }

  /**
   * Insert a single new item.
   */
  async create(item: CreateItemInput): Promise<ItemEntity> {
    const { rows } = await this.db.query(
      `INSERT INTO items (
        section_type, dimension, facet, item_position, content,
        social_desirability_rating, is_reverse_scored, is_consistency_check,
        matched_pair_id, is_social_desirability_item, expert_ranking
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        item.sectionType,
        item.dimension,
        item.facet,
        item.itemPosition,
        JSON.stringify(item.content),
        item.socialDesirabilityRating,
        item.isReverseScored,
        item.isConsistencyCheck,
        item.matchedPairId,
        item.isSocialDesirabilityItem,
        item.expertRanking ? JSON.stringify(item.expertRanking) : null,
      ]
    );
    return mapRowToEntity(rows[0]);
  }

  /**
   * Bulk insert multiple items in a single transaction.
   */
  async createBatch(items: CreateItemInput[]): Promise<ItemEntity[]> {
    if (items.length === 0) return [];

    const results = await this.db.transaction(async (client) => {
      const inserted: ItemEntity[] = [];

      for (const item of items) {
        const { rows } = await client.query(
          `INSERT INTO items (
            section_type, dimension, facet, item_position, content,
            social_desirability_rating, is_reverse_scored, is_consistency_check,
            matched_pair_id, is_social_desirability_item, expert_ranking
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            item.sectionType,
            item.dimension,
            item.facet,
            item.itemPosition,
            JSON.stringify(item.content),
            item.socialDesirabilityRating,
            item.isReverseScored,
            item.isConsistencyCheck,
            item.matchedPairId,
            item.isSocialDesirabilityItem,
            item.expertRanking ? JSON.stringify(item.expertRanking) : null,
          ]
        );
        inserted.push(mapRowToEntity(rows[0]));
      }

      return inserted;
    });

    return results;
  }
}
