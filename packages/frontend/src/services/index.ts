/**
 * Services barrel export.
 * Provides offline queue, connection monitoring, heartbeat, and auto-save services.
 */

export {
  openDatabase,
  enqueueResponse,
  getPendingResponses,
  getAllQueuedResponses,
  updateResponseStatus,
  removeResponse,
  clearQueue,
  getPendingCount,
  closeDatabase,
  deleteDatabase,
} from './offline-queue';

export {
  startConnectionMonitor,
  stopConnectionMonitor,
  onConnectionChange,
  getConnectionStatus,
  isOnline,
  clearListeners,
  type ConnectionStatus,
  type ConnectionListener,
} from './connection-monitor';

export {
  startHeartbeat,
  stopHeartbeat,
  isHeartbeatRunning,
  triggerHeartbeat,
  type HeartbeatConfig,
} from './heartbeat';

export {
  startAutoSave,
  stopAutoSave,
  flushAutoSave,
  isAutoSaveRunning,
  bufferResponse,
  synchronizeQueue,
  getBufferSize,
  clearBuffer,
  type AutoSaveConfig,
} from './auto-save';
