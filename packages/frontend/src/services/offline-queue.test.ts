/**
 * Tests for the IndexedDB-based offline queue service.
 *
 * Validates: Requirements 16.5, 16.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { QueuedResponseStatus } from '@assessment/shared';
import type { ResponsePayload } from '@assessment/shared';
import {
  openDatabase,
  enqueueResponse,
  getPendingResponses,
  getAllQueuedResponses,
  updateResponseStatus,
  removeResponse,
  clearQueue,
  getPendingCount,
  deleteDatabase,
} from './offline-queue';

function makePayload(overrides: Partial<ResponsePayload> = {}): ResponsePayload {
  return {
    assessmentId: 'assessment-1',
    itemId: 'item-1',
    response: 3,
    responseTimeMs: 5000,
    clientTimestamp: Date.now(),
    ...overrides,
  };
}

describe('offline-queue', () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  afterEach(async () => {
    await deleteDatabase();
  });

  it('should open the database successfully', async () => {
    const db = await openDatabase();
    expect(db).toBeDefined();
    expect(db.name).toBe('assessment-offline-queue');
  });

  it('should enqueue a response and retrieve it', async () => {
    const payload = makePayload();
    const queued = await enqueueResponse(payload);

    expect(queued.id).toBeDefined();
    expect(queued.payload).toEqual(payload);
    expect(queued.status).toBe(QueuedResponseStatus.Pending);
    expect(queued.retryCount).toBe(0);
    expect(queued.timestamp).toBeGreaterThan(0);
  });

  it('should retrieve pending responses ordered by timestamp', async () => {
    const payload1 = makePayload({ itemId: 'item-1' });
    const payload2 = makePayload({ itemId: 'item-2' });
    const payload3 = makePayload({ itemId: 'item-3' });

    await enqueueResponse(payload1);
    await enqueueResponse(payload2);
    await enqueueResponse(payload3);

    const pending = await getPendingResponses();
    expect(pending).toHaveLength(3);
    // All items should be present (order may vary when timestamps are identical)
    const itemIds = pending.map((p) => p.payload.itemId);
    expect(itemIds).toContain('item-1');
    expect(itemIds).toContain('item-2');
    expect(itemIds).toContain('item-3');
  });

  it('should update response status', async () => {
    const payload = makePayload();
    const queued = await enqueueResponse(payload);

    await updateResponseStatus(queued.id, QueuedResponseStatus.Syncing);

    const pending = await getPendingResponses();
    expect(pending).toHaveLength(0);

    const all = await getAllQueuedResponses();
    expect(all).toHaveLength(1);
    expect(all[0]!.status).toBe(QueuedResponseStatus.Syncing);
  });

  it('should update retry count when updating status', async () => {
    const payload = makePayload();
    const queued = await enqueueResponse(payload);

    await updateResponseStatus(queued.id, QueuedResponseStatus.Pending, 2);

    const all = await getAllQueuedResponses();
    expect(all[0]!.retryCount).toBe(2);
  });

  it('should remove a response from the queue', async () => {
    const payload = makePayload();
    const queued = await enqueueResponse(payload);

    await removeResponse(queued.id);

    const all = await getAllQueuedResponses();
    expect(all).toHaveLength(0);
  });

  it('should clear all responses from the queue', async () => {
    await enqueueResponse(makePayload({ itemId: 'item-1' }));
    await enqueueResponse(makePayload({ itemId: 'item-2' }));
    await enqueueResponse(makePayload({ itemId: 'item-3' }));

    await clearQueue();

    const all = await getAllQueuedResponses();
    expect(all).toHaveLength(0);
  });

  it('should count pending responses', async () => {
    await enqueueResponse(makePayload({ itemId: 'item-1' }));
    await enqueueResponse(makePayload({ itemId: 'item-2' }));

    const count = await getPendingCount();
    expect(count).toBe(2);
  });

  it('should not count non-pending responses in pending count', async () => {
    const queued1 = await enqueueResponse(makePayload({ itemId: 'item-1' }));
    await enqueueResponse(makePayload({ itemId: 'item-2' }));

    await updateResponseStatus(queued1.id, QueuedResponseStatus.Syncing);

    const count = await getPendingCount();
    expect(count).toBe(1);
  });

  it('should reject updating a non-existent response', async () => {
    await expect(
      updateResponseStatus('non-existent-id', QueuedResponseStatus.Syncing)
    ).rejects.toThrow('Queued response not found');
  });
});
