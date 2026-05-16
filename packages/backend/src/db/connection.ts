/**
 * Database connection utility with connection pooling and health checks.
 * Uses pg Pool for efficient connection management.
 */

import { Pool, PoolConfig, PoolClient } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  /** Maximum number of clients in the pool (default: 20) */
  maxConnections?: number;
  /** Idle timeout in milliseconds before a client is closed (default: 30000) */
  idleTimeoutMs?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectionTimeoutMs?: number;
  /** Whether to use SSL (default: false) */
  ssl?: boolean;
}

export interface HealthCheckResult {
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  latencyMs: number;
  error?: string;
}

/**
 * Creates a database configuration from environment variables.
 */
export function createConfigFromEnv(): DatabaseConfig {
  return {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    database: process.env['DB_NAME'] ?? 'assessment_platform',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? '',
    maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '20', 10),
    idleTimeoutMs: parseInt(process.env['DB_IDLE_TIMEOUT_MS'] ?? '30000', 10),
    connectionTimeoutMs: parseInt(process.env['DB_CONNECTION_TIMEOUT_MS'] ?? '5000', 10),
    ssl: process.env['DB_SSL'] === 'true',
  };
}

/**
 * Database connection manager with pooling and health checks.
 */
export class Database {
  private pool: Pool;

  constructor(config: DatabaseConfig) {

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections ?? 20,
      idleTimeoutMillis: config.idleTimeoutMs ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMs ?? 5000,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    };

    this.pool = new Pool(poolConfig);

    // Log pool errors to prevent unhandled rejections
    this.pool.on('error', (err) => {
      console.error('[Database] Unexpected pool error:', err.message);
    });
  }

  /**
   * Get the underlying pool instance (for advanced usage).
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute a query using a pooled connection.
   */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    const result = await this.pool.query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  }

  /**
   * Get a client from the pool for transaction support.
   * IMPORTANT: Always release the client when done.
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a function within a database transaction.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform a health check on the database connection.
   * Returns connection pool stats and latency.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const latencyMs = Date.now() - start;

      return {
        healthy: true,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      return {
        healthy: false,
        totalConnections: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingRequests: this.pool.waitingCount,
        latencyMs,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gracefully close all pool connections.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get current pool statistics.
   */
  getStats(): { total: number; idle: number; waiting: number } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

let dbInstance: Database | null = null;

/**
 * Get or create the singleton database instance.
 */
export function getDatabase(config?: DatabaseConfig): Database {
  if (!dbInstance) {
    const resolvedConfig = config ?? createConfigFromEnv();
    dbInstance = new Database(resolvedConfig);
  }
  return dbInstance;
}

/**
 * Close the singleton database instance.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}
