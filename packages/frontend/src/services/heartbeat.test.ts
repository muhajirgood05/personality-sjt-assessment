/**
 * Tests for the heartbeat service.
 *
 * Validates: Requirements 1.4, 1.5, 16.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startHeartbeat,
  stopHeartbeat,
  isHeartbeatRunning,
  triggerHeartbeat,
} from './heartbeat';

// Mock the api-client module
vi.mock('../auth/api-client', () => ({
  apiRequest: vi.fn(),
}));

// Mock the connection-monitor module
vi.mock('./connection-monitor', () => ({
  isOnline: vi.fn(() => true),
}));

import { apiRequest } from '../auth/api-client';
import { isOnline } from './connection-monitor';

const mockApiRequest = vi.mocked(apiRequest);
const mockIsOnline = vi.mocked(isOnline);

function makeSuccessResponse(remainingMs = 1000) {
  return new Response(
    JSON.stringify({
      timerSync: { sectionId: 's1', remainingMs, serverTimestamp: Date.now() },
      sessionValid: true,
    })
  );
}

describe('heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockIsOnline.mockReturnValue(true);
    stopHeartbeat();
  });

  afterEach(() => {
    stopHeartbeat();
    vi.useRealTimers();
  });

  it('should start and stop the heartbeat service', () => {
    mockApiRequest.mockResolvedValue(makeSuccessResponse());

    startHeartbeat({ assessmentId: 'test-assessment' });
    expect(isHeartbeatRunning()).toBe(true);

    stopHeartbeat();
    expect(isHeartbeatRunning()).toBe(false);
  });

  it('should send heartbeat immediately on start', () => {
    mockApiRequest.mockResolvedValue(makeSuccessResponse());

    startHeartbeat({ assessmentId: 'test-assessment' });

    expect(mockApiRequest).toHaveBeenCalledWith('/api/assessment/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: 'test-assessment' }),
    });
  });

  it('should send heartbeat every 30 seconds', () => {
    mockApiRequest.mockResolvedValue(makeSuccessResponse());

    startHeartbeat({ assessmentId: 'test-assessment' });

    // Initial call
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    // Advance 30 seconds
    vi.advanceTimersByTime(30_000);
    expect(mockApiRequest).toHaveBeenCalledTimes(2);

    // Advance another 30 seconds
    vi.advanceTimersByTime(30_000);
    expect(mockApiRequest).toHaveBeenCalledTimes(3);
  });

  it('should call onSuccess when heartbeat succeeds', async () => {
    const timerSync = { sectionId: 's1', remainingMs: 5000, serverTimestamp: Date.now() };
    mockApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ timerSync, sessionValid: true }))
    );

    const onSuccess = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onSuccess });

    // Flush the initial heartbeat promise
    await vi.advanceTimersByTimeAsync(0);

    expect(onSuccess).toHaveBeenCalledWith({ timerSync, sessionValid: true });
  });

  it('should call onFailure when heartbeat fails', async () => {
    mockApiRequest.mockRejectedValue(new Error('Network error'));

    const onFailure = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onFailure });

    // Flush the initial heartbeat promise
    await vi.advanceTimersByTimeAsync(0);

    expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onSessionInvalid when session is no longer valid', async () => {
    mockApiRequest.mockResolvedValue(
      new Response(JSON.stringify({
        timerSync: { sectionId: 's1', remainingMs: 0, serverTimestamp: Date.now() },
        sessionValid: false,
      }))
    );

    const onSessionInvalid = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onSessionInvalid });

    // Flush the initial heartbeat promise
    await vi.advanceTimersByTimeAsync(0);

    expect(onSessionInvalid).toHaveBeenCalled();
  });

  it('should not send heartbeat when offline', async () => {
    mockIsOnline.mockReturnValue(false);

    const onFailure = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onFailure });

    // Flush the initial heartbeat promise
    await vi.advanceTimersByTimeAsync(0);

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Client is offline',
    }));
  });

  it('should call onFailure when server returns non-ok status', async () => {
    mockApiRequest.mockResolvedValue(new Response('', { status: 500 }));

    const onFailure = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onFailure });

    // Flush the initial heartbeat promise
    await vi.advanceTimersByTimeAsync(0);

    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('500'),
    }));
  });

  it('should allow triggering a manual heartbeat', async () => {
    mockApiRequest.mockResolvedValue(makeSuccessResponse());

    const onSuccess = vi.fn();
    startHeartbeat({ assessmentId: 'test-assessment', onSuccess });

    // Flush the initial heartbeat
    await vi.advanceTimersByTimeAsync(0);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    // Trigger manual heartbeat
    mockApiRequest.mockResolvedValue(makeSuccessResponse(500));
    await triggerHeartbeat();

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });
});
