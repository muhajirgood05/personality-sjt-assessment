import { useState, useEffect, useRef, useCallback } from 'react';
import { ForcedChoiceItem } from '../../components/ForcedChoiceItem';
import { SectionTimer } from '../../components/SectionTimer';
import type { PersonalityItemDto, TimerSync } from '@assessment/shared';
import './PersonalityTestPage.css';

export interface PersonalityTestPageProps {
  /** Assessment ID for this session */
  assessmentId: string;
  /** Initial list of items (or first item if loaded one at a time) */
  initialItem: PersonalityItemDto;
  /** Total number of items in the test */
  totalItems: number;
  /** Current item index (0-based) */
  initialIndex: number;
  /** Timer sync data from server */
  timerSync: TimerSync;
  /** Called when a response is submitted */
  onSubmitResponse: (payload: {
    assessmentId: string;
    itemId: string;
    response: number;
    responseTimeMs: number;
    clientTimestamp: number;
  }) => Promise<{ nextItem: PersonalityItemDto | null; timerSync: TimerSync; sectionComplete: boolean }>;
  /** Called for auto-save */
  onAutoSave: (assessmentId: string) => Promise<void>;
  /** Called when the section is complete */
  onSectionComplete: () => void;
  /** Called when timer expires */
  onTimerExpired: () => void;
}

const INACTIVITY_TIMEOUT_MS = 120_000; // 120 seconds
const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function PersonalityTestPage({
  assessmentId,
  initialItem,
  totalItems,
  initialIndex,
  timerSync,
  onSubmitResponse,
  onAutoSave,
  onSectionComplete,
  onTimerExpired,
}: PersonalityTestPageProps) {
  const [currentItem, setCurrentItem] = useState<PersonalityItemDto>(initialItem);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentTimerSync, setCurrentTimerSync] = useState<TimerSync>(timerSync);
  const [showReminder, setShowReminder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  // Track item render timestamp for response time calculation
  const itemRenderTimestampRef = useRef<number>(Date.now());
  // Inactivity timer ref
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auto-save interval ref
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Auto-save status visibility timer
  const autoSaveVisibilityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record render timestamp when item changes
  useEffect(() => {
    itemRenderTimestampRef.current = Date.now();
  }, [currentItem.itemId]);

  // Start/reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
    }
    setShowReminder(false);
    inactivityTimerRef.current = setTimeout(() => {
      setShowReminder(true);
    }, INACTIVITY_TIMEOUT_MS);
  }, []);

  // Initialize inactivity timer on mount and item change
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current !== null) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [currentItem.itemId, resetInactivityTimer]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      setAutoSaveStatus('saving');
      onAutoSave(assessmentId)
        .then(() => {
          setAutoSaveStatus('saved');
          // Hide the indicator after 2 seconds
          if (autoSaveVisibilityRef.current !== null) {
            clearTimeout(autoSaveVisibilityRef.current);
          }
          autoSaveVisibilityRef.current = setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 2000);
        })
        .catch(() => {
          setAutoSaveStatus('error');
          if (autoSaveVisibilityRef.current !== null) {
            clearTimeout(autoSaveVisibilityRef.current);
          }
          autoSaveVisibilityRef.current = setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 3000);
        });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveIntervalRef.current !== null) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (autoSaveVisibilityRef.current !== null) {
        clearTimeout(autoSaveVisibilityRef.current);
      }
    };
  }, [assessmentId, onAutoSave]);

  // Handle response selection - forward-only navigation
  const handleResponse = useCallback(
    async (itemId: string, value: number) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const responseTimeMs = Date.now() - itemRenderTimestampRef.current;
      const clientTimestamp = Date.now();

      try {
        const result = await onSubmitResponse({
          assessmentId,
          itemId,
          response: value,
          responseTimeMs,
          clientTimestamp,
        });

        // Update timer sync from server response
        setCurrentTimerSync(result.timerSync);

        if (result.sectionComplete) {
          onSectionComplete();
        } else if (result.nextItem) {
          setCurrentItem(result.nextItem);
          setCurrentIndex((prev) => prev + 1);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [assessmentId, isSubmitting, onSubmitResponse, onSectionComplete]
  );

  const handleDismissReminder = useCallback(() => {
    setShowReminder(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleTimerExpired = useCallback(() => {
    onTimerExpired();
  }, [onTimerExpired]);

  // Early submit is not allowed in personality test (forward-only, no skip)
  const handleEarlySubmit = useCallback(() => {
    // No-op: personality test doesn't allow early submission
  }, []);

  const progressPercentage = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0;

  const autoSaveIndicatorClass = [
    'personality-test__auto-save-indicator',
    autoSaveStatus !== 'idle' ? 'personality-test__auto-save-indicator--visible' : '',
    autoSaveStatus === 'saving' ? 'personality-test__auto-save-indicator--saving' : '',
    autoSaveStatus === 'saved' ? 'personality-test__auto-save-indicator--saved' : '',
    autoSaveStatus === 'error' ? 'personality-test__auto-save-indicator--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const autoSaveText =
    autoSaveStatus === 'saving'
      ? 'Menyimpan...'
      : autoSaveStatus === 'saved'
        ? '✓ Tersimpan'
        : autoSaveStatus === 'error'
          ? '✗ Gagal menyimpan'
          : '';

  return (
    <div className="personality-test">
      <div className="personality-test__header">
        <div className="personality-test__progress">
          <span className="personality-test__progress-text" data-testid="progress-text">
            Soal {currentIndex + 1} dari {totalItems}
          </span>
          <div
            className="personality-test__progress-bar"
            role="progressbar"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalItems}
            aria-label="Progres tes"
          >
            <div
              className="personality-test__progress-fill"
              style={{ width: `${progressPercentage}%` }}
              data-testid="progress-fill"
            />
          </div>
        </div>

        <SectionTimer
          remainingMs={currentTimerSync.remainingMs}
          serverTimestamp={currentTimerSync.serverTimestamp}
          onExpired={handleTimerExpired}
          onEarlySubmit={handleEarlySubmit}
          showEarlySubmit={false}
        />
      </div>

      <div className="personality-test__content">
        <div className="personality-test__question-number">
          Soal {currentIndex + 1}
        </div>
        <ForcedChoiceItem
          key={currentItem.itemId}
          itemId={currentItem.itemId}
          statementLeft={currentItem.statementLeft}
          statementRight={currentItem.statementRight}
          onResponse={handleResponse}
          disabled={isSubmitting}
        />
      </div>

      {/* Auto-save status indicator */}
      <div className={autoSaveIndicatorClass} data-testid="auto-save-indicator">
        {autoSaveText}
      </div>

      {/* 120-second inactivity reminder */}
      {showReminder && (
        <div
          className="forced-choice__reminder-overlay"
          role="alertdialog"
          aria-modal="true"
          aria-label="Pengingat aktivitas"
          data-testid="inactivity-reminder"
        >
          <div className="forced-choice__reminder">
            <h3>Pengingat</h3>
            <p>
              Anda belum memberikan jawaban selama 2 menit. Silakan pilih salah satu jawaban untuk
              melanjutkan.
            </p>
            <button
              type="button"
              className="forced-choice__reminder-btn"
              onClick={handleDismissReminder}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
