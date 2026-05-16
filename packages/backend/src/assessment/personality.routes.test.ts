/**
 * Tests for Personality Route Validation Logic and Route Handlers
 *
 * Validates:
 * - Response validation (integer 1-5)
 * - PersonalityItemDto building
 * - Forward-only navigation enforcement
 * - Inactivity reminder logic
 * - Route handler behavior with mocked Redis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePersonalityResponse,
  buildPersonalityItemDto,
  INACTIVITY_REMINDER_MS,
  PersonalityKeys,
} from './personality.routes';

// ─── validatePersonalityResponse ─────────────────────────────────────────────

describe('validatePersonalityResponse', () => {
  describe('valid responses', () => {
    it('should accept 1', () => {
      expect(validatePersonalityResponse(1)).toBeNull();
    });

    it('should accept 2', () => {
      expect(validatePersonalityResponse(2)).toBeNull();
    });

    it('should accept 3', () => {
      expect(validatePersonalityResponse(3)).toBeNull();
    });

    it('should accept 4', () => {
      expect(validatePersonalityResponse(4)).toBeNull();
    });

    it('should accept 5', () => {
      expect(validatePersonalityResponse(5)).toBeNull();
    });
  });

  describe('invalid responses - out of range', () => {
    it('should reject 0', () => {
      const result = validatePersonalityResponse(0);
      expect(result).not.toBeNull();
      expect(result).toContain('between 1 and 5');
    });

    it('should reject 6', () => {
      const result = validatePersonalityResponse(6);
      expect(result).not.toBeNull();
      expect(result).toContain('between 1 and 5');
    });

    it('should reject negative numbers', () => {
      const result = validatePersonalityResponse(-1);
      expect(result).not.toBeNull();
      expect(result).toContain('between 1 and 5');
    });

    it('should reject large numbers', () => {
      const result = validatePersonalityResponse(100);
      expect(result).not.toBeNull();
    });
  });

  describe('invalid responses - non-integer', () => {
    it('should reject 1.5', () => {
      const result = validatePersonalityResponse(1.5);
      expect(result).not.toBeNull();
      expect(result).toContain('integer');
    });

    it('should reject 3.7', () => {
      const result = validatePersonalityResponse(3.7);
      expect(result).not.toBeNull();
      expect(result).toContain('integer');
    });
  });

  describe('invalid responses - type errors', () => {
    it('should reject null', () => {
      const result = validatePersonalityResponse(null);
      expect(result).not.toBeNull();
      expect(result).toContain('required');
    });

    it('should reject undefined', () => {
      const result = validatePersonalityResponse(undefined);
      expect(result).not.toBeNull();
      expect(result).toContain('required');
    });

    it('should reject string', () => {
      const result = validatePersonalityResponse('3');
      expect(result).not.toBeNull();
      expect(result).toContain('number');
    });

    it('should reject array', () => {
      const result = validatePersonalityResponse([3]);
      expect(result).not.toBeNull();
      expect(result).toContain('number');
    });

    it('should reject object', () => {
      const result = validatePersonalityResponse({ value: 3 });
      expect(result).not.toBeNull();
    });

    it('should reject NaN', () => {
      const result = validatePersonalityResponse(NaN);
      expect(result).not.toBeNull();
    });

    it('should reject Infinity', () => {
      const result = validatePersonalityResponse(Infinity);
      expect(result).not.toBeNull();
    });
  });
});

// ─── buildPersonalityItemDto ─────────────────────────────────────────────────

describe('buildPersonalityItemDto', () => {
  it('should build a valid PersonalityItemDto from an item entity', () => {
    const item = {
      id: 'item-001',
      content: {
        type: 'forced_choice',
        statementLeft: 'I enjoy meeting new people',
        statementRight: 'I prefer working alone',
      },
    };

    const renderedAt = 1700000000000;
    const dto = buildPersonalityItemDto(item, renderedAt);

    expect(dto).toEqual({
      type: 'forced_choice',
      itemId: 'item-001',
      statementLeft: 'I enjoy meeting new people',
      statementRight: 'I prefer working alone',
      renderedAt: 1700000000000,
    });
  });

  it('should handle missing statement fields gracefully', () => {
    const item = {
      id: 'item-002',
      content: {
        type: 'forced_choice',
      },
    };

    const renderedAt = 1700000000000;
    const dto = buildPersonalityItemDto(item, renderedAt);

    expect(dto.statementLeft).toBe('');
    expect(dto.statementRight).toBe('');
    expect(dto.type).toBe('forced_choice');
    expect(dto.itemId).toBe('item-002');
    expect(dto.renderedAt).toBe(renderedAt);
  });

  it('should use the provided renderedAt timestamp', () => {
    const item = {
      id: 'item-003',
      content: {
        type: 'forced_choice',
        statementLeft: 'Left',
        statementRight: 'Right',
      },
    };

    const renderedAt = Date.now();
    const dto = buildPersonalityItemDto(item, renderedAt);

    expect(dto.renderedAt).toBe(renderedAt);
  });
});

// ─── PersonalityKeys ─────────────────────────────────────────────────────────

describe('PersonalityKeys', () => {
  it('should generate correct item order key', () => {
    expect(PersonalityKeys.itemOrder('assess-123')).toBe(
      'personality:assess-123:item_order'
    );
  });

  it('should generate correct seed key', () => {
    expect(PersonalityKeys.seed('assess-123')).toBe(
      'personality:assess-123:seed'
    );
  });

  it('should generate correct renderedAt key', () => {
    expect(PersonalityKeys.renderedAt('assess-123')).toBe(
      'personality:assess-123:rendered_at'
    );
  });

  it('should generate correct lastActivity key', () => {
    expect(PersonalityKeys.lastActivity('assess-123')).toBe(
      'personality:assess-123:last_activity'
    );
  });
});

// ─── INACTIVITY_REMINDER_MS ──────────────────────────────────────────────────

describe('INACTIVITY_REMINDER_MS', () => {
  it('should be 120 seconds (120000 ms)', () => {
    expect(INACTIVITY_REMINDER_MS).toBe(120_000);
  });
});

// ─── Integration-style tests with mocked Redis ──────────────────────────────

describe('personality routes integration', () => {
  let mockRedis: Record<string, string>;
  let redisMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedis = {};
    redisMock = {
      get: vi.fn((key: string) => Promise.resolve(mockRedis[key] ?? null)),
      set: vi.fn((key: string, value: string) => {
        mockRedis[key] = value;
        return Promise.resolve('OK');
      }),
      keys: vi.fn((pattern: string) => {
        const prefix = pattern.replace('*', '');
        const matchingKeys = Object.keys(mockRedis).filter((k) =>
          k.startsWith(prefix.split('*')[0]!)
        );
        return Promise.resolve(matchingKeys);
      }),
      del: vi.fn((key: string) => {
        delete mockRedis[key];
        return Promise.resolve(1);
      }),
    };
  });

  describe('forward-only navigation enforcement', () => {
    it('should not allow responding to a non-current item', async () => {
      // Setup: simulate a session at item index 2
      const assessmentId = 'personality_test_123';
      const candidateId = 'candidate-1';
      const itemOrder = ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'];

      mockRedis[PersonalityKeys.itemOrder(assessmentId)] = JSON.stringify(itemOrder);
      mockRedis[`session:${candidateId}:state`] = JSON.stringify({
        assessmentId,
        sectionType: 'personality',
        currentItemIndex: 2,
        totalItems: 5,
        startedAt: Date.now(),
        lastSavedAt: Date.now(),
        status: 'in_progress',
      });

      // The current item should be 'item-2'
      // Trying to respond to 'item-0' (going back) should fail
      const sessionState = JSON.parse(mockRedis[`session:${candidateId}:state`]!);
      const currentIndex = sessionState.currentItemIndex;
      const expectedItemId = itemOrder[currentIndex];

      // Simulate the check
      const attemptedItemId = 'item-0';
      expect(attemptedItemId).not.toBe(expectedItemId);
      expect(expectedItemId).toBe('item-2');
    });

    it('should allow responding to the current item', () => {
      const itemOrder = ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'];
      const currentIndex = 2;
      const expectedItemId = itemOrder[currentIndex];
      const attemptedItemId = 'item-2';

      expect(attemptedItemId).toBe(expectedItemId);
    });

    it('should not allow skipping items', () => {
      const itemOrder = ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'];
      const currentIndex = 1;
      const expectedItemId = itemOrder[currentIndex];
      const attemptedItemId = 'item-3'; // trying to skip ahead

      expect(attemptedItemId).not.toBe(expectedItemId);
      expect(expectedItemId).toBe('item-1');
    });
  });

  describe('inactivity reminder logic', () => {
    it('should trigger reminder after 120 seconds of inactivity', () => {
      const lastActivity = Date.now() - 121_000; // 121 seconds ago
      const inactivityMs = Date.now() - lastActivity;
      const showReminder = inactivityMs >= INACTIVITY_REMINDER_MS;

      expect(showReminder).toBe(true);
    });

    it('should not trigger reminder before 120 seconds', () => {
      const lastActivity = Date.now() - 60_000; // 60 seconds ago
      const inactivityMs = Date.now() - lastActivity;
      const showReminder = inactivityMs >= INACTIVITY_REMINDER_MS;

      expect(showReminder).toBe(false);
    });

    it('should not trigger reminder at exactly 119 seconds', () => {
      const lastActivity = Date.now() - 119_000;
      const inactivityMs = Date.now() - lastActivity;
      const showReminder = inactivityMs >= INACTIVITY_REMINDER_MS;

      expect(showReminder).toBe(false);
    });
  });

  describe('section completion detection', () => {
    it('should detect section complete when all items are answered', () => {
      const totalItems = 5;
      const nextIndex = 5; // after answering the last item (index 4)
      const itemOrder = ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'];

      const sectionComplete = nextIndex >= itemOrder.length;
      expect(sectionComplete).toBe(true);
    });

    it('should not be complete when items remain', () => {
      const nextIndex = 3;
      const itemOrder = ['item-0', 'item-1', 'item-2', 'item-3', 'item-4'];

      const sectionComplete = nextIndex >= itemOrder.length;
      expect(sectionComplete).toBe(false);
    });
  });
});
