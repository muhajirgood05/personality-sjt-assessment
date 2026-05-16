/**
 * Tests for PDF report generation service.
 * Validates HTML rendering, incomplete data handling, and timeout behavior.
 *
 * Requirements: 11.6, 11.7
 */

import { describe, it, expect, afterAll } from 'vitest';
import { buildReportHtml, generateReportPdf, closeBrowser } from './pdf.service';
import type { CandidateReportResponse } from '@assessment/shared';

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function createCompleteReport(): CandidateReportResponse {
  return {
    candidateId: 'candidate-001',
    candidateName: 'Ahmad Fauzi',
    sessionName: 'MINTS 2024 Batch 1',
    completedAt: '2024-06-15T10:30:00.000Z',
    personality: {
      dimensions: [
        { dimension: 'openness' as never, rawScore: 72, stenScore: 7 },
        { dimension: 'conscientiousness' as never, rawScore: 85, stenScore: 9 },
        { dimension: 'extraversion' as never, rawScore: 60, stenScore: 6 },
        { dimension: 'agreeableness' as never, rawScore: 68, stenScore: 7 },
        { dimension: 'neuroticism' as never, rawScore: 35, stenScore: 3 },
      ],
      facets: [
        { dimension: 'openness' as never, facet: 'intellectual_curiosity', rawScore: 75, stenScore: 8 },
        { dimension: 'openness' as never, facet: 'aesthetic_sensitivity', rawScore: 65, stenScore: 6 },
        { dimension: 'conscientiousness' as never, facet: 'orderliness', rawScore: 88, stenScore: 9 },
        { dimension: 'conscientiousness' as never, facet: 'self_discipline', rawScore: 82, stenScore: 8 },
      ],
      narratives: [
        {
          dimension: 'openness' as never,
          narrative: 'Kandidat menunjukkan keterbukaan yang tinggi terhadap pengalaman baru.',
        },
        {
          dimension: 'conscientiousness' as never,
          narrative: 'Kandidat menunjukkan tingkat kedisiplinan yang sangat tinggi.',
        },
      ],
    },
    sjt: {
      valueScores: [
        { value: 'integritas' as never, score: 85 },
        { value: 'profesionalisme' as never, score: 78 },
        { value: 'sinergi' as never, score: 72 },
        { value: 'pelayanan' as never, score: 80 },
        { value: 'kesempurnaan' as never, score: 76 },
      ],
      behavioralExamples: [
        {
          value: 'integritas' as never,
          examples: ['Melaporkan ketidaksesuaian prosedur kepada atasan langsung.'],
        },
        {
          value: 'profesionalisme' as never,
          examples: ['Menyelesaikan tugas sebelum tenggat waktu.'],
        },
      ],
      elaborationScores: [
        { scenarioId: 'scenario-1', score: 82 },
        { scenarioId: 'scenario-2', score: 75 },
      ],
    },
    composite: {
      suitabilityScore: 82,
      category: 'Highly Suitable',
      confidence: 'High Confidence',
      personalitySubScore: 78,
      sjtSubScore: 85,
    },
    validity: {
      consistencyIndex: 87,
      averageResponseTimeMs: 4500,
      personalityAvgResponseTimeMs: 3200,
      sjtAvgResponseTimeMs: 12000,
      socialDesirabilityScore: 4,
      validityFlag: 'Valid',
      flaggedResponsePercentage: 5,
      focusLossCount: 1,
      hasValidityWarning: false,
    },
    recommendations: [
      {
        value: 'sinergi' as never,
        currentScore: 72,
        suggestion: 'Tingkatkan kolaborasi dengan rekan kerja lintas divisi.',
      },
    ],
  };
}

function createIncompleteReport(): CandidateReportResponse {
  return {
    candidateId: 'candidate-002',
    candidateName: 'Siti Rahayu',
    sessionName: 'MINTS 2024 Batch 2',
    completedAt: '2024-07-01T14:00:00.000Z',
    personality: {
      dimensions: [],
      facets: [],
      narratives: [],
    },
    sjt: {
      valueScores: [],
      behavioralExamples: [],
      elaborationScores: [],
    },
    composite: {
      suitabilityScore: 0,
      category: 'Not Suitable',
      confidence: 'Low Confidence',
      personalitySubScore: 0,
      sjtSubScore: 0,
    },
    validity: {
      consistencyIndex: 0,
      averageResponseTimeMs: 0,
      personalityAvgResponseTimeMs: 0,
      sjtAvgResponseTimeMs: 0,
      socialDesirabilityScore: 0,
      validityFlag: 'Cautionary',
      flaggedResponsePercentage: 0,
      focusLossCount: 0,
      hasValidityWarning: true,
      validityWarningMessage: 'Data validitas tidak tersedia untuk asesmen ini.',
    },
    recommendations: [],
  };
}

// ─── HTML Generation Tests ───────────────────────────────────────────────────

describe('buildReportHtml', () => {
  it('generates valid HTML document with complete report data', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="id">');
    expect(html).toContain('Laporan Asesmen');
    expect(html).toContain('Ahmad Fauzi');
    expect(html).toContain('MINTS 2024 Batch 1');
  });

  it('includes personality profile dimensions', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Profil Kepribadian (OCEAN)');
    expect(html).toContain('Openness (Keterbukaan)');
    expect(html).toContain('Conscientiousness (Kesadaran)');
    expect(html).toContain('Sten Score: 7/10');
    expect(html).toContain('Sten Score: 9/10');
  });

  it('includes facet breakdown for dimensions', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Intellectual Curiosity');
    expect(html).toContain('Aesthetic Sensitivity');
    expect(html).toContain('Sub-Facet');
  });

  it('includes narrative interpretations', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Interpretasi');
    expect(html).toContain('keterbukaan yang tinggi');
  });

  it('includes Kemenkeu values scores', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Keselarasan Nilai Kemenkeu');
    expect(html).toContain('Integritas');
    expect(html).toContain('85/100');
    expect(html).toContain('Profesionalisme');
  });

  it('includes behavioral examples', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Contoh Perilaku');
    expect(html).toContain('Melaporkan ketidaksesuaian prosedur');
  });

  it('includes assessment validity section', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Validitas Asesmen');
    expect(html).toContain('Indeks Konsistensi');
    expect(html).toContain('87%');
    expect(html).toContain('Skor Desirabilitas Sosial');
    expect(html).toContain('4/10');
  });

  it('includes improvement recommendations', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Rekomendasi Pengembangan');
    expect(html).toContain('Sinergi');
    expect(html).toContain('kolaborasi dengan rekan kerja');
  });

  it('includes composite suitability score in header', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Skor Kesesuaian');
    expect(html).toContain('82');
    expect(html).toContain('Highly Suitable');
    expect(html).toContain('High Confidence');
  });

  // ─── Incomplete Data Handling (Requirement 11.7) ─────────────────────────

  it('shows notice when personality data is incomplete', () => {
    const report = createIncompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Data skor kepribadian tidak tersedia');
    expect(html).toContain('⚠️');
  });

  it('shows notice when SJT data is incomplete', () => {
    const report = createIncompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Data skor SJT tidak tersedia');
  });

  it('shows notice when behavioral examples are missing', () => {
    const report = createIncompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Data elaborasi tidak tersedia');
  });

  it('shows validity warning when present', () => {
    const report = createIncompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Data validitas tidak tersedia untuk asesmen ini.');
  });

  it('shows empty recommendations message when none exist', () => {
    const report = createIncompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('Tidak ada rekomendasi pengembangan saat ini');
  });

  it('escapes HTML special characters in candidate name', () => {
    const report = createCompleteReport();
    report.candidateName = '<script>alert("xss")</script>';
    const html = buildReportHtml(report);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes inline CSS styles', () => {
    const report = createCompleteReport();
    const html = buildReportHtml(report);

    expect(html).toContain('<style>');
    expect(html).toContain('.candidate-report');
    expect(html).toContain('.personality-profile');
    expect(html).toContain('.incomplete-section');
  });
});

// ─── PDF Generation Tests ────────────────────────────────────────────────────

describe('generateReportPdf', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('generates a valid PDF buffer from complete report', async () => {
    const report = createCompleteReport();
    const pdfBuffer = await generateReportPdf(report);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
  }, 15_000);

  it('generates PDF within 15 seconds (Requirement 11.6)', async () => {
    const report = createCompleteReport();
    const startTime = Date.now();

    const pdfBuffer = await generateReportPdf(report);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(15_000);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  }, 15_000);

  it('generates PDF for incomplete report with notices (Requirement 11.7)', async () => {
    const report = createIncompleteReport();
    const pdfBuffer = await generateReportPdf(report);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
  }, 15_000);
});
