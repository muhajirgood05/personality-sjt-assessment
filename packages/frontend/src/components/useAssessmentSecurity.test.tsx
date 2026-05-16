import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssessmentSecurity, type SecurityEvent } from './useAssessmentSecurity';

describe('useAssessmentSecurity', () => {
  let events: SecurityEvent[];
  let onSecurityEvent: (event: SecurityEvent) => void;

  beforeEach(() => {
    events = [];
    onSecurityEvent = (event: SecurityEvent) => {
      events.push(event);
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderSecurityHook(
    overrides?: Partial<Parameters<typeof useAssessmentSecurity>[0]>
  ) {
    return renderHook(() =>
      useAssessmentSecurity({
        assessmentId: 'test-assessment-123',
        enabled: true,
        onSecurityEvent,
        ...overrides,
      })
    );
  }

  describe('copy/paste prevention', () => {
    it('should prevent copy events and report them', () => {
      renderSecurityHook();

      const copyEvent = new Event('copy', { cancelable: true });
      act(() => {
        document.dispatchEvent(copyEvent);
      });

      expect(copyEvent.defaultPrevented).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('copy_attempt');
    });

    it('should prevent cut events and report them', () => {
      renderSecurityHook();

      const cutEvent = new Event('cut', { cancelable: true });
      act(() => {
        document.dispatchEvent(cutEvent);
      });

      expect(cutEvent.defaultPrevented).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('copy_attempt');
    });

    it('should block Ctrl+C keyboard shortcut', () => {
      renderSecurityHook();

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        cancelable: true,
      });
      act(() => {
        document.dispatchEvent(keyEvent);
      });

      expect(keyEvent.defaultPrevented).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('copy_attempt');
    });
  });

  describe('print prevention', () => {
    it('should block Ctrl+P keyboard shortcut', () => {
      renderSecurityHook();

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        cancelable: true,
      });
      act(() => {
        document.dispatchEvent(keyEvent);
      });

      expect(keyEvent.defaultPrevented).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('print_attempt');
    });

    it('should block Cmd+P keyboard shortcut (macOS)', () => {
      renderSecurityHook();

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'p',
        metaKey: true,
        cancelable: true,
      });
      act(() => {
        document.dispatchEvent(keyEvent);
      });

      expect(keyEvent.defaultPrevented).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('print_attempt');
    });
  });

  describe('context menu prevention', () => {
    it('should prevent right-click context menu', () => {
      renderSecurityHook();

      const contextEvent = new MouseEvent('contextmenu', { cancelable: true });
      act(() => {
        document.dispatchEvent(contextEvent);
      });

      expect(contextEvent.defaultPrevented).toBe(true);
    });
  });

  describe('focus loss detection', () => {
    it('should detect tab visibility change to hidden', () => {
      renderSecurityHook();

      // Simulate visibilitychange to hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('focus_loss');
      expect(events[0]!.details).toContain('tab hidden');

      // Restore
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
    });

    it('should detect window blur when document is still visible', () => {
      renderSecurityHook();

      // Ensure document is visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });

      act(() => {
        window.dispatchEvent(new Event('blur'));
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('focus_loss');
      expect(events[0]!.details).toContain('window blur');
    });
  });

  describe('navigation away detection', () => {
    it('should detect beforeunload and report navigation attempt', () => {
      renderSecurityHook();

      const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
      act(() => {
        window.dispatchEvent(beforeUnloadEvent);
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('navigation_attempt');
    });
  });

  describe('disabled state', () => {
    it('should not register event listeners when disabled', () => {
      renderSecurityHook({ enabled: false });

      const copyEvent = new Event('copy', { cancelable: true });
      act(() => {
        document.dispatchEvent(copyEvent);
      });

      // Should not be prevented when disabled
      expect(events).toHaveLength(0);
    });

    it('should not register event listeners when assessmentId is null', () => {
      renderSecurityHook({ assessmentId: null });

      const copyEvent = new Event('copy', { cancelable: true });
      act(() => {
        document.dispatchEvent(copyEvent);
      });

      expect(events).toHaveLength(0);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderSecurityHook();

      unmount();

      const copyEvent = new Event('copy', { cancelable: true });
      document.dispatchEvent(copyEvent);

      // After unmount, no events should be captured
      expect(events).toHaveLength(0);
    });
  });
});
