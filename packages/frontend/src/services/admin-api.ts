/**
 * Admin API service for the admin dashboard.
 * Handles all API calls to admin endpoints.
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.6
 */

import { apiRequest } from '../auth/api-client.js';
import type {
  ApiResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsResponse,
  SessionCandidatesResponse,
  SessionAnalyticsResponse,
  CandidateReportResponse,
} from '@assessment/shared';

const API_BASE = '/api/admin';

/**
 * Create a new assessment session.
 */
export async function createSession(
  request: CreateSessionRequest
): Promise<ApiResponse<CreateSessionResponse>> {
  const response = await apiRequest(`${API_BASE}/sessions`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json() as Promise<ApiResponse<CreateSessionResponse>>;
}

/**
 * List all assessment sessions with summary statistics.
 */
export async function listSessions(): Promise<ApiResponse<ListSessionsResponse>> {
  const response = await apiRequest(`${API_BASE}/sessions`);
  return response.json() as Promise<ApiResponse<ListSessionsResponse>>;
}

/**
 * Get candidate progress for a specific session.
 */
export async function getSessionCandidates(
  sessionId: string
): Promise<ApiResponse<SessionCandidatesResponse>> {
  const response = await apiRequest(`${API_BASE}/sessions/${sessionId}/candidates`);
  return response.json() as Promise<ApiResponse<SessionCandidatesResponse>>;
}

/**
 * Get analytics data for a specific session.
 */
export async function getSessionAnalytics(
  sessionId: string
): Promise<ApiResponse<SessionAnalyticsResponse>> {
  const response = await apiRequest(`${API_BASE}/sessions/${sessionId}/analytics`);
  return response.json() as Promise<ApiResponse<SessionAnalyticsResponse>>;
}

/**
 * Get a candidate's full report (includes anti-faking indicators).
 */
export async function getCandidateReport(
  candidateId: string
): Promise<ApiResponse<CandidateReportResponse>> {
  const response = await apiRequest(`/api/reports/${candidateId}`);
  return response.json() as Promise<ApiResponse<CandidateReportResponse>>;
}

/**
 * Download PDF report for a candidate.
 * Returns a Blob for client-side download.
 *
 * Validates: Requirement 11.6
 */
export async function downloadReportPdf(candidateId: string): Promise<Blob> {
  const response = await apiRequest(`/api/reports/${candidateId}/pdf`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      (errorData as { error?: { message?: string } })?.error?.message ??
      'Gagal mengunduh laporan PDF';
    throw new Error(message);
  }

  return response.blob();
}

/**
 * Export session results as CSV or Excel.
 * Returns a Blob for client-side download.
 *
 * Validates: Requirement 12.5
 */
export async function exportSessionResults(
  sessionId: string,
  format: 'csv' | 'excel' = 'csv'
): Promise<Blob> {
  const response = await apiRequest(
    `/api/reports/session/${sessionId}/export?format=${format}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      (errorData as { error?: { message?: string } })?.error?.message ??
      'Gagal mengekspor hasil';
    throw new Error(message);
  }

  return response.blob();
}
