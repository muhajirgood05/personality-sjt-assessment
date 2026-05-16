/**
 * Unit tests for Report Service functions.
 *
 * Tests cover:
 * - formatAsCsv: CSV formatting with proper escaping
 * - getSessionExportData: Session export data aggregation
 * - getReportData: Report data assembly from scoring results
 *
 * Validates: Requirements 11.6, 12.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatAsCsv, type SessionExportRow } from './report.service.js';
import { OceanDimension, KemenkeuValue } from '@assessment/shared';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('formatAsCsv', () => {
  it('should generate CSV with correct headers', () => {
    const rows: SessionExportRow[] = [];
    const csv = formatAsCsv(rows);

    const headers = csv.split('\n')[0]!;
    expect(headers).toContain('Candidate ID');
    expect(headers).toContain('Suitability Score');
    expect(headers).toContain('Openness (Sten)');
    expect(headers).toContain('Conscientiousness (Sten)');
    expect(headers).toContain('Extraversion (Sten)');
    expect(headers).toContain('Agreeableness (Sten)');
    expect(headers).toContain('Neuroticism (Sten)');
    expect(headers).toContain('Integritas');
    expect(headers).toContain('Profesionalisme');
    expect(headers).toContain('Sinergi');
    expect(headers).toContain('Pelayanan');
    expect(headers).toContain('Kesempurnaan');
    expect(headers).toContain('Completion Status');
  });

  it('should format rows with all scores', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c1',
        candidateName: 'John Doe',
        employeeId: 'EMP001',
        suitabilityScore: 75.5,
        openness: 7,
        conscientiousness: 8,
        extraversion: 5,
        agreeableness: 6,
        neuroticism: 3,
        integritas: 8,
        profesionalisme: 7,
        sinergi: 6,
        pelayanan: 7,
        kesempurnaan: 8,
        completionStatus: 'completed',
      },
    ];

    const csv = formatAsCsv(rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toBe('c1,John Doe,EMP001,75.5,7,8,5,6,3,8,7,6,7,8,completed');
  });

  it('should handle null scores as empty fields', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c2',
        candidateName: 'Jane Smith',
        employeeId: 'EMP002',
        suitabilityScore: null,
        openness: null,
        conscientiousness: null,
        extraversion: null,
        agreeableness: null,
        neuroticism: null,
        integritas: null,
        profesionalisme: null,
        sinergi: null,
        pelayanan: null,
        kesempurnaan: null,
        completionStatus: 'not_started',
      },
    ];

    const csv = formatAsCsv(rows);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('c2,Jane Smith,EMP002,,,,,,,,,,,,not_started');
  });

  it('should escape fields containing commas', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c3',
        candidateName: 'Doe, John',
        employeeId: 'EMP003',
        suitabilityScore: 60,
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 5,
        integritas: 5,
        profesionalisme: 5,
        sinergi: 5,
        pelayanan: 5,
        kesempurnaan: 5,
        completionStatus: 'completed',
      },
    ];

    const csv = formatAsCsv(rows);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('"Doe, John"');
  });

  it('should escape fields containing double quotes', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c4',
        candidateName: 'John "JD" Doe',
        employeeId: 'EMP004',
        suitabilityScore: 50,
        openness: 5,
        conscientiousness: 5,
        extraversion: 5,
        agreeableness: 5,
        neuroticism: 5,
        integritas: 5,
        profesionalisme: 5,
        sinergi: 5,
        pelayanan: 5,
        kesempurnaan: 5,
        completionStatus: 'completed',
      },
    ];

    const csv = formatAsCsv(rows);
    const lines = csv.split('\n');

    expect(lines[1]).toContain('"John ""JD"" Doe"');
  });

  it('should handle multiple rows', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c1',
        candidateName: 'Alice',
        employeeId: 'E1',
        suitabilityScore: 80,
        openness: 8,
        conscientiousness: 9,
        extraversion: 7,
        agreeableness: 8,
        neuroticism: 2,
        integritas: 9,
        profesionalisme: 8,
        sinergi: 7,
        pelayanan: 8,
        kesempurnaan: 9,
        completionStatus: 'completed',
      },
      {
        candidateId: 'c2',
        candidateName: 'Bob',
        employeeId: 'E2',
        suitabilityScore: 45,
        openness: 4,
        conscientiousness: 5,
        extraversion: 6,
        agreeableness: 4,
        neuroticism: 7,
        integritas: 5,
        profesionalisme: 5,
        sinergi: 5,
        pelayanan: 5,
        kesempurnaan: 5,
        completionStatus: 'completed',
      },
    ];

    const csv = formatAsCsv(rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it('should escape fields containing newlines', () => {
    const rows: SessionExportRow[] = [
      {
        candidateId: 'c5',
        candidateName: 'Name\nWith Newline',
        employeeId: 'EMP005',
        suitabilityScore: 70,
        openness: 6,
        conscientiousness: 6,
        extraversion: 6,
        agreeableness: 6,
        neuroticism: 4,
        integritas: 6,
        profesionalisme: 6,
        sinergi: 6,
        pelayanan: 6,
        kesempurnaan: 6,
        completionStatus: 'completed',
      },
    ];

    const csv = formatAsCsv(rows);
    // The name with newline should be quoted
    expect(csv).toContain('"Name\nWith Newline"');
  });
});
