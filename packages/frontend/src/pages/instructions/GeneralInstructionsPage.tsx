import { useState } from 'react';

export interface GeneralInstructionsPageProps {
  onContinue: () => void;
}

export function GeneralInstructionsPage({ onContinue }: GeneralInstructionsPageProps) {
  const [hasRead, setHasRead] = useState(false);

  return (
    <div className="instructions-page general-instructions">
      <h1>Selamat Datang di Platform Asesmen MINTS</h1>
      <h2>Kementerian Keuangan Republik Indonesia</h2>

      <section className="instructions-section">
        <h3>Tujuan Asesmen</h3>
        <p>
          Asesmen ini bertujuan untuk mengukur kesesuaian kepribadian dan kemampuan
          penilaian situasional Anda dengan nilai-nilai inti Kementerian Keuangan
          dalam rangka seleksi beasiswa MINTS.
        </p>
      </section>

      <section className="instructions-section">
        <h3>Durasi Total</h3>
        <p>
          Asesmen ini terdiri dari dua bagian dengan total waktu <strong>105 menit</strong>:
        </p>
        <ul>
          <li>
            <strong>Tes Kepribadian:</strong> 45 menit
          </li>
          <li>
            <strong>Tes Penilaian Situasional (SJT):</strong> 60 menit
          </li>
        </ul>
      </section>

      <section className="instructions-section">
        <h3>Gambaran Umum Bagian Asesmen</h3>
        <ol>
          <li>
            <strong>Tes Kepribadian (Forced-Choice)</strong>
            <p>
              Anda akan diberikan pasangan pernyataan dan diminta memilih pernyataan
              mana yang lebih menggambarkan diri Anda menggunakan skala 5 poin.
              Bagian ini mengukur lima dimensi kepribadian utama (OCEAN).
            </p>
          </li>
          <li>
            <strong>Tes Penilaian Situasional (SJT)</strong>
            <p>
              Anda akan diberikan skenario tempat kerja dan diminta mengurutkan
              pilihan respons dari yang paling efektif hingga paling tidak efektif,
              serta memberikan penjelasan singkat atas pilihan Anda.
            </p>
          </li>
        </ol>
      </section>

      <section className="instructions-section">
        <h3>Informasi Penting</h3>
        <ul>
          <li>Setiap bagian memiliki batas waktu yang akan ditampilkan di layar.</li>
          <li>Jawaban Anda akan disimpan secara otomatis setiap 30 detik.</li>
          <li>Anda tidak dapat kembali ke soal sebelumnya pada Tes Kepribadian.</li>
          <li>Pastikan koneksi internet Anda stabil selama asesmen berlangsung.</li>
          <li>Sebelum memulai setiap bagian, Anda akan mengerjakan latihan terlebih dahulu.</li>
        </ul>
      </section>

      <div className="instructions-acknowledgment">
        <label>
          <input
            type="checkbox"
            checked={hasRead}
            onChange={(e) => setHasRead(e.target.checked)}
            aria-label="Saya telah membaca dan memahami instruksi"
          />
          <span>Saya telah membaca dan memahami instruksi di atas</span>
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={onContinue}
        disabled={!hasRead}
        aria-label="Lanjutkan ke bagian berikutnya"
      >
        Lanjutkan
      </button>
    </div>
  );
}
