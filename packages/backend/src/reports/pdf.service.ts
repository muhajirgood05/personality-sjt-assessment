/**
 * PDF Report Generation Service.
 * Uses Puppeteer for headless rendering of report HTML to PDF.
 *
 * Requirements: 11.6, 11.7
 * - Report must be available in downloadable PDF format within 15 seconds
 * - If scoring data is incomplete, render report with available sections
 *   and display notice in affected sections
 */

import puppeteer, { Browser } from 'puppeteer';
import type { CandidateReportResponse } from '@assessment/shared';

/** Timeout for PDF generation (15 seconds per requirement 11.6) */
const PDF_GENERATION_TIMEOUT_MS = 15_000;

let browserInstance: Browser | null = null;

/**
 * Get or create a shared browser instance for PDF generation.
 * Reusing the browser avoids the overhead of launching a new process per request.
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return browserInstance;
}

/**
 * Gracefully close the shared browser instance.
 * Call this during application shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Generate a PDF buffer from a candidate report.
 * Renders the report as HTML and converts to PDF using Puppeteer.
 *
 * @param report - The candidate report data
 * @returns PDF as a Buffer
 * @throws Error if generation exceeds 15 seconds
 */
export async function generateReportPdf(
  report: CandidateReportResponse
): Promise<Buffer> {
  const startTime = Date.now();

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = buildReportHtml(report);

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10_000 });

    const elapsed = Date.now() - startTime;
    const remainingTimeout = PDF_GENERATION_TIMEOUT_MS - elapsed;

    if (remainingTimeout <= 0) {
      throw new PdfGenerationTimeoutError(
        'PDF generation exceeded 15 second timeout during HTML rendering'
      );
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      timeout: remainingTimeout,
    });

    const totalElapsed = Date.now() - startTime;
    if (totalElapsed > PDF_GENERATION_TIMEOUT_MS) {
      throw new PdfGenerationTimeoutError(
        `PDF generation took ${totalElapsed}ms, exceeding 15 second limit`
      );
    }

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/** Custom error for PDF generation timeout */
export class PdfGenerationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfGenerationTimeoutError';
  }
}

/**
 * Build the full HTML document for the report.
 * Includes inline CSS and renders all report sections.
 * Handles incomplete data by showing section-level notices.
 */
function buildReportHtml(report: CandidateReportResponse): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Asesmen - ${escapeHtml(report.candidateName)}</title>
  <style>${getReportStyles()}</style>
</head>
<body>
  <article class="candidate-report">
    ${renderHeader(report)}
    ${renderPersonalityProfile(report)}
    ${renderKemenkeuValues(report)}
    ${renderBehavioralExamples(report)}
    ${renderAssessmentValidity(report)}
    ${renderRecommendations(report)}
  </article>
</body>
</html>`;
}

function renderHeader(report: CandidateReportResponse): string {
  const completedDate = formatDate(report.completedAt);
  return `
    <header class="candidate-report__header">
      <h1>Laporan Asesmen</h1>
      <div class="candidate-report__meta">
        <p><strong>Nama:</strong> ${escapeHtml(report.candidateName)}</p>
        <p><strong>Sesi:</strong> ${escapeHtml(report.sessionName)}</p>
        <p><strong>Tanggal Selesai:</strong> ${completedDate}</p>
      </div>
      <div class="candidate-report__composite">
        <div class="candidate-report__suitability">
          <span class="candidate-report__suitability-label">Skor Kesesuaian</span>
          <span class="candidate-report__suitability-score">${Math.round(report.composite.suitabilityScore)}</span>
          <span class="candidate-report__suitability-category">${escapeHtml(report.composite.category)}</span>
        </div>
        <div class="candidate-report__confidence">
          <span class="candidate-report__confidence-label">Tingkat Kepercayaan</span>
          <span class="candidate-report__confidence-value">${escapeHtml(report.composite.confidence)}</span>
        </div>
      </div>
    </header>`;
}

function renderPersonalityProfile(report: CandidateReportResponse): string {
  if (!report.personality || !report.personality.dimensions || report.personality.dimensions.length === 0) {
    return renderIncompleteNotice(
      'Profil Kepribadian',
      'Data skor kepribadian tidak tersedia atau belum selesai dihitung.'
    );
  }

  const dimensionRows = report.personality.dimensions
    .map((dim) => {
      const percentage = (dim.stenScore / 10) * 100;
      return `
        <div class="personality-profile__dimension">
          <h3>${escapeHtml(formatDimensionName(dim.dimension))}</h3>
          <div class="personality-profile__sten-score">Sten Score: ${dim.stenScore}/10</div>
          <div class="facet-breakdown__bar-container">
            <div class="facet-breakdown__bar" style="width: ${percentage}%"></div>
          </div>
          ${renderFacetsForDimension(report.personality.facets, dim.dimension)}
          ${renderNarrativeForDimension(report.personality.narratives, dim.dimension)}
        </div>`;
    })
    .join('');

  return `
    <section class="personality-profile">
      <h2>Profil Kepribadian (OCEAN)</h2>
      ${dimensionRows}
    </section>`;
}

function renderFacetsForDimension(
  facets: CandidateReportResponse['personality']['facets'],
  dimension: string
): string {
  if (!facets || facets.length === 0) return '';

  const dimFacets = facets.filter((f) => f.dimension === dimension);
  if (dimFacets.length === 0) return '';

  const facetItems = dimFacets
    .map((f) => {
      const percentage = (f.stenScore / 10) * 100;
      return `
        <div class="facet-breakdown__item">
          <span class="facet-breakdown__label">${escapeHtml(formatFacetName(f.facet))}</span>
          <div class="facet-breakdown__bar-container">
            <div class="facet-breakdown__bar" style="width: ${percentage}%"></div>
          </div>
          <span class="facet-breakdown__score">${f.stenScore}</span>
        </div>`;
    })
    .join('');

  return `
    <div class="facet-breakdown">
      <div class="facet-breakdown__title">Sub-Facet</div>
      ${facetItems}
    </div>`;
}

function renderNarrativeForDimension(
  narratives: CandidateReportResponse['personality']['narratives'],
  dimension: string
): string {
  if (!narratives || narratives.length === 0) return '';

  const narrative = narratives.find((n) => n.dimension === dimension);
  if (!narrative) return '';

  return `
    <div class="narrative-interpretation">
      <div class="narrative-interpretation__title">Interpretasi</div>
      <p class="narrative-interpretation__text">${escapeHtml(narrative.narrative)}</p>
    </div>`;
}

function renderKemenkeuValues(report: CandidateReportResponse): string {
  if (!report.sjt || !report.sjt.valueScores || report.sjt.valueScores.length === 0) {
    return renderIncompleteNotice(
      'Keselarasan Nilai Kemenkeu',
      'Data skor SJT tidak tersedia atau belum selesai dihitung.'
    );
  }

  const scoreItems = report.sjt.valueScores
    .map(
      (vs) => `
      <div class="kemenkeu-values-chart__score-item">
        <span class="kemenkeu-values-chart__value-name">${escapeHtml(formatValueName(vs.value))}</span>
        <span class="kemenkeu-values-chart__value-score">${Math.round(vs.score)}/100</span>
      </div>`
    )
    .join('');

  return `
    <section class="kemenkeu-values-chart">
      <h2>Keselarasan Nilai Kemenkeu</h2>
      <div class="kemenkeu-values-chart__scores">
        ${scoreItems}
      </div>
    </section>`;
}

function renderBehavioralExamples(report: CandidateReportResponse): string {
  if (
    !report.sjt ||
    !report.sjt.behavioralExamples ||
    report.sjt.behavioralExamples.length === 0
  ) {
    return renderIncompleteNotice(
      'Contoh Perilaku',
      'Data elaborasi tidak tersedia untuk menghasilkan contoh perilaku.'
    );
  }

  const groups = report.sjt.behavioralExamples
    .map((group) => {
      const examples = group.examples
        .map((ex) => `<li class="behavioral-examples__example-item">${escapeHtml(ex)}</li>`)
        .join('');
      return `
        <div class="behavioral-examples__value-group">
          <h4>${escapeHtml(formatValueName(group.value))}</h4>
          <ul class="behavioral-examples__examples">${examples}</ul>
        </div>`;
    })
    .join('');

  return `
    <section class="behavioral-examples">
      <h3>Contoh Perilaku</h3>
      ${groups}
    </section>`;
}

function renderAssessmentValidity(report: CandidateReportResponse): string {
  if (!report.validity) {
    return renderIncompleteNotice(
      'Validitas Asesmen',
      'Data validitas asesmen tidak tersedia.'
    );
  }

  const v = report.validity;
  const flagClass =
    v.validityFlag === 'Valid'
      ? 'valid'
      : v.validityFlag === 'Cautionary'
        ? 'cautionary'
        : 'invalid';

  const warningHtml = v.hasValidityWarning && v.validityWarningMessage
    ? `<div class="assessment-validity__warning">${escapeHtml(v.validityWarningMessage)}</div>`
    : '';

  return `
    <section class="assessment-validity">
      <h2>Validitas Asesmen</h2>
      <div class="assessment-validity__flag">
        <span class="assessment-validity__flag-badge assessment-validity__flag-badge--${flagClass}">
          ${escapeHtml(v.validityFlag)}
        </span>
      </div>
      <div class="assessment-validity__metrics">
        <div class="assessment-validity__metric">
          <span class="assessment-validity__metric-label">Indeks Konsistensi</span>
          <span class="assessment-validity__metric-value">${Math.round(v.consistencyIndex)}%</span>
        </div>
        <div class="assessment-validity__metric">
          <span class="assessment-validity__metric-label">Rata-rata Waktu Respons</span>
          <span class="assessment-validity__metric-value">${formatMs(v.averageResponseTimeMs)}</span>
        </div>
        <div class="assessment-validity__metric">
          <span class="assessment-validity__metric-label">Skor Desirabilitas Sosial</span>
          <span class="assessment-validity__metric-value">${v.socialDesirabilityScore}/10</span>
        </div>
        <div class="assessment-validity__metric">
          <span class="assessment-validity__metric-label">Respons Ditandai</span>
          <span class="assessment-validity__metric-value">${Math.round(v.flaggedResponsePercentage)}%</span>
        </div>
        <div class="assessment-validity__metric">
          <span class="assessment-validity__metric-label">Kehilangan Fokus</span>
          <span class="assessment-validity__metric-value">${v.focusLossCount} kali</span>
        </div>
      </div>
      ${warningHtml}
    </section>`;
}

function renderRecommendations(report: CandidateReportResponse): string {
  if (!report.recommendations || report.recommendations.length === 0) {
    return `
      <section class="improvement-recommendations">
        <h2>Rekomendasi Pengembangan</h2>
        <p class="improvement-recommendations__none">Tidak ada rekomendasi pengembangan saat ini.</p>
      </section>`;
  }

  const items = report.recommendations
    .map(
      (rec) => `
      <div class="improvement-recommendations__item">
        <div class="improvement-recommendations__header">
          <h4 class="improvement-recommendations__value-name">${escapeHtml(formatValueName(rec.value))}</h4>
          <span class="improvement-recommendations__current-score">Skor: ${Math.round(rec.currentScore)}</span>
        </div>
        <p class="improvement-recommendations__suggestion">${escapeHtml(rec.suggestion)}</p>
      </div>`
    )
    .join('');

  return `
    <section class="improvement-recommendations">
      <h2>Rekomendasi Pengembangan</h2>
      ${items}
    </section>`;
}

/**
 * Render a notice for sections with incomplete data.
 * Requirement 11.7: display notice in affected sections indicating
 * which data is missing and why the section could not be fully generated.
 */
function renderIncompleteNotice(sectionTitle: string, reason: string): string {
  return `
    <section class="incomplete-section">
      <h2>${escapeHtml(sectionTitle)}</h2>
      <div class="incomplete-section__notice">
        <p class="incomplete-section__notice-text">
          ⚠️ ${escapeHtml(reason)}
        </p>
      </div>
    </section>`;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDimensionName(dimension: string): string {
  const names: Record<string, string> = {
    openness: 'Openness (Keterbukaan)',
    conscientiousness: 'Conscientiousness (Kesadaran)',
    extraversion: 'Extraversion (Ekstraversi)',
    agreeableness: 'Agreeableness (Keramahan)',
    neuroticism: 'Neuroticism (Neurotisisme)',
  };
  return names[dimension] || dimension;
}

function formatFacetName(facet: string): string {
  return facet
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValueName(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Inline CSS for the PDF report.
 * Based on the frontend report.css with PDF-specific adjustments.
 */
function getReportStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2937; line-height: 1.5; }

    .candidate-report { max-width: 100%; padding: 0; }
    .candidate-report__header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e5e7eb; }
    .candidate-report__header h1 { font-size: 1.75rem; margin-bottom: 1rem; }
    .candidate-report__meta p { margin: 0.25rem 0; color: #4b5563; }
    .candidate-report__composite { display: flex; gap: 2rem; margin-top: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; }
    .candidate-report__suitability, .candidate-report__confidence { display: flex; flex-direction: column; gap: 0.25rem; }
    .candidate-report__suitability-label, .candidate-report__confidence-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .candidate-report__suitability-score { font-size: 2rem; font-weight: 700; color: #3b82f6; }
    .candidate-report__suitability-category { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .candidate-report__confidence-value { font-size: 0.875rem; font-weight: 600; }

    .personality-profile { margin-bottom: 2.5rem; }
    .personality-profile h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    .personality-profile__dimension { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; page-break-inside: avoid; }
    .personality-profile__dimension h3 { font-size: 1.125rem; margin-bottom: 0.5rem; }
    .personality-profile__sten-score { color: #4b5563; margin-bottom: 0.75rem; }

    .facet-breakdown { margin-top: 0.75rem; }
    .facet-breakdown__title { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: #6b7280; }
    .facet-breakdown__item { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.375rem; }
    .facet-breakdown__label { flex: 0 0 140px; font-size: 0.8125rem; color: #374151; }
    .facet-breakdown__bar-container { flex: 1; height: 12px; background: #f3f4f6; border-radius: 6px; overflow: hidden; }
    .facet-breakdown__bar { height: 100%; background: #3b82f6; border-radius: 6px; }
    .facet-breakdown__score { flex: 0 0 24px; font-size: 0.8125rem; font-weight: 600; text-align: right; }

    .narrative-interpretation { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f3f4f6; }
    .narrative-interpretation__title { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; color: #6b7280; }
    .narrative-interpretation__text { font-size: 0.875rem; line-height: 1.5; color: #374151; }

    .kemenkeu-values-chart { margin-bottom: 2.5rem; }
    .kemenkeu-values-chart h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    .kemenkeu-values-chart__scores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .kemenkeu-values-chart__score-item { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f9fafb; border-radius: 6px; }
    .kemenkeu-values-chart__value-name { font-size: 0.875rem; font-weight: 500; }
    .kemenkeu-values-chart__value-score { font-size: 0.875rem; font-weight: 600; color: #10b981; }

    .behavioral-examples { margin-bottom: 2.5rem; }
    .behavioral-examples h3 { font-size: 1.25rem; margin-bottom: 1rem; }
    .behavioral-examples__value-group { margin-bottom: 1rem; }
    .behavioral-examples__value-group h4 { font-size: 1rem; margin-bottom: 0.5rem; color: #374151; }
    .behavioral-examples__examples { list-style: disc; padding-left: 1.5rem; }
    .behavioral-examples__example-item { font-size: 0.875rem; line-height: 1.5; margin-bottom: 0.25rem; color: #4b5563; }

    .assessment-validity { margin-bottom: 2.5rem; }
    .assessment-validity h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    .assessment-validity__flag { margin-bottom: 1rem; }
    .assessment-validity__flag-badge { display: inline-block; padding: 0.375rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; }
    .assessment-validity__flag-badge--valid { background: #d1fae5; color: #065f46; }
    .assessment-validity__flag-badge--cautionary { background: #fef3c7; color: #92400e; }
    .assessment-validity__flag-badge--invalid { background: #fee2e2; color: #991b1b; }
    .assessment-validity__metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .assessment-validity__metric { display: flex; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f9fafb; border-radius: 6px; }
    .assessment-validity__metric-label { font-size: 0.8125rem; color: #4b5563; }
    .assessment-validity__metric-value { font-size: 0.8125rem; font-weight: 600; }
    .assessment-validity__warning { margin-top: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 0.875rem; color: #92400e; }

    .improvement-recommendations { margin-bottom: 2.5rem; }
    .improvement-recommendations h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    .improvement-recommendations__none { color: #6b7280; font-style: italic; }
    .improvement-recommendations__item { margin-bottom: 1rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; border-left: 4px solid #f59e0b; page-break-inside: avoid; }
    .improvement-recommendations__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .improvement-recommendations__value-name { font-size: 1rem; margin: 0; }
    .improvement-recommendations__current-score { font-size: 0.8125rem; color: #6b7280; }
    .improvement-recommendations__suggestion { font-size: 0.875rem; line-height: 1.5; color: #374151; margin: 0; }

    .incomplete-section { margin-bottom: 2.5rem; }
    .incomplete-section h2 { font-size: 1.5rem; margin-bottom: 1rem; }
    .incomplete-section__notice { padding: 1rem; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; }
    .incomplete-section__notice-text { font-size: 0.875rem; color: #92400e; margin: 0; }
  `;
}

// Export for testing
export { buildReportHtml };
