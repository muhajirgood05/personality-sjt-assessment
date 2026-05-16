import { useState } from 'react';

interface PracticeScenario {
  id: string;
  scenarioText: string;
  options: { id: string; text: string; expertRank: number }[];
  feedbackExplanation: string;
}

interface PracticeScenarioResponse {
  scenarioId: string;
  ranking: Record<string, number>;
  elaboration: string;
  submitted: boolean;
  feedbackShown: boolean;
}

const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: 'practice-sjt-1',
    scenarioText:
      'Anda menemukan bahwa rekan kerja Anda secara rutin menggunakan fasilitas kantor untuk kepentingan pribadi, termasuk mencetak dokumen pribadi dalam jumlah besar dan menggunakan kendaraan dinas untuk urusan keluarga. Hal ini sudah berlangsung selama beberapa bulan dan beberapa rekan lain juga mengetahuinya.',
    options: [
      { id: 'a', text: 'Melaporkan langsung kepada atasan dengan bukti yang jelas', expertRank: 1 },
      { id: 'b', text: 'Berbicara secara pribadi dengan rekan tersebut dan mengingatkan tentang aturan', expertRank: 2 },
      { id: 'c', text: 'Mengabaikan situasi karena bukan urusan Anda', expertRank: 4 },
      { id: 'd', text: 'Mendiskusikan masalah ini dengan rekan kerja lain untuk mencari solusi bersama', expertRank: 3 },
    ],
    feedbackExplanation:
      'Urutan yang paling tepat berdasarkan nilai Integritas adalah: (1) Melaporkan kepada atasan, (2) Mengingatkan rekan secara pribadi, (3) Diskusi dengan rekan lain, (4) Mengabaikan. Melaporkan pelanggaran menunjukkan integritas tertinggi, sementara mengabaikan menunjukkan kurangnya tanggung jawab.',
  },
  {
    id: 'practice-sjt-2',
    scenarioText:
      'Anda ditugaskan memimpin proyek lintas divisi dengan tenggat waktu yang ketat. Di tengah proyek, salah satu anggota tim dari divisi lain mengalami kesulitan menyelesaikan bagiannya karena beban kerja yang tinggi di divisinya sendiri. Hal ini berpotensi menghambat penyelesaian proyek secara keseluruhan.',
    options: [
      { id: 'a', text: 'Membantu anggota tim tersebut menyelesaikan tugasnya sambil tetap mengerjakan bagian Anda', expertRank: 2 },
      { id: 'b', text: 'Berkomunikasi dengan atasan anggota tim tersebut untuk meminta keringanan beban kerja sementara', expertRank: 1 },
      { id: 'c', text: 'Mendistribusikan ulang tugas kepada anggota tim lain yang memiliki kapasitas', expertRank: 3 },
      { id: 'd', text: 'Meminta perpanjangan tenggat waktu proyek kepada manajemen', expertRank: 4 },
    ],
    feedbackExplanation:
      'Urutan yang paling tepat berdasarkan nilai Sinergi adalah: (1) Berkomunikasi dengan atasan untuk solusi struktural, (2) Membantu langsung, (3) Redistribusi tugas, (4) Meminta perpanjangan. Koordinasi antar divisi menunjukkan sinergi tertinggi karena menyelesaikan akar masalah.',
  },
  {
    id: 'practice-sjt-3',
    scenarioText:
      'Seorang wajib pajak datang ke kantor Anda dengan keluhan bahwa proses pengembalian pajaknya sudah tertunda selama 3 bulan. Wajib pajak tersebut terlihat sangat frustrasi dan mulai meninggikan suaranya. Beberapa pengunjung lain mulai memperhatikan situasi ini.',
    options: [
      { id: 'a', text: 'Meminta wajib pajak untuk tenang dan menjelaskan bahwa Anda akan membantu menyelesaikan masalahnya', expertRank: 1 },
      { id: 'b', text: 'Memanggil petugas keamanan karena wajib pajak mulai mengganggu ketertiban', expertRank: 4 },
      { id: 'c', text: 'Mengajak wajib pajak ke ruangan terpisah untuk membahas masalahnya secara privat', expertRank: 2 },
      { id: 'd', text: 'Mengarahkan wajib pajak ke bagian pengaduan untuk ditangani oleh petugas yang berwenang', expertRank: 3 },
    ],
    feedbackExplanation:
      'Urutan yang paling tepat berdasarkan nilai Pelayanan adalah: (1) Menenangkan dan menawarkan bantuan langsung, (2) Mengajak ke ruangan privat, (3) Mengarahkan ke bagian pengaduan, (4) Memanggil keamanan. Respons empatik dan proaktif menunjukkan orientasi pelayanan tertinggi.',
  },
];

const MIN_ELABORATION_LENGTH = 50;
const MAX_ELABORATION_LENGTH = 500;

export interface SJTInstructionsPageProps {
  onContinue: () => void;
}

export function SJTInstructionsPage({ onContinue }: SJTInstructionsPageProps) {
  const [practiceResponses, setPracticeResponses] = useState<PracticeScenarioResponse[]>(
    PRACTICE_SCENARIOS.map((scenario) => ({
      scenarioId: scenario.id,
      ranking: {},
      elaboration: '',
      submitted: false,
      feedbackShown: false,
    })),
  );

  const completedCount = practiceResponses.filter((r) => r.feedbackShown).length;
  const canProceed = completedCount >= 2;
  const currentScenarioIndex = practiceResponses.findIndex((r) => !r.feedbackShown);

  function handleRankChange(scenarioIndex: number, optionId: string, rank: number) {
    setPracticeResponses((prev) =>
      prev.map((r, i) => {
        if (i !== scenarioIndex) return r;
        const newRanking = { ...r.ranking };

        // Remove the rank from any other option that has it
        for (const key of Object.keys(newRanking)) {
          if (newRanking[key] === rank) {
            delete newRanking[key];
          }
        }

        // Assign the rank to the selected option
        newRanking[optionId] = rank;

        return { ...r, ranking: newRanking };
      }),
    );
  }

  function handleElaborationChange(scenarioIndex: number, text: string) {
    setPracticeResponses((prev) =>
      prev.map((r, i) => (i === scenarioIndex ? { ...r, elaboration: text } : r)),
    );
  }

  function isRankingComplete(scenarioIndex: number): boolean {
    const response = practiceResponses[scenarioIndex]!;
    const scenario = PRACTICE_SCENARIOS[scenarioIndex]!;
    const rankedOptions = Object.keys(response.ranking).length;
    return rankedOptions === scenario.options.length;
  }

  function isElaborationValid(scenarioIndex: number): boolean {
    const response = practiceResponses[scenarioIndex]!;
    return (
      response.elaboration.length >= MIN_ELABORATION_LENGTH &&
      response.elaboration.length <= MAX_ELABORATION_LENGTH
    );
  }

  function canSubmitScenario(scenarioIndex: number): boolean {
    return isRankingComplete(scenarioIndex) && isElaborationValid(scenarioIndex);
  }

  function getValidationErrors(scenarioIndex: number): string[] {
    const errors: string[] = [];
    if (!isRankingComplete(scenarioIndex)) {
      errors.push('Anda harus memberikan peringkat untuk semua pilihan respons.');
    }
    const response = practiceResponses[scenarioIndex]!;
    if (response.elaboration.length < MIN_ELABORATION_LENGTH) {
      errors.push(`Penjelasan harus minimal ${MIN_ELABORATION_LENGTH} karakter (saat ini: ${response.elaboration.length}).`);
    }
    if (response.elaboration.length > MAX_ELABORATION_LENGTH) {
      errors.push(`Penjelasan maksimal ${MAX_ELABORATION_LENGTH} karakter (saat ini: ${response.elaboration.length}).`);
    }
    return errors;
  }

  function handleSubmitScenario(scenarioIndex: number) {
    if (!canSubmitScenario(scenarioIndex)) return;
    setPracticeResponses((prev) =>
      prev.map((r, i) =>
        i === scenarioIndex ? { ...r, submitted: true, feedbackShown: true } : r,
      ),
    );
  }

  function getRankingFeedback(scenarioIndex: number): string {
    const response = practiceResponses[scenarioIndex]!;
    const scenario = PRACTICE_SCENARIOS[scenarioIndex]!;

    let correctCount = 0;
    for (const option of scenario.options) {
      if (response.ranking[option.id] === option.expertRank) {
        correctCount++;
      }
    }

    if (correctCount === scenario.options.length) {
      return 'Sempurna! Urutan Anda sesuai dengan urutan yang direkomendasikan oleh para ahli.';
    } else if (correctCount >= scenario.options.length / 2) {
      return `Cukup baik! ${correctCount} dari ${scenario.options.length} posisi sesuai dengan urutan ahli.`;
    } else {
      return `Anda menempatkan ${correctCount} dari ${scenario.options.length} posisi dengan benar. Perhatikan penjelasan di bawah untuk memahami urutan yang direkomendasikan.`;
    }
  }

  return (
    <div className="instructions-page sjt-instructions">
      <h1>Instruksi Tes Penilaian Situasional (SJT)</h1>

      <section className="instructions-section">
        <h3>Format Tes</h3>
        <p>
          Pada bagian ini, Anda akan diberikan skenario situasi kerja yang relevan
          dengan konteks operasional Kementerian Keuangan. Untuk setiap skenario,
          Anda diminta untuk:
        </p>
        <ol>
          <li>
            <strong>Mengurutkan</strong> semua pilihan respons dari yang paling efektif
            (peringkat 1) hingga paling tidak efektif (peringkat terakhir).
          </li>
          <li>
            <strong>Memberikan penjelasan</strong> singkat (50–500 karakter) mengapa
            Anda memilih respons tertentu sebagai yang paling efektif.
          </li>
        </ol>
      </section>

      <section className="instructions-section">
        <h3>Cara Menjawab</h3>
        <ul>
          <li>Baca skenario dengan seksama.</li>
          <li>Berikan peringkat 1 (paling efektif) hingga 4 (paling tidak efektif) untuk setiap pilihan.</li>
          <li>Setiap peringkat hanya boleh digunakan satu kali (tidak boleh ada peringkat yang sama).</li>
          <li>Tulis penjelasan singkat untuk pilihan yang Anda anggap paling efektif.</li>
          <li>Setelah mengirim jawaban, Anda tidak dapat mengubah jawaban untuk skenario tersebut.</li>
        </ul>
      </section>

      <section className="instructions-section">
        <h3>Nilai yang Diukur</h3>
        <p>Tes ini mengukur kesesuaian Anda dengan lima nilai inti Kementerian Keuangan:</p>
        <ul>
          <li><strong>Integritas</strong> — Kejujuran dan kepatuhan terhadap aturan</li>
          <li><strong>Profesionalisme</strong> — Kompetensi dan tanggung jawab profesional</li>
          <li><strong>Sinergi</strong> — Kerja sama dan kolaborasi</li>
          <li><strong>Pelayanan</strong> — Orientasi pada pelayanan publik</li>
          <li><strong>Kesempurnaan</strong> — Upaya perbaikan berkelanjutan</li>
        </ul>
      </section>

      <section className="instructions-section practice-section">
        <h3>Latihan</h3>
        <p>
          Silakan kerjakan latihan berikut untuk memastikan Anda memahami format tes.
          Anda harus menyelesaikan minimal <strong>2 skenario latihan</strong> sebelum
          melanjutkan ke tes sesungguhnya.
        </p>
        <p className="practice-progress">
          Latihan selesai: <strong>{completedCount}</strong> dari {PRACTICE_SCENARIOS.length}
          {canProceed && ' ✓ Anda sudah dapat melanjutkan'}
        </p>

        {PRACTICE_SCENARIOS.map((scenario, scenarioIndex) => {
          const response = practiceResponses[scenarioIndex]!;
          const isCurrentScenario = scenarioIndex === currentScenarioIndex;
          const isCompleted = response.feedbackShown;

          if (!isCurrentScenario && !isCompleted) return null;

          const validationErrors = !isCompleted ? getValidationErrors(scenarioIndex) : [];

          return (
            <div
              key={scenario.id}
              className={`practice-scenario ${isCompleted ? 'completed' : 'active'}`}
              aria-label={`Skenario latihan ${scenarioIndex + 1}`}
            >
              <h4>Skenario Latihan {scenarioIndex + 1}</h4>
              <div className="scenario-text">
                <p>{scenario.scenarioText}</p>
              </div>

              <div className="ranking-section">
                <p className="ranking-instruction">
                  Berikan peringkat untuk setiap pilihan (1 = paling efektif, {scenario.options.length} = paling tidak efektif):
                </p>
                <div className="options-list">
                  {scenario.options.map((option) => (
                    <div key={option.id} className="option-row">
                      <span className="option-text">{option.text}</span>
                      <select
                        value={response.ranking[option.id] ?? ''}
                        onChange={(e) =>
                          handleRankChange(scenarioIndex, option.id, Number(e.target.value))
                        }
                        disabled={isCompleted}
                        aria-label={`Peringkat untuk pilihan ${option.id.toUpperCase()}`}
                      >
                        <option value="">Pilih peringkat</option>
                        {scenario.options.map((_, rankIndex) => (
                          <option key={rankIndex + 1} value={rankIndex + 1}>
                            {rankIndex + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="elaboration-section">
                <label htmlFor={`elaboration-${scenario.id}`}>
                  Jelaskan mengapa Anda memilih respons tersebut sebagai yang paling efektif
                  ({MIN_ELABORATION_LENGTH}–{MAX_ELABORATION_LENGTH} karakter):
                </label>
                <textarea
                  id={`elaboration-${scenario.id}`}
                  value={response.elaboration}
                  onChange={(e) => handleElaborationChange(scenarioIndex, e.target.value)}
                  disabled={isCompleted}
                  minLength={MIN_ELABORATION_LENGTH}
                  maxLength={MAX_ELABORATION_LENGTH}
                  placeholder="Tuliskan penjelasan Anda di sini..."
                  aria-label="Penjelasan jawaban"
                />
                <span className="char-count">
                  {response.elaboration.length}/{MAX_ELABORATION_LENGTH} karakter
                </span>
              </div>

              {!isCompleted && validationErrors.length > 0 && (
                <div className="validation-errors" role="alert">
                  {validationErrors.map((error, i) => (
                    <p key={i} className="error-text">{error}</p>
                  ))}
                </div>
              )}

              {!isCompleted && (
                <button
                  className="btn-secondary"
                  onClick={() => handleSubmitScenario(scenarioIndex)}
                  disabled={!canSubmitScenario(scenarioIndex)}
                  aria-label="Kirim jawaban skenario"
                >
                  Kirim Jawaban
                </button>
              )}

              {isCompleted && (
                <div className="practice-feedback" role="alert">
                  <p className="feedback-ranking">{getRankingFeedback(scenarioIndex)}</p>
                  <div className="expert-ranking">
                    <p><strong>Urutan yang direkomendasikan:</strong></p>
                    <ol>
                      {[...scenario.options]
                        .sort((a, b) => a.expertRank - b.expertRank)
                        .map((option) => (
                          <li key={option.id}>{option.text}</li>
                        ))}
                    </ol>
                  </div>
                  <p className="feedback-explanation">{scenario.feedbackExplanation}</p>
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
        aria-label="Mulai tes SJT"
      >
        {canProceed ? 'Mulai Tes Penilaian Situasional' : `Selesaikan minimal 2 latihan (${completedCount}/2)`}
      </button>
    </div>
  );
}
