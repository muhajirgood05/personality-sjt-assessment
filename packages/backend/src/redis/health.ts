import type Redis from 'ioredis';
import { getRedisClient } from './client.js';

export interface RedisHealthStatus {
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  message?: string;
  connectedClients?: number;
  usedMemory?: string;
}

/**
 * Performs a health check on the Redis connection by issuing a PING command
 * and optionally gathering server info.
 *
 * @param client - Optional Redis client instance. Uses the default singleton if not provided.
 * @returns Health status including latency and connection details.
 */
export async function checkRedisHealth(client?: Redis): Promise<RedisHealthStatus> {
  const redis = client ?? getRedisClient();
  const start = Date.now();

  try {
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;

    if (pong !== 'PONG') {
      return {
        status: 'unhealthy',
        latencyMs,
        message: `Unexpected PING response: ${pong}`,
      };
    }

    // Gather basic server info for monitoring
    let connectedClients: number | undefined;
    let usedMemory: string | undefined;

    try {
      const info = await redis.info('clients');
      const clientsMatch = info.match(/connected_clients:(\d+)/);
      if (clientsMatch && clientsMatch[1]) {
        connectedClients = parseInt(clientsMatch[1], 10);
      }

      const memInfo = await redis.info('memory');
      const memMatch = memInfo.match(/used_memory_human:(.+)/);
      if (memMatch && memMatch[1]) {
        usedMemory = memMatch[1].trim();
      }
    } catch {
      // Info gathering is optional — don't fail the health check
    }

    return {
      status: 'healthy',
      latencyMs,
      connectedClients,
      usedMemory,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown Redis error';

    return {
      status: 'unhealthy',
      latencyMs,
      message,
    };
  }
}
