import { useState, useCallback } from 'react';
import { RankingInput, validateRanking } from '../components/RankingInput';
import {
  ElaborationTextField,
  validateElaboration,
} from '../components/ElaborationTextField';

export interface SjtScenario {
  itemId: string;
  scenarioText: string;
  options: { id: string; text: string }[];
}

export interface SjtScenarioResponse {
  itemId: string;
  ranking: Record<string, number>;
  elaboration: string;
  submitted: boolean;
}

export interface SJTTestPageProps {
  /** List of scenarios to present */
  scenarios: SjtScenario[];
  /** Previously submitted responses (for session resume) */
  initialResponses?: SjtScenarioResponse[];
  /** Callback when a scenario response is submitted */
  onSubmitScenario: (response: SjtScenarioResponse) => void;
  /** Callback when all scenarios are completed */
  onComplete?: () => void;
}

interface ValidationState {
  rankingErrors: string[];
  elaborationErrors: string[];
}

/**
 * SJT Test Page — presents workplace scenarios for ranking and elaboration.
 * Implements drag-and-drop ranking, elaboration text field, and validation.
 * Prevents modification of previously submitted scenarios.
 *
 * Requirements: 3.3, 3.4, 3.7, 3.8
 */
export function SJTTestPage({
  scenarios,
  initialResponses,
  onSubmitScenario,
  onComplete,
}: SJTTestPageProps) {
  const [responses, setResponses] = useState<SjtScenarioResponse[]>(() => {
    if (initialResponses && initialResponses.length > 0) {
      return initialResponses;
    }
    return scenarios.map((s) => ({
      itemId: s.itemId,
      ranking: {},
      elaboration: '',
      submitted: false,
    }));
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (initialResponses) {
      const firstUnsubmitted = initialResponses.findIndex((r) => !r.submitted);
      return firstUnsubmitted >= 0 ? firstUnsubmitted : initialResponses.length;
    }
    return 0;
  });

  const [validation, setValidation] = useState<ValidationState>({
    rankingErrors: [],
    elaborationErrors: [],
  });

  const [showValidation, setShowValidation] = useState(false);

  const currentScenario = scenarios[currentIndex];
  const currentResponse = responses[currentIndex];
  const isSubmitted = currentResponse?.submitted ?? false;
  const totalScenarios = scenarios.length;
  const completedCount = responses.filter((r) => r.submitted).length;

  const handleRankingChange = useCallback(
    (ranking: Record<string, number>) => {
      if (isSubmitted) return;
      setResponses((prev) =>
        prev.map((r, i) => (i === currentIndex ? { ...r, ranking } : r)),
      );
      // Clear ranking errors on change
      if (showValidation) {
        setValidation((prev) => ({ ...prev, rankingErrors: [] }));
      }
    },
    [currentIndex, isSubmitted, showValidation],
  );

  const handleElaborationChange = useCallback(
    (elaboration: string) => {
      if (isSubmitted) return;
      setResponses((prev) =>
        prev.map((r, i) => (i === currentIndex ? { ...r, elaboration } : r)),
      );
      // Clear elaboration errors on change
      if (showValidation) {
        setValidation((prev) => ({ ...prev, elaborationErrors: [] }));
      }
    },
    [currentIndex, isSubmitted, showValidation],
  );

  const handleSubmit = useCallback(() => {
    if (!currentScenario || !currentResponse || isSubmitted) return;

    const rankingResult = validateRanking(
      currentResponse.ranking,
      currentScenario.options.length,
    );
    const elaborationResult = validateElaboration(currentResponse.elaboration);

    if (!rankingResult.valid || !elaborationResult.valid) {
      setShowValidation(true);
      setValidation({
        rankingErrors: rankingResult.errors,
        elaborationErrors: elaborationResult.errors,
      });
      return;
    }

    // Mark as submitted
    const submittedResponse: SjtScenarioResponse = {
      ...currentResponse,
      submitted: true,
    };

    setResponses((prev) =>
      prev.map((r, i) => (i === currentIndex ? submittedResponse : r)),
    );

    setShowValidation(false);
    setValidation({ rankingErrors: [], elaborationErrors: [] });

    onSubmitScenario(submittedResponse);

    // Move to next scenario or complete
    if (currentIndex < totalScenarios - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [
    currentScenario,
    currentResponse,
    isSubmitted,
    currentIndex,
    totalScenarios,
    onSubmitScenario,
    onComplete,
  ]);

  const handleNavigateToScenario = useCallback(
    (index: number) => {
      // Only allow navigating to submitted scenarios (read-only) or the current active one
      if (index <= completedCount) {
        setCurrentIndex(index);
        setShowValidation(false);
        setValidation({ rankingErrors: [], elaborationErrors: [] });
      }
    },
    [completedCount],
  );

  if (!currentScenario || !currentResponse) {
    return (
      <div className="sjt-test-page sjt-test-page--complete">
        <h2>Semua skenario telah diselesaikan</h2>
        <p>Anda telah menyelesaikan {completedCount} dari {totalScenarios} skenario.</p>
      </div>
    );
  }

  return (
    <div className="sjt-test-page">
      <header className="sjt-test-page__header">
        <h2>Tes Penilaian Situasional</h2>
        <div className="sjt-test-page__progress" aria-live="polite">
          Skenario {currentIndex + 1} dari {totalScenarios}
          {completedCount > 0 && ` (${completedCount} selesai)`}
        </div>
      </header>

      {/* Scenario navigation indicators */}
      <nav className="sjt-test-page__nav" aria-label="Navigasi skenario">
        {scenarios.map((_, index) => {
          const resp = responses[index];
          const isActive = index === currentIndex;
          const isDone = resp?.submitted ?? false;
          return (
            <button
              key={index}
              className={`sjt-test-page__nav-dot${isActive ? ' sjt-test-page__nav-dot--active' : ''}${isDone ? ' sjt-test-page__nav-dot--done' : ''}`}
              onClick={() => handleNavigateToScenario(index)}
              disabled={index > completedCount}
              aria-label={`Skenario ${index + 1}${isDone ? ' (selesai)' : ''}${isActive ? ' (aktif)' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {index + 1}
            </button>
          );
        })}
      </nav>

      {/* Scenario content */}
      <section className="sjt-test-page__scenario" aria-labelledby="scenario-title">
        <h3 id="scenario-title">Skenario {currentIndex + 1}</h3>
        <div className="sjt-test-page__scenario-text">
          <p>{currentScenario.scenarioText}</p>
        </div>

        {isSubmitted && (
          <div className="sjt-test-page__submitted-notice" role="status">
            Jawaban untuk skenario ini telah dikirim dan tidak dapat diubah.
          </div>
        )}
      </section>

      {/* Ranking section */}
      <section className="sjt-test-page__ranking" aria-labelledby="ranking-title">
        <h4 id="ranking-title">Peringkat Respons</h4>
        <RankingInput
          options={currentScenario.options}
          ranking={currentResponse.ranking}
          onRankingChange={handleRankingChange}
          disabled={isSubmitted}
          errors={showValidation ? validation.rankingErrors : undefined}
        />
      </section>

      {/* Elaboration section */}
      <section className="sjt-test-page__elaboration" aria-labelledby="elaboration-title">
        <h4 id="elaboration-title">Penjelasan</h4>
        <ElaborationTextField
          value={currentResponse.elaboration}
          onChange={handleElaborationChange}
          disabled={isSubmitted}
          errors={showValidation ? validation.elaborationErrors : undefined}
          id={`elaboration-${currentScenario.itemId}`}
        />
      </section>

      {/* Submit button */}
      {!isSubmitted && (
        <div className="sjt-test-page__actions">
          <button
            className="btn-primary sjt-test-page__submit"
            onClick={handleSubmit}
            aria-label="Kirim jawaban skenario"
          >
            Kirim Jawaban
          </button>
        </div>
      )}

      {/* General validation error summary */}
      {showValidation && (validation.rankingErrors.length > 0 || validation.elaborationErrors.length > 0) && (
        <div className="sjt-test-page__error-summary" role="alert" aria-live="assertive">
          <p className="sjt-test-page__error-summary-title">
            Harap lengkapi semua bidang sebelum mengirim:
          </p>
          <ul>
            {validation.rankingErrors.map((err, i) => (
              <li key={`rank-${i}`}>{err}</li>
            ))}
            {validation.elaborationErrors.map((err, i) => (
              <li key={`elab-${i}`}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
