/**
 * Tests for LoginPage component.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the login form with employee ID and password fields', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('ID Pegawai')).toBeInTheDocument();
    expect(screen.getByLabelText('Kata Sandi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('should render the header with platform name', () => {
    render(<LoginPage />);

    expect(screen.getByText('Assessment Platform')).toBeInTheDocument();
    expect(
      screen.getByText('MINTS Scholarship Selection - Kementerian Keuangan')
    ).toBeInTheDocument();
  });

  it('should show validation error when fields are empty', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(
      screen.getByText('ID Pegawai dan kata sandi wajib diisi')
    ).toBeInTheDocument();
  });

  it('should call login API with credentials on submit', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresIn: 3600,
          role: 'candidate',
          candidateId: 'user-id-789',
        },
      }),
    });

    const onLoginSuccess = vi.fn();
    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: 'EMP001', password: 'password123' }),
      });
    });

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith('candidate');
    });
  });

  it('should display error message on invalid credentials', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid employee ID or password',
        },
      }),
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(
        screen.getByText('ID Pegawai atau kata sandi salah')
      ).toBeInTheDocument();
    });
  });

  it('should display lockout message with remaining duration', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked after 3 failed attempts.',
          details: {
            lockedUntil: String(Date.now() + 900000),
            remainingSeconds: '900',
          },
        },
      }),
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Akun Anda terkunci karena terlalu banyak percobaan login yang gagal.'
        )
      ).toBeInTheDocument();
    });

    // Check lockout duration is displayed
    const lockoutDuration = screen.getByTestId('lockout-duration');
    expect(lockoutDuration).toBeInTheDocument();
    expect(lockoutDuration.textContent).toContain('15 menit');
  });

  it('should disable form inputs and button during lockout', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account locked.',
          details: {
            lockedUntil: String(Date.now() + 60000),
            remainingSeconds: '60',
          },
        },
      }),
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(screen.getByLabelText('ID Pegawai')).toBeDisabled();
      expect(screen.getByLabelText('Kata Sandi')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Masuk' })).toBeDisabled();
    });
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();
    // Never resolve to keep the loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<LoginPage />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Memproses...' })).toBeDisabled();
    });
  });

  it('should display network error message on fetch failure', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText('ID Pegawai'), 'EMP001');
    await user.type(screen.getByLabelText('Kata Sandi'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(
        screen.getByText('Terjadi kesalahan jaringan. Silakan coba lagi.')
      ).toBeInTheDocument();
    });
  });

  it('should have accessible form with aria attributes', () => {
    render(<LoginPage />);

    const form = screen.getByRole('form', { name: 'Login form' });
    expect(form).toBeInTheDocument();

    const employeeIdInput = screen.getByLabelText('ID Pegawai');
    expect(employeeIdInput).toHaveAttribute('aria-required', 'true');

    const passwordInput = screen.getByLabelText('Kata Sandi');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
  });
});
