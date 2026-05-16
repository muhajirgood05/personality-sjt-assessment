/**
 * Connection monitor service.
 * Detects online/offline status using navigator.onLine and browser events.
 * Notifies subscribers when connection status changes.
 *
 * Validates: Requirements 16.6
 */

export type ConnectionStatus = 'online' | 'offline';
export type ConnectionListener = (status: ConnectionStatus) => void;

const listeners = new Set<ConnectionListener>();
let currentStatus: ConnectionStatus = typeof navigator !== 'undefined'
  ? (navigator.onLine ? 'online' : 'offline')
  : 'online';

function handleOnline(): void {
  if (currentStatus !== 'online') {
    currentStatus = 'online';
    notifyListeners();
  }
}

function handleOffline(): void {
  if (currentStatus !== 'offline') {
    currentStatus = 'offline';
    notifyListeners();
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(currentStatus);
    } catch {
      // Prevent one listener from breaking others
    }
  }
}

/**
 * Start monitoring connection status.
 * Attaches event listeners to the window for online/offline events.
 */
export function startConnectionMonitor(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  // Sync initial state
  currentStatus = navigator.onLine ? 'online' : 'offline';
}

/**
 * Stop monitoring connection status.
 * Removes event listeners from the window.
 */
export function stopConnectionMonitor(): void {
  if (typeof window === 'undefined') return;
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
}

/**
 * Subscribe to connection status changes.
 * Returns an unsubscribe function.
 */
export function onConnectionChange(listener: ConnectionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get the current connection status.
 */
export function getConnectionStatus(): ConnectionStatus {
  return currentStatus;
}

/**
 * Check if currently online.
 */
export function isOnline(): boolean {
  return currentStatus === 'online';
}

/**
 * Clear all listeners (useful for testing).
 */
export function clearListeners(): void {
  listeners.clear();
}
