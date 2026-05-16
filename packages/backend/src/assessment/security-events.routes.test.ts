/**
 * Tests for Assessment Security Events Routes
 *
 * Validates:
 * - Security event request validation
 * - Focus loss count increment (Req 15.6)
 * - Navigation attempt logging (Req 15.4)
 * - Active session guard (Req 15.2)
 * - Copy/print attempt logging (Req 15.3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  securityEventsRoutes,
  SecurityKeys,
  createActiveSessionGuard,
  type SecurityEventsRoutesOptions,
} from './security-events.routes';

// ─── Mock Redis ──────────────────────────────────────────────────────────────

function createMockRedis() {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    incr: vi.fn(async (key: string) => {
      const current = Number(store.get(key) || '0');
      const next = current + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: vi.fn(async () => 1),
    rpush: vi.fn(async (key: string, ...values: string[]) => {
      const list = lists.get(key) || [];
      list.push(...values);
      lists.set(key, list);
      return list.length;
    }),
    lrange: vi.fn(async (key: string) => lists.get(key) || []),
    keys: vi.fn(async () => ['session:candidate-1:state']),
    // Internal helpers for test setup
    _store: store,
    _lists: lists,
  };
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

describe('securityEventsRoutes', () => {
  let app: FastifyInstance;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    mockRedis = createMockRedis();
    app = Fastify();

    // Set up a session state that indicates an active assessment
    mockRedis._store.set(
      'session:candidate-1:state',
      JSON.stringify({
        assessmentId: 'test-assessment-123',
        sectionType: 'personality',
        currentItemIndex: 5,
        totalItems: 120,
        startedAt: Date.now(),
        lastSavedAt: Date.now(),
        status: 'in_progress',
      })
    );

    const options: SecurityEventsRoutesOptions = {
      redis: mockRedis as any,
    };

    await app.register(securityEventsRoutes, options);
    await app.ready();
  });

  describe('POST /api/assessment/security-event', () => {
    describe('validation', () => {
      it('should reject request without assessmentId', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('INVALID_REQUEST');
      });

      it('should reject request without eventType', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            timestamp: Date.now(),
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
      });

      it('should reject invalid eventType', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'invalid_type',
            timestamp: Date.now(),
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.message).toContain('eventType must be one of');
      });

      it('should reject request without timestamp', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'focus_loss',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('active session check (Req 15.2)', () => {
      it('should reject events for non-active sessions', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'non-existent-assessment',
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('SESSION_NOT_ACTIVE');
      });

      it('should reject events for completed sessions', async () => {
        // Override session state to completed
        mockRedis._store.set(
          'session:candidate-1:state',
          JSON.stringify({
            assessmentId: 'completed-assessment',
            sectionType: 'personality',
            currentItemIndex: 120,
            totalItems: 120,
            startedAt: Date.now() - 3600000,
            lastSavedAt: Date.now(),
            status: 'completed',
          })
        );

        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'completed-assessment',
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('focus_loss events (Req 15.6)', () => {
      it('should increment focus_loss_count in Redis', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'focus_loss',
            timestamp: Date.now(),
            details: 'Focus loss #1 - tab hidden',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.logged).toBe(true);
        expect(body.data.eventType).toBe('focus_loss');

        // Verify Redis incr was called
        expect(mockRedis.incr).toHaveBeenCalledWith(
          SecurityKeys.focusLossCount('test-assessment-123')
        );
      });

      it('should set TTL on first focus loss increment', async () => {
        await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        expect(mockRedis.expire).toHaveBeenCalledWith(
          SecurityKeys.focusLossCount('test-assessment-123'),
          expect.any(Number)
        );
      });

      it('should accumulate multiple focus loss events', async () => {
        // First event
        await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        // Second event
        await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'focus_loss',
            timestamp: Date.now(),
          },
        });

        // Verify incr was called twice
        expect(mockRedis.incr).toHaveBeenCalledTimes(2);
        // The mock store should have value "2"
        expect(mockRedis._store.get(SecurityKeys.focusLossCount('test-assessment-123'))).toBe('2');
      });
    });

    describe('navigation_attempt events (Req 15.4)', () => {
      it('should log navigation attempt to Redis list', async () => {
        const timestamp = Date.now();
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'navigation_attempt',
            timestamp,
            details: 'Navigation attempt #1',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify rpush was called with the navigation attempt
        expect(mockRedis.rpush).toHaveBeenCalledWith(
          SecurityKeys.navigationAttempts('test-assessment-123'),
          expect.any(String)
        );

        // Verify the stored entry
        const storedEntry = mockRedis._lists.get(
          SecurityKeys.navigationAttempts('test-assessment-123')
        );
        expect(storedEntry).toHaveLength(1);
        const parsed = JSON.parse(storedEntry![0]!);
        expect(parsed.timestamp).toBe(timestamp);
        expect(parsed.details).toBe('Navigation attempt #1');
      });
    });

    describe('copy_attempt and print_attempt events (Req 15.3)', () => {
      it('should log copy attempt successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'copy_attempt',
            timestamp: Date.now(),
            details: 'Copy shortcut blocked',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.eventType).toBe('copy_attempt');
      });

      it('should log print attempt successfully', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/assessment/security-event',
          payload: {
            assessmentId: 'test-assessment-123',
            eventType: 'print_attempt',
            timestamp: Date.now(),
            details: 'Print shortcut blocked',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.eventType).toBe('print_attempt');
      });
    });
  });

  describe('GET /api/assessment/security-event/:assessmentId/summary', () => {
    it('should return security event summary', async () => {
      // Set up some security events
      mockRedis._store.set(SecurityKeys.focusLossCount('test-assessment-123'), '3');
      mockRedis._lists.set(SecurityKeys.navigationAttempts('test-assessment-123'), [
        JSON.stringify({ timestamp: 1000, details: 'Attempt 1' }),
        JSON.stringify({ timestamp: 2000, details: 'Attempt 2' }),
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/assessment/security-event/test-assessment-123/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.focusLossCount).toBe(3);
      expect(body.data.navigationAttemptCount).toBe(2);
      expect(body.data.navigationAttempts).toHaveLength(2);
    });

    it('should return zero counts when no events exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/assessment/security-event/new-assessment/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.focusLossCount).toBe(0);
      expect(body.data.navigationAttemptCount).toBe(0);
    });
  });
});

describe('createActiveSessionGuard', () => {
  let app: FastifyInstance;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    mockRedis = createMockRedis();
    app = Fastify();

    // Set up an active session
    mockRedis._store.set(
      'session:candidate-1:state',
      JSON.stringify({
        assessmentId: 'active-assessment',
        sectionType: 'personality',
        currentItemIndex: 0,
        totalItems: 120,
        startedAt: Date.now(),
        lastSavedAt: Date.now(),
        status: 'in_progress',
      })
    );

    const guard = createActiveSessionGuard(mockRedis as any);

    // Register a test route with the guard
    app.post(
      '/test-guarded',
      { preHandler: guard },
      async (request, reply) => {
        return reply.send({ success: true, data: { message: 'Access granted' } });
      }
    );

    await app.ready();
  });

  it('should allow access for active sessions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test-guarded',
      payload: { assessmentId: 'active-assessment' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('should deny access for non-active sessions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test-guarded',
      payload: { assessmentId: 'non-existent-assessment' },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SESSION_NOT_ACTIVE');
  });

  it('should pass through when no assessmentId is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test-guarded',
      payload: { someOtherField: 'value' },
    });

    // Should pass through to the route handler
    expect(response.statusCode).toBe(200);
  });
});
