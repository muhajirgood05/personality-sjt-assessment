/**
 * API client for assessment security event reporting.
 *
 * Reports security events (focus loss, navigation attempts, copy/print attempts)
 * to the backend for audit logging and focus_loss_count tracking.
 *
 * Validates: Requirements 15.4, 15.6
 */

import { apiRequest } from '../auth/api-client';
import type { SecurityEvent } from './useAssessmentSecurity';

/**
 * Reports a security event to the backend.
 * This is a fire-and-forget call — failures are silently ignored
 * to avoid disrupting the candidate's assessment experience.
 */
export async function reportSecurityEvent(
  assessmentId: string,
  event: SecurityEvent
): Promise<void> {
  try {
    await apiRequest('/api/assessment/security-event', {
      method: 'POST',
      body: JSON.stringify({
        assessmentId,
        eventType: event.type,
        timestamp: event.timestamp,
        details: event.details,
      }),
    });
  } catch {
    // Silently ignore — security event reporting should not block the assessment
  }
}
