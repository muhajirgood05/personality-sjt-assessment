import { describe, it, expect, vi } from 'vitest';
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@assessment/shared';
import {
  requireRole,
  requireAdmin,
  requireCandidate,
  requireAny,
  JwtPayload,
} from './rbac.middleware';

/** Helper to create a mock Fastify request with a given user payload */
function mockRequest(user?: Partial<JwtPayload>): FastifyRequest {
  return { user } as unknown as FastifyRequest;
}

/** Helper to create a mock Fastify reply with chainable code/send */
function mockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as FastifyReply & {
    code: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

function makePayload(role: UserRole): JwtPayload {
  return {
    sub: 'user-123',
    role,
    employeeId: 'EMP001',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: 'token-id-abc',
  };
}

describe('RBAC Middleware', () => {
  describe('requireRole', () => {
    it('should allow access when user role matches allowed roles', async () => {
      const handler = requireRole(UserRole.Administrator);
      const request = mockRequest(makePayload(UserRole.Administrator));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it('should deny access when user role does not match allowed roles', async () => {
      const handler = requireRole(UserRole.Administrator);
      const request = mockRequest(makePayload(UserRole.Candidate));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'FORBIDDEN' }),
        }),
      );
    });

    it('should deny access when user has no role in token', async () => {
      const handler = requireRole(UserRole.Administrator);
      const request = mockRequest({ sub: 'user-123' } as Partial<JwtPayload>);
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'Access denied: no role found in token',
          }),
        }),
      );
    });

    it('should deny access when request.user is undefined', async () => {
      const handler = requireRole(UserRole.Administrator);
      const request = mockRequest(undefined);
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAdmin', () => {
    it('should allow Administrator access', async () => {
      const handler = requireAdmin();
      const request = mockRequest(makePayload(UserRole.Administrator));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should deny Candidate access', async () => {
      const handler = requireAdmin();
      const request = mockRequest(makePayload(UserRole.Candidate));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
    });
  });

  describe('requireCandidate', () => {
    it('should allow Candidate access', async () => {
      const handler = requireCandidate();
      const request = mockRequest(makePayload(UserRole.Candidate));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should deny Administrator access', async () => {
      const handler = requireCandidate();
      const request = mockRequest(makePayload(UserRole.Administrator));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAny', () => {
    it('should allow Administrator access', async () => {
      const handler = requireAny();
      const request = mockRequest(makePayload(UserRole.Administrator));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should allow Candidate access', async () => {
      const handler = requireAny();
      const request = mockRequest(makePayload(UserRole.Candidate));
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should deny access when no role is present', async () => {
      const handler = requireAny();
      const request = mockRequest({} as Partial<JwtPayload>);
      const reply = mockReply();

      await handler(request, reply);

      expect(reply.code).toHaveBeenCalledWith(403);
    });
  });
});
