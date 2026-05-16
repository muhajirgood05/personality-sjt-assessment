import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OceanDimension, KemenkeuValue } from '@assessment/shared';
import type {
  CandidateReportResponse,
  PersonalityProfileDto,
  AssessmentValidityDto,
  ImprovementRecommendation,
  ValueBehavioralExampleDto,
  KemenkeuValueScore,
} from '@assessment/shared';
import { RadarChart } from './RadarChart';
import { BarChart } from './BarChart';
import { FacetBreakdown } from './FacetBreakdown';
import { NarrativeInterpretation } from './NarrativeInterpretation';
import { KemenkeuValuesChart } from './KemenkeuValuesChart';
import { BehavioralExamples } from './BehavioralExamples';
import { AssessmentValidity } from './AssessmentValidity';
import { ImprovementRecommendations } from './ImprovementRecommendations';
import { CandidateReport } from './CandidateReport';

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockPersonalityProfile: PersonalityProfileDto = {
  dimensions: [
    { dimension: OceanDimension.Openness, rawScore: 45, stenScore: 7 },
    { dimension: OceanDimension.Conscientiousness, rawScore: 50, stenScore: 8 },
    { dimension: OceanDimension.Extraversion, rawScore: 35, stenScore: 5 },
    { dimension: OceanDimension.Agreeableness, rawScore: 42, stenScore: 6 },
    { dimension: OceanDimension.Neuroticism, rawScore: 20, stenScore: 3 },
  ],
  facets: [
    { dimension: OceanDimension.Openness, facet: 'imagination', rawScore: 12, stenScore: 7 },
    { dimension: OceanDimension.Openness, facet: 'artistic_interests', rawScore: 10, stenScore: 6 },
    { dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', rawScore: 14, stenScore: 8 },
    { dimension: OceanDimension.Conscientiousness, facet: 'orderliness', rawScore: 13, stenScore: 7 },
  ],
  narratives: [
    {
      dimension: OceanDimension.Openness,
      narrative: 'Kandidat menunjukkan tingkat keterbukaan yang tinggi terhadap pengalaman baru.',
    },
    {
      dimension: OceanDimension.Conscientiousness,
      narrative: 'Kandidat memiliki tingkat kesadaran yang sangat baik dalam menjalankan tugas.',
    },
  ],
};

const mockValueScores: KemenkeuValueScore[] = [
  { value: KemenkeuValue.Integritas, score: 75 },
  { value: KemenkeuValue.Profesionalisme, score: 82 },
  { value: KemenkeuValue.Sinergi, score: 68 },
  { value: KemenkeuValue.Pelayanan, score: 71 },
  { value: KemenkeuValue.Kesempurnaan, score: 79 },
];

const mockBehavioralExamples: ValueBehavioralExampleDto[] = [
  {
    value: KemenkeuValue.Integritas,
    examples: [
      'Melaporkan ketidaksesuaian prosedur kepada atasan.',
      'Menolak gratifikasi dari pihak ketiga.',
    ],
  },
  {
    value: KemenkeuValue.Profesionalisme,
    examples: ['Menyelesaikan tugas sebelum tenggat waktu.'],
  },
];

const mockValidity: AssessmentValidityDto = {
  consistencyIndex: 85.5,
  averageResponseTimeMs: 4500,
  personalityAvgResponseTimeMs: 3200,
  sjtAvgResponseTimeMs: 12000,
  socialDesirabilityScore: 4,
  validityFlag: 'Valid',
  flaggedResponsePercentage: 5.2,
  focusLossCount: 1,
  hasValidityWarning: false,
};

const mockRecommendations: ImprovementRecommendation[] = [
  {
    value: KemenkeuValue.Sinergi,
    currentScore: 45,
    suggestion: 'Tingkatkan kemampuan kolaborasi dengan berpartisipasi aktif dalam proyek lintas unit.',
  },
];

const mockReport: CandidateReportResponse = {
  candidateId: 'candidate-1',
  candidateName: 'Ahmad Fauzi',
  sessionName: 'MINTS 2024 Batch 1',
  completedAt: '2024-03-15T10:30:00Z',
  personality: mockPersonalityProfile,
  sjt: {
    valueScores: mockValueScores,
    behavioralExamples: mockBehavioralExamples,
    elaborationScores: [{ scenarioId: 's1', score: 78 }],
  },
  composite: {
    suitabilityScore: 74,
    category: 'Suitable',
    confidence: 'High Confidence',
    personalitySubScore: 70,
    sjtSubScore: 76,
  },
  validity: mockValidity,
  recommendations: mockRecommendations,
};

// ─── RadarChart Tests ────────────────────────────────────────────────────────

describe('RadarChart', () => {
  it('renders SVG with correct role and title', () => {
    const data = [
      { label: 'A', value: 50, maxValue: 100 },
      { label: 'B', value: 75, maxValue: 100 },
      { label: 'C', value: 30, maxValue: 100 },
    ];

    render(<RadarChart data={data} title="Test Radar" />);
    const svg = screen.getByRole('img', { name: 'Test Radar' });
    expect(svg).toBeInTheDocument();
  });

  it('renders polygon for data points', () => {
    const data = [
      { label: 'A', value: 50, maxValue: 100 },
      { label: 'B', value: 75, maxValue: 100 },
      { label: 'C', value: 30, maxValue: 100 },
    ];

    render(<RadarChart data={data} />);
    const polygon = screen.getByTestId('radar-polygon');
    expect(polygon).toBeInTheDocument();
    expect(polygon.getAttribute('points')).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    render(<RadarChart data={[]} title="Empty Chart" />);
    const svg = screen.getByRole('img', { name: 'Empty Chart' });
    expect(svg).toBeInTheDocument();
  });
});

// ─── BarChart Tests ──────────────────────────────────────────────────────────

describe('BarChart', () => {
  it('renders bars for each data point', () => {
    const data = [
      { label: 'Openness', value: 70, maxValue: 100 },
      { label: 'Conscientiousness', value: 80, maxValue: 100 },
    ];

    render(<BarChart data={data} title="Test Bar" />);
    expect(screen.getByTestId('bar-Openness')).toBeInTheDocument();
    expect(screen.getByTestId('bar-Conscientiousness')).toBeInTheDocument();
  });

  it('displays value labels when showValues is true', () => {
    const data = [{ label: 'Test', value: 65, maxValue: 100 }];

    render(<BarChart data={data} showValues={true} />);
    expect(screen.getByText('65')).toBeInTheDocument();
  });
});

// ─── FacetBreakdown Tests ────────────────────────────────────────────────────

describe('FacetBreakdown', () => {
  it('renders facets with sten scores', () => {
    const facets = [
      { dimension: OceanDimension.Openness, facet: 'imagination', rawScore: 12, stenScore: 7 },
      { dimension: OceanDimension.Openness, facet: 'artistic_interests', rawScore: 10, stenScore: 6 },
    ];

    render(<FacetBreakdown facets={facets} />);
    expect(screen.getByTestId('facet-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Imagination')).toBeInTheDocument();
    expect(screen.getByText('Artistic Interests')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('renders nothing when facets array is empty', () => {
    const { container } = render(<FacetBreakdown facets={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

// ─── NarrativeInterpretation Tests ───────────────────────────────────────────

describe('NarrativeInterpretation', () => {
  it('renders narrative text', () => {
    render(
      <NarrativeInterpretation
        dimension={OceanDimension.Openness}
        narrative="Kandidat menunjukkan keterbukaan tinggi."
      />
    );
    expect(screen.getByText('Kandidat menunjukkan keterbukaan tinggi.')).toBeInTheDocument();
  });

  it('truncates text exceeding 200 words', () => {
    const longNarrative = Array(250).fill('kata').join(' ');
    render(
      <NarrativeInterpretation
        dimension={OceanDimension.Openness}
        narrative={longNarrative}
      />
    );
    expect(screen.getByText(/Teks dipotong pada 200 kata/)).toBeInTheDocument();
  });

  it('does not show truncation notice for short text', () => {
    render(
      <NarrativeInterpretation
        dimension={OceanDimension.Openness}
        narrative="Teks pendek."
      />
    );
    expect(screen.queryByText(/Teks dipotong/)).not.toBeInTheDocument();
  });
});

// ─── KemenkeuValuesChart Tests ───────────────────────────────────────────────

describe('KemenkeuValuesChart', () => {
  it('renders radar chart with all five values', () => {
    render(<KemenkeuValuesChart valueScores={mockValueScores} />);
    // Each value appears in both the radar chart label and the scores list
    expect(screen.getAllByText(/Integritas/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Profesionalisme/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Sinergi/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pelayanan/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Kesempurnaan/).length).toBeGreaterThanOrEqual(1);
  });

  it('displays scores in the list', () => {
    render(<KemenkeuValuesChart valueScores={mockValueScores} />);
    const scoresList = screen.getByTestId('kemenkeu-scores-list');
    expect(scoresList).toBeInTheDocument();
    expect(screen.getByText('75 / 100')).toBeInTheDocument();
    expect(screen.getByText('82 / 100')).toBeInTheDocument();
  });
});

// ─── BehavioralExamples Tests ────────────────────────────────────────────────

describe('BehavioralExamples', () => {
  it('renders examples grouped by value', () => {
    render(<BehavioralExamples examples={mockBehavioralExamples} />);
    expect(screen.getByTestId('examples-integritas')).toBeInTheDocument();
    expect(screen.getByTestId('examples-profesionalisme')).toBeInTheDocument();
    expect(
      screen.getByText('Melaporkan ketidaksesuaian prosedur kepada atasan.')
    ).toBeInTheDocument();
  });

  it('limits to 3 examples per value', () => {
    const manyExamples: ValueBehavioralExampleDto[] = [
      {
        value: KemenkeuValue.Integritas,
        examples: ['Ex 1', 'Ex 2', 'Ex 3', 'Ex 4', 'Ex 5'],
      },
    ];
    render(<BehavioralExamples examples={manyExamples} />);
    const items = screen.getByTestId('examples-integritas').querySelectorAll('li');
    expect(items.length).toBe(3);
  });

  it('shows empty message when no examples', () => {
    render(<BehavioralExamples examples={[]} />);
    expect(
      screen.getByText('Tidak ada contoh perilaku yang tersedia.')
    ).toBeInTheDocument();
  });
});

// ─── AssessmentValidity Tests ────────────────────────────────────────────────

describe('AssessmentValidity', () => {
  it('renders validity flag', () => {
    render(<AssessmentValidity validity={mockValidity} />);
    expect(screen.getByTestId('validity-flag')).toHaveTextContent('Valid');
  });

  it('renders all metrics', () => {
    render(<AssessmentValidity validity={mockValidity} />);
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText('5.2%')).toBeInTheDocument();
    expect(screen.getByText('1 kali')).toBeInTheDocument();
  });

  it('shows validity warning when present', () => {
    const validityWithWarning: AssessmentValidityDto = {
      ...mockValidity,
      validityFlag: 'Cautionary',
      hasValidityWarning: true,
      validityWarningMessage: 'Pertimbangkan asesmen ulang karena inkonsistensi tinggi.',
    };
    render(<AssessmentValidity validity={validityWithWarning} />);
    expect(screen.getByTestId('validity-warning')).toBeInTheDocument();
    expect(
      screen.getByText(/Pertimbangkan asesmen ulang/)
    ).toBeInTheDocument();
  });

  it('does not show warning when hasValidityWarning is false', () => {
    render(<AssessmentValidity validity={mockValidity} />);
    expect(screen.queryByTestId('validity-warning')).not.toBeInTheDocument();
  });
});

// ─── ImprovementRecommendations Tests ────────────────────────────────────────

describe('ImprovementRecommendations', () => {
  it('renders recommendations with value name and score', () => {
    render(<ImprovementRecommendations recommendations={mockRecommendations} />);
    expect(screen.getByTestId('recommendation-sinergi')).toBeInTheDocument();
    expect(screen.getByText(/Skor saat ini: 45/)).toBeInTheDocument();
    expect(
      screen.getByText(/Tingkatkan kemampuan kolaborasi/)
    ).toBeInTheDocument();
  });

  it('shows no-recommendations message when empty', () => {
    render(<ImprovementRecommendations recommendations={[]} />);
    expect(screen.getByTestId('no-recommendations')).toBeInTheDocument();
  });
});

// ─── CandidateReport (Integration) Tests ─────────────────────────────────────

describe('CandidateReport', () => {
  it('renders complete report with all sections', () => {
    render(<CandidateReport report={mockReport} />);

    // Header
    expect(screen.getByText('Laporan Asesmen')).toBeInTheDocument();
    expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
    expect(screen.getByText('MINTS 2024 Batch 1')).toBeInTheDocument();

    // Composite summary
    expect(screen.getByTestId('composite-summary')).toBeInTheDocument();
    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.getByText('Suitable')).toBeInTheDocument();

    // Personality profile section
    expect(screen.getByText('Profil Kepribadian (OCEAN)')).toBeInTheDocument();

    // Kemenkeu values section
    expect(screen.getByText('Hasil SJT — Nilai-Nilai Kemenkeu')).toBeInTheDocument();

    // Validity section
    expect(screen.getByText('Validitas Asesmen')).toBeInTheDocument();

    // Recommendations section
    expect(screen.getByText('Rekomendasi Pengembangan')).toBeInTheDocument();
  });

  it('renders with bar chart type', () => {
    render(<CandidateReport report={mockReport} personalityChartType="bar" />);
    expect(screen.getByRole('img', { name: 'Profil Kepribadian OCEAN' })).toBeInTheDocument();
  });
});
