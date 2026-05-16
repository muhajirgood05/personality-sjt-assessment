/**
 * Login page component with credential input and lockout message display.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { login, type LoginErrorResponse } from '../../auth/auth.service.js';

export interface LoginPageProps {
  onLoginSuccess?: (role: 'administrator' | 'candidate') => void;
}

interface LockoutInfo {
  remainingSeconds: number;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockout, setLockout] = useState<LockoutInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for lockout duration
  useEffect(() => {
    if (!lockout || lockout.remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setLockout((prev) => {
        if (!prev || prev.remainingSeconds <= 1) {
          return null;
        }
        return { remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockout]);

  // Clear lockout message when countdown reaches zero
  useEffect(() => {
    if (lockout === null && error?.includes('locked')) {
      setError(null);
    }
  }, [lockout, error]);

  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes} menit ${secs > 0 ? `${secs} detik` : ''}`.trim();
    }
    return `${secs} detik`;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim() || !password.trim()) {
      setError('ID Pegawai dan kata sandi wajib diisi');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({ employeeId: employeeId.trim(), password });

      if (result.success) {
        onLoginSuccess?.(result.data.role);
      } else {
        const errorResponse = result as LoginErrorResponse;
        handleLoginError(errorResponse);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginError = (response: LoginErrorResponse) => {
    switch (response.error.code) {
      case 'ACCOUNT_LOCKED': {
        const remainingSeconds = parseInt(
          response.error.details?.remainingSeconds ?? '0',
          10
        );
        setLockout({ remainingSeconds });
        setError('Akun Anda terkunci karena terlalu banyak percobaan login yang gagal.');
        break;
      }
      case 'INVALID_CREDENTIALS':
        setError('ID Pegawai atau kata sandi salah');
        break;
      case 'VALIDATION_ERROR':
        setError('ID Pegawai dan kata sandi wajib diisi');
        break;
      default:
        setError('Terjadi kesalahan. Silakan coba lagi.');
    }
  };

  const isLocked = lockout !== null && lockout.remainingSeconds > 0;

  return (
    <div className="login-page">
      <div className="login-container">
        <header className="login-header">
          <h1>Assessment Platform</h1>
          <p>MINTS Scholarship Selection - Kementerian Keuangan</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" aria-label="Login form">
          <div className="form-group">
            <label htmlFor="employeeId">ID Pegawai</label>
            <input
              id="employeeId"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isSubmitting || isLocked}
              autoComplete="username"
              aria-required="true"
              placeholder="Masukkan ID Pegawai"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Kata Sandi</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isLocked}
              autoComplete="current-password"
              aria-required="true"
              placeholder="Masukkan kata sandi"
            />
          </div>

          {error && (
            <div className="error-message" role="alert" aria-live="assertive">
              <p>{error}</p>
              {isLocked && (
                <p className="lockout-duration" data-testid="lockout-duration">
                  Silakan coba lagi dalam {formatDuration(lockout.remainingSeconds)}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className="login-button"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
