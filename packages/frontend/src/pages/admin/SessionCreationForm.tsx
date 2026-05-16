/**
 * Session creation form with validation.
 * Allows configuration of start date, end date, candidate list, and timer durations.
 *
 * Validates: Requirements 12.2, 12.7
 */

import { useState, type FormEvent } from 'react';
import type { CreateSessionRequest } from '@assessment/shared';
import { createSession } from '../../services/admin-api.js';

export interface SessionCreationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  candidateIds?: string;
  personalityTimerSeconds?: string;
  sjtTimerSeconds?: string;
}

const MIN_TIMER_SECONDS = 60;
const MAX_TIMER_SECONDS = 7200;
const MAX_CANDIDATES = 500;

export function SessionCreationForm({ onSuccess, onCancel }: SessionCreationFormProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [candidateIdsText, setCandidateIdsText] = useState('');
  const [personalityTimerSeconds, setPersonalityTimerSeconds] = useState(2700); // 45 min default
  const [sjtTimerSeconds, setSjtTimerSeconds] = useState(3600); // 60 min default
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

    const candidateIds = parseCandidateIds(candidateIdsText);
    if (candidateIds.length === 0) {
      formErrors.candidateIds = 'Daftar kandidat tidak boleh kosong';
    } else if (candidateIds.length > MAX_CANDIDATES) {
      formErrors.candidateIds = `Maksimal ${MAX_CANDIDATES} kandidat`;
    }

    if (personalityTimerSeconds < MIN_TIMER_SECONDS || personalityTimerSeconds > MAX_TIMER_SECONDS) {
      formErrors.personalityTimerSeconds = `Durasi harus antara ${MIN_TIMER_SECONDS} dan ${MAX_TIMER_SECONDS} detik`;
    }

    if (sjtTimerSeconds < MIN_TIMER_SECONDS || sjtTimerSeconds > MAX_TIMER_SECONDS) {
      formErrors.sjtTimerSeconds = `Durasi harus antara ${MIN_TIMER_SECONDS} dan ${MAX_TIMER_SECONDS} detik`;
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

    const request: CreateSessionRequest = {
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      candidateIds: parseCandidateIds(candidateIdsText),
      personalityTimerSeconds,
      sjtTimerSeconds,
    };

    try {
      const result = await createSession(request);
      if (result.success) {
        onSuccess();
      } else {
        setSubmitError(result.error?.message ?? 'Gagal membuat sesi');
        // Map server-side validation errors to form fields
        if (result.error?.details) {
          const serverErrors: FormErrors = {};
          for (const [field, message] of Object.entries(result.error.details)) {
            (serverErrors as Record<string, string>)[field] = message;
          }
          setErrors(serverErrors);
        }
      }
    } catch {
      setSubmitError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimerDisplay = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} menit${secs > 0 ? ` ${secs} detik` : ''}`;
  };

  return (
    <form onSubmit={handleSubmit} className="session-form" aria-label="Form pembuatan sesi">
      {submitError && (
        <div className="error-banner" role="alert">
          {submitError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="session-name">Nama Sesi</label>
        <input
          id="session-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          placeholder="Contoh: Seleksi MINTS Batch 2024"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="field-error" role="alert">
            {errors.name}
          </span>
        )}
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
            aria-describedby={errors.startDate ? 'start-date-error' : undefined}
          />
          {errors.startDate && (
            <span id="start-date-error" className="field-error" role="alert">
              {errors.startDate}
            </span>
          )}
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
            aria-describedby={errors.endDate ? 'end-date-error' : undefined}
          />
          {errors.endDate && (
            <span id="end-date-error" className="field-error" role="alert">
              {errors.endDate}
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="candidate-ids">
          Daftar Kandidat (ID, pisahkan dengan baris baru atau koma, maks {MAX_CANDIDATES})
        </label>
        <textarea
          id="candidate-ids"
          value={candidateIdsText}
          onChange={(e) => setCandidateIdsText(e.target.value)}
          disabled={isSubmitting}
          rows={6}
          placeholder="candidate-id-1&#10;candidate-id-2&#10;candidate-id-3"
          aria-required="true"
          aria-invalid={!!errors.candidateIds}
          aria-describedby={errors.candidateIds ? 'candidates-error' : undefined}
        />
        <span className="field-hint">
          {parseCandidateIds(candidateIdsText).length} kandidat terdeteksi
        </span>
        {errors.candidateIds && (
          <span id="candidates-error" className="field-error" role="alert">
            {errors.candidateIds}
          </span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="personality-timer">
            Durasi Tes Kepribadian ({MIN_TIMER_SECONDS}–{MAX_TIMER_SECONDS} detik)
          </label>
          <input
            id="personality-timer"
            type="number"
            value={personalityTimerSeconds}
            onChange={(e) => setPersonalityTimerSeconds(parseInt(e.target.value, 10) || 0)}
            min={MIN_TIMER_SECONDS}
            max={MAX_TIMER_SECONDS}
            disabled={isSubmitting}
            aria-invalid={!!errors.personalityTimerSeconds}
            aria-describedby={errors.personalityTimerSeconds ? 'personality-timer-error' : undefined}
          />
          <span className="field-hint">{formatTimerDisplay(personalityTimerSeconds)}</span>
          {errors.personalityTimerSeconds && (
            <span id="personality-timer-error" className="field-error" role="alert">
              {errors.personalityTimerSeconds}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="sjt-timer">
            Durasi Tes SJT ({MIN_TIMER_SECONDS}–{MAX_TIMER_SECONDS} detik)
          </label>
          <input
            id="sjt-timer"
            type="number"
            value={sjtTimerSeconds}
            onChange={(e) => setSjtTimerSeconds(parseInt(e.target.value, 10) || 0)}
            min={MIN_TIMER_SECONDS}
            max={MAX_TIMER_SECONDS}
            disabled={isSubmitting}
            aria-invalid={!!errors.sjtTimerSeconds}
            aria-describedby={errors.sjtTimerSeconds ? 'sjt-timer-error' : undefined}
          />
          <span className="field-hint">{formatTimerDisplay(sjtTimerSeconds)}</span>
          {errors.sjtTimerSeconds && (
            <span id="sjt-timer-error" className="field-error" role="alert">
              {errors.sjtTimerSeconds}
            </span>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Membuat...' : 'Buat Sesi'}
        </button>
      </div>
    </form>
  );
}

export default SessionCreationForm;
