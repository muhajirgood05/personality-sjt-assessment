import { useState } from 'react';

interface PracticeItem {
  id: string;
  statementLeft: string;
  statementRight: string;
  correctFeedback: string;
}

interface PracticeResponse {
  itemId: string;
  value: number | null;
  submitted: boolean;
  feedbackShown: boolean;
}

const PRACTICE_ITEMS: PracticeItem[] = [
  {
    id: 'practice-personality-1',
    statementLeft: 'Saya senang mencoba hal-hal baru dan berbeda',
    statementRight: 'Saya lebih suka mengikuti rutinitas yang sudah terbukti berhasil',
    correctFeedback:
      'Bagus! Tidak ada jawaban benar atau salah. Pilihan Anda menunjukkan preferensi Anda antara keterbukaan terhadap pengalaman baru dan keteraturan. Pastikan Anda memilih jawaban yang paling menggambarkan diri Anda.',
  },
  {
    id: 'practice-personality-2',
    statementLeft: 'Saya merasa nyaman bekerja dalam tim besar',
    statementRight: 'Saya lebih produktif bekerja secara mandiri',
    correctFeedback:
      'Bagus! Jawaban ini mencerminkan preferensi Anda dalam berinteraksi dengan orang lain. Ingat, tidak ada jawaban yang lebih baik dari yang lain — jawablah sesuai dengan kepribadian Anda yang sebenarnya.',
  },
  {
    id: 'practice-personality-3',
    statementLeft: 'Saya cenderung merencanakan segala sesuatu dengan detail',
    statementRight: 'Saya lebih suka bersikap fleksibel dan spontan',
    correctFeedback:
      'Bagus! Pilihan ini menggambarkan tingkat keteraturan dan perencanaan Anda. Jawablah dengan jujur sesuai perilaku Anda sehari-hari.',
  },
];

const SCALE_LABELS = [
  'Sangat menggambarkan saya (kiri)',
  'Agak menggambarkan saya (kiri)',
  'Netral',
  'Agak menggambarkan saya (kanan)',
  'Sangat menggambarkan saya (kanan)',
];

export interface PersonalityInstructionsPageProps {
  onContinue: () => void;
}

export function PersonalityInstructionsPage({ onContinue }: PersonalityInstructionsPageProps) {
  const [practiceResponses, setPracticeResponses] = useState<PracticeResponse[]>(
    PRACTICE_ITEMS.map((item) => ({
      itemId: item.id,
      value: null,
      submitted: false,
      feedbackShown: false,
    })),
  );

  const completedCount = practiceResponses.filter((r) => r.feedbackShown).length;
  const canProceed = completedCount >= 2;
  const currentItemIndex = practiceResponses.findIndex((r) => !r.feedbackShown);

  function handleScaleSelect(itemIndex: number, value: number) {
    setPracticeResponses((prev) =>
      prev.map((r, i) => (i === itemIndex ? { ...r, value } : r)),
    );
  }

  function handleSubmitPractice(itemIndex: number) {
    setPracticeResponses((prev) =>
      prev.map((r, i) =>
        i === itemIndex ? { ...r, submitted: true, feedbackShown: true } : r,
      ),
    );
  }

  return (
    <div className="instructions-page personality-instructions">
      <h1>Instruksi Tes Kepribadian</h1>

      <section className="instructions-section">
        <h3>Format Tes</h3>
        <p>
          Pada bagian ini, Anda akan diberikan pasangan pernyataan. Tugas Anda adalah
          menentukan pernyataan mana yang <strong>lebih menggambarkan</strong> diri Anda
          menggunakan skala 5 poin.
        </p>
      </section>

      <section className="instructions-section">
        <h3>Cara Menjawab</h3>
        <ul>
          <li>Baca kedua pernyataan dengan seksama.</li>
          <li>
            Pilih salah satu posisi pada skala yang menunjukkan seberapa kuat pernyataan
            tersebut menggambarkan diri Anda.
          </li>
          <li>Tidak ada jawaban benar atau salah — jawablah sesuai kepribadian Anda.</li>
          <li>Anda tidak dapat kembali ke soal sebelumnya setelah menjawab.</li>
          <li>Jika tidak menjawab dalam 120 detik, akan muncul pengingat.</li>
        </ul>
      </section>

      <section className="instructions-section">
        <h3>Skala Penilaian</h3>
        <div className="scale-explanation">
          <div className="scale-item">1 — Sangat menggambarkan saya (pernyataan kiri)</div>
          <div className="scale-item">2 — Agak menggambarkan saya (pernyataan kiri)</div>
          <div className="scale-item">3 — Netral / kedua pernyataan sama-sama menggambarkan saya</div>
          <div className="scale-item">4 — Agak menggambarkan saya (pernyataan kanan)</div>
          <div className="scale-item">5 — Sangat menggambarkan saya (pernyataan kanan)</div>
        </div>
      </section>

      <section className="instructions-section practice-section">
        <h3>Latihan</h3>
        <p>
          Silakan kerjakan latihan berikut untuk memastikan Anda memahami format tes.
          Anda harus menyelesaikan minimal <strong>2 soal latihan</strong> sebelum
          melanjutkan ke tes sesungguhnya.
        </p>
        <p className="practice-progress">
          Latihan selesai: <strong>{completedCount}</strong> dari {PRACTICE_ITEMS.length}
          {canProceed && ' ✓ Anda sudah dapat melanjutkan'}
        </p>

        {PRACTICE_ITEMS.map((item, index) => {
          const response = practiceResponses[index]!;
          const isCurrentItem = index === currentItemIndex;
          const isCompleted = response.feedbackShown;

          if (!isCurrentItem && !isCompleted) return null;

          return (
            <div
              key={item.id}
              className={`practice-item ${isCompleted ? 'completed' : 'active'}`}
              aria-label={`Soal latihan ${index + 1}`}
            >
              <h4>Soal Latihan {index + 1}</h4>
              <div className="forced-choice-pair">
                <div className="statement statement-left">
                  <p>{item.statementLeft}</p>
                </div>
                <div className="scale-selector">
                  {SCALE_LABELS.map((label, scaleIndex) => (
                    <label key={scaleIndex} className="scale-option">
                      <input
                        type="radio"
                        name={`practice-${item.id}`}
                        value={scaleIndex + 1}
                        checked={response.value === scaleIndex + 1}
                        onChange={() => handleScaleSelect(index, scaleIndex + 1)}
                        disabled={isCompleted}
                        aria-label={label}
                      />
                      <span className="scale-label">{scaleIndex + 1}</span>
                    </label>
                  ))}
                </div>
                <div className="statement statement-right">
                  <p>{item.statementRight}</p>
                </div>
              </div>

              {!isCompleted && (
                <button
                  className="btn-secondary"
                  onClick={() => handleSubmitPractice(index)}
                  disabled={response.value === null}
                  aria-label="Kirim jawaban latihan"
                >
                  Kirim Jawaban
                </button>
              )}

              {isCompleted && (
                <div className="practice-feedback" role="alert">
                  <p className="feedback-text">{item.correctFeedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <button
        className="btn-primary"
        onClick={onContinue}
        disabled={!canProceed}
        aria-label="Mulai tes kepribadian"
      >
        {canProceed ? 'Mulai Tes Kepribadian' : `Selesaikan minimal 2 latihan (${completedCount}/2)`}
      </button>
    </div>
  );
}
