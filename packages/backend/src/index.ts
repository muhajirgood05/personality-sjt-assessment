/**
 * Backend API entry point.
 * Registers all plugins and route modules.
 *
 * Runs in MOCK MODE by default (no PostgreSQL/Redis required).
 * Set USE_REAL_DB=true and USE_REAL_REDIS=true for production.
 */

import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { registerAuthRoutes } from './auth/auth.routes.js';
import { sessionRoutes } from './session/session.routes.js';
import { timerRoutes } from './timer/timer.routes.js';
import { personalityRoutes } from './assessment/personality.routes.js';
import { sjtRoutes } from './assessment/sjt.routes.js';
import { InMemoryDatabase, InMemoryRedis } from './mock-data.js';
import { generateMockPersonalityItems, generateMockSjtScenarios } from './mock-generators.js';

const app = Fastify({
  logger: true,
});

const start = async () => {
  try {
    // ─── Register Plugins ──────────────────────────────────────────────────────

    // CORS - allow frontend dev servers
    await app.register(fastifyCors, {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // JWT
    const jwtSecret = process.env.JWT_SECRET || 'development-secret';
    await app.register(fastifyJwt, {
      secret: jwtSecret,
    });

    // ─── Initialize Data Stores ────────────────────────────────────────────────

    const useRealDb = process.env.USE_REAL_DB === 'true';
    const useRealRedis = process.env.USE_REAL_REDIS === 'true';

    let db: InstanceType<typeof InMemoryDatabase>;
    let redis: InstanceType<typeof InMemoryRedis>;

    if (useRealDb) {
      // Production: use real PostgreSQL
      const { getDatabase } = await import('./db/connection.js');
      db = getDatabase() as unknown as InstanceType<typeof InMemoryDatabase>;
      console.log('[DB] Connected to PostgreSQL');
    } else {
      // Mock mode: use in-memory database
      db = new InMemoryDatabase();
      await db.initialize();
      console.log('[DB] Using in-memory database (mock mode)');
      console.log('[DB] Pre-seeded users: TEST001/password123 (candidate), ADMIN001/admin123 (admin)');
    }

    if (useRealRedis) {
      // Production: use real Redis
      const { createRedisClient } = await import('./redis/client.js');
      redis = createRedisClient() as unknown as InstanceType<typeof InMemoryRedis>;
      console.log('[Redis] Connected to Redis');
    } else {
      // Mock mode: use in-memory Redis
      redis = new InMemoryRedis();
      console.log('[Redis] Using in-memory store (mock mode)');
    }

    // ─── Health Check ──────────────────────────────────────────────────────────

    app.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        mode: useRealDb ? 'production' : 'mock',
      };
    });

    // ─── Register Routes ───────────────────────────────────────────────────────

    // Auth routes (login, refresh, logout)
    await registerAuthRoutes(app, { db: db as any, redis: redis as any });

    // Session routes (heartbeat, resume)
    await app.register(sessionRoutes, { redis: redis as any });

    // Timer routes (timer sync)
    await app.register(timerRoutes, { redis: redis as any });

    // Personality assessment routes
    await app.register(personalityRoutes, { redis: redis as any });

    // SJT assessment routes
    await app.register(sjtRoutes, { redis: redis as any });

    // ─── Unified Assessment Start Route ───────────────────────────────────────
    // Frontend calls POST /api/assessment/start with { sectionType }
    // This delegates to the appropriate section-specific handler

    app.post('/api/assessment/start', async (request, reply) => {
      const body = request.body as { sectionType?: string; sessionId?: string } | null;
      const sectionType = body?.sectionType;

      if (sectionType === 'personality') {
        // Generate mock personality test data
        const assessmentId = `personality_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = Date.now();
        const timerMs = 45 * 60 * 1000; // 45 minutes

        // Generate mock personality items
        const mockItems = generateMockPersonalityItems();

        // Store session state in mock Redis
        const sessionState = {
          assessmentId,
          sectionType: 'personality',
          currentItemIndex: 0,
          totalItems: mockItems.length,
          startedAt: now,
          lastSavedAt: now,
          status: 'in_progress',
        };
        await redis.set(`session:candidate-001:state`, JSON.stringify(sessionState), 'EX', 1800);
        await redis.set(`timer:${assessmentId}:personality:remaining`, String(timerMs), 'EX', 1800);
        await redis.set(`timer:${assessmentId}:personality:start_time`, String(now), 'EX', 1800);
        // Initialize heartbeat key so heartbeat endpoint works correctly
        await redis.set(`heartbeat:${assessmentId}:last_seen`, String(now), 'EX', 90);
        await redis.set(`personality:${assessmentId}:item_order`, JSON.stringify(mockItems.map((_, i) => `item-${i}`)), 'EX', 1800);

        return reply.status(200).send({
          success: true,
          data: {
            assessmentId,
            sectionType: 'personality',
            totalItems: mockItems.length,
            timerSync: {
              sectionId: assessmentId,
              remainingMs: timerMs,
              serverTimestamp: now,
            },
            firstItem: mockItems[0],
          },
        });
      }

      if (sectionType === 'sjt') {
        const assessmentId = `sjt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = Date.now();
        const timerMs = 60 * 60 * 1000; // 60 minutes

        const sjtScenarios = generateMockSjtScenarios();
        await redis.set(`session:candidate-001:state`, JSON.stringify({
          assessmentId,
          sectionType: 'sjt',
          currentItemIndex: 0,
          totalItems: sjtScenarios.length,
          startedAt: now,
          lastSavedAt: now,
          status: 'in_progress',
        }), 'EX', 1800);
        await redis.set(`timer:${assessmentId}:sjt:remaining`, String(timerMs), 'EX', 1800);
        await redis.set(`timer:${assessmentId}:sjt:start_time`, String(now), 'EX', 1800);
        // Initialize heartbeat key so heartbeat endpoint works correctly
        await redis.set(`heartbeat:${assessmentId}:last_seen`, String(now), 'EX', 90);

        return reply.status(200).send({
          success: true,
          data: {
            assessmentId,
            sectionType: 'sjt',
            totalItems: sjtScenarios.length,
            timerSync: {
              sectionId: assessmentId,
              remainingMs: timerMs,
              serverTimestamp: now,
            },
            firstItem: {
              type: 'sjt_scenario',
              ...sjtScenarios[0],
              renderedAt: now,
            },
          },
        });
      }

      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'sectionType must be "personality" or "sjt"' },
      });
    });

    // Unified respond endpoint
    app.post('/api/assessment/respond', async (request, reply) => {
      const body = request.body as any;
      const now = Date.now();

      // Get current session to determine section type
      const sessionStr = await redis.get('session:candidate-001:state');
      if (!sessionStr) {
        return reply.status(404).send({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'No active session' } });
      }

      const session = JSON.parse(sessionStr);
      const nextIndex = session.currentItemIndex + 1;
      session.currentItemIndex = nextIndex;
      session.lastSavedAt = now;
      await redis.set('session:candidate-001:state', JSON.stringify(session), 'EX', 1800);

      if (session.sectionType === 'personality') {
        const sectionComplete = nextIndex >= session.totalItems;
        const mockItems = generateMockPersonalityItems();
        const nextItem = sectionComplete ? null : (nextIndex < mockItems.length ? mockItems[nextIndex] : null);

        // Update timer
        const timerKey = `timer:${session.assessmentId}:personality:remaining`;
        const startKey = `timer:${session.assessmentId}:personality:start_time`;
        const remainingStr = await redis.get(timerKey);
        const startStr = await redis.get(startKey);
        const remaining = remainingStr ? Number(remainingStr) : 45 * 60 * 1000;
        const startTime = startStr ? Number(startStr) : now;
        const elapsed = now - startTime;
        const remainingMs = Math.max(0, remaining - elapsed);

        return reply.status(200).send({
          success: true,
          data: {
            saved: true,
            nextItem,
            timerSync: { sectionId: session.assessmentId, remainingMs, serverTimestamp: now },
            sectionComplete,
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          saved: true,
          nextItem: null,
          timerSync: { sectionId: session.assessmentId, remainingMs: 60 * 60 * 1000, serverTimestamp: now },
          sectionComplete: false,
        },
      });
    });

    // Mock scoring endpoint
    app.post('/api/scoring/calculate', async (_request, reply) => {
      return reply.status(200).send({ success: true, data: { status: 'completed' } });
    });

    // Mock report endpoint
    app.get('/api/reports/:candidateId', async (_request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          candidateId: 'candidate-001',
          candidateName: 'Test Candidate',
          sessionName: 'MINTS 2025',
          completedAt: new Date().toISOString(),
          personality: {
            dimensions: [
              { dimension: 'openness', rawScore: 15, stenScore: 7 },
              { dimension: 'conscientiousness', rawScore: 18, stenScore: 8 },
              { dimension: 'extraversion', rawScore: 12, stenScore: 6 },
              { dimension: 'agreeableness', rawScore: 16, stenScore: 7 },
              { dimension: 'neuroticism', rawScore: 8, stenScore: 4 },
            ],
            facets: [],
            narratives: [
              { dimension: 'openness', narrative: 'Anda menunjukkan keterbukaan yang baik terhadap pengalaman baru dan ide-ide kreatif.' },
              { dimension: 'conscientiousness', narrative: 'Anda memiliki tingkat kedisiplinan dan tanggung jawab yang tinggi.' },
              { dimension: 'extraversion', narrative: 'Anda memiliki keseimbangan yang baik antara bersosialisasi dan bekerja mandiri.' },
              { dimension: 'agreeableness', narrative: 'Anda menunjukkan kemampuan kerjasama dan empati yang baik.' },
              { dimension: 'neuroticism', narrative: 'Anda memiliki stabilitas emosional yang baik dan mampu mengelola tekanan.' },
            ],
          },
          sjt: {
            valueScores: [
              { value: 'integritas', score: 82 },
              { value: 'profesionalisme', score: 75 },
              { value: 'sinergi', score: 70 },
              { value: 'pelayanan', score: 78 },
              { value: 'kesempurnaan', score: 72 },
            ],
            behavioralExamples: [],
            elaborationScores: [],
          },
          composite: {
            suitabilityScore: 76.5,
            category: 'Suitable',
            confidence: 'High Confidence',
            personalitySubScore: 72,
            sjtSubScore: 75.4,
          },
          validity: {
            consistencyIndex: 87,
            averageResponseTimeMs: 4500,
            personalityAvgResponseTimeMs: 3200,
            sjtAvgResponseTimeMs: 12000,
            socialDesirabilityScore: 4,
            validityFlag: 'Valid',
            flaggedResponsePercentage: 5,
            focusLossCount: 0,
            hasValidityWarning: false,
          },
          recommendations: [
            { value: 'sinergi', currentScore: 70, suggestion: 'Kembangkan kemampuan kolaborasi dan komunikasi lintas unit untuk membangun kemitraan yang lebih produktif.' },
            { value: 'kesempurnaan', currentScore: 72, suggestion: 'Biasakan melakukan evaluasi dan perbaikan berkelanjutan untuk mencapai standar kerja yang lebih tinggi.' },
          ],
        },
      });
    });

    // Mock SJT scenarios endpoint
    app.get('/api/assessment/sjt/scenarios', async (_request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          scenarios: generateMockSjtScenarios(),
        },
      });
    });

    // ─── Start Server ──────────────────────────────────────────────────────────

    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);

    // ─── Graceful Shutdown ─────────────────────────────────────────────────────

    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Shutting down gracefully...`);
      await app.close();
      await db.close();
      if (typeof (redis as any).quit === 'function') {
        await (redis as any).quit();
      }
      console.log('Server shut down complete.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
