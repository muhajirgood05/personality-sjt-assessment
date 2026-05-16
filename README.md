# Tes Kepribadian & SJT — Platform Asesmen MINTS Kemenkeu

Platform asesmen psikologis berbasis web untuk seleksi beasiswa MINTS (Kementerian Keuangan RI). Mengadministrasikan dua jenis tes:

1. **Tes Kepribadian** — 120 soal forced-choice (Big Five/OCEAN) dengan format Graded Paired Comparisons
2. **Situational Judgement Test (SJT)** — 30 skenario kerja Kemenkeu dengan ranking most/least effective

## Fitur Utama

- ⏱️ Timer per seksi (45 menit kepribadian, 60 menit SJT)
- 🔒 Anti-faking: response time tracking, consistency index, social desirability detection
- 📊 Scoring: IRT-based OCEAN, concordance SJT, composite suitability score
- 📋 Laporan komprehensif dengan rekomendasi perbaikan
- 🏛️ Pemetaan ke 5 Nilai Kemenkeu: Integritas, Profesionalisme, Sinergi, Pelayanan, Kesempurnaan

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Fastify + TypeScript
- **Database:** PostgreSQL (production) / In-memory (demo)
- **Cache:** Redis (production) / In-memory (demo)
- **Testing:** Vitest + fast-check

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Run frontend (http://localhost:5174)
npm run dev --workspace=@assessment/frontend

# Run backend (http://localhost:3000)
npm run dev --workspace=@assessment/backend
```

## Demo Credentials

| Role | NIP | Password |
|------|-----|----------|
| Kandidat | TEST001 | password123 |
| Admin | ADMIN001 | admin123 |

## Project Structure

```
packages/
├── shared/     # Shared TypeScript types & interfaces
├── backend/    # Fastify API server
│   ├── src/auth/        # JWT authentication & RBAC
│   ├── src/session/     # Session management & heartbeat
│   ├── src/timer/       # Server-side timer service
│   ├── src/items/       # Item bank & assembly algorithm
│   ├── src/assessment/  # Assessment delivery routes
│   └── src/scoring/     # Scoring engine (OCEAN, SJT, composite)
└── frontend/   # React SPA
    ├── src/pages/       # Login, Instructions, Tests, Results
    ├── src/components/  # Timer, ForcedChoice, Ranking, Reports
    └── src/services/    # Heartbeat, auto-save, offline queue
```

## Deployment

Frontend deployed on Vercel. Backend runs in mock mode (no external DB/Redis required).

## License

Internal use — Kementerian Keuangan RI
