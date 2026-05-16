/**
 * Assessment Security Provider Component
 *
 * Wraps assessment pages with security controls:
 * - Applies CSS class to disable copy/print/screenshot
 * - Activates the useAssessmentSecurity hook
 * - Reports security events to the backend via API
 *
 * Usage:
 *   <AssessmentSecurityProvider assessmentId={id} enabled={isActive}>
 *     <PersonalityTestPage />
 *   </AssessmentSecurityProvider>
 *
 * Validates: Requirements 15.2, 15.3, 15.4, 15.6
 */

import React, { useCallback } from 'react';
import { useAssessmentSecurity, type SecurityEvent } from './useAssessmentSecurity';
import { reportSecurityEvent } from './assessment-security.api';
import './AssessmentSecurity.css';

export interface AssessmentSecurityProviderProps {
  /** The active assessment ID */
  assessmentId: string | null;
  /** Whether security controls should be active */
  enabled: boolean;
  /** Children to render inside the secure container */
  children: React.ReactNode;
}

export function AssessmentSecurityProvider({
  assessmentId,
  enabled,
  children,
}: AssessmentSecurityProviderProps): React.ReactElement {
  const handleSecurityEvent = useCallback(
    (event: SecurityEvent) => {
      if (assessmentId) {
        // Fire-and-forget: report to backend
        reportSecurityEvent(assessmentId, event).catch(() => {
          // Silently ignore reporting failures — don't disrupt the assessment
        });
      }
    },
    [assessmentId]
  );

  const { focusLossCount, navigationAttemptCount } = useAssessmentSecurity({
    assessmentId,
    enabled,
    onSecurityEvent: handleSecurityEvent,
  });

  // Expose counts via data attributes for testing
  return (
    <div
      className={enabled ? 'assessment-secure' : ''}
      data-focus-loss-count={focusLossCount}
      data-navigation-attempt-count={navigationAttemptCount}
      data-testid="assessment-security-provider"
    >
      {children}
    </div>
  );
}
