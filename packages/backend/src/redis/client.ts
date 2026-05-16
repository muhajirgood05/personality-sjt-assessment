import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  /** Maximum number of connections in the pool (simulated via lazyConnect instances) */
  poolSize?: number;
}

const DEFAULT_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || '',
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  poolSize: 10,
};

function buildRedisOptions(config: RedisConfig): RedisOptions {
  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
    enableReadyCheck: config.enableReadyCheck ?? true,
    connectTimeout: config.connectTimeout ?? 10000,
    retryStrategy(times: number): number | null {
      if (times > 10) {
        // Stop retrying after 10 attempts
        return null;
      }
      // Exponential backoff: min(times * 200, 5000)ms
      return Math.min(times * 200, 5000);
    },
    reconnectOnError(err: Error): boolean | 1 | 2 {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return true;
      }
      return false;
    },
  };
}

/**
 * Creates a new Redis client instance with the given configuration.
 * Uses ioredis built-in connection management with reconnection strategy.
 */
export function createRedisClient(config?: Partial<RedisConfig>): Redis {
  const mergedConfig: RedisConfig = { ...DEFAULT_CONFIG, ...config };
  const options = buildRedisOptions(mergedConfig);
  const client = new Redis(options);

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  client.on('connect', () => {
    console.info('[Redis] Connected successfully');
  });

  client.on('reconnecting', (delay: number) => {
    console.warn(`[Redis] Reconnecting in ${delay}ms...`);
  });

  client.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  return client;
}

/**
 * Singleton Redis client instance for the application.
 * Lazily initialized on first access.
 */
let _defaultClient: Redis | null = null;

export function getRedisClient(config?: Partial<RedisConfig>): Redis {
  if (!_defaultClient) {
    _defaultClient = createRedisClient(config);
  }
  return _defaultClient;
}

/**
 * Gracefully disconnect the default Redis client.
 * Should be called during application shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (_defaultClient) {
    await _defaultClient.quit();
    _defaultClient = null;
  }
}

/**
 * Reset the singleton client (useful for testing).
 */
export function resetRedisClient(): void {
  _defaultClient = null;
}
