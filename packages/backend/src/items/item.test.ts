/**
 * Unit tests for item repository and personality items seed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemRepository, CreateItemInput } from './item.repository.js';
import {
  generateForcedChoiceItems,
  generateConsistencyCheckPairs,
  generateSocialDesirabilityItems,
  generateAllPersonalityItems,
  validateSeedData,
  getPersonalitySeedData,
  FACETS,
} from './personality-items.seed.js';
import {
  SectionType,
  OceanDimension,
  ForcedChoiceItemContent,
} from '@assessment/shared';

// ─── Mock Database ───────────────────────────────────────────────────────────

function createMockDb() {
  const store: Record<string, unknown>[] = [];
  let idCounter = 0;

  return {
    query: vi.fn(async (text: string, params?: unknown[]) => {
      if (text.includes('INSERT')) {
        const id = `test-id-${++idCounter}`;
        const row = {
          id,
          section_type: params?.[0],
          dimension: params?.[1],
          facet: params?.[2],
          item_position: params?.[3],
          content: typeof params?.[4] === 'string' ? JSON.parse(params[4] as string) : params?.[4],
          social_desirability_rating: params?.[5],
          is_reverse_scored: params?.[6],
          is_consistency_check: params?.[7],
          matched_pair_id: params?.[8],
          is_social_desirability_item: params?.[9],
          expert_ranking: params?.[10] ? JSON.parse(params[10] as string) : null,
        };
        store.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (text.includes('WHERE id =')) {
        const id = params?.[0];
        const found = store.filter(r => r.id === id);
        return { rows: found, rowCount: found.length };
      }
      if (text.includes('WHERE section_type =')) {
        const sectionType = params?.[0];
        const found = store.filter(r => r.section_type === sectionType);
        return { rows: found, rowCount: found.length };
      }
      if (text.includes('WHERE dimension =')) {
        const dimension = params?.[0];
        const found = store.filter(r => r.dimension === dimension);
        return { rows: found, rowCount: found.length };
      }
      if (text.includes('is_consistency_check = true')) {
        const found = store.filter(r => r.is_consistency_check === true);
        return { rows: found, rowCount: found.length };
      }
      if (text.includes('is_social_desirability_item = true')) {
        const found = store.filter(r => r.is_social_desirability_item === true);
        return { rows: found, rowCount: found.length };
      }
      return { rows: store, rowCount: store.length };
    }),
    transaction: vi.fn(async (fn: (client: any) => Promise<any>) => {
      const client = {
        query: vi.fn(async (text: string, params?: unknown[]) => {
          if (text.includes('INSERT')) {
            const id = `test-id-${++idCounter}`;
            const row = {
              id,
              section_type: params?.[0],
              dimension: params?.[1],
              facet: params?.[2],
              item_position: params?.[3],
              content: typeof params?.[4] === 'string' ? JSON.parse(params[4] as string) : params?.[4],
              social_desirability_rating: params?.[5],
              is_reverse_scored: params?.[6],
              is_consistency_check: params?.[7],
              matched_pair_id: params?.[8],
              is_social_desirability_item: params?.[9],
              expert_ranking: params?.[10] ? JSON.parse(params[10] as string) : null,
            };
            store.push(row);
            return { rows: [row], rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        }),
      };
      return fn(client);
    }),
    _store: store,
  };
}

// ─── Repository Tests ────────────────────────────────────────────────────────

describe('ItemRepository', () => {
  let repo: ItemRepository;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    repo = new ItemRepository(mockDb as any);
  });

  describe('create', () => {
    it('should insert a single item and return it with an id', async () => {
      const input: CreateItemInput = {
        sectionType: SectionType.Personality,
        dimension: OceanDimension.Openness,
        facet: 'imagination',
        itemPosition: 1,
        content: {
          type: 'forced_choice',
          statementLeft: 'Test left',
          statementRight: 'Test right',
          dimensionLeft: OceanDimension.Openness,
          dimensionRight: OceanDimension.Conscientiousness,
          facetLeft: 'imagination',
          facetRight: 'orderliness',
          socialDesirabilityLeft: 3.2,
          socialDesirabilityRight: 3.4,
        },
        socialDesirabilityRating: 3.3,
        isReverseScored: false,
        isConsistencyCheck: false,
        matchedPairId: null,
        isSocialDesirabilityItem: false,
        expertRanking: null,
      };

      const result = await repo.create(input);

      expect(result.id).toBeDefined();
      expect(result.sectionType).toBe(SectionType.Personality);
      expect(result.dimension).toBe(OceanDimension.Openness);
      expect(result.facet).toBe('imagination');
      expect(result.itemPosition).toBe(1);
      expect(result.isReverseScored).toBe(false);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('createBatch', () => {
    it('should insert multiple items in a transaction', async () => {
      const items: CreateItemInput[] = [
        {
          sectionType: SectionType.Personality,
          dimension: OceanDimension.Openness,
          facet: 'imagination',
          itemPosition: 1,
          content: {
            type: 'forced_choice',
            statementLeft: 'A',
            statementRight: 'B',
            dimensionLeft: OceanDimension.Openness,
            dimensionRight: OceanDimension.Conscientiousness,
            facetLeft: 'imagination',
            facetRight: 'orderliness',
            socialDesirabilityLeft: 3.0,
            socialDesirabilityRight: 3.0,
          },
          socialDesirabilityRating: 3.0,
          isReverseScored: false,
          isConsistencyCheck: false,
          matchedPairId: null,
          isSocialDesirabilityItem: false,
          expertRanking: null,
        },
        {
          sectionType: SectionType.Personality,
          dimension: OceanDimension.Extraversion,
          facet: 'friendliness',
          itemPosition: 2,
          content: {
            type: 'forced_choice',
            statementLeft: 'C',
            statementRight: 'D',
            dimensionLeft: OceanDimension.Extraversion,
            dimensionRight: OceanDimension.Agreeableness,
            facetLeft: 'friendliness',
            facetRight: 'trust',
            socialDesirabilityLeft: 3.5,
            socialDesirabilityRight: 3.3,
          },
          socialDesirabilityRating: 3.4,
          isReverseScored: true,
          isConsistencyCheck: false,
          matchedPairId: null,
          isSocialDesirabilityItem: false,
          expertRanking: null,
        },
      ];

      const results = await repo.createBatch(items);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBeDefined();
      expect(results[1].id).toBeDefined();
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should return empty array for empty input', async () => {
      const results = await repo.createBatch([]);
      expect(results).toHaveLength(0);
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should query items by section type', async () => {
      await repo.findAll(SectionType.Personality);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE section_type = $1'),
        [SectionType.Personality]
      );
    });
  });

  describe('findById', () => {
    it('should return null when item not found', async () => {
      const result = await repo.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findByDimension', () => {
    it('should query items by dimension', async () => {
      await repo.findByDimension(OceanDimension.Openness);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE dimension = $1'),
        [OceanDimension.Openness]
      );
    });
  });

  describe('findConsistencyPairs', () => {
    it('should query consistency check items', async () => {
      await repo.findConsistencyPairs();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_consistency_check = true'),
        []
      );
    });
  });

  describe('findSocialDesirabilityItems', () => {
    it('should query social desirability items', async () => {
      await repo.findSocialDesirabilityItems();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_social_desirability_item = true'),
        []
      );
    });
  });
});

// ─── Seed Data Tests ─────────────────────────────────────────────────────────

describe('Personality Items Seed', () => {
  describe('FACETS', () => {
    it('should define 6 facets for each OCEAN dimension', () => {
      const dimensions = Object.values(OceanDimension);
      for (const dim of dimensions) {
        expect(FACETS[dim]).toHaveLength(6);
      }
    });
  });

  describe('generateForcedChoiceItems', () => {
    const items = generateForcedChoiceItems();

    it('should generate exactly 150 forced-choice items', () => {
      expect(items).toHaveLength(150);
    });

    it('should have 30 items per OCEAN dimension', () => {
      const dimensions = Object.values(OceanDimension);
      for (const dim of dimensions) {
        const count = items.filter(i => i.dimension === dim).length;
        expect(count).toBe(30);
      }
    });

    it('should cover all 6 facets per dimension', () => {
      const dimensions = Object.values(OceanDimension);
      for (const dim of dimensions) {
        const dimItems = items.filter(i => i.dimension === dim);
        const facets = new Set(dimItems.map(i => i.facet));
        expect(facets.size).toBeGreaterThanOrEqual(6);
      }
    });

    it('should have social desirability difference within 1 point for each pair', () => {
      for (const item of items) {
        const content = item.content as ForcedChoiceItemContent;
        const diff = Math.abs(content.socialDesirabilityLeft - content.socialDesirabilityRight);
        expect(diff).toBeLessThanOrEqual(1.0);
      }
    });

    it('should have all items as personality section type', () => {
      for (const item of items) {
        expect(item.sectionType).toBe(SectionType.Personality);
      }
    });

    it('should have sequential item positions', () => {
      for (let i = 0; i < items.length; i++) {
        expect(items[i].itemPosition).toBe(i + 1);
      }
    });

    it('should have content in Bahasa Indonesia', () => {
      // Check that statements contain Indonesian words
      const indonesianWords = ['saya', 'yang', 'dengan', 'untuk', 'dalam', 'tidak', 'lebih'];
      for (const item of items) {
        const content = item.content as ForcedChoiceItemContent;
        const combined = (content.statementLeft + content.statementRight).toLowerCase();
        const hasIndonesian = indonesianWords.some(word => combined.includes(word));
        expect(hasIndonesian).toBe(true);
      }
    });

    it('should have at least 30% reverse-scored items', () => {
      const reverseCount = items.filter(i => i.isReverseScored).length;
      expect(reverseCount / items.length).toBeGreaterThanOrEqual(0.30);
    });

    it('should pair statements from different dimensions', () => {
      for (const item of items) {
        const content = item.content as ForcedChoiceItemContent;
        expect(content.dimensionLeft).not.toBe(content.dimensionRight);
      }
    });
  });

  describe('generateConsistencyCheckPairs', () => {
    const items = generateConsistencyCheckPairs(151);

    it('should generate 30 items (15 pairs)', () => {
      expect(items).toHaveLength(30);
    });

    it('should mark all items as consistency checks', () => {
      for (const item of items) {
        expect(item.isConsistencyCheck).toBe(true);
      }
    });

    it('should have paired items at least 20 positions apart', () => {
      // First 15 items are "first" of each pair, last 15 are "second"
      for (let i = 0; i < 15; i++) {
        const first = items[i];
        const second = items[i + 15];
        const gap = Math.abs(second.itemPosition - first.itemPosition);
        expect(gap).toBeGreaterThanOrEqual(20);
      }
    });

    it('should have content in Bahasa Indonesia', () => {
      const indonesianWords = ['saya', 'yang', 'dengan', 'untuk', 'dalam', 'lebih', 'tidak', 'adalah', 'dari', 'ini', 'itu', 'bisa', 'akan', 'sudah', 'harus', 'juga', 'atau', 'pada', 'ke', 'di', 'dan', 'secara', 'tanpa', 'sebelum', 'setelah', 'antara', 'orang', 'kerja', 'waktu', 'hal'];
      for (const item of items) {
        const content = item.content as ForcedChoiceItemContent;
        const combined = (content.statementLeft + content.statementRight).toLowerCase();
        const hasIndonesian = indonesianWords.some(word => combined.includes(word));
        expect(hasIndonesian).toBe(true);
      }
    });
  });

  describe('generateSocialDesirabilityItems', () => {
    const items = generateSocialDesirabilityItems(181);

    it('should generate exactly 10 items', () => {
      expect(items).toHaveLength(10);
    });

    it('should mark all items as social desirability items', () => {
      for (const item of items) {
        expect(item.isSocialDesirabilityItem).toBe(true);
      }
    });

    it('should have at least 5 positions between consecutive SD items', () => {
      const positions = items.map(i => i.itemPosition).sort((a, b) => a - b);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(5);
      }
    });

    it('should have content in Bahasa Indonesia', () => {
      const indonesianWords = ['saya', 'yang', 'dengan', 'untuk', 'selalu', 'tidak', 'pernah'];
      for (const item of items) {
        const content = item.content as ForcedChoiceItemContent;
        const combined = (content.statementLeft + content.statementRight).toLowerCase();
        const hasIndonesian = indonesianWords.some(word => combined.includes(word));
        expect(hasIndonesian).toBe(true);
      }
    });
  });

  describe('validateSeedData', () => {
    it('should validate correct seed data without errors', () => {
      const data = generateAllPersonalityItems();
      const result = validateSeedData(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getPersonalitySeedData', () => {
    it('should return all items combined (150 + 30 + 10 = 190)', () => {
      const allItems = getPersonalitySeedData();
      expect(allItems).toHaveLength(190);
    });

    it('should have correct distribution of item types', () => {
      const allItems = getPersonalitySeedData();
      const regular = allItems.filter(i => !i.isConsistencyCheck && !i.isSocialDesirabilityItem);
      const consistency = allItems.filter(i => i.isConsistencyCheck);
      const sd = allItems.filter(i => i.isSocialDesirabilityItem);

      expect(regular).toHaveLength(150);
      expect(consistency).toHaveLength(30);
      expect(sd).toHaveLength(10);
    });
  });
});
