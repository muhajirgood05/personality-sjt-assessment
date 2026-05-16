/**
 * Tests for the auto-save service with offline queue integration.
 *
 * Validates: Requirements 16.5, 16.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import type { ResponsePayload } from '@assessment/shared';

// Mock the api-client module
vi.mock('../auth/api-client', () => ({
  apiRequest: vi.fn(),
}));

// Mock the connection-monitor module
let mockOnlineState = true;
const connectionChangeListeners: Array<(status: string) => void> = [];

vi.mock('./connection-monitor', () => ({
  isOnline: () => mockOnlineState,
  onConnectionChange: (listener: (status: string) => void) => {
    connectionChangeListeners.push(listener);
    return () => {
      const idx = connectionChangeListeners.indexOf(listener);
      if (idx >= 0) connectionChangeListeners.splice(idx, 1);
    };
  },
}));

import { apiRequest } from '../auth/api-client';
import {
  startAutoSave,
  stopAutoSave,
  isAutoSaveRunning,
  bufferResponse,
  getBufferSize,
  clearBuffer,
  synchronizeQueue,
  flushAutoSave,
} from './auto-save';
import { deleteDatabase, getPendingResponses, enqueueResponse } from './offline-queue';

const mockApiRequest = vi.mocked(apiRequest);

function makePayload(overrides: Partial<ResponsePayload> = {}): ResponsePayload {
  return {
    assessmentId: 'assessment-1',
    itemId: `item-${Math.random().toString(36).slice(2)}`,
    response: 3,
    responseTimeMs: 5000,
    clientTimestamp: Date.now(),
    ...overrides,
  };
}

describe('auto-save', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOnlineState = true;
    connectionChangeListeners.length = 0;
    stopAutoSave();
    clearBuffer();
    await deleteDatabase();
  });

  afterEach(async () => {
    stopAutoSave();
    clearBuffer();
    await deleteDatabase();
  });

  describe('service lifecycle', () => {
    it('should start and stop the auto-save service', () => {
      startAutoSave({ assessmentId: 'test-assessment' });
      expect(isAutoSaveRunning()).toBe(true);

      stopAutoSave();
      expect(isAutoSaveRunning()).toBe(false);
    });
  });

  describe('buffering', () => {
    it('should buffer responses', () => {
      const payload = makePayload();
      bufferResponse(payload);
      expect(getBufferSize()).toBe(1);

      bufferResponse(makePayload({ itemId: 'item-2' }));
      expect(getBufferSize()).toBe(2);
    });

    it('should clear buffer on flush when online', async () => {
      mockApiRequest.mockResolvedValue(
        new Response(JSON.stringify({ savedCount: 3 }))
      );

      startAutoSave({ assessmentId: 'assessment-1' });

      bufferResponse(makePayload({ itemId: 'item-1' }));
      bufferResponse(makePayload({ itemId: 'item-2' }));
      bufferResponse(makePayload({ itemId: 'item-3' }));

      expect(getBufferSize()).toBe(3);
      await flushAutoSave();
      expect(getBufferSize()).toBe(0);
    });
  });

  describe('online auto-save', () => {
    it('should send buffered responses to server via flushAutoSave', async () => {
      mockApiRequest.mockResolvedValue(
        new Response(JSON.stringify({ savedCount: 2 }))
      );

      const onSaveSuccess = vi.fn();
      startAutoSave({ assessmentId: 'assessment-1', onSaveSuccess });

      bufferResponse(makePayload({ itemId: 'item-1' }));
      bufferResponse(makePayload({ itemId: 'item-2' }));

      await flushAutoSave();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/assessment/auto-save', {
        method: 'POST',
        body: expect.stringContaining('assessment-1'),
      });
      expect(onSaveSuccess).toHaveBeenCalledWith(2);
      expect(getBufferSize()).toBe(0);
    });

    it('should not send auto-save when buffer is empty', async () => {
      startAutoSave({ assessmentId: 'assessment-1' });

      await flushAutoSave();

      expect(mockApiRequest).not.toHaveBeenCalled();
    });
  });

  describe('offline queueing', () => {
    it('should queue responses locally when offline', async () => {
      mockOnlineState = false;

      const onSaveFailure = vi.fn();
      startAutoSave({ assessmentId: 'assessment-1', onSaveFailure });

      bufferResponse(makePayload({ itemId: 'item-1' }));
      bufferResponse(makePayload({ itemId: 'item-2' }));

      await flushAutoSave();

      expect(mockApiRequest).not.toHaveBeenCalled();

      const pending = await getPendingResponses();
      expect(pending).toHaveLength(2);
      expect(onSaveFailure).toHaveBeenCalled();
    });

    it('should queue responses locally when API call fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      const onSaveFailure = vi.fn();
      startAutoSave({ assessmentId: 'assessment-1', onSaveFailure });

      bufferResponse(makePayload({ itemId: 'item-1' }));

      await flushAutoSave();

      const pending = await getPendingResponses();
      expect(pending).toHaveLength(1);
      expect(onSaveFailure).toHaveBeenCalled();
    });
  });

  describe('synchronization', () => {
    it('should synchronize queued responses when called', async () => {
      mockOnlineState = true;
      mockApiRequest.mockResolvedValue(
        new Response(JSON.stringify({ savedCount: 2 }))
      );

      await enqueueResponse(makePayload({ itemId: 'item-1', assessmentId: 'assessment-1' }));
      await enqueueResponse(makePayload({ itemId: 'item-2', assessmentId: 'assessment-1' }));

      startAutoSave({ assessmentId: 'assessment-1' });

      const syncedCount = await synchronizeQueue();
      expect(syncedCount).toBe(2);

      const pending = await getPendingResponses();
      expect(pending).toHaveLength(0);
    });

    it('should not synchronize when offline', async () => {
      mockOnlineState = false;

      await enqueueResponse(makePayload({ itemId: 'item-1', assessmentId: 'assessment-1' }));

      const syncedCount = await synchronizeQueue();
      expect(syncedCount).toBe(0);

      const pending = await getPendingResponses();
      expect(pending).toHaveLength(1);
    });

    it('should trigger sync when connection is restored', async () => {
      mockApiRequest.mockResolvedValue(
        new Response(JSON.stringify({ savedCount: 1 }))
      );

      mockOnlineState = false;
      startAutoSave({ assessmentId: 'assessment-1' });

      await enqueueResponse(makePayload({ itemId: 'item-1', assessmentId: 'assessment-1' }));

      // Simulate coming back online
      mockOnlineState = true;
      for (const listener of connectionChangeListeners) {
        listener('online');
      }

      // Allow async sync to complete
      await new Promise((resolve) => { setTimeout(resolve, 100); });

      const pending = await getPendingResponses();
      expect(pending).toHaveLength(0);
    });
  });
});
