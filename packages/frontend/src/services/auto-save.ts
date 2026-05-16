/**
 * Auto-save service with offline queue integration.
 * Saves responses every 30 seconds. When offline, queues responses
 * locally in IndexedDB and synchronizes them on reconnection.
 *
 * Validates: Requirements 16.5, 16.6
 */

import type { ResponsePayload } from '@assessment/shared';
import { QueuedResponseStatus } from '@assessment/shared';
import { apiRequest } from '../auth/api-client';
import {
  enqueueResponse,
  getPendingResponses,
  updateResponseStatus,
  removeResponse,
} from './offline-queue';
import {
  isOnline,
  onConnectionChange,
  type ConnectionStatus,
} from './connection-monitor';

const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds
const MAX_RETRY_COUNT = 3;

export interface AutoSaveConfig {
  /** Assessment ID for the current session */
  assessmentId: string;
  /** Called when auto-save succeeds */
  onSaveSuccess?: (savedCount: number) => void;
  /** Called when auto-save fails (will queue locally if offline) */
  onSaveFailure?: (error: Error) => void;
  /** Called when offline queue sync completes */
  onSyncComplete?: (syncedCount: number) => void;
  /** Called when connection status changes */
  onConnectionChange?: (status: ConnectionStatus) => void;
}

// In-memory buffer of unsaved responses since last auto-save
let responseBuffer: ResponsePayload[] = [];
let autoSaveInterval: ReturnType<typeof setInterval> | null = null;
let currentConfig: AutoSaveConfig | null = null;
let connectionUnsubscribe: (() => void) | null = null;
let isSyncing = false;

/**
 * Add a response to the in-memory buffer for the next auto-save cycle.
 */
export function bufferResponse(payload: ResponsePayload): void {
  responseBuffer.push(payload);
}

/**
 * Perform the auto-save: send buffered responses to the server.
 * If offline, queue them in IndexedDB instead.
 */
async function performAutoSave(): Promise<void> {
  if (!currentConfig) return;
  if (responseBuffer.length === 0) return;

  const responsesToSave = [...responseBuffer];
  responseBuffer = [];

  if (!isOnline()) {
    // Queue responses locally when offline
    for (const payload of responsesToSave) {
      await enqueueResponse(payload);
    }
    currentConfig.onSaveFailure?.(new Error('Offline: responses queued locally'));
    return;
  }

  try {
    const response = await apiRequest('/api/assessment/auto-save', {
      method: 'POST',
      body: JSON.stringify({
        assessmentId: currentConfig.assessmentId,
        responses: responsesToSave,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auto-save failed with status ${response.status}`);
    }

    const data = await response.json();
    currentConfig.onSaveSuccess?.(data.savedCount ?? responsesToSave.length);
  } catch (error) {
    // On failure, queue responses locally
    for (const payload of responsesToSave) {
      await enqueueResponse(payload);
    }
    currentConfig.onSaveFailure?.(
      error instanceof Error ? error : new Error('Auto-save failed')
    );
  }
}

/**
 * Synchronize all pending queued responses to the server.
 * Called when connection is restored.
 */
export async function synchronizeQueue(): Promise<number> {
  if (isSyncing) return 0;
  if (!isOnline()) return 0;

  isSyncing = true;
  let syncedCount = 0;

  try {
    const pending = await getPendingResponses();
    if (pending.length === 0) return 0;

    // Mark all as syncing
    for (const item of pending) {
      await updateResponseStatus(item.id, QueuedResponseStatus.Syncing);
    }

    // Send batch to server
    const payloads = pending.map((item) => item.payload);
    const assessmentId = payloads[0]?.assessmentId;

    if (!assessmentId) return 0;

    try {
      const response = await apiRequest('/api/assessment/auto-save', {
        method: 'POST',
        body: JSON.stringify({
          assessmentId,
          responses: payloads,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      // Remove successfully synced responses
      for (const item of pending) {
        await removeResponse(item.id);
      }
      syncedCount = pending.length;
    } catch {
      // Mark failed items back to pending or failed based on retry count
      for (const item of pending) {
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= MAX_RETRY_COUNT) {
          await updateResponseStatus(item.id, QueuedResponseStatus.Failed, newRetryCount);
        } else {
          await updateResponseStatus(item.id, QueuedResponseStatus.Pending, newRetryCount);
        }
      }
    }

    return syncedCount;
  } finally {
    isSyncing = false;
  }
}

/**
 * Handle connection status change.
 * Triggers synchronization when coming back online.
 */
async function handleConnectionChange(status: ConnectionStatus): Promise<void> {
  currentConfig?.onConnectionChange?.(status);

  if (status === 'online') {
    const syncedCount = await synchronizeQueue();
    if (syncedCount > 0) {
      currentConfig?.onSyncComplete?.(syncedCount);
    }
  }
}

/**
 * Start the auto-save service.
 * Begins periodic auto-save and listens for connection changes.
 */
export function startAutoSave(config: AutoSaveConfig): void {
  stopAutoSave();
  currentConfig = config;

  // Start periodic auto-save
  autoSaveInterval = setInterval(() => {
    void performAutoSave();
  }, AUTO_SAVE_INTERVAL_MS);

  // Listen for connection changes to trigger sync
  connectionUnsubscribe = onConnectionChange((status) => {
    void handleConnectionChange(status);
  });
}

/**
 * Stop the auto-save service.
 */
export function stopAutoSave(): void {
  if (autoSaveInterval !== null) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (connectionUnsubscribe) {
    connectionUnsubscribe();
    connectionUnsubscribe = null;
  }
  currentConfig = null;
}

/**
 * Trigger an immediate auto-save (e.g., before page unload).
 */
export async function flushAutoSave(): Promise<void> {
  await performAutoSave();
}

/**
 * Check if the auto-save service is currently running.
 */
export function isAutoSaveRunning(): boolean {
  return autoSaveInterval !== null;
}

/**
 * Get the current response buffer size (for testing/debugging).
 */
export function getBufferSize(): number {
  return responseBuffer.length;
}

/**
 * Clear the response buffer (for testing).
 */
export function clearBuffer(): void {
  responseBuffer = [];
}
