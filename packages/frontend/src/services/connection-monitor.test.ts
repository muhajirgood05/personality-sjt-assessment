/**
 * Tests for the connection monitor service.
 *
 * Validates: Requirements 16.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startConnectionMonitor,
  stopConnectionMonitor,
  onConnectionChange,
  getConnectionStatus,
  isOnline,
  clearListeners,
} from './connection-monitor';

describe('connection-monitor', () => {
  beforeEach(() => {
    clearListeners();
    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    startConnectionMonitor();
  });

  afterEach(() => {
    stopConnectionMonitor();
    clearListeners();
  });

  it('should report online status when navigator.onLine is true', () => {
    expect(getConnectionStatus()).toBe('online');
    expect(isOnline()).toBe(true);
  });

  it('should report offline status when navigator.onLine is false', () => {
    stopConnectionMonitor();
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    startConnectionMonitor();

    expect(getConnectionStatus()).toBe('offline');
    expect(isOnline()).toBe(false);
  });

  it('should notify listeners when going offline', () => {
    const listener = vi.fn();
    onConnectionChange(listener);

    // Simulate going offline
    window.dispatchEvent(new Event('offline'));

    expect(listener).toHaveBeenCalledWith('offline');
  });

  it('should notify listeners when coming back online', () => {
    // Start offline
    window.dispatchEvent(new Event('offline'));

    const listener = vi.fn();
    onConnectionChange(listener);

    // Simulate coming back online
    window.dispatchEvent(new Event('online'));

    expect(listener).toHaveBeenCalledWith('online');
  });

  it('should not notify if status does not change', () => {
    const listener = vi.fn();
    onConnectionChange(listener);

    // Already online, dispatch online again
    window.dispatchEvent(new Event('online'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('should allow unsubscribing from connection changes', () => {
    const listener = vi.fn();
    const unsubscribe = onConnectionChange(listener);

    unsubscribe();

    window.dispatchEvent(new Event('offline'));

    expect(listener).not.toHaveBeenCalled();
  });

  it('should support multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    onConnectionChange(listener1);
    onConnectionChange(listener2);

    window.dispatchEvent(new Event('offline'));

    expect(listener1).toHaveBeenCalledWith('offline');
    expect(listener2).toHaveBeenCalledWith('offline');
  });

  it('should not break other listeners if one throws', () => {
    const errorListener = vi.fn(() => {
      throw new Error('listener error');
    });
    const goodListener = vi.fn();

    onConnectionChange(errorListener);
    onConnectionChange(goodListener);

    window.dispatchEvent(new Event('offline'));

    expect(errorListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalledWith('offline');
  });
});
