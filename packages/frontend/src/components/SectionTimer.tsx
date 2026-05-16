import { useState, useEffect, useRef, useCallback } from 'react';
import './SectionTimer.css';

export interface SectionTimerProps {
  /** Remaining time in milliseconds (from server) */
  remainingMs: number;
  /** Server timestamp when remainingMs was calculated */
  serverTimestamp: number;
  /** Called when the timer reaches 0 */
  onExpired: () => void;
  /** Called when user confirms early submission */
  onEarlySubmit: () => void;
  /** Whether to show the early submit button */
  showEarlySubmit?: boolean;
}

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SectionTimer({
  remainingMs,
  serverTimestamp,
  onExpired,
  onEarlySubmit,
  showEarlySubmit = false,
}: SectionTimerProps) {
  const [localRemainingMs, setLocalRemainingMs] = useState<number>(() => {
    // Account for any time elapsed since the server timestamp
    const elapsed = Date.now() - serverTimestamp;
    return Math.max(0, remainingMs - elapsed);
  });
  const [showDialog, setShowDialog] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredCalledRef = useRef(false);

  // Sync with server time when props change (heartbeat response)
  useEffect(() => {
    const elapsed = Date.now() - serverTimestamp;
    const synced = Math.max(0, remainingMs - elapsed);
    setLocalRemainingMs(synced);
    expiredCalledRef.current = false;
  }, [remainingMs, serverTimestamp]);

  // Countdown interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setLocalRemainingMs((prev) => {
        const next = prev - 1000;
        return Math.max(0, next);
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle expiration
  useEffect(() => {
    if (localRemainingMs <= 0 && !expiredCalledRef.current) {
      expiredCalledRef.current = true;
      onExpired();
    }
  }, [localRemainingMs, onExpired]);

  const isWarning = localRemainingMs <= WARNING_THRESHOLD_MS;

  const handleEarlySubmitClick = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleConfirmSubmit = useCallback(() => {
    setShowDialog(false);
    onEarlySubmit();
  }, [onEarlySubmit]);

  const handleCancelSubmit = useCallback(() => {
    setShowDialog(false);
  }, []);

  const containerClass = `section-timer${isWarning ? ' section-timer--warning' : ''}`;

  return (
    <>
      <div className={containerClass} role="timer" aria-live="polite" aria-label="Section timer">
        <span className="section-timer__label">Sisa Waktu</span>
        <span className="section-timer__time" data-testid="timer-display">
          {formatTime(localRemainingMs)}
        </span>
        {showEarlySubmit && (
          <button
            type="button"
            className="section-timer__submit-btn"
            onClick={handleEarlySubmitClick}
          >
            Selesai Lebih Awal
          </button>
        )}
      </div>

      {showDialog && (
        <div className="section-timer__dialog-overlay" role="dialog" aria-modal="true">
          <div className="section-timer__dialog">
            <h3>Konfirmasi Pengumpulan</h3>
            <p>
              Apakah Anda yakin ingin mengumpulkan jawaban sekarang? Anda masih memiliki{' '}
              {formatTime(localRemainingMs)} tersisa.
            </p>
            <div className="section-timer__dialog-actions">
              <button
                type="button"
                className="section-timer__dialog-cancel"
                onClick={handleCancelSubmit}
              >
                Batal
              </button>
              <button
                type="button"
                className="section-timer__dialog-confirm"
                onClick={handleConfirmSubmit}
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
