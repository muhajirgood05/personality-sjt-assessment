/**
 * Assessment Security Hook
 *
 * Provides client-side security controls during active assessment sessions:
 * - Disables copy, cut, paste, and print keyboard shortcuts (Req 15.3)
 * - Detects and logs navigation away attempts via beforeunload (Req 15.4)
 * - Detects and logs tab/window focus loss via visibilitychange (Req 15.6)
 * - Reports security events to the backend for audit logging
 *
 * Validates: Requirements 15.3, 15.4, 15.6
 */

import { useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SecurityEventType = 'navigation_attempt' | 'focus_loss' | 'copy_attempt' | 'print_attempt';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details?: string;
}

export interface UseAssessmentSecurityOptions {
  /** The active assessment ID (required to enable security controls) */
  assessmentId: string | null;
  /** Whether security controls are active */
  enabled: boolean;
  /** Callback to report security events to the backend */
  onSecurityEvent?: (event: SecurityEvent) => void;
}

export interface UseAssessmentSecurityResult {
  /** Current focus loss count for this session */
  focusLossCount: number;
  /** Current navigation attempt count for this session */
  navigationAttemptCount: number;
}

// ─── Hook Implementation ─────────────────────────────────────────────────────

export function useAssessmentSecurity(
  options: UseAssessmentSecurityOptions
): UseAssessmentSecurityResult {
  const { assessmentId, enabled, onSecurityEvent } = options;
  const focusLossCountRef = useRef(0);
  const navigationAttemptCountRef = useRef(0);
  const onSecurityEventRef = useRef(onSecurityEvent);

  // Keep callback ref up to date
  onSecurityEventRef.current = onSecurityEvent;

  const reportEvent = useCallback((event: SecurityEvent) => {
    onSecurityEventRef.current?.(event);
  }, []);

  useEffect(() => {
    if (!enabled || !assessmentId) {
      return;
    }

    // ─── Prevent Copy/Cut/Paste ────────────────────────────────────────────

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportEvent({
        type: 'copy_attempt',
        timestamp: Date.now(),
        details: `Clipboard event: ${e.type}`,
      });
    };

    // ─── Prevent Print (Ctrl+P / Cmd+P) and Screenshot (PrintScreen) ──────

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P / Cmd+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        reportEvent({
          type: 'print_attempt',
          timestamp: Date.now(),
          details: 'Print shortcut blocked',
        });
        return;
      }

      // Block Ctrl+C / Cmd+C (copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        reportEvent({
          type: 'copy_attempt',
          timestamp: Date.now(),
          details: 'Copy shortcut blocked',
        });
        return;
      }

      // Block Ctrl+A / Cmd+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        return;
      }

      // Block PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        reportEvent({
          type: 'copy_attempt',
          timestamp: Date.now(),
          details: 'PrintScreen key blocked',
        });
      }
    };

    // ─── Prevent Context Menu (Right-Click) ────────────────────────────────

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // ─── Detect Navigation Away (beforeunload) ─────────────────────────────

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      navigationAttemptCountRef.current += 1;
      reportEvent({
        type: 'navigation_attempt',
        timestamp: Date.now(),
        details: `Navigation attempt #${navigationAttemptCountRef.current}`,
      });

      // Show browser's built-in warning dialog
      e.preventDefault();
      e.returnValue = 'Anda sedang dalam sesi asesmen aktif. Apakah Anda yakin ingin meninggalkan halaman ini?';
      return e.returnValue;
    };

    // ─── Detect Tab/Window Focus Loss (visibilitychange) ───────────────────

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        focusLossCountRef.current += 1;
        reportEvent({
          type: 'focus_loss',
          timestamp: Date.now(),
          details: `Focus loss #${focusLossCountRef.current} - tab hidden`,
        });
      }
    };

    // Also detect window blur (covers alt-tab and window switching)
    const handleWindowBlur = () => {
      // Only count if the document is still visible (alt-tab without tab switch)
      if (document.visibilityState === 'visible') {
        focusLossCountRef.current += 1;
        reportEvent({
          type: 'focus_loss',
          timestamp: Date.now(),
          details: `Focus loss #${focusLossCountRef.current} - window blur`,
        });
      }
    };

    // ─── Register Event Listeners ──────────────────────────────────────────

    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handleCopy);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleWindowBlur);

    // ─── Cleanup ───────────────────────────────────────────────────────────

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, assessmentId, reportEvent]);

  return {
    focusLossCount: focusLossCountRef.current,
    navigationAttemptCount: navigationAttemptCountRef.current,
  };
}
