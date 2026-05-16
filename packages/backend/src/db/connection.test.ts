/**
 * Unit tests for the database connection module.
 * Tests configuration creation, pool management, and health check logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Database, DatabaseConfig, createConfigFromEnv } from './connection.js';

describe('createConfigFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars are set', () => {
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_NAME'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASSWORD'];
    delete process.env['DB_MAX_CONNECTIONS'];
    delete process.env['DB_IDLE_TIMEOUT_MS'];
    delete process.env['DB_CONNECTION_TIMEOUT_MS'];
    delete process.env['DB_SSL'];

    const config = createConfigFromEnv();

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.database).toBe('assessment_platform');
    expect(config.user).toBe('postgres');
    expect(config.password).toBe('');
    expect(config.maxConnections).toBe(20);
    expect(config.idleTimeoutMs).toBe(30000);
    expect(config.connectionTimeoutMs).toBe(5000);
    expect(config.ssl).toBe(false);
  });

  it('should read values from environment variables', () => {
    process.env['DB_HOST'] = 'db.example.com';
    process.env['DB_PORT'] = '5433';
    process.env['DB_NAME'] = 'test_db';
    process.env['DB_USER'] = 'test_user';
    process.env['DB_PASSWORD'] = 'secret123';
    process.env['DB_MAX_CONNECTIONS'] = '50';
    process.env['DB_IDLE_TIMEOUT_MS'] = '60000';
    process.env['DB_CONNECTION_TIMEOUT_MS'] = '10000';
    process.env['DB_SSL'] = 'true';

    const config = createConfigFromEnv();

    expect(config.host).toBe('db.example.com');
    expect(config.port).toBe(5433);
    expect(config.database).toBe('test_db');
    expect(config.user).toBe('test_user');
    expect(config.password).toBe('secret123');
    expect(config.maxConnections).toBe(50);
    expect(config.idleTimeoutMs).toBe(60000);
    expect(config.connectionTimeoutMs).toBe(10000);
    expect(config.ssl).toBe(true);
  });
});

describe('Database', () => {
  it('should create a Database instance with config', () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
      maxConnections: 5,
      idleTimeoutMs: 10000,
      connectionTimeoutMs: 3000,
      ssl: false,
    };

    const db = new Database(config);
    expect(db).toBeDefined();
    expect(db.getPool()).toBeDefined();
    expect(db.getStats()).toEqual({
      total: 0,
      idle: 0,
      waiting: 0,
    });
  });

  it('should return pool statistics', () => {
    const config: DatabaseConfig = {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'test',
      password: 'test',
    };

    const db = new Database(config);
    const stats = db.getStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('idle');
    expect(stats).toHaveProperty('waiting');
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.idle).toBe('number');
    expect(typeof stats.waiting).toBe('number');
  });

  it('should report unhealthy when connection fails', async () => {
    const config: DatabaseConfig = {
      host: 'nonexistent-host',
      port: 9999,
      database: 'test',
      user: 'test',
      password: 'test',
      connectionTimeoutMs: 1000,
    };

    const db = new Database(config);
    const health = await db.healthCheck();

    expect(health.healthy).toBe(false);
    expect(health.error).toBeDefined();
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);

    await db.close();
  }, 10000);
});
