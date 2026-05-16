/**
 * Elaboration Quality Scoring
 *
 * Evaluates the quality of candidate's elaboration text (their explanation
 * for why they chose a particular ranking as most effective).
 *
 * Scoring uses keyword + heuristic-based analysis (no ML required):
 * - Coherence score (0-50): text quality, word count, sentence structure
 * - Alignment score (0-50): keyword matching, reference to chosen option, value reasoning
 *
 * Validates: Requirements 9.5
 */

import { KemenkeuValue } from '@assessment/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScenarioContext {
  scenarioId: string;
  kemenkeuValue: KemenkeuValue;
  scenarioText: string;
  mostEffectiveOptionText: string; // the option the candidate ranked as #1
  keywords: string[]; // relevant keywords for this value
}

export interface ElaborationScoreResult {
  score: number; // 0-100
  coherenceScore: number; // 0-50 (text quality)
  alignmentScore: number; // 0-50 (alignment with value/ranking)
  wordCount: number;
  keywordMatches: number;
}

export interface ElaborationInput {
  scenarioId: string;
  elaboration: string;
  context: ScenarioContext;
}

export interface ElaborationScore {
  scenarioId: string;
  score: number;
  coherenceScore: number;
  alignmentScore: number;
  wordCount: number;
  keywordMatches: number;
}

// ─── Value-Specific Keywords (Bahasa Indonesia) ──────────────────────────────

export const VALUE_KEYWORDS: Record<KemenkeuValue, string[]> = {
  [KemenkeuValue.Integritas]: [
    'jujur', 'etika', 'transparan', 'akuntabel', 'kode etik',
    'prinsip', 'moral', 'benar', 'adil',
  ],
  [KemenkeuValue.Profesionalisme]: [
    'kompeten', 'tanggung jawab', 'kualitas', 'standar', 'akurat',
    'tuntas', 'komitmen',
  ],
  [KemenkeuValue.Sinergi]: [
    'kerjasama', 'kolaborasi', 'tim', 'bersama', 'koordinasi',
    'harmonis', 'mitra',
  ],
  [KemenkeuValue.Pelayanan]: [
    'layanan', 'kepuasan', 'stakeholder', 'responsif', 'cepat',
    'tepat', 'ramah',
  ],
  [KemenkeuValue.Kesempurnaan]: [
    'perbaikan', 'inovasi', 'terbaik', 'peningkatan', 'evaluasi',
    'optimal', 'sempurna',
  ],
};

// ─── Reasoning Words (Bahasa Indonesia) ──────────────────────────────────────

const REASONING_WORDS = [
  'karena', 'sehingga', 'agar', 'supaya', 'oleh karena itu',
  'dengan demikian', 'maka', 'sebab', 'akibatnya', 'untuk',
];

// ─── Coherence Scoring ───────────────────────────────────────────────────────

/**
 * Calculates the word count factor for coherence scoring.
 * Optimal range: 50-100 words = full score (25 points).
 * Below 50 or above 300 = reduced score.
 */
export function calculateWordCountFactor(wordCount: number): number {
  const maxPoints = 25;

  if (wordCount === 0) return 0;

  if (wordCount >= 50 && wordCount <= 100) {
    return maxPoints;
  }

  if (wordCount < 50) {
    // Linear scale from 0 to maxPoints as word count goes from 0 to 50
    return Math.round((wordCount / 50) * maxPoints);
  }

  // wordCount > 100
  if (wordCount <= 300) {
    // Slight reduction for verbose text (100-300 words)
    // Linear decrease from maxPoints to 15
    const reduction = ((wordCount - 100) / 200) * 10;
    return Math.round(maxPoints - reduction);
  }

  // wordCount > 300: more significant reduction
  // Cap at minimum 5 points
  const reduction = Math.min(20, 10 + ((wordCount - 300) / 200) * 10);
  return Math.round(maxPoints - reduction);
}

/**
 * Calculates the sentence structure factor for coherence scoring.
 * Checks for presence of reasoning/conjunction words.
 * Max: 15 points.
 */
export function calculateSentenceStructureFactor(text: string): number {
  const maxPoints = 15;
  const lowerText = text.toLowerCase();

  let reasoningWordCount = 0;
  for (const word of REASONING_WORDS) {
    if (lowerText.includes(word)) {
      reasoningWordCount++;
    }
  }

  // Award points based on reasoning word usage
  // 1 word = 5 points, 2 words = 10 points, 3+ words = 15 points
  if (reasoningWordCount >= 3) return maxPoints;
  if (reasoningWordCount === 2) return 10;
  if (reasoningWordCount === 1) return 5;
  return 0;
}

/**
 * Calculates the repetition penalty for coherence scoring.
 * Excessive repetition of the same words reduces the score.
 * Max penalty: 10 points (subtracted from coherence).
 */
export function calculateRepetitionPenalty(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length === 0) return 0;

  const wordFrequency = new Map<string, number>();
  for (const word of words) {
    wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
  }

  // Calculate ratio of most repeated word to total words
  let maxFrequency = 0;
  for (const count of wordFrequency.values()) {
    if (count > maxFrequency) maxFrequency = count;
  }

  const repetitionRatio = maxFrequency / words.length;

  // If any word appears more than 30% of the time, apply penalty
  if (repetitionRatio > 0.3) {
    return Math.min(10, Math.round((repetitionRatio - 0.3) * 50));
  }

  return 0;
}

/**
 * Calculates the coherence score (0-50) for an elaboration text.
 * Components:
 * - Word count factor (0-25)
 * - Sentence structure factor (0-15)
 * - Base quality points (0-10) minus repetition penalty
 */
export function calculateCoherenceScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const wordCountFactor = calculateWordCountFactor(wordCount);
  const sentenceStructureFactor = calculateSentenceStructureFactor(text);
  const repetitionPenalty = calculateRepetitionPenalty(text);

  // Base quality: award points for having some text at all (0-10)
  const baseQuality = wordCount > 0 ? Math.min(10, Math.round(wordCount / 5)) : 0;

  const rawScore = wordCountFactor + sentenceStructureFactor + baseQuality - repetitionPenalty;

  return Math.max(0, Math.min(50, rawScore));
}

// ─── Alignment Scoring ───────────────────────────────────────────────────────

/**
 * Counts keyword matches in the elaboration text.
 * Uses case-insensitive matching.
 */
export function countKeywordMatches(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let matches = 0;

  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }

  return matches;
}

/**
 * Checks if the elaboration references the most effective option.
 * Uses simple word overlap between the elaboration and the option text.
 */
export function checkOptionReference(
  elaboration: string,
  optionText: string
): boolean {
  const elaborationLower = elaboration.toLowerCase();
  const optionWords = optionText
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3); // Only check meaningful words

  if (optionWords.length === 0) return false;

  let matchCount = 0;
  for (const word of optionWords) {
    if (elaborationLower.includes(word)) {
      matchCount++;
    }
  }

  // Consider it a reference if at least 30% of option words appear
  return matchCount / optionWords.length >= 0.3;
}

/**
 * Calculates the alignment score (0-50) for an elaboration text.
 * Components:
 * - Keyword matching (0-25): count matches with value-specific keywords
 * - Option reference (0-10): does the elaboration reference the most effective option?
 * - Value reasoning (0-15): does it demonstrate understanding of the Kemenkeu value?
 */
export function calculateAlignmentScore(
  text: string,
  context: ScenarioContext
): { alignmentScore: number; keywordMatches: number } {
  // Combine context keywords with value-specific keywords
  const allKeywords = [
    ...context.keywords,
    ...VALUE_KEYWORDS[context.kemenkeuValue],
  ];
  // Deduplicate keywords
  const uniqueKeywords = [...new Set(allKeywords.map(k => k.toLowerCase()))];

  const keywordMatches = countKeywordMatches(text, uniqueKeywords);

  // Keyword matching score (0-25)
  // Each keyword match is worth up to 5 points, capped at 25
  const keywordScore = Math.min(25, keywordMatches * 5);

  // Option reference score (0-10)
  const referencesOption = checkOptionReference(
    text,
    context.mostEffectiveOptionText
  );
  const optionReferenceScore = referencesOption ? 10 : 0;

  // Value reasoning score (0-15)
  // Check if the text demonstrates understanding of the specific value
  const valueKeywords = VALUE_KEYWORDS[context.kemenkeuValue];
  const valueKeywordMatches = countKeywordMatches(text, valueKeywords);
  const valueReasoningScore = Math.min(15, valueKeywordMatches * 5);

  const alignmentScore = Math.min(
    50,
    keywordScore + optionReferenceScore + valueReasoningScore
  );

  return { alignmentScore, keywordMatches };
}

// ─── Main Scoring Functions ──────────────────────────────────────────────────

/**
 * Scores a single elaboration for coherence and alignment.
 * Returns a score from 0-100.
 */
export function scoreElaboration(
  elaboration: string,
  scenarioContext: ScenarioContext
): ElaborationScoreResult {
  const trimmedText = elaboration.trim();
  const words = trimmedText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const coherenceScore = calculateCoherenceScore(trimmedText);
  const { alignmentScore, keywordMatches } = calculateAlignmentScore(
    trimmedText,
    scenarioContext
  );

  const score = coherenceScore + alignmentScore;

  return {
    score: Math.min(100, score),
    coherenceScore,
    alignmentScore,
    wordCount,
    keywordMatches,
  };
}

/**
 * Scores all elaborations and returns an array of scores.
 */
export function scoreAllElaborations(
  elaborations: ElaborationInput[]
): ElaborationScore[] {
  return elaborations.map((input) => {
    const result = scoreElaboration(input.elaboration, input.context);
    return {
      scenarioId: input.scenarioId,
      score: result.score,
      coherenceScore: result.coherenceScore,
      alignmentScore: result.alignmentScore,
      wordCount: result.wordCount,
      keywordMatches: result.keywordMatches,
    };
  });
}
