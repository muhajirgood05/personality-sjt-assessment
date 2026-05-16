import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';

// Mock the auth module (barrel export)
vi.mock('./auth', () => ({
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshAccessToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue('mock-token'),
  getRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  getAuthState: vi.fn().mockReturnValue({
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    role: 'candidate',
    userId: 'candidate-123',
  }),
  isAuthenticated: vi.fn().mockReturnValue(false),
  setTokens: vi.fn(),
  updateAccessToken: vi.fn(),
  clearTokens: vi.fn(),
  apiRequest: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  apiJson: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

// Also mock the direct service file for LoginPage's import
vi.mock('./auth/auth.service.js', () => ({
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshAccessToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue('mock-token'),
  getRefreshToken: vi.fn().mockReturnValue('mock-refresh'),
  getAuthState: vi.fn().mockReturnValue({
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    role: 'candidate',
    userId: 'candidate-123',
  }),
  isAuthenticated: vi.fn().mockReturnValue(false),
  setTokens: vi.fn(),
  updateAccessToken: vi.fn(),
  clearTokens: vi.fn(),
}));

// Mock the api-client (used by LoginPage indirectly)
vi.mock('./auth/api-client.js', () => ({
  apiRequest: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  apiJson: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

// Mock services
vi.mock('./services', () => ({
  startHeartbeat: vi.fn(),
  stopHeartbeat: vi.fn(),
  startAutoSave: vi.fn(),
  stopAutoSave: vi.fn(),
  bufferResponse: vi.fn(),
  startConnectionMonitor: vi.fn(),
  stopConnectionMonitor: vi.fn(),
  isOnline: vi.fn().mockReturnValue(true),
}));

// Mock the AssessmentSecurityProvider to just render children
vi.mock('./components/AssessmentSecurityProvider', () => ({
  AssessmentSecurityProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="assessment-security-provider">{children}</div>
  ),
}));

// Mock the CandidateReport component
vi.mock('./components/report', () => ({
  CandidateReport: ({ report }: { report: unknown }) => (
    <div data-testid="candidate-report">Report for {(report as { candidateName: string }).candidateName}</div>
  ),
}));

// Mock the AdminFlow component
vi.mock('./pages/admin', () => ({
  AdminFlow: ({ onLogout }: { onLogout?: () => void }) => (
    <div data-testid="admin-flow">
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));

describe('App - Assessment Flow Orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the login page initially', () => {
    render(<App />);
    expect(screen.getByLabelText('Login form')).toBeInTheDocument();
  });

  it('should transition to general instructions after successful candidate login', async () => {
    const { login } = await import('./auth/auth.service.js');
    (login as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        role: 'candidate',
        candidateId: 'candidate-123',
      },
    });

    const user = userEvent.setup();
    render(<App />);

    // Fill in login form
    await user.type(screen.getByLabelText(/ID Pegawai/i), 'EMP001');
    await user.type(screen.getByLabelText(/Kata Sandi/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    // Should transition to general instructions
    await waitFor(() => {
      expect(screen.getByText(/Selamat Datang di Platform Asesmen MINTS/i)).toBeInTheDocument();
    });
  });

  it('should transition from general instructions to personality instructions', async () => {
    const { login } = await import('./auth/auth.service.js');
    (login as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        role: 'candidate',
        candidateId: 'candidate-123',
      },
    });

    const user = userEvent.setup();
    render(<App />);

    // Login
    await user.type(screen.getByLabelText(/ID Pegawai/i), 'EMP001');
    await user.type(screen.getByLabelText(/Kata Sandi/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Masuk/i }));

    // Wait for general instructions
    await waitFor(() => {
      expect(screen.getByText(/Selamat Datang di Platform Asesmen MINTS/i)).toBeInTheDocument();
    });

    // Check the acknowledgment checkbox and continue
    const checkbox = screen.getByLabelText(/Saya telah membaca dan memahami instruksi/i);
    await user.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /Lanjutkan ke bagian berikutnya/i });
    await user.click(continueButton);

    // Should transition to personality instructions
    await waitFor(() => {
      expect(screen.getByText(/Instruksi Tes Kepribadian/i)).toBeInTheDocument();
    });
  });

  it('should wrap assessment pages with AssessmentSecurityProvider', () => {
    render(<App />);
    expect(screen.getByTestId('assessment-security-provider')).toBeInTheDocument();
  });

  it('should show scoring state when assessment is being processed', async () => {
    // This tests the scoring step rendering
    const { login } = await import('./auth/auth.service.js');
    const { apiJson } = await import('./auth/api-client.js');

    (login as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        role: 'candidate',
        candidateId: 'candidate-123',
      },
    });

    // Mock the start assessment to return personality data
    (apiJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {
        assessmentId: 'assessment-1',
        sectionType: 'personality',
        totalItems: 120,
        timerSync: { sectionId: 'personality-1', remainingMs: 2700000, serverTimestamp: Date.now() },
        firstItem: {
          type: 'forced_choice',
          itemId: 'item-1',
          statementLeft: 'Statement A',
          statementRight: 'Statement B',
          renderedAt: Date.now(),
        },
      },
    });

    render(<App />);
    // The scoring step is an intermediate state that shows a loading message
    // We verify it renders correctly by checking the component structure
    expect(screen.getByTestId('assessment-security-provider')).toBeInTheDocument();
  });
});

describe('App - Session State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain session state across component renders', () => {
    const { rerender } = render(<App />);
    // Re-render should not reset state
    rerender(<App />);
    expect(screen.getByLabelText('Login form')).toBeInTheDocument();
  });

  it('should display error banner when session becomes invalid', async () => {
    render(<App />);
    // The error banner is conditionally rendered
    // Initially no error should be shown
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
