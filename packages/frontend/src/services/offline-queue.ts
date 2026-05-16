/**
 * IndexedDB-based offline queue for assessment responses.
 * Stores responses locally when the connection is lost and
 * provides methods to retrieve and synchronize them on reconnection.
 *
 * Validates: Requirements 16.5, 16.6
 */

import type { ResponsePayload, QueuedResponse } from '@assessment/shared';
import { QueuedResponseStatus } from '@assessment/shared';

const DB_NAME = 'assessment-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'responses';

let dbInstance: IDBDatabase | null = null;

/**
 * Open (or create) the IndexedDB database for the offline queue.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('assessmentId', 'payload.assessmentId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB for offline queue'));
    };
  });
}

/**
 * Generate a unique ID for a queued response.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Enqueue a response payload into the offline queue.
 */
export async function enqueueResponse(payload: ResponsePayload): Promise<QueuedResponse> {
  const db = await openDatabase();
  const queuedResponse: QueuedResponse = {
    id: generateId(),
    payload,
    timestamp: Date.now(),
    retryCount: 0,
    status: QueuedResponseStatus.Pending,
  };

  return new Promise<QueuedResponse>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(queuedResponse);

    request.onsuccess = () => resolve(queuedResponse);
    request.onerror = () => reject(new Error('Failed to enqueue response'));
  });
}

/**
 * Get all pending responses from the queue, ordered by timestamp.
 */
export async function getPendingResponses(): Promise<QueuedResponse[]> {
  const db = await openDatabase();

  return new Promise<QueuedResponse[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(QueuedResponseStatus.Pending);

    request.onsuccess = () => {
      const results = request.result as QueuedResponse[];
      results.sort((a, b) => a.timestamp - b.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(new Error('Failed to get pending responses'));
  });
}

/**
 * Get all responses in the queue (any status).
 */
export async function getAllQueuedResponses(): Promise<QueuedResponse[]> {
  const db = await openDatabase();

  return new Promise<QueuedResponse[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as QueuedResponse[];
      results.sort((a, b) => a.timestamp - b.timestamp);
      resolve(results);
    };
    request.onerror = () => reject(new Error('Failed to get all queued responses'));
  });
}

/**
 * Update the status of a queued response.
 */
export async function updateResponseStatus(
  id: string,
  status: QueuedResponseStatus,
  retryCount?: number
): Promise<void> {
  const db = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result as QueuedResponse | undefined;
      if (!item) {
        reject(new Error(`Queued response not found: ${id}`));
        return;
      }
      item.status = status;
      if (retryCount !== undefined) {
        item.retryCount = retryCount;
      }
      const putRequest = store.put(item);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to update response status'));
    };
    getRequest.onerror = () => reject(new Error('Failed to get response for update'));
  });
}

/**
 * Remove a response from the queue (after successful sync).
 */
export async function removeResponse(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to remove response from queue'));
  });
}

/**
 * Clear all responses from the queue.
 */
export async function clearQueue(): Promise<void> {
  const db = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear queue'));
  });
}

/**
 * Get the count of pending responses in the queue.
 */
export async function getPendingCount(): Promise<number> {
  const db = await openDatabase();

  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count(QueuedResponseStatus.Pending);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to count pending responses'));
  });
}

/**
 * Close the database connection (useful for testing cleanup).
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the database entirely (useful for testing cleanup).
 */
export function deleteDatabase(): Promise<void> {
  closeDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete database'));
  });
}
