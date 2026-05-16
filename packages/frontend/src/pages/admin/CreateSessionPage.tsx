/**
 * Create Session page.
 * Allows administrators to create a new assessment session with validation.
 *
 * Validates: Requirements 12.2, 12.7
 */

import { useState, type FormEvent } from 'react';
import { createSession } from '../../services/admin-api.js';

export interface CreateSessionPageProps {
  onSessionCreated?: (sessionId: string) => void;
  onCancel?: () => void;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  candidateIds?: string;
  personalityTimerSeconds?: string;
  sjtTimerSeconds?: string;
}

export function CreateSessionPage({ onSessionCreated, onCancel }: CreateSessionPageProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [candidateIdsText, setCandidateIdsText] = useState('');
  const [personalityTimer, setPersonalityTimer] = useState(2700); // 45 min default
  const [sjtTimer, setSjtTimer] = useState(3600); // 60 min default
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): FormErrors => {
    const formErrors: FormErrors = {};

    if (!name.trim()) {
      formErrors.name = 'Nama sesi wajib diisi';
    }

    if (!startDate) {
      formErrors.startDate = 'Tanggal mulai wajib diisi';
    }

    if (!endDate) {
      formErrors.endDate = 'Tanggal selesai wajib diisi';
    }

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      formErrors.endDate = 'Tanggal selesai harus setelah tanggal mulai';
    }

    const ids = parseCandidateIds(candidateIdsText);
    if (ids.length === 0) {
      formErrors.candidateIds = 'Daftar kandidat tidak boleh kosong';
    } else if (ids.length > 500) {
      formErrors.candidateIds = 'Maksimal 500 kandidat per sesi';
    }

    if (personalityTimer < 60 || personalityTimer > 7200) {
      formErrors.personalityTimerSeconds = 'Timer harus antara 60 dan 7200 detik';
    }

    if (sjtTimer < 60 || sjtTimer > 7200) {
      formErrors.sjtTimerSeconds = 'Timer harus antara 60 dan 7200 detik';
    }

    return formErrors;
  };

  const parseCandidateIds = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const formErrors = validateForm();
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const candidateIds = parseCandidateIds(candidateIdsText);
      const response = await createSession({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        candidateIds,
        personalityTimerSeconds: personalityTimer,
        sjtTimerSeconds: sjtTimer,
      });

      if (response.success && response.data) {
        onSessionCreated?.(response.data.sessionId);
      } else {
        setSubmitError(response.error?.message ?? 'Gagal membuat sesi');
      }
    } catch {
      setSubmitError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-session-page" data-testid="create-session-page">
      <header className="create-session-page__header">
        <h1>Buat Sesi Asesmen Baru</h1>
      </header>

      <form onSubmit={handleSubmit} className="create-session-form" aria-label="Create session form">
        <div className="form-group">
          <label htmlFor="session-name">Nama Sesi</label>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            placeholder="Contoh: MINTS Batch 2024-A"
            aria-required="true"
            aria-invalid={!!errors.name}
          />
          {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start-date">Tanggal Mulai</label>
            <input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errors.startDate}
            />
            {errors.startDate && <span className="form-error" role="alert">{errors.startDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="end-date">Tanggal Selesai</label>
            <input
              id="end-date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSubmitting}
              aria-required="true"
              aria-invalid={!!errors.endDate}
            />
            {errors.endDate && <span className="form-error" role="alert">{errors.endDate}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="candidate-ids">
            Daftar ID Kandidat (pisahkan dengan baris baru, koma, atau titik koma)
          </label>
          <textarea
            id="candidate-ids"
            value={candidateIdsText}
            onChange={(e) => setCandidateIdsText(e.target.value)}
            disabled={isSubmitting}
            rows={6}
            placeholder="ID-001&#10;ID-002&#10;ID-003"
            aria-required="true"
            aria-invalid={!!errors.candidateIds}
          />
          <span className="form-hint">
            {parseCandidateIds(candidateIdsText).length} kandidat terdeteksi
          </span>
          {errors.candidateIds && (
            <span className="form-error" role="alert">{errors.candidateIds}</span>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="personality-timer">Timer Personality Test (detik)</label>
            <input
              id="personality-timer"
              type="number"
              value={personalityTimer}
              onChange={(e) => setPersonalityTimer(parseInt(e.target.value, 10) || 0)}
              disabled={isSubmitting}
              min={60}
              max={7200}
              aria-invalid={!!errors.personalityTimerSeconds}
            />
            <span className="form-hint">
              {Math.floor(personalityTimer / 60)} menit {personalityTimer % 60} detik
            </span>
            {errors.personalityTimerSeconds && (
              <span className="form-error" role="alert">{errors.personalityTimerSeconds}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="sjt-timer">Timer SJT (detik)</label>
            <input
              id="sjt-timer"
              type="number"
              value={sjtTimer}
              onChange={(e) => setSjtTimer(parseInt(e.target.value, 10) || 0)}
              disabled={isSubmitting}
              min={60}
              max={7200}
              aria-invalid={!!errors.sjtTimerSeconds}
            />
            <span className="form-hint">
              {Math.floor(sjtTimer / 60)} menit {sjtTimer % 60} detik
            </span>
            {errors.sjtTimerSeconds && (
              <span className="form-error" role="alert">{errors.sjtTimerSeconds}</span>
            )}
          </div>
        </div>

        {submitError && (
          <div className="form-submit-error" role="alert" aria-live="assertive">
            <p>{submitError}</p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            data-testid="submit-session-btn"
          >
            {isSubmitting ? 'Membuat...' : 'Buat Sesi'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateSessionPage;
