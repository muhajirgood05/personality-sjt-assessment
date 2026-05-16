/**
 * Main App component — orchestrates the complete candidate assessment flow.
 *
 * Flow: Login → General Instructions → Personality Instructions (with practice)
 *       → Personality Test → SJT Instructions (with practice) → SJT Test → Results
 *
 * Manages session state across sections, handles timer resets on section transitions,
 * and triggers the scoring pipeline on assessment completion.
 *
 * Validates: Requirements 1.1, 2.1, 3.1, 4.1, 8.1, 9.1, 10.1
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { LoginPage } from './pages/login';
import {
  GeneralInstructionsPage,
  PersonalityInstructionsPage,
  SJTInstructionsPage,
} from './pages/instructions';
import { PersonalityTestPage } from './pages/personality';
import { SJTTestPage } from './pages/SJTTestPage';
import { AdminFlow } from './pages/admin';
import { AssessmentSecurityProvider } from './components/AssessmentSecurityProvider';
import { CandidateReport } from './components/report';
import {
  getAuthState,
  logout,
  apiRequest,
  apiJson,
} from './auth';
import {
  startHeartbeat,
  stopHeartbeat,
  startAutoSave,
  stopAutoSave,
  bufferResponse,
  startConnectionMonitor,
  stopConnectionMonitor,
} from './services';
import type {
  TimerSync,
  PersonalityItemDto,
  SjtItemDto,
  ResponsePayload,
  StartAssessmentResponse,
  CandidateReportResponse,
} from '@assessment/shared';
import type { SjtScenario, SjtScenarioResponse } from './pages/SJTTestPage';

// ─── Assessment Flow Steps ───────────────────────────────────────────────────

export type AssessmentStep =
  | 'login'
  | 'admin'
  | 'general-instructions'
  | 'personality-instructions'
  | 'personality-test'
  | 'sjt-instructions'
  | 'sjt-test'
  | 'scoring'
  | 'results';

// ─── Session State ───────────────────────────────────────────────────────────

export interface SessionState {
  sessionId: string | null;
  assessmentId: string | null;
  candidateId: string | null;
  role: 'administrator' | 'candidate' | null;
  personalityCompleted: boolean;
  sjtCompleted: boolean;
}

const INITIAL_SESSION_STATE: SessionState = {
  sessionId: null,
  assessmentId: null,
  candidateId: null,
  role: null,
  personalityCompleted: false,
  sjtCompleted: false,
};

// ─── App Component ───────────────────────────────────────────────────────────

function App() {
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('login');
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [error, setError] = useState<string | null>(null);

  // Personality test state
  const [personalityItem, setPersonalityItem] = useState<PersonalityItemDto | null>(null);
  const [personalityTotalItems, setPersonalityTotalItems] = useState(0);
  const [personalityCurrentIndex, setPersonalityCurrentIndex] = useState(0);
  const [personalityTimerSync, setPersonalityTimerSync] = useState<TimerSync | null>(null);

  // SJT test state
  const [sjtScenarios, setSjtScenarios] = useState<SjtScenario[]>([]);
  // Timer sync for SJT section (used for server-side timer coordination)
  const [, setSjtTimerSync] = useState<TimerSync | null>(null);

  // Results state
  const [reportData, setReportData] = useState<CandidateReportResponse | null>(null);

  // Track whether security controls should be active
  const isInAssessment = currentStep === 'personality-test' || currentStep === 'sjt-test';

  // Ref to track if services are started
  const servicesStartedRef = useRef(false);

  // ─── Service Lifecycle ───────────────────────────────────────────────────

  const startServices = useCallback((assessmentId: string) => {
    if (servicesStartedRef.current) return;
    servicesStartedRef.current = true;

    startConnectionMonitor();

    startHeartbeat({
      assessmentId,
      onSuccess: (data) => {
        // Timer sync updates are handled per-section
        // Only trigger invalid if sessionValid is explicitly false (not undefined)
        if (data.sessionValid === false) {
          handleSessionInvalid();
        }
      },
      onSessionInvalid: handleSessionInvalid,
    });

    startAutoSave({
      assessmentId,
      onSaveSuccess: () => { /* silent */ },
      onSaveFailure: () => { /* queued locally */ },
    });
  }, []);

  const stopServices = useCallback(() => {
    stopHeartbeat();
    stopAutoSave();
    stopConnectionMonitor();
    servicesStartedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopServices();
    };
  }, [stopServices]);

  // ─── Session Management ──────────────────────────────────────────────────

  function handleSessionInvalid() {
    stopServices();
    setError('Sesi Anda telah berakhir. Silakan login kembali.');
    setCurrentStep('login');
    setSession(INITIAL_SESSION_STATE);
  }

  // ─── Login Handler ───────────────────────────────────────────────────────

  const handleLoginSuccess = useCallback((role: 'administrator' | 'candidate') => {
    const authState = getAuthState();
    setSession((prev) => ({
      ...prev,
      role,
      candidateId: authState?.userId ?? null,
    }));
    setError(null);

    if (role === 'administrator') {
      setCurrentStep('admin');
    } else {
      setCurrentStep('general-instructions');
    }
  }, []);

  // ─── General Instructions → Personality Instructions ─────────────────────

  const handleGeneralInstructionsContinue = useCallback(() => {
    setCurrentStep('personality-instructions');
  }, []);

  // ─── Personality Instructions → Start Personality Test ───────────────────

  const handlePersonalityInstructionsContinue = useCallback(async () => {
    try {
      setError(null);
      // Start the personality assessment section
      const response = await apiJson<{ success: boolean; data: StartAssessmentResponse }>(
        '/api/assessment/start',
        {
          method: 'POST',
          body: JSON.stringify({
            sectionType: 'personality',
          }),
        },
      );

      if (response.success && response.data) {
        const { assessmentId, totalItems, timerSync, firstItem } = response.data;

        setSession((prev) => ({
          ...prev,
          assessmentId,
          sessionId: timerSync.sectionId,
        }));

        const item = firstItem as PersonalityItemDto;
        setPersonalityItem(item);
        setPersonalityTotalItems(totalItems);
        setPersonalityCurrentIndex(0);
        setPersonalityTimerSync(timerSync);

        // Start background services
        startServices(assessmentId);

        setCurrentStep('personality-test');
      } else {
        setError('Gagal memulai tes kepribadian. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    }
  }, [startServices]);

  // ─── Personality Test Handlers ───────────────────────────────────────────

  const handlePersonalitySubmitResponse = useCallback(
    async (payload: {
      assessmentId: string;
      itemId: string;
      response: number;
      responseTimeMs: number;
      clientTimestamp: number;
    }): Promise<{
      nextItem: PersonalityItemDto | null;
      timerSync: TimerSync;
      sectionComplete: boolean;
    }> => {
      // Buffer for auto-save
      const responsePayload: ResponsePayload = {
        assessmentId: payload.assessmentId,
        itemId: payload.itemId,
        response: payload.response,
        responseTimeMs: payload.responseTimeMs,
        clientTimestamp: payload.clientTimestamp,
      };
      bufferResponse(responsePayload);

      const response = await apiJson<{
        success: boolean;
        data: {
          nextItem: PersonalityItemDto | null;
          timerSync: TimerSync;
          sectionComplete: boolean;
        };
      }>('/api/assessment/respond', {
        method: 'POST',
        body: JSON.stringify(responsePayload),
      });

      if (response.success && response.data) {
        return response.data;
      }

      // Fallback: return current timer sync
      return {
        nextItem: null,
        timerSync: personalityTimerSync!,
        sectionComplete: false,
      };
    },
    [personalityTimerSync],
  );

  const handlePersonalityAutoSave = useCallback(async (_assessmentId: string) => {
    // Auto-save is handled by the auto-save service
    // This callback is for the PersonalityTestPage's internal auto-save
    await apiRequest('/api/assessment/auto-save', {
      method: 'POST',
      body: JSON.stringify({ assessmentId: _assessmentId, responses: [] }),
    });
  }, []);

  const handlePersonalitySectionComplete = useCallback(() => {
    setSession((prev) => ({ ...prev, personalityCompleted: true }));
    // Transition to SJT instructions
    setCurrentStep('sjt-instructions');
  }, []);

  const handlePersonalityTimerExpired = useCallback(() => {
    // Timer expired — auto-submit and move to SJT
    setSession((prev) => ({ ...prev, personalityCompleted: true }));
    setCurrentStep('sjt-instructions');
  }, []);

  // ─── SJT Instructions → Start SJT Test ──────────────────────────────────

  const handleSJTInstructionsContinue = useCallback(async () => {
    try {
      setError(null);
      // Start the SJT assessment section
      const response = await apiJson<{ success: boolean; data: StartAssessmentResponse }>(
        '/api/assessment/start',
        {
          method: 'POST',
          body: JSON.stringify({
            sectionType: 'sjt',
          }),
        },
      );

      if (response.success && response.data) {
        const { assessmentId, timerSync, firstItem } = response.data;

        // Update session with new assessment ID for SJT section
        setSession((prev) => ({
          ...prev,
          assessmentId,
        }));

        // Parse SJT scenarios from the response
        // The API returns the first item; we need to fetch all scenarios for SJT
        const scenariosResponse = await apiJson<{
          success: boolean;
          data: { scenarios: SjtScenario[] };
        }>('/api/assessment/sjt/scenarios', {
          method: 'GET',
        });

        if (scenariosResponse.success && scenariosResponse.data) {
          setSjtScenarios(scenariosResponse.data.scenarios);
        } else {
          // Fallback: use the first item as a single scenario
          const sjtItem = firstItem as SjtItemDto;
          setSjtScenarios([
            {
              itemId: sjtItem.itemId,
              scenarioText: sjtItem.scenarioText,
              options: sjtItem.options.map((o) => ({ id: o.id, text: o.text })),
            },
          ]);
        }

        setSjtTimerSync(timerSync);

        // Restart heartbeat with new assessment ID
        stopHeartbeat();
        startHeartbeat({
          assessmentId,
          onSuccess: (data) => {
            if (data.sessionValid === false) {
              handleSessionInvalid();
            }
          },
          onSessionInvalid: handleSessionInvalid,
        });

        setCurrentStep('sjt-test');
      } else {
        setError('Gagal memulai tes SJT. Silakan coba lagi.');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    }
  }, []);

  // ─── SJT Test Handlers ──────────────────────────────────────────────────

  const handleSJTSubmitScenario = useCallback(
    (response: SjtScenarioResponse) => {
      if (!session.assessmentId) return;

      // Buffer the response for auto-save
      const responsePayload: ResponsePayload = {
        assessmentId: session.assessmentId,
        itemId: response.itemId,
        response: Object.values(response.ranking),
        elaboration: response.elaboration,
        responseTimeMs: 0, // SJT tracks time differently
        clientTimestamp: Date.now(),
      };
      bufferResponse(responsePayload);

      // Submit to server
      apiRequest('/api/assessment/respond', {
        method: 'POST',
        body: JSON.stringify(responsePayload),
      }).catch(() => {
        // Queued locally by auto-save service
      });
    },
    [session.assessmentId],
  );

  const handleSJTComplete = useCallback(async () => {
    setSession((prev) => ({ ...prev, sjtCompleted: true }));
    // Trigger scoring pipeline
    await triggerScoring();
  }, []);

  // ─── Scoring Pipeline ────────────────────────────────────────────────────

  const triggerScoring = useCallback(async () => {
    setCurrentStep('scoring');
    stopServices();

    try {
      // Trigger scoring calculation
      await apiRequest('/api/scoring/calculate', {
        method: 'POST',
        body: JSON.stringify({
          assessmentId: session.assessmentId,
          candidateId: session.candidateId,
        }),
      });

      // Fetch the report
      const reportResponse = await apiJson<{
        success: boolean;
        data: CandidateReportResponse;
      }>(`/api/reports/${session.candidateId}`);

      if (reportResponse.success && reportResponse.data) {
        setReportData(reportResponse.data);
        setCurrentStep('results');
      } else {
        setError('Gagal memuat hasil asesmen. Silakan hubungi administrator.');
        setCurrentStep('results');
      }
    } catch {
      setError('Terjadi kesalahan saat menghitung skor. Silakan hubungi administrator.');
      setCurrentStep('results');
    }
  }, [session.assessmentId, session.candidateId, stopServices]);

  // ─── Logout Handler ──────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    stopServices();
    await logout();
    setSession(INITIAL_SESSION_STATE);
    setCurrentStep('login');
    setError(null);
  }, [stopServices]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AssessmentSecurityProvider
      assessmentId={session.assessmentId}
      enabled={isInAssessment}
    >
      <div className="app">
        {error && (
          <div className="app__error-banner" role="alert" aria-live="assertive">
            <p>{error}</p>
            {currentStep !== 'login' && (
              <button onClick={() => setError(null)} aria-label="Tutup pesan error">
                ✕
              </button>
            )}
          </div>
        )}

        {currentStep === 'login' && (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        )}

        {currentStep === 'admin' && (
          <AdminFlow onLogout={handleLogout} />
        )}

        {currentStep === 'general-instructions' && (
          <GeneralInstructionsPage onContinue={handleGeneralInstructionsContinue} />
        )}

        {currentStep === 'personality-instructions' && (
          <PersonalityInstructionsPage onContinue={handlePersonalityInstructionsContinue} />
        )}

        {currentStep === 'personality-test' &&
          personalityItem &&
          personalityTimerSync &&
          session.assessmentId && (
            <PersonalityTestPage
              assessmentId={session.assessmentId}
              initialItem={personalityItem}
              totalItems={personalityTotalItems}
              initialIndex={personalityCurrentIndex}
              timerSync={personalityTimerSync}
              onSubmitResponse={handlePersonalitySubmitResponse}
              onAutoSave={handlePersonalityAutoSave}
              onSectionComplete={handlePersonalitySectionComplete}
              onTimerExpired={handlePersonalityTimerExpired}
            />
          )}

        {currentStep === 'sjt-instructions' && (
          <SJTInstructionsPage onContinue={handleSJTInstructionsContinue} />
        )}

        {currentStep === 'sjt-test' && sjtScenarios.length > 0 && (
          <SJTTestPage
            scenarios={sjtScenarios}
            onSubmitScenario={handleSJTSubmitScenario}
            onComplete={handleSJTComplete}
          />
        )}

        {currentStep === 'scoring' && (
          <div className="app__scoring">
            <h2>Menghitung Skor...</h2>
            <p>Mohon tunggu, sistem sedang memproses hasil asesmen Anda.</p>
            <div className="app__scoring-spinner" aria-label="Memproses" />
          </div>
        )}

        {currentStep === 'results' && (
          <div className="app__results">
            {reportData ? (
              <CandidateReport report={reportData} />
            ) : (
              <div className="app__results-error">
                <h2>Asesmen Selesai</h2>
                <p>
                  {error ||
                    'Hasil asesmen Anda sedang diproses. Silakan hubungi administrator untuk melihat hasil.'}
                </p>
              </div>
            )}
            <button
              className="btn-secondary"
              onClick={handleLogout}
              aria-label="Keluar dari sistem"
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </AssessmentSecurityProvider>
  );
}

export default App;
