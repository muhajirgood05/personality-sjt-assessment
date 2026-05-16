/**
 * Heartbeat service.
 * Sends periodic heartbeat requests to the server every 30 seconds
 * to maintain session state and detect connection issues.
 *
 * Validates: Requirements 1.4, 1.5, 16.5
 */

import { apiRequest } from '../auth/api-client';
import { isOnline } from './connection-monitor';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export interface HeartbeatConfig {
  /** Assessment ID for the current session */
  assessmentId: string;
  /** Called when heartbeat succeeds with timer sync data */
  onSuccess?: (data: { timerSync: { sectionId: string; remainingMs: number; serverTimestamp: number }; sessionValid: boolean }) => void;
  /** Called when heartbeat fails (connection issue or server error) */
  onFailure?: (error: Error) => void;
  /** Called when session is no longer valid */
  onSessionInvalid?: () => void;
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentConfig: HeartbeatConfig | null = null;

/**
 * Send a single heartbeat request to the server.
 */
async function sendHeartbeat(): Promise<void> {
  if (!currentConfig) return;
  if (!isOnline()) {
    currentConfig.onFailure?.(new Error('Client is offline'));
    return;
  }

  try {
    const response = await apiRequest('/api/assessment/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: currentConfig.assessmentId }),
    });

    if (!response.ok) {
      throw new Error(`Heartbeat failed with status ${response.status}`);
    }

    const json = await response.json();

    // The API wraps the response in { success, data }
    // Extract the actual heartbeat data from the envelope
    const heartbeatData = json.data ?? json;

    if (heartbeatData.sessionValid === false) {
      currentConfig?.onSessionInvalid?.();
      return;
    }

    currentConfig?.onSuccess?.(heartbeatData);
  } catch (error) {
    currentConfig?.onFailure?.(error instanceof Error ? error : new Error('Heartbeat failed'));
  }
}

/**
 * Start the heartbeat service.
 * Sends a heartbeat immediately and then every 30 seconds.
 */
export function startHeartbeat(config: HeartbeatConfig): void {
  stopHeartbeat();
  currentConfig = config;

  // Send initial heartbeat
  void sendHeartbeat();

  // Schedule periodic heartbeats
  heartbeatInterval = setInterval(() => {
    void sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
}

/**
 * Stop the heartbeat service.
 */
export function stopHeartbeat(): void {
  if (heartbeatInterval !== null) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  currentConfig = null;
}

/**
 * Check if the heartbeat service is currently running.
 */
export function isHeartbeatRunning(): boolean {
  return heartbeatInterval !== null;
}

/**
 * Trigger a single heartbeat manually (e.g., on reconnection).
 */
export async function triggerHeartbeat(): Promise<void> {
  await sendHeartbeat();
}
