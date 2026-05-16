/**
 * Vercel Serverless Function — Backend API entry point.
 * Handles all /api/* routes using the Fastify backend in mock mode.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory stores (persist across warm invocations)
const store = new Map<string, { value: string; expiresAt?: number }>();

// Simple bcrypt-like comparison for demo (pre-hashed passwords)
const USERS = [
  { id: 'candidate-001', employeeId: 'TEST001', role: 'candidate', password: 'password123', name: 'Test Candidate' },
  { id: 'admin-001', employeeId: 'ADMIN001', role: 'administrator', password: 'admin123', name: 'Admin User' },
];

// Simple JWT-like token generation (for demo — NOT production secure)
function generateToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }));
  const sig = btoa('demo-signature');
  return `${header}.${body}.${sig}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url?.replace('/api', '') || '/';
  const method = req.method || 'GET';
  const body = req.body;

  try {
    // Health
    if (path === '/health' || path === '/') {
      return res.json({ status: 'ok', mode: 'serverless-mock', timestamp: new Date().toISOString() });
    }

    // Login
    if (path === '/auth/login' && method === 'POST') {
      const { employeeId, password } = body || {};
      const user = USERS.find(u => u.employeeId === employeeId && u.password === password);
      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'NIP atau password salah' } });
      }
      const accessToken = generateToken({ sub: user.id, role: user.role, employeeId: user.employeeId });
      const refreshToken = generateToken({ sub: user.id, role: user.role, employeeId: user.employeeId, type: 'refresh' });
      return res.json({
        success: true,
        data: { accessToken, refreshToken, expiresIn: 3600, role: user.role, ...(user.role === 'candidate' ? { candidateId: user.id } : { adminId: user.id }) },
      });
    }

    // Assessment start
    if (path === '/assessment/start' && method === 'POST') {
      const { sectionType } = body || {};
      const now = Date.now();

      if (sectionType === 'personality') {
        const assessmentId = `p_${now}`;
        const items = generatePersonalityItems();
        store.set(`session:${assessmentId}`, { value: JSON.stringify({ currentIndex: 0, totalItems: items.length, sectionType: 'personality' }) });
        store.set(`items:${assessmentId}`, { value: JSON.stringify(items) });

        return res.json({
          success: true,
          data: {
            assessmentId,
            sectionType: 'personality',
            totalItems: items.length,
            timerSync: { sectionId: assessmentId, remainingMs: 45 * 60 * 1000, serverTimestamp: now },
            firstItem: items[0],
          },
        });
      }

      if (sectionType === 'sjt') {
        const assessmentId = `s_${now}`;
        return res.json({
          success: true,
          data: {
            assessmentId,
            sectionType: 'sjt',
            totalItems: 30,
            timerSync: { sectionId: assessmentId, remainingMs: 60 * 60 * 1000, serverTimestamp: now },
            firstItem: { type: 'sjt_scenario', itemId: 'sjt-1', scenarioText: 'Anda menemukan rekan kerja senior melakukan kesalahan pencatatan...', options: [{ id: 'a', text: 'Melaporkan melalui mekanisme resmi' }, { id: 'b', text: 'Menemui rekan secara pribadi' }, { id: 'c', text: 'Berkonsultasi dengan atasan' }, { id: 'd', text: 'Mengumpulkan lebih banyak bukti' }], renderedAt: now },
          },
        });
      }

      return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'sectionType required' } });
    }

    // Assessment respond
    if (path === '/assessment/respond' && method === 'POST') {
      const { assessmentId } = body || {};
      const sessionStr = store.get(`session:${assessmentId}`)?.value;
      const itemsStr = store.get(`items:${assessmentId}`)?.value;

      if (!sessionStr) {
        return res.json({ success: true, data: { saved: true, nextItem: null, timerSync: { sectionId: assessmentId, remainingMs: 40 * 60 * 1000, serverTimestamp: Date.now() }, sectionComplete: true } });
      }

      const session = JSON.parse(sessionStr);
      const items = itemsStr ? JSON.parse(itemsStr) : [];
      session.currentIndex += 1;
      const sectionComplete = session.currentIndex >= session.totalItems;
      const nextItem = sectionComplete ? null : items[session.currentIndex] || null;
      store.set(`session:${assessmentId}`, { value: JSON.stringify(session) });

      return res.json({
        success: true,
        data: { saved: true, nextItem, timerSync: { sectionId: assessmentId, remainingMs: 40 * 60 * 1000, serverTimestamp: Date.now() }, sectionComplete },
      });
    }

    // Heartbeat
    if (path === '/assessment/heartbeat' && method === 'POST') {
      return res.json({ success: true, data: { timerSync: { sectionId: body?.assessmentId || '', remainingMs: 40 * 60 * 1000, serverTimestamp: Date.now() }, sessionValid: true } });
    }

    // Scoring
    if (path === '/scoring/calculate' && method === 'POST') {
      return res.json({ success: true, data: { status: 'completed' } });
    }

    // Reports
    if (path.startsWith('/reports/')) {
      return res.json({ success: true, data: getMockReport() });
    }

    // SJT scenarios
    if (path === '/assessment/sjt/scenarios') {
      return res.json({ success: true, data: { scenarios: generateSjtScenarios().slice(0, 5) } });
    }

    // Auto-save
    if (path === '/assessment/auto-save' && method === 'POST') {
      return res.json({ success: true, data: { savedCount: 0, timerSync: { sectionId: '', remainingMs: 40 * 60 * 1000, serverTimestamp: Date.now() } } });
    }

    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${method} ${path} not found` } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
  }
}

function generatePersonalityItems() {
  const pairs: [string, string][] = [
    ['Saya senang mencoba hal-hal baru yang belum pernah saya coba', 'Saya lebih nyaman dengan rutinitas yang sudah terbukti'],
    ['Saya selalu menepati janji yang sudah saya buat', 'Terkadang saya mengabaikan kewajiban jika ada hal yang lebih menarik'],
    ['Saya mudah menjalin hubungan baik dengan orang baru', 'Saya butuh waktu lama untuk merasa nyaman dengan orang baru'],
    ['Saya percaya kebanyakan orang pada dasarnya baik', 'Saya selalu waspada terhadap motif tersembunyi orang lain'],
    ['Saya jarang merasa cemas tentang hal-hal yang mungkin terjadi', 'Saya sering merasa khawatir tentang kemungkinan buruk'],
    ['Saya menikmati diskusi mendalam tentang ide-ide abstrak', 'Saya lebih tertarik pada masalah praktis daripada teori'],
    ['Saya menetapkan standar tinggi untuk diri sendiri', 'Saya puas dengan hasil yang cukup baik tanpa perlu sempurna'],
    ['Saya tidak ragu menyampaikan pendapat dalam rapat', 'Saya lebih suka mengikuti arahan daripada memimpin'],
    ['Membantu orang lain memberikan kepuasan batin bagi saya', 'Saya fokus pada kepentingan diri sendiri terlebih dahulu'],
    ['Saya mampu tetap tenang di bawah tekanan', 'Situasi darurat membuat saya panik dan sulit berpikir jernih'],
    ['Saya sering menemukan cara baru untuk menyelesaikan masalah', 'Saya lebih memilih mengikuti prosedur yang sudah terbukti efektif'],
    ['Saya selalu merencanakan kegiatan jauh-jauh hari sebelumnya', 'Saya lebih fleksibel dan menyesuaikan rencana sesuai situasi'],
    ['Saya merasa berenergi setelah menghabiskan waktu bersama banyak orang', 'Saya membutuhkan waktu sendiri untuk mengisi ulang energi'],
    ['Saya memberikan kepercayaan kepada rekan kerja baru sejak awal', 'Saya membangun kepercayaan secara bertahap berdasarkan bukti'],
    ['Pikiran tentang kemungkinan kegagalan sering mengganggu konsentrasi saya', 'Saya mampu menyingkirkan pikiran negatif dan fokus pada tugas'],
    ['Saya gemar mempelajari topik di luar bidang keahlian saya', 'Saya lebih memilih mendalami satu bidang yang sudah dikuasai'],
    ['Saya terus bekerja pada tugas sampai benar-benar selesai', 'Saya tahu kapan harus berhenti dan melanjutkan keesokan harinya'],
    ['Saya tidak ragu mengambil peran pemimpin dalam kelompok', 'Saya lebih nyaman sebagai kontributor yang mendukung pemimpin'],
    ['Keberhasilan tim lebih penting bagi saya daripada pengakuan individual', 'Kontribusi individual yang kuat adalah fondasi keberhasilan tim'],
    ['Saya mudah merasa frustrasi ketika hal-hal tidak berjalan sesuai rencana', 'Saya menerima perubahan rencana dengan tenang'],
  ];
  return pairs.map((pair, i) => ({ type: 'forced_choice', itemId: `item-${i}`, statementLeft: pair[0], statementRight: pair[1], renderedAt: Date.now() }));
}

function generateSjtScenarios() {
  return [
    { itemId: 'sjt-1', scenarioText: 'Anda menemukan rekan kerja senior melakukan kesalahan pencatatan yang menguntungkan pihak tertentu selama 6 bulan terakhir.', options: [{ id: 'a', text: 'Mendokumentasikan temuan dan melaporkan melalui mekanisme resmi' }, { id: 'b', text: 'Menemui rekan secara pribadi untuk klarifikasi' }, { id: 'c', text: 'Berkonsultasi dengan atasan tanpa menyebut nama' }, { id: 'd', text: 'Mengumpulkan lebih banyak bukti sebelum bertindak' }] },
    { itemId: 'sjt-2', scenarioText: 'Atasan meminta Anda mempercepat proses persetujuan dokumen dengan melewati beberapa tahap verifikasi standar karena tekanan dari pihak eksternal.', options: [{ id: 'a', text: 'Menolak dengan sopan dan menjelaskan pentingnya prosedur verifikasi' }, { id: 'b', text: 'Melakukan verifikasi cepat pada aspek paling kritis' }, { id: 'c', text: 'Meminta instruksi tertulis resmi dari atasan' }, { id: 'd', text: 'Mengikuti instruksi atasan karena beliau yang bertanggung jawab' }] },
    { itemId: 'sjt-3', scenarioText: 'Unit Anda dan unit lain memiliki proyek saling terkait dengan timeline berbeda. Unit lain membutuhkan data dari tim Anda tetapi menyediakannya akan mengalihkan sumber daya.', options: [{ id: 'a', text: 'Mengatur pertemuan bersama untuk menemukan solusi yang mengakomodasi kebutuhan bersama' }, { id: 'b', text: 'Mengalokasikan sebagian kecil kapasitas untuk data paling kritis' }, { id: 'c', text: 'Mengeskalasi ke atasan bersama untuk keputusan prioritas' }, { id: 'd', text: 'Menawarkan timeline realistis setelah proyek internal selesai' }] },
    { itemId: 'sjt-4', scenarioText: 'Seorang wajib pajak datang menjelang jam tutup dengan masalah kompleks. Ia sudah beberapa kali datang tanpa penyelesaian dan terlihat sangat frustrasi.', options: [{ id: 'a', text: 'Menerima dan menyelesaikan bagian yang bisa ditangani hari ini dengan janji tindak lanjut spesifik' }, { id: 'b', text: 'Menjelaskan kendala dan berkomitmen menghubungi besok pagi' }, { id: 'c', text: 'Menghubungi petugas bagian terkait melalui telepon meski di luar jam' }, { id: 'd', text: 'Menjadwalkan appointment khusus dan memberikan nomor kontak langsung' }] },
    { itemId: 'sjt-5', scenarioText: 'Unit Anda menggunakan metode pelaporan yang sama selama 5 tahun. Anda menemukan pendekatan baru yang 30% lebih efisien tetapi memerlukan investasi waktu untuk transisi.', options: [{ id: 'a', text: 'Melakukan pilot project kecil untuk memvalidasi manfaat sebelum implementasi luas' }, { id: 'b', text: 'Menyusun proposal perbandingan dengan analisis cost-benefit' }, { id: 'c', text: 'Mempelajari dan menerapkan pada pekerjaan sendiri sebagai proof of concept' }, { id: 'd', text: 'Mengundang praktisi dari institusi lain untuk sharing session' }] },
  ];
}

function getMockReport() {
  return {
    candidateId: 'candidate-001', candidateName: 'Test Candidate', sessionName: 'MINTS 2025', completedAt: new Date().toISOString(),
    personality: { dimensions: [{ dimension: 'openness', rawScore: 15, stenScore: 7 }, { dimension: 'conscientiousness', rawScore: 18, stenScore: 8 }, { dimension: 'extraversion', rawScore: 12, stenScore: 6 }, { dimension: 'agreeableness', rawScore: 16, stenScore: 7 }, { dimension: 'neuroticism', rawScore: 8, stenScore: 4 }], facets: [], narratives: [{ dimension: 'openness', narrative: 'Anda menunjukkan keterbukaan yang baik terhadap pengalaman baru.' }, { dimension: 'conscientiousness', narrative: 'Anda memiliki tingkat kedisiplinan dan tanggung jawab yang tinggi.' }, { dimension: 'extraversion', narrative: 'Anda memiliki keseimbangan yang baik antara bersosialisasi dan bekerja mandiri.' }, { dimension: 'agreeableness', narrative: 'Anda menunjukkan kemampuan kerjasama dan empati yang baik.' }, { dimension: 'neuroticism', narrative: 'Anda memiliki stabilitas emosional yang baik.' }] },
    sjt: { valueScores: [{ value: 'integritas', score: 82 }, { value: 'profesionalisme', score: 75 }, { value: 'sinergi', score: 70 }, { value: 'pelayanan', score: 78 }, { value: 'kesempurnaan', score: 72 }], behavioralExamples: [], elaborationScores: [] },
    composite: { suitabilityScore: 76.5, category: 'Suitable', confidence: 'High Confidence', personalitySubScore: 72, sjtSubScore: 75.4 },
    validity: { consistencyIndex: 87, averageResponseTimeMs: 4500, personalityAvgResponseTimeMs: 3200, sjtAvgResponseTimeMs: 12000, socialDesirabilityScore: 4, validityFlag: 'Valid', flaggedResponsePercentage: 5, focusLossCount: 0, hasValidityWarning: false },
    recommendations: [{ value: 'sinergi', currentScore: 70, suggestion: 'Kembangkan kemampuan kolaborasi dan komunikasi lintas unit.' }, { value: 'kesempurnaan', currentScore: 72, suggestion: 'Biasakan melakukan evaluasi dan perbaikan berkelanjutan.' }],
  };
}
