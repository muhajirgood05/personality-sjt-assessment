import { describe, it, expect } from 'vitest';
import { KemenkeuValue } from '@assessment/shared';
import {
  calculateWordCountFactor,
  calculateSentenceStructureFactor,
  calculateRepetitionPenalty,
  calculateCoherenceScore,
  countKeywordMatches,
  checkOptionReference,
  calculateAlignmentScore,
  scoreElaboration,
  scoreAllElaborations,
  VALUE_KEYWORDS,
  ScenarioContext,
  ElaborationInput,
} from './elaboration-scoring';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createContext(overrides: Partial<ScenarioContext> = {}): ScenarioContext {
  return {
    scenarioId: 'scenario-1',
    kemenkeuValue: KemenkeuValue.Integritas,
    scenarioText: 'Anda menemukan rekan kerja yang melakukan pelanggaran kode etik.',
    mostEffectiveOptionText: 'Melaporkan langsung kepada atasan dengan bukti yang jelas',
    keywords: ['lapor', 'atasan', 'bukti', 'pelanggaran'],
    ...overrides,
  };
}

// ─── Word Count Factor ───────────────────────────────────────────────────────

describe('calculateWordCountFactor', () => {
  it('returns 0 for empty text (0 words)', () => {
    expect(calculateWordCountFactor(0)).toBe(0);
  });

  it('returns reduced score for text below 50 words', () => {
    expect(calculateWordCountFactor(25)).toBe(13); // 25/50 * 25 = 12.5 → 13
    expect(calculateWordCountFactor(10)).toBe(5);  // 10/50 * 25 = 5
  });

  it('returns full score (25) for text between 50-100 words', () => {
    expect(calculateWordCountFactor(50)).toBe(25);
    expect(calculateWordCountFactor(75)).toBe(25);
    expect(calculateWordCountFactor(100)).toBe(25);
  });

  it('returns slightly reduced score for 100-300 words', () => {
    const score150 = calculateWordCountFactor(150);
    expect(score150).toBeGreaterThan(15);
    expect(score150).toBeLessThan(25);

    const score300 = calculateWordCountFactor(300);
    expect(score300).toBeGreaterThanOrEqual(15);
  });

  it('returns more reduced score for text above 300 words', () => {
    const score400 = calculateWordCountFactor(400);
    expect(score400).toBeLessThan(15);
    expect(score400).toBeGreaterThanOrEqual(5);
  });
});

// ─── Sentence Structure Factor ───────────────────────────────────────────────

describe('calculateSentenceStructureFactor', () => {
  it('returns 0 when no reasoning words are present', () => {
    expect(calculateSentenceStructureFactor('Saya memilih opsi ini.')).toBe(0);
  });

  it('returns 5 for one reasoning word', () => {
    expect(calculateSentenceStructureFactor('Saya memilih karena itu benar.')).toBe(5);
  });

  it('returns 10 for two reasoning words', () => {
    expect(calculateSentenceStructureFactor('Karena hal ini penting sehingga harus dilakukan.')).toBe(10);
  });

  it('returns 15 (max) for three or more reasoning words', () => {
    expect(calculateSentenceStructureFactor(
      'Karena hal ini penting sehingga harus dilakukan agar hasil optimal.'
    )).toBe(15);
  });

  it('is case-insensitive', () => {
    expect(calculateSentenceStructureFactor('KARENA hal ini penting.')).toBe(5);
  });
});

// ─── Repetition Penalty ──────────────────────────────────────────────────────

describe('calculateRepetitionPenalty', () => {
  it('returns 0 for text with no excessive repetition', () => {
    expect(calculateRepetitionPenalty(
      'Saya memilih opsi ini karena sesuai dengan prinsip integritas dan etika kerja'
    )).toBe(0);
  });

  it('returns 0 for empty text', () => {
    expect(calculateRepetitionPenalty('')).toBe(0);
  });

  it('returns penalty for highly repetitive text', () => {
    const repetitiveText = 'penting penting penting penting penting penting penting penting penting penting';
    const penalty = calculateRepetitionPenalty(repetitiveText);
    expect(penalty).toBeGreaterThan(0);
  });

  it('ignores short words (3 chars or less)', () => {
    // "dan" is 3 chars, should be ignored
    expect(calculateRepetitionPenalty('dan dan dan dan dan dan dan dan dan dan')).toBe(0);
  });
});

// ─── Coherence Score ─────────────────────────────────────────────────────────

describe('calculateCoherenceScore', () => {
  it('returns 0 for empty text', () => {
    expect(calculateCoherenceScore('')).toBe(0);
  });

  it('returns low score for very short text', () => {
    const score = calculateCoherenceScore('Saya setuju.');
    expect(score).toBeLessThan(20);
  });

  it('returns high score for well-structured text in optimal range', () => {
    // ~60 words with reasoning words
    const goodText = 'Saya memilih opsi pertama karena tindakan tersebut mencerminkan nilai integritas yang tinggi. Dengan melaporkan pelanggaran secara langsung, kita menunjukkan komitmen terhadap transparansi dan akuntabilitas. Sehingga organisasi dapat mengambil tindakan yang tepat agar masalah tidak berlarut-larut dan merugikan pihak lain di kemudian hari.';
    const score = calculateCoherenceScore(goodText);
    expect(score).toBeGreaterThan(30);
  });

  it('is capped at 50', () => {
    const longGoodText = 'Karena sehingga agar supaya oleh karena itu ' +
      Array(60).fill('kata').join(' ');
    const score = calculateCoherenceScore(longGoodText);
    expect(score).toBeLessThanOrEqual(50);
  });

  it('never returns negative', () => {
    const score = calculateCoherenceScore('a');
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ─── Keyword Matching ────────────────────────────────────────────────────────

describe('countKeywordMatches', () => {
  it('returns 0 when no keywords match', () => {
    expect(countKeywordMatches('Saya memilih opsi ini.', ['integritas', 'jujur'])).toBe(0);
  });

  it('counts single keyword match', () => {
    expect(countKeywordMatches('Saya harus jujur dalam situasi ini.', ['jujur', 'etika'])).toBe(1);
  });

  it('counts multiple keyword matches', () => {
    expect(countKeywordMatches(
      'Kita harus jujur dan menjaga etika kerja.',
      ['jujur', 'etika', 'transparan']
    )).toBe(2);
  });

  it('is case-insensitive', () => {
    expect(countKeywordMatches('JUJUR dan ETIKA', ['jujur', 'etika'])).toBe(2);
  });

  it('matches multi-word keywords', () => {
    expect(countKeywordMatches(
      'Kita harus mematuhi kode etik organisasi.',
      ['kode etik', 'jujur']
    )).toBe(1);
  });
});

// ─── Option Reference Check ──────────────────────────────────────────────────

describe('checkOptionReference', () => {
  it('returns true when elaboration references the option', () => {
    const result = checkOptionReference(
      'Saya memilih untuk melaporkan langsung kepada atasan karena itu yang benar.',
      'Melaporkan langsung kepada atasan dengan bukti yang jelas'
    );
    expect(result).toBe(true);
  });

  it('returns false when elaboration does not reference the option', () => {
    const result = checkOptionReference(
      'Saya memilih opsi ini karena sesuai dengan nilai organisasi.',
      'Melaporkan langsung kepada atasan dengan bukti yang jelas'
    );
    expect(result).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = checkOptionReference(
      'MELAPORKAN LANGSUNG KEPADA ATASAN adalah tindakan yang tepat.',
      'Melaporkan langsung kepada atasan dengan bukti yang jelas'
    );
    expect(result).toBe(true);
  });

  it('returns false for empty option text', () => {
    expect(checkOptionReference('Saya memilih ini.', '')).toBe(false);
  });
});

// ─── Alignment Score ─────────────────────────────────────────────────────────

describe('calculateAlignmentScore', () => {
  it('returns 0 for text with no alignment', () => {
    const context = createContext();
    const { alignmentScore } = calculateAlignmentScore(
      'Saya memilih opsi ini.',
      context
    );
    expect(alignmentScore).toBe(0);
  });

  it('awards points for keyword matches', () => {
    const context = createContext();
    const { alignmentScore, keywordMatches } = calculateAlignmentScore(
      'Tindakan ini mencerminkan kejujuran dan etika yang jujur serta transparan.',
      context
    );
    expect(keywordMatches).toBeGreaterThan(0);
    expect(alignmentScore).toBeGreaterThan(0);
  });

  it('awards points for referencing the chosen option', () => {
    const context = createContext();
    const { alignmentScore } = calculateAlignmentScore(
      'Melaporkan langsung kepada atasan dengan bukti yang jelas adalah tindakan yang tepat.',
      context
    );
    expect(alignmentScore).toBeGreaterThan(0);
  });

  it('is capped at 50', () => {
    const context = createContext({
      keywords: ['jujur', 'etika', 'transparan', 'akuntabel', 'prinsip', 'moral', 'benar', 'adil'],
    });
    const text = 'Jujur etika transparan akuntabel prinsip moral benar adil melaporkan langsung kepada atasan dengan bukti yang jelas';
    const { alignmentScore } = calculateAlignmentScore(text, context);
    expect(alignmentScore).toBeLessThanOrEqual(50);
  });
});

// ─── Score Elaboration ───────────────────────────────────────────────────────

describe('scoreElaboration', () => {
  it('returns score between 0 and 100', () => {
    const context = createContext();
    const result = scoreElaboration(
      'Saya memilih opsi ini karena sesuai dengan prinsip integritas.',
      context
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns low score for empty elaboration', () => {
    const context = createContext();
    const result = scoreElaboration('', context);
    expect(result.score).toBe(0);
    expect(result.coherenceScore).toBe(0);
    expect(result.alignmentScore).toBe(0);
    expect(result.wordCount).toBe(0);
  });

  it('returns high score for well-written, aligned elaboration', () => {
    const context = createContext();
    const elaboration =
      'Saya memilih untuk melaporkan langsung kepada atasan karena tindakan ini mencerminkan nilai integritas dan kejujuran. ' +
      'Dengan bersikap transparan dan akuntabel, kita menjaga etika organisasi. ' +
      'Sehingga pelanggaran dapat ditangani dengan adil dan sesuai prinsip yang berlaku agar tidak terulang.';
    const result = scoreElaboration(elaboration, context);
    expect(result.score).toBeGreaterThan(50);
    expect(result.coherenceScore).toBeGreaterThan(20);
    expect(result.alignmentScore).toBeGreaterThan(20);
  });

  it('correctly counts word count', () => {
    const context = createContext();
    const result = scoreElaboration('satu dua tiga empat lima', context);
    expect(result.wordCount).toBe(5);
  });

  it('correctly reports keyword matches', () => {
    const context = createContext({
      kemenkeuValue: KemenkeuValue.Integritas,
      keywords: ['lapor'],
    });
    const result = scoreElaboration(
      'Saya harus jujur dan transparan dalam melaporkan hal ini.',
      context
    );
    // 'jujur' and 'transparan' from VALUE_KEYWORDS, 'lapor' from context keywords
    expect(result.keywordMatches).toBeGreaterThanOrEqual(2);
  });

  it('handles whitespace-only elaboration as empty', () => {
    const context = createContext();
    const result = scoreElaboration('   \n\t  ', context);
    expect(result.score).toBe(0);
    expect(result.wordCount).toBe(0);
  });

  it('coherenceScore is between 0 and 50', () => {
    const context = createContext();
    const result = scoreElaboration(
      'Karena sehingga agar supaya oleh karena itu ' + Array(60).fill('kata').join(' '),
      context
    );
    expect(result.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(result.coherenceScore).toBeLessThanOrEqual(50);
  });

  it('alignmentScore is between 0 and 50', () => {
    const context = createContext();
    const result = scoreElaboration(
      'Jujur etika transparan akuntabel prinsip moral benar adil melaporkan langsung kepada atasan',
      context
    );
    expect(result.alignmentScore).toBeGreaterThanOrEqual(0);
    expect(result.alignmentScore).toBeLessThanOrEqual(50);
  });
});

// ─── Score All Elaborations ──────────────────────────────────────────────────

describe('scoreAllElaborations', () => {
  it('returns empty array for empty input', () => {
    expect(scoreAllElaborations([])).toEqual([]);
  });

  it('scores multiple elaborations correctly', () => {
    const inputs: ElaborationInput[] = [
      {
        scenarioId: 'scenario-1',
        elaboration: 'Saya memilih opsi ini karena sesuai dengan prinsip integritas dan kejujuran.',
        context: createContext({ scenarioId: 'scenario-1' }),
      },
      {
        scenarioId: 'scenario-2',
        elaboration: 'Kerjasama tim dan kolaborasi sangat penting dalam situasi ini.',
        context: createContext({
          scenarioId: 'scenario-2',
          kemenkeuValue: KemenkeuValue.Sinergi,
          keywords: ['tim', 'bersama'],
        }),
      },
    ];

    const results = scoreAllElaborations(inputs);

    expect(results).toHaveLength(2);
    expect(results[0].scenarioId).toBe('scenario-1');
    expect(results[1].scenarioId).toBe('scenario-2');
    expect(results[0].score).toBeGreaterThanOrEqual(0);
    expect(results[1].score).toBeGreaterThanOrEqual(0);
  });

  it('returns correct structure for each result', () => {
    const inputs: ElaborationInput[] = [
      {
        scenarioId: 'scenario-1',
        elaboration: 'Tindakan jujur dan transparan.',
        context: createContext(),
      },
    ];

    const results = scoreAllElaborations(inputs);

    expect(results[0]).toHaveProperty('scenarioId');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('coherenceScore');
    expect(results[0]).toHaveProperty('alignmentScore');
    expect(results[0]).toHaveProperty('wordCount');
    expect(results[0]).toHaveProperty('keywordMatches');
  });

  it('each score is sum of coherence and alignment', () => {
    const inputs: ElaborationInput[] = [
      {
        scenarioId: 'scenario-1',
        elaboration: 'Saya memilih karena jujur dan etika penting sehingga harus transparan.',
        context: createContext(),
      },
    ];

    const results = scoreAllElaborations(inputs);
    const result = results[0];

    expect(result.score).toBe(
      Math.min(100, result.coherenceScore + result.alignmentScore)
    );
  });
});

// ─── VALUE_KEYWORDS ──────────────────────────────────────────────────────────

describe('VALUE_KEYWORDS', () => {
  it('has keywords for all five Kemenkeu values', () => {
    expect(VALUE_KEYWORDS[KemenkeuValue.Integritas]).toBeDefined();
    expect(VALUE_KEYWORDS[KemenkeuValue.Profesionalisme]).toBeDefined();
    expect(VALUE_KEYWORDS[KemenkeuValue.Sinergi]).toBeDefined();
    expect(VALUE_KEYWORDS[KemenkeuValue.Pelayanan]).toBeDefined();
    expect(VALUE_KEYWORDS[KemenkeuValue.Kesempurnaan]).toBeDefined();
  });

  it('each value has at least 5 keywords', () => {
    for (const value of Object.values(KemenkeuValue)) {
      expect(VALUE_KEYWORDS[value].length).toBeGreaterThanOrEqual(5);
    }
  });
});
