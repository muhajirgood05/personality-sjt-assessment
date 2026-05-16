/**
 * Report data service.
 * Fetches and assembles report data for a candidate.
 * Provides session export functionality for CSV/Excel.
 *
 * Requirements: 11.6, 11.7, 12.5
 * - Assembles complete report data from scoring results
 * - Handles incomplete data gracefully (returns partial data with null sections)
 * - Exports session results as CSV containing scores and completion status
 */

import type {
  CandidateReportResponse,
  PersonalityProfileDto,
  SjtResultsDto,
  CompositeResultDto,
  AssessmentValidityDto,
} from '@assessment/shared';
import type { ImprovementRecommendation } from '@assessment/shared';
import { OceanDimension, KemenkeuValue } from '@assessment/shared';
import { getDatabase, type Database } from '../db/connection';

// ─── Session Export Types ────────────────────────────────────────────────────

export interface SessionExportRow {
  candidateId: string;
  candidateName: string;
  employeeId: string;
  suitabilityScore: number | null;
  openness: number | null;
  conscientiousness: number | null;
  extraversion: number | null;
  agreeableness: number | null;
  neuroticism: number | null;
  integritas: number | null;
  profesionalisme: number | null;
  sinergi: number | null;
  pelayanan: number | null;
  kesempurnaan: number | null;
  completionStatus: string;
}

/**
 * Fetch report data for a candidate.
 * Returns null if no scoring data exists at all.
 * Returns partial data with empty sections if some data is incomplete (Req 11.7).
 */
export async function getReportData(
  candidateId: string
): Promise<CandidateReportResponse | null> {
  const db = getDatabase();

  // Fetch candidate info
  const candidateResult = await db.query(
    'SELECT id, name, employee_id FROM candidates WHERE id = $1',
    [candidateId]
  );

  if (candidateResult.rows.length === 0) {
    return null;
  }

  const candidate = candidateResult.rows[0];

  // Fetch the most recent assessment session for this candidate
  const sessionResult = await db.query(
    `SELECT s.name as session_name, a.completed_at
     FROM assessments a
     JOIN assessment_sessions s ON a.session_id = s.id
     WHERE a.candidate_id = $1 AND a.status = 'completed'
     ORDER BY a.completed_at DESC
     LIMIT 1`,
    [candidateId]
  );

  const sessionName = sessionResult.rows[0]?.session_name || 'N/A';
  const completedAt = sessionResult.rows[0]?.completed_at || new Date().toISOString();

  // Fetch scoring results
  const scoringResult = await db.query(
    `SELECT * FROM scoring_results
     WHERE assessment_id IN (
       SELECT id FROM assessments WHERE candidate_id = $1 AND status = 'completed'
     )
     ORDER BY calculated_at DESC
     LIMIT 1`,
    [candidateId]
  );

  // Fetch anti-faking results
  const antiFakingResult = await db.query(
    `SELECT * FROM anti_faking_results
     WHERE assessment_id IN (
       SELECT id FROM assessments WHERE candidate_id = $1 AND status = 'completed'
     )
     ORDER BY calculated_at DESC
     LIMIT 1`,
    [candidateId]
  );

  // Build report with available data (Req 11.7: handle incomplete data)
  const scoring = scoringResult.rows[0];
  const antiFaking = antiFakingResult.rows[0];

  const personality = buildPersonalityProfile(scoring);
  const sjt = buildSjtResults(scoring);
  const composite = buildCompositeResult(scoring);
  const validity = buildValiditySection(antiFaking, scoring);
  const recommendations = buildRecommendations(scoring);

  return {
    candidateId,
    candidateName: candidate.name,
    sessionName,
    completedAt: typeof completedAt === 'string' ? completedAt : completedAt.toISOString(),
    personality,
    sjt,
    composite,
    validity,
    recommendations,
  };
}

function buildPersonalityProfile(scoring: Record<string, unknown> | undefined): PersonalityProfileDto {
  if (!scoring) {
    return { dimensions: [], facets: [], narratives: [] };
  }

  const dimensions = (scoring.ocean_sten_scores as unknown[]) || [];
  const facets = (scoring.facet_scores as unknown[]) || [];

  // Generate basic narratives from dimension scores
  const narratives = Array.isArray(dimensions)
    ? dimensions.map((dim: unknown) => {
        const d = dim as { dimension: string; stenScore: number };
        return {
          dimension: d.dimension,
          narrative: generateNarrative(d.dimension, d.stenScore),
        };
      })
    : [];

  return {
    dimensions: Array.isArray(dimensions) ? dimensions as PersonalityProfileDto['dimensions'] : [],
    facets: Array.isArray(facets) ? facets as PersonalityProfileDto['facets'] : [],
    narratives: narratives as PersonalityProfileDto['narratives'],
  };
}

function buildSjtResults(scoring: Record<string, unknown> | undefined): SjtResultsDto {
  if (!scoring) {
    return { valueScores: [], behavioralExamples: [], elaborationScores: [] };
  }

  return {
    valueScores: (scoring.sjt_concordance_scores as SjtResultsDto['valueScores']) || [],
    behavioralExamples: [], // Extracted separately from elaboration data
    elaborationScores: (scoring.elaboration_scores as SjtResultsDto['elaborationScores']) || [],
  };
}

function buildCompositeResult(scoring: Record<string, unknown> | undefined): CompositeResultDto {
  if (!scoring) {
    return {
      suitabilityScore: 0,
      category: 'Not Suitable',
      confidence: 'Low Confidence',
      personalitySubScore: 0,
      sjtSubScore: 0,
    };
  }

  return {
    suitabilityScore: (scoring.suitability_score as number) || 0,
    category: (scoring.suitability_category as CompositeResultDto['category']) || 'Not Suitable',
    confidence: (scoring.confidence_level as CompositeResultDto['confidence']) || 'Low Confidence',
    personalitySubScore: 0, // Derived from personality-value alignment
    sjtSubScore: 0, // Derived from SJT-value alignment
  };
}

function buildValiditySection(
  antiFaking: Record<string, unknown> | undefined,
  scoring: Record<string, unknown> | undefined
): AssessmentValidityDto {
  if (!antiFaking) {
    return {
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
    };
  }

  const flaggedCount = (antiFaking.flagged_fast_count as number) || 0;
  const totalResponses = (antiFaking.total_responses as number) || 1;
  const flaggedPercentage = (flaggedCount / totalResponses) * 100;
  const inconsistentPairs = (antiFaking.inconsistent_pair_count as number) || 0;

  const hasWarning = inconsistentPairs >= 3 || flaggedPercentage > 30;
  let warningMessage: string | undefined;
  if (hasWarning) {
    warningMessage = `Peringatan validitas: ${inconsistentPairs} pasangan inkonsisten dan ${Math.round(flaggedPercentage)}% respons ditandai. Pertimbangkan asesmen ulang.`;
  }

  return {
    consistencyIndex: (antiFaking.consistency_index as number) || 0,
    averageResponseTimeMs: 0, // Calculated from response data
    personalityAvgResponseTimeMs: 0,
    sjtAvgResponseTimeMs: 0,
    socialDesirabilityScore: (antiFaking.social_desirability_score as number) || 0,
    validityFlag: (antiFaking.validity_flag as AssessmentValidityDto['validityFlag']) || 'Cautionary',
    flaggedResponsePercentage: flaggedPercentage,
    focusLossCount: 0,
    hasValidityWarning: hasWarning,
    validityWarningMessage: warningMessage,
  };
}

function buildRecommendations(scoring: Record<string, unknown> | undefined): ImprovementRecommendation[] {
  if (!scoring || !scoring.recommendations) {
    return [];
  }
  return (scoring.recommendations as ImprovementRecommendation[]) || [];
}

/**
 * Generate a brief narrative interpretation for a personality dimension.
 */
function generateNarrative(dimension: string, stenScore: number): string {
  const level = stenScore >= 7 ? 'tinggi' : stenScore >= 4 ? 'sedang' : 'rendah';

  const narratives: Record<string, Record<string, string>> = {
    openness: {
      tinggi: 'Kandidat menunjukkan keterbukaan yang tinggi terhadap pengalaman baru, ide-ide kreatif, dan pendekatan inovatif dalam pekerjaan.',
      sedang: 'Kandidat memiliki keseimbangan antara keterbukaan terhadap hal baru dan preferensi terhadap pendekatan yang sudah terbukti.',
      rendah: 'Kandidat cenderung lebih menyukai pendekatan konvensional dan rutinitas yang sudah mapan.',
    },
    conscientiousness: {
      tinggi: 'Kandidat menunjukkan tingkat kedisiplinan, keteraturan, dan tanggung jawab yang tinggi dalam menjalankan tugas.',
      sedang: 'Kandidat memiliki tingkat kedisiplinan yang memadai dengan fleksibilitas dalam pendekatan kerja.',
      rendah: 'Kandidat mungkin memerlukan dukungan tambahan dalam hal perencanaan dan pengorganisasian tugas.',
    },
    extraversion: {
      tinggi: 'Kandidat menunjukkan energi sosial yang tinggi, aktif dalam interaksi, dan nyaman dalam situasi kelompok.',
      sedang: 'Kandidat memiliki keseimbangan antara aktivitas sosial dan kebutuhan waktu sendiri.',
      rendah: 'Kandidat cenderung lebih reflektif dan mungkin lebih produktif dalam lingkungan kerja yang tenang.',
    },
    agreeableness: {
      tinggi: 'Kandidat menunjukkan kecenderungan kuat untuk bekerja sama, berempati, dan menjaga harmoni dalam tim.',
      sedang: 'Kandidat memiliki keseimbangan antara kerja sama dan ketegasan dalam menyampaikan pendapat.',
      rendah: 'Kandidat cenderung lebih analitis dan objektif, mungkin lebih efektif dalam peran yang memerlukan pengambilan keputusan tegas.',
    },
    neuroticism: {
      tinggi: 'Kandidat mungkin lebih sensitif terhadap tekanan dan memerlukan strategi pengelolaan stres yang efektif.',
      sedang: 'Kandidat menunjukkan stabilitas emosional yang memadai dengan respons normal terhadap situasi stres.',
      rendah: 'Kandidat menunjukkan stabilitas emosional yang tinggi dan ketahanan yang baik terhadap tekanan kerja.',
    },
  };

  return narratives[dimension]?.[level] || `Skor sten ${stenScore} pada dimensi ${dimension}.`;
}

// ─── Session Export Functions ────────────────────────────────────────────────

/**
 * Fetch export data for all candidates in a session.
 * Contains: Suitability_Score, OCEAN dimension scores, Kemenkeu_Values alignment scores,
 * and completion status.
 *
 * @param sessionId - The assessment session UUID
 * @param db - Optional database instance (uses singleton if not provided)
 * @returns Array of export rows or null if session not found
 *
 * Validates: Requirement 12.5
 */
export async function getSessionExportData(
  sessionId: string,
  db?: Database
): Promise<SessionExportRow[] | null> {
  const database = db ?? getDatabase();

  // Verify session exists
  const sessionResult = await database.query(
    'SELECT id FROM assessment_sessions WHERE id = $1',
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    return null;
  }

  // Fetch all candidates in the session with their scoring results
  const result = await database.query(
    `SELECT
       c.id as candidate_id,
       c.name as candidate_name,
       c.employee_id,
       COALESCE(a.status, 'not_started') as status,
       sr.suitability_score,
       sr.ocean_sten_scores,
       sr.kemenkeu_value_scores
     FROM session_candidates sc
     JOIN candidates c ON sc.candidate_id = c.id
     LEFT JOIN assessments a ON a.candidate_id = c.id AND a.session_id = $1
     LEFT JOIN scoring_results sr ON sr.assessment_id = a.id
     WHERE sc.session_id = $1
     ORDER BY c.name`,
    [sessionId]
  );

  return result.rows.map((row: Record<string, unknown>) => {
    const oceanScores = (row.ocean_sten_scores as Array<{ dimension: string; stenScore: number }>) ?? [];
    const valueScores = (row.kemenkeu_value_scores as Array<{ value: string; score: number }>) ?? [];

    const getOceanSten = (dim: string): number | null => {
      const found = oceanScores.find((s) => s.dimension === dim);
      return found ? found.stenScore : null;
    };

    const getValueScore = (val: string): number | null => {
      const found = valueScores.find((s) => s.value === val);
      return found ? found.score : null;
    };

    return {
      candidateId: row.candidate_id as string,
      candidateName: row.candidate_name as string,
      employeeId: row.employee_id as string,
      suitabilityScore: (row.suitability_score as number) ?? null,
      openness: getOceanSten(OceanDimension.Openness),
      conscientiousness: getOceanSten(OceanDimension.Conscientiousness),
      extraversion: getOceanSten(OceanDimension.Extraversion),
      agreeableness: getOceanSten(OceanDimension.Agreeableness),
      neuroticism: getOceanSten(OceanDimension.Neuroticism),
      integritas: getValueScore(KemenkeuValue.Integritas),
      profesionalisme: getValueScore(KemenkeuValue.Profesionalisme),
      sinergi: getValueScore(KemenkeuValue.Sinergi),
      pelayanan: getValueScore(KemenkeuValue.Pelayanan),
      kesempurnaan: getValueScore(KemenkeuValue.Kesempurnaan),
      completionStatus: row.status as string,
    };
  });
}

/**
 * Converts export rows to CSV format.
 * Headers include all required fields per Requirement 12.5.
 */
export function formatAsCsv(rows: SessionExportRow[]): string {
  const headers = [
    'Candidate ID',
    'Candidate Name',
    'Employee ID',
    'Suitability Score',
    'Openness (Sten)',
    'Conscientiousness (Sten)',
    'Extraversion (Sten)',
    'Agreeableness (Sten)',
    'Neuroticism (Sten)',
    'Integritas',
    'Profesionalisme',
    'Sinergi',
    'Pelayanan',
    'Kesempurnaan',
    'Completion Status',
  ];

  const csvRows = rows.map((row) =>
    [
      escapeCsvField(row.candidateId),
      escapeCsvField(row.candidateName),
      escapeCsvField(row.employeeId),
      row.suitabilityScore ?? '',
      row.openness ?? '',
      row.conscientiousness ?? '',
      row.extraversion ?? '',
      row.agreeableness ?? '',
      row.neuroticism ?? '',
      row.integritas ?? '',
      row.profesionalisme ?? '',
      row.sinergi ?? '',
      row.pelayanan ?? '',
      row.kesempurnaan ?? '',
      escapeCsvField(row.completionStatus),
    ].join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Class-based API ─────────────────────────────────────────────────────────

/**
 * ReportService class providing report data assembly and export functionality.
 * Wraps the standalone functions with an injected database dependency.
 */
export class ReportService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Fetch report data for a candidate.
   */
  async getCandidateReport(candidateId: string): Promise<CandidateReportResponse | null> {
    // Fetch candidate info
    const candidateResult = await this.db.query(
      'SELECT id, name, employee_id FROM candidates WHERE id = $1',
      [candidateId]
    );

    if (candidateResult.rows.length === 0) {
      return null;
    }

    const candidate = candidateResult.rows[0] as Record<string, unknown>;

    // Fetch the most recent completed assessment for this candidate
    const assessmentResult = await this.db.query(
      `SELECT a.id as assessment_id, a.session_id, s.name as session_name, a.completed_at
       FROM assessments a
       JOIN assessment_sessions s ON a.session_id = s.id
       WHERE a.candidate_id = $1 AND a.status = 'completed'
       ORDER BY a.completed_at DESC
       LIMIT 1`,
      [candidateId]
    );

    if (assessmentResult.rows.length === 0) {
      return null;
    }

    const assessment = assessmentResult.rows[0] as Record<string, unknown>;

    // Fetch scoring results
    const scoringResult = await this.db.query(
      `SELECT * FROM scoring_results WHERE assessment_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
      [assessment.assessment_id]
    );

    // Fetch anti-faking results
    const antiFakingResult = await this.db.query(
      `SELECT * FROM anti_faking_results WHERE assessment_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
      [assessment.assessment_id]
    );

    // Fetch average response times
    const responseTimeResult = await this.db.query(
      `SELECT
         AVG(response_time_ms) as avg_all,
         AVG(CASE WHEN section_type = 'personality' THEN response_time_ms END) as avg_personality,
         AVG(CASE WHEN section_type = 'sjt' THEN response_time_ms END) as avg_sjt
       FROM responses r
       JOIN assessments a ON r.assessment_id = a.id
       WHERE a.candidate_id = $1 AND a.status = 'completed'`,
      [candidateId]
    );

    const scoring = scoringResult.rows[0] as Record<string, unknown> | undefined;
    const antiFaking = antiFakingResult.rows[0] as Record<string, unknown> | undefined;
    const responseTimes = responseTimeResult.rows[0] as Record<string, unknown> | undefined;

    const personality = buildPersonalityProfile(scoring);
    const sjt = buildSjtResults(scoring);
    const composite = buildCompositeResult(scoring);
    const validity = buildValiditySectionWithTimes(antiFaking, responseTimes);
    const recommendations = buildRecommendations(scoring);

    return {
      candidateId,
      candidateName: candidate.name as string,
      sessionName: assessment.session_name as string,
      completedAt: typeof assessment.completed_at === 'string'
        ? assessment.completed_at
        : (assessment.completed_at as Date).toISOString(),
      personality,
      sjt,
      composite,
      validity,
      recommendations,
    };
  }

  /**
   * Fetch export data for all candidates in a session.
   */
  async getSessionExportData(sessionId: string): Promise<SessionExportRow[] | null> {
    return getSessionExportData(sessionId, this.db);
  }

  /**
   * Format export rows as CSV.
   */
  formatAsCsv(rows: SessionExportRow[]): string {
    return formatAsCsv(rows);
  }
}

/**
 * Build validity section with response time data from a separate query.
 */
function buildValiditySectionWithTimes(
  antiFaking: Record<string, unknown> | undefined,
  responseTimes: Record<string, unknown> | undefined
): AssessmentValidityDto {
  if (!antiFaking) {
    return {
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
    };
  }

  const flaggedCount = (antiFaking.flagged_fast_count as number) || 0;
  const totalResponses = (antiFaking.total_responses as number) || 1;
  const flaggedPercentage = (flaggedCount / totalResponses) * 100;
  const inconsistentPairs = (antiFaking.inconsistent_pair_count as number) || 0;

  const hasWarning = inconsistentPairs >= 3 || flaggedPercentage > 30;
  let warningMessage: string | undefined;
  if (hasWarning) {
    warningMessage = `Peringatan validitas: ${inconsistentPairs} pasangan inkonsisten dan ${Math.round(flaggedPercentage)}% respons ditandai. Pertimbangkan asesmen ulang.`;
  }

  return {
    consistencyIndex: (antiFaking.consistency_index as number) || 0,
    averageResponseTimeMs: (responseTimes?.avg_all as number) || 0,
    personalityAvgResponseTimeMs: (responseTimes?.avg_personality as number) || 0,
    sjtAvgResponseTimeMs: (responseTimes?.avg_sjt as number) || 0,
    socialDesirabilityScore: (antiFaking.social_desirability_score as number) || 0,
    validityFlag: (antiFaking.validity_flag as AssessmentValidityDto['validityFlag']) || 'Cautionary',
    flaggedResponsePercentage: flaggedPercentage,
    focusLossCount: 0,
    hasValidityWarning: hasWarning,
    validityWarningMessage: warningMessage,
  };
}
