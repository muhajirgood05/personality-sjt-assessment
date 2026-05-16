/**
 * JWT authentication middleware for Fastify.
 * Verifies the access token and attaches user info to the request.
 *
 * Validates: Requirements 1.1, 14.3
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type Redis from 'ioredis';
import '@fastify/jwt';
import { TokenBlacklistKeys } from '../redis/keys.js';
import type { TokenPayload } from './auth.service.js';

export interface AuthMiddlewareDeps {
  redis: Redis;
}

/**
 * Creates a Fastify preHandler hook that verifies JWT tokens.
 * Extracts the token from the Authorization header (Bearer scheme),
 * verifies it, checks the blacklist, and attaches the user payload to the request.
 */
export function createAuthMiddleware(deps: AuthMiddlewareDeps) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
      return;
    }

    let payload: TokenPayload;
    try {
      payload = await request.jwtVerify<TokenPayload>();
    } catch {
      reply.code(401).send({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token is invalid or expired',
        },
      });
      return;
    }

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await deps.redis.get(TokenBlacklistKeys.entry(payload.jti));
    if (isBlacklisted) {
      reply.code(401).send({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
        },
      });
      return;
    }
  };
}
