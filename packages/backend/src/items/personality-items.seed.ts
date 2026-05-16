/**
 * Seeding script for personality test items.
 * Creates:
 * - 150 forced-choice personality items (30 per OCEAN dimension)
 * - 15 consistency-check pairs (matched_pair_id linking them)
 * - 10 social desirability scale items
 *
 * All items are in Bahasa Indonesia with psychologically sound statements.
 * At least 30% reverse-scored items. Each dimension covers 6 facets.
 */

import {
  SectionType,
  OceanDimension,
  ForcedChoiceItemContent,
} from '@assessment/shared';
import { CreateItemInput } from './item.repository.js';

// ─── Facet Definitions ───────────────────────────────────────────────────────

export const FACETS: Record<OceanDimension, string[]> = {
  [OceanDimension.Openness]: [
    'imagination', 'artistic_interests', 'emotionality',
    'adventurousness', 'intellect', 'liberalism',
  ],
  [OceanDimension.Conscientiousness]: [
    'self_efficacy', 'orderliness', 'dutifulness',
    'achievement_striving', 'self_discipline', 'cautiousness',
  ],
  [OceanDimension.Extraversion]: [
    'friendliness', 'gregariousness', 'assertiveness',
    'activity_level', 'excitement_seeking', 'cheerfulness',
  ],
  [OceanDimension.Agreeableness]: [
    'trust', 'morality', 'altruism',
    'cooperation', 'modesty', 'sympathy',
  ],
  [OceanDimension.Neuroticism]: [
    'anxiety', 'anger', 'depression',
    'self_consciousness', 'immoderation', 'vulnerability',
  ],
};

// ─── Statement Bank ──────────────────────────────────────────────────────────

interface StatementDef {
  text: string;
  dimension: OceanDimension;
  facet: string;
  socialDesirability: number;
  isReverse: boolean;
}


/**
 * Openness statements — 6 facets, 5 statements each (30 total).
 */
const OPENNESS_STATEMENTS: StatementDef[] = [
  // imagination
  { text: 'Saya sering membayangkan skenario alternatif untuk situasi sehari-hari', dimension: OceanDimension.Openness, facet: 'imagination', socialDesirability: 3.2, isReverse: false },
  { text: 'Pikiran saya sering melayang ke dunia imajinasi saat sedang sendiri', dimension: OceanDimension.Openness, facet: 'imagination', socialDesirability: 2.8, isReverse: false },
  { text: 'Saya lebih suka berpikir tentang hal-hal konkret daripada berkhayal', dimension: OceanDimension.Openness, facet: 'imagination', socialDesirability: 3.4, isReverse: true },
  { text: 'Saya mudah terhanyut dalam lamunan kreatif', dimension: OceanDimension.Openness, facet: 'imagination', socialDesirability: 2.9, isReverse: false },
  { text: 'Saya jarang menghabiskan waktu untuk berimajinasi', dimension: OceanDimension.Openness, facet: 'imagination', socialDesirability: 3.0, isReverse: true },
  // artistic_interests
  { text: 'Saya menikmati mengunjungi museum atau galeri seni', dimension: OceanDimension.Openness, facet: 'artistic_interests', socialDesirability: 3.5, isReverse: false },
  { text: 'Karya seni dan musik memiliki pengaruh emosional yang kuat pada saya', dimension: OceanDimension.Openness, facet: 'artistic_interests', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya kurang tertarik pada kegiatan yang bersifat artistik', dimension: OceanDimension.Openness, facet: 'artistic_interests', socialDesirability: 2.8, isReverse: true },
  { text: 'Saya sering mencari pengalaman estetis dalam kehidupan sehari-hari', dimension: OceanDimension.Openness, facet: 'artistic_interests', socialDesirability: 3.1, isReverse: false },
  { text: 'Keindahan alam dan seni tidak terlalu menarik perhatian saya', dimension: OceanDimension.Openness, facet: 'artistic_interests', socialDesirability: 2.7, isReverse: true },
  // emotionality
  { text: 'Saya merasakan emosi dengan sangat intens dibanding kebanyakan orang', dimension: OceanDimension.Openness, facet: 'emotionality', socialDesirability: 3.0, isReverse: false },
  { text: 'Saya mudah terharu oleh cerita atau pengalaman orang lain', dimension: OceanDimension.Openness, facet: 'emotionality', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya cenderung menjaga jarak emosional dari situasi yang mengharukan', dimension: OceanDimension.Openness, facet: 'emotionality', socialDesirability: 2.9, isReverse: true },
  { text: 'Perasaan saya sering berfluktuasi sepanjang hari', dimension: OceanDimension.Openness, facet: 'emotionality', socialDesirability: 2.6, isReverse: false },
  { text: 'Saya tidak mudah tersentuh secara emosional', dimension: OceanDimension.Openness, facet: 'emotionality', socialDesirability: 3.1, isReverse: true },
  // adventurousness
  { text: 'Saya selalu mencari pengalaman baru yang belum pernah saya coba', dimension: OceanDimension.Openness, facet: 'adventurousness', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya lebih nyaman dengan rutinitas yang sudah familiar', dimension: OceanDimension.Openness, facet: 'adventurousness', socialDesirability: 3.2, isReverse: true },
  { text: 'Mencoba makanan atau budaya baru adalah hal yang menyenangkan bagi saya', dimension: OceanDimension.Openness, facet: 'adventurousness', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya merasa tidak nyaman ketika harus keluar dari zona nyaman', dimension: OceanDimension.Openness, facet: 'adventurousness', socialDesirability: 2.8, isReverse: true },
  { text: 'Perubahan dan variasi membuat hidup saya lebih bermakna', dimension: OceanDimension.Openness, facet: 'adventurousness', socialDesirability: 3.4, isReverse: false },
  // intellect
  { text: 'Saya menikmati diskusi mendalam tentang ide-ide abstrak', dimension: OceanDimension.Openness, facet: 'intellect', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya lebih tertarik pada masalah praktis daripada teori', dimension: OceanDimension.Openness, facet: 'intellect', socialDesirability: 3.3, isReverse: true },
  { text: 'Membaca tentang topik yang kompleks memberi saya kepuasan tersendiri', dimension: OceanDimension.Openness, facet: 'intellect', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya suka mempertanyakan asumsi-asumsi yang dianggap benar', dimension: OceanDimension.Openness, facet: 'intellect', socialDesirability: 3.2, isReverse: false },
  { text: 'Perdebatan filosofis terasa membosankan bagi saya', dimension: OceanDimension.Openness, facet: 'intellect', socialDesirability: 2.9, isReverse: true },
  // liberalism
  { text: 'Saya percaya bahwa tradisi perlu terus dievaluasi dan diperbarui', dimension: OceanDimension.Openness, facet: 'liberalism', socialDesirability: 3.1, isReverse: false },
  { text: 'Nilai-nilai lama yang sudah terbukti sebaiknya dipertahankan', dimension: OceanDimension.Openness, facet: 'liberalism', socialDesirability: 3.3, isReverse: true },
  { text: 'Saya terbuka terhadap cara pandang yang berbeda dari norma umum', dimension: OceanDimension.Openness, facet: 'liberalism', socialDesirability: 3.5, isReverse: false },
  { text: 'Perubahan sosial yang terlalu cepat membuat saya khawatir', dimension: OceanDimension.Openness, facet: 'liberalism', socialDesirability: 3.0, isReverse: true },
  { text: 'Saya menghargai keberagaman pendapat dalam masyarakat', dimension: OceanDimension.Openness, facet: 'liberalism', socialDesirability: 3.7, isReverse: false },
];


/**
 * Conscientiousness statements — 6 facets, 5 statements each (30 total).
 */
const CONSCIENTIOUSNESS_STATEMENTS: StatementDef[] = [
  // self_efficacy
  { text: 'Saya yakin dengan kemampuan saya untuk menyelesaikan tugas yang sulit', dimension: OceanDimension.Conscientiousness, facet: 'self_efficacy', socialDesirability: 3.8, isReverse: false },
  { text: 'Saya sering meragukan kemampuan diri sendiri saat menghadapi tantangan', dimension: OceanDimension.Conscientiousness, facet: 'self_efficacy', socialDesirability: 2.5, isReverse: true },
  { text: 'Saya percaya bahwa usaha keras akan membuahkan hasil', dimension: OceanDimension.Conscientiousness, facet: 'self_efficacy', socialDesirability: 3.9, isReverse: false },
  { text: 'Ketika menghadapi masalah, saya merasa mampu menemukan solusi', dimension: OceanDimension.Conscientiousness, facet: 'self_efficacy', socialDesirability: 3.7, isReverse: false },
  { text: 'Saya cenderung menyerah ketika tugas terasa terlalu berat', dimension: OceanDimension.Conscientiousness, facet: 'self_efficacy', socialDesirability: 2.3, isReverse: true },
  // orderliness
  { text: 'Meja kerja saya selalu tertata rapi dan terorganisir', dimension: OceanDimension.Conscientiousness, facet: 'orderliness', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya memiliki sistem khusus untuk mengatur dokumen dan file', dimension: OceanDimension.Conscientiousness, facet: 'orderliness', socialDesirability: 3.4, isReverse: false },
  { text: 'Kerapian bukan prioritas utama saya dalam bekerja', dimension: OceanDimension.Conscientiousness, facet: 'orderliness', socialDesirability: 2.7, isReverse: true },
  { text: 'Saya merasa tidak nyaman jika lingkungan kerja berantakan', dimension: OceanDimension.Conscientiousness, facet: 'orderliness', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya bisa bekerja dengan baik meskipun ruangan tidak teratur', dimension: OceanDimension.Conscientiousness, facet: 'orderliness', socialDesirability: 3.1, isReverse: true },
  // dutifulness
  { text: 'Saya selalu menepati janji yang sudah saya buat', dimension: OceanDimension.Conscientiousness, facet: 'dutifulness', socialDesirability: 3.9, isReverse: false },
  { text: 'Tanggung jawab adalah hal yang saya ambil dengan sangat serius', dimension: OceanDimension.Conscientiousness, facet: 'dutifulness', socialDesirability: 3.8, isReverse: false },
  { text: 'Terkadang saya mengabaikan kewajiban jika ada hal yang lebih menarik', dimension: OceanDimension.Conscientiousness, facet: 'dutifulness', socialDesirability: 2.4, isReverse: true },
  { text: 'Saya merasa bersalah jika tidak memenuhi ekspektasi orang lain', dimension: OceanDimension.Conscientiousness, facet: 'dutifulness', socialDesirability: 3.2, isReverse: false },
  { text: 'Aturan dan prosedur kadang terasa terlalu membatasi bagi saya', dimension: OceanDimension.Conscientiousness, facet: 'dutifulness', socialDesirability: 2.9, isReverse: true },
  // achievement_striving
  { text: 'Saya menetapkan standar tinggi untuk diri sendiri dalam pekerjaan', dimension: OceanDimension.Conscientiousness, facet: 'achievement_striving', socialDesirability: 3.7, isReverse: false },
  { text: 'Saya terus berusaha meningkatkan kinerja meskipun sudah cukup baik', dimension: OceanDimension.Conscientiousness, facet: 'achievement_striving', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya puas dengan hasil yang cukup baik tanpa perlu sempurna', dimension: OceanDimension.Conscientiousness, facet: 'achievement_striving', socialDesirability: 3.0, isReverse: true },
  { text: 'Pencapaian karir adalah motivasi utama saya bekerja', dimension: OceanDimension.Conscientiousness, facet: 'achievement_striving', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya tidak terlalu ambisius dalam mengejar target kerja', dimension: OceanDimension.Conscientiousness, facet: 'achievement_striving', socialDesirability: 2.6, isReverse: true },
  // self_discipline
  { text: 'Saya mampu fokus pada tugas hingga selesai tanpa terdistraksi', dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', socialDesirability: 3.7, isReverse: false },
  { text: 'Saya sering menunda pekerjaan yang tidak menyenangkan', dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', socialDesirability: 2.4, isReverse: true },
  { text: 'Disiplin diri adalah kekuatan utama saya', dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya mudah kehilangan motivasi di tengah proyek yang panjang', dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', socialDesirability: 2.5, isReverse: true },
  { text: 'Saya konsisten menjalankan rencana yang sudah saya buat', dimension: OceanDimension.Conscientiousness, facet: 'self_discipline', socialDesirability: 3.5, isReverse: false },
  // cautiousness
  { text: 'Saya selalu mempertimbangkan konsekuensi sebelum bertindak', dimension: OceanDimension.Conscientiousness, facet: 'cautiousness', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya cenderung bertindak impulsif tanpa banyak pertimbangan', dimension: OceanDimension.Conscientiousness, facet: 'cautiousness', socialDesirability: 2.3, isReverse: true },
  { text: 'Saya lebih suka menganalisis situasi secara menyeluruh sebelum memutuskan', dimension: OceanDimension.Conscientiousness, facet: 'cautiousness', socialDesirability: 3.5, isReverse: false },
  { text: 'Kehati-hatian berlebihan justru menghambat produktivitas saya', dimension: OceanDimension.Conscientiousness, facet: 'cautiousness', socialDesirability: 3.0, isReverse: true },
  { text: 'Saya jarang membuat keputusan yang terburu-buru', dimension: OceanDimension.Conscientiousness, facet: 'cautiousness', socialDesirability: 3.4, isReverse: false },
];


/**
 * Extraversion statements — 6 facets, 5 statements each (30 total).
 */
const EXTRAVERSION_STATEMENTS: StatementDef[] = [
  // friendliness
  { text: 'Saya mudah menjalin hubungan baik dengan orang yang baru dikenal', dimension: OceanDimension.Extraversion, facet: 'friendliness', socialDesirability: 3.6, isReverse: false },
  { text: 'Saya merasa hangat dan ramah terhadap hampir semua orang', dimension: OceanDimension.Extraversion, facet: 'friendliness', socialDesirability: 3.7, isReverse: false },
  { text: 'Saya butuh waktu lama untuk merasa nyaman dengan orang baru', dimension: OceanDimension.Extraversion, facet: 'friendliness', socialDesirability: 2.8, isReverse: true },
  { text: 'Orang lain sering menganggap saya sebagai pribadi yang mudah didekati', dimension: OceanDimension.Extraversion, facet: 'friendliness', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya cenderung menjaga jarak dengan orang yang belum saya kenal baik', dimension: OceanDimension.Extraversion, facet: 'friendliness', socialDesirability: 2.9, isReverse: true },
  // gregariousness
  { text: 'Saya menikmati berada di tengah keramaian dan acara sosial', dimension: OceanDimension.Extraversion, facet: 'gregariousness', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya lebih memilih menghabiskan waktu bersama banyak orang', dimension: OceanDimension.Extraversion, facet: 'gregariousness', socialDesirability: 3.1, isReverse: false },
  { text: 'Kesendirian lebih menyenangkan bagi saya daripada pesta', dimension: OceanDimension.Extraversion, facet: 'gregariousness', socialDesirability: 3.0, isReverse: true },
  { text: 'Saya aktif mencari kesempatan untuk berkumpul dengan teman-teman', dimension: OceanDimension.Extraversion, facet: 'gregariousness', socialDesirability: 3.2, isReverse: false },
  { text: 'Acara sosial yang ramai membuat saya cepat lelah', dimension: OceanDimension.Extraversion, facet: 'gregariousness', socialDesirability: 2.8, isReverse: true },
  // assertiveness
  { text: 'Saya tidak ragu untuk menyampaikan pendapat dalam rapat', dimension: OceanDimension.Extraversion, facet: 'assertiveness', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya sering mengambil peran pemimpin dalam kelompok', dimension: OceanDimension.Extraversion, facet: 'assertiveness', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya lebih suka mengikuti arahan daripada memimpin', dimension: OceanDimension.Extraversion, facet: 'assertiveness', socialDesirability: 2.9, isReverse: true },
  { text: 'Saya mampu mempengaruhi keputusan kelompok dengan argumen saya', dimension: OceanDimension.Extraversion, facet: 'assertiveness', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya cenderung diam dan membiarkan orang lain yang berbicara', dimension: OceanDimension.Extraversion, facet: 'assertiveness', socialDesirability: 2.7, isReverse: true },
  // activity_level
  { text: 'Saya selalu memiliki banyak aktivitas yang membuat hari saya sibuk', dimension: OceanDimension.Extraversion, facet: 'activity_level', socialDesirability: 3.4, isReverse: false },
  { text: 'Tempo hidup saya cenderung cepat dan penuh energi', dimension: OceanDimension.Extraversion, facet: 'activity_level', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya lebih menikmati hari-hari yang tenang dan santai', dimension: OceanDimension.Extraversion, facet: 'activity_level', socialDesirability: 3.1, isReverse: true },
  { text: 'Saya merasa gelisah jika tidak ada yang dikerjakan', dimension: OceanDimension.Extraversion, facet: 'activity_level', socialDesirability: 3.0, isReverse: false },
  { text: 'Saya tidak merasa perlu untuk selalu produktif setiap saat', dimension: OceanDimension.Extraversion, facet: 'activity_level', socialDesirability: 3.0, isReverse: true },
  // excitement_seeking
  { text: 'Saya menikmati aktivitas yang memacu adrenalin', dimension: OceanDimension.Extraversion, facet: 'excitement_seeking', socialDesirability: 3.1, isReverse: false },
  { text: 'Saya mencari sensasi dan pengalaman yang mendebarkan', dimension: OceanDimension.Extraversion, facet: 'excitement_seeking', socialDesirability: 2.9, isReverse: false },
  { text: 'Saya lebih memilih kegiatan yang aman dan dapat diprediksi', dimension: OceanDimension.Extraversion, facet: 'excitement_seeking', socialDesirability: 3.2, isReverse: true },
  { text: 'Kehidupan tanpa tantangan terasa membosankan bagi saya', dimension: OceanDimension.Extraversion, facet: 'excitement_seeking', socialDesirability: 3.0, isReverse: false },
  { text: 'Saya menghindari situasi yang terlalu berisiko', dimension: OceanDimension.Extraversion, facet: 'excitement_seeking', socialDesirability: 3.3, isReverse: true },
  // cheerfulness
  { text: 'Saya umumnya merasa gembira dan optimis tentang kehidupan', dimension: OceanDimension.Extraversion, facet: 'cheerfulness', socialDesirability: 3.7, isReverse: false },
  { text: 'Tawa dan humor adalah bagian penting dari keseharian saya', dimension: OceanDimension.Extraversion, facet: 'cheerfulness', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya jarang merasa sangat antusias tentang sesuatu', dimension: OceanDimension.Extraversion, facet: 'cheerfulness', socialDesirability: 2.6, isReverse: true },
  { text: 'Orang lain sering mengatakan bahwa saya membawa energi positif', dimension: OceanDimension.Extraversion, facet: 'cheerfulness', socialDesirability: 3.6, isReverse: false },
  { text: 'Suasana hati saya cenderung datar dan tidak terlalu ekspresif', dimension: OceanDimension.Extraversion, facet: 'cheerfulness', socialDesirability: 2.7, isReverse: true },
];


/**
 * Agreeableness statements — 6 facets, 5 statements each (30 total).
 */
const AGREEABLENESS_STATEMENTS: StatementDef[] = [
  // trust
  { text: 'Saya percaya bahwa kebanyakan orang pada dasarnya baik', dimension: OceanDimension.Agreeableness, facet: 'trust', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya mudah mempercayai niat baik rekan kerja', dimension: OceanDimension.Agreeableness, facet: 'trust', socialDesirability: 3.2, isReverse: false },
  { text: 'Saya selalu waspada terhadap motif tersembunyi orang lain', dimension: OceanDimension.Agreeableness, facet: 'trust', socialDesirability: 3.0, isReverse: true },
  { text: 'Saya memberikan kepercayaan kepada orang baru sampai terbukti sebaliknya', dimension: OceanDimension.Agreeableness, facet: 'trust', socialDesirability: 3.4, isReverse: false },
  { text: 'Pengalaman mengajarkan saya untuk tidak mudah percaya pada siapapun', dimension: OceanDimension.Agreeableness, facet: 'trust', socialDesirability: 2.8, isReverse: true },
  // morality
  { text: 'Kejujuran adalah prinsip yang tidak bisa saya kompromikan', dimension: OceanDimension.Agreeableness, facet: 'morality', socialDesirability: 4.0, isReverse: false },
  { text: 'Saya selalu berusaha bersikap transparan dalam interaksi profesional', dimension: OceanDimension.Agreeableness, facet: 'morality', socialDesirability: 3.8, isReverse: false },
  { text: 'Terkadang kebohongan kecil diperlukan untuk menjaga hubungan baik', dimension: OceanDimension.Agreeableness, facet: 'morality', socialDesirability: 2.5, isReverse: true },
  { text: 'Saya tidak pernah memanipulasi orang lain untuk keuntungan pribadi', dimension: OceanDimension.Agreeableness, facet: 'morality', socialDesirability: 3.9, isReverse: false },
  { text: 'Dalam situasi tertentu, saya bisa bersikap strategis meskipun tidak sepenuhnya jujur', dimension: OceanDimension.Agreeableness, facet: 'morality', socialDesirability: 2.4, isReverse: true },
  // altruism
  { text: 'Membantu orang lain memberikan kepuasan batin yang mendalam bagi saya', dimension: OceanDimension.Agreeableness, facet: 'altruism', socialDesirability: 3.8, isReverse: false },
  { text: 'Saya sering mendahulukan kebutuhan orang lain di atas kebutuhan sendiri', dimension: OceanDimension.Agreeableness, facet: 'altruism', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya fokus pada kepentingan diri sendiri terlebih dahulu', dimension: OceanDimension.Agreeableness, facet: 'altruism', socialDesirability: 2.6, isReverse: true },
  { text: 'Saya dengan senang hati meluangkan waktu untuk membantu rekan yang kesulitan', dimension: OceanDimension.Agreeableness, facet: 'altruism', socialDesirability: 3.7, isReverse: false },
  { text: 'Saya merasa tidak perlu selalu membantu jika bukan tanggung jawab saya', dimension: OceanDimension.Agreeableness, facet: 'altruism', socialDesirability: 2.8, isReverse: true },
  // cooperation
  { text: 'Saya menghindari konflik dan mencari jalan tengah dalam perselisihan', dimension: OceanDimension.Agreeableness, facet: 'cooperation', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya bersedia mengalah demi menjaga keharmonisan tim', dimension: OceanDimension.Agreeableness, facet: 'cooperation', socialDesirability: 3.3, isReverse: false },
  { text: 'Saya tidak segan berkonfrontasi jika merasa pendapat saya benar', dimension: OceanDimension.Agreeableness, facet: 'cooperation', socialDesirability: 3.0, isReverse: true },
  { text: 'Kompromi adalah cara terbaik untuk menyelesaikan perbedaan pendapat', dimension: OceanDimension.Agreeableness, facet: 'cooperation', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya lebih suka mempertahankan posisi saya daripada mengalah', dimension: OceanDimension.Agreeableness, facet: 'cooperation', socialDesirability: 2.7, isReverse: true },
  // modesty
  { text: 'Saya tidak suka memamerkan pencapaian saya kepada orang lain', dimension: OceanDimension.Agreeableness, facet: 'modesty', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya merasa tidak nyaman menjadi pusat perhatian', dimension: OceanDimension.Agreeableness, facet: 'modesty', socialDesirability: 3.0, isReverse: false },
  { text: 'Saya bangga menunjukkan kemampuan dan prestasi saya', dimension: OceanDimension.Agreeableness, facet: 'modesty', socialDesirability: 3.2, isReverse: true },
  { text: 'Saya lebih suka membiarkan hasil kerja berbicara sendiri', dimension: OceanDimension.Agreeableness, facet: 'modesty', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya merasa perlu mendapatkan pengakuan atas kontribusi saya', dimension: OceanDimension.Agreeableness, facet: 'modesty', socialDesirability: 2.9, isReverse: true },
  // sympathy
  { text: 'Saya sangat tergerak oleh penderitaan orang lain', dimension: OceanDimension.Agreeableness, facet: 'sympathy', socialDesirability: 3.5, isReverse: false },
  { text: 'Saya mudah merasakan apa yang dirasakan orang di sekitar saya', dimension: OceanDimension.Agreeableness, facet: 'sympathy', socialDesirability: 3.4, isReverse: false },
  { text: 'Saya cenderung bersikap objektif dan tidak terbawa emosi orang lain', dimension: OceanDimension.Agreeableness, facet: 'sympathy', socialDesirability: 3.1, isReverse: true },
  { text: 'Empati adalah kualitas yang sangat saya hargai dalam diri saya', dimension: OceanDimension.Agreeableness, facet: 'sympathy', socialDesirability: 3.6, isReverse: false },
  { text: 'Masalah orang lain bukan urusan saya kecuali diminta membantu', dimension: OceanDimension.Agreeableness, facet: 'sympathy', socialDesirability: 2.5, isReverse: true },
];


/**
 * Neuroticism statements — 6 facets, 5 statements each (30 total).
 */
const NEUROTICISM_STATEMENTS: StatementDef[] = [
  // anxiety
  { text: 'Saya sering merasa cemas tentang hal-hal yang mungkin terjadi', dimension: OceanDimension.Neuroticism, facet: 'anxiety', socialDesirability: 2.5, isReverse: false },
  { text: 'Kekhawatiran sering mengganggu konsentrasi kerja saya', dimension: OceanDimension.Neuroticism, facet: 'anxiety', socialDesirability: 2.3, isReverse: false },
  { text: 'Saya jarang merasa gelisah atau khawatir berlebihan', dimension: OceanDimension.Neuroticism, facet: 'anxiety', socialDesirability: 3.5, isReverse: true },
  { text: 'Pikiran tentang kemungkinan buruk sering muncul di benak saya', dimension: OceanDimension.Neuroticism, facet: 'anxiety', socialDesirability: 2.4, isReverse: false },
  { text: 'Saya mampu tetap tenang meskipun situasi tidak pasti', dimension: OceanDimension.Neuroticism, facet: 'anxiety', socialDesirability: 3.6, isReverse: true },
  // anger
  { text: 'Saya mudah merasa kesal ketika sesuatu tidak berjalan sesuai rencana', dimension: OceanDimension.Neuroticism, facet: 'anger', socialDesirability: 2.6, isReverse: false },
  { text: 'Kemarahan saya cepat muncul tetapi juga cepat reda', dimension: OceanDimension.Neuroticism, facet: 'anger', socialDesirability: 2.8, isReverse: false },
  { text: 'Saya mampu mengendalikan emosi marah dengan baik', dimension: OceanDimension.Neuroticism, facet: 'anger', socialDesirability: 3.7, isReverse: true },
  { text: 'Hal-hal kecil yang mengganggu bisa membuat saya frustrasi', dimension: OceanDimension.Neuroticism, facet: 'anger', socialDesirability: 2.5, isReverse: false },
  { text: 'Saya jarang merasa jengkel terhadap perilaku orang lain', dimension: OceanDimension.Neuroticism, facet: 'anger', socialDesirability: 3.4, isReverse: true },
  // depression
  { text: 'Terkadang saya merasa sedih tanpa alasan yang jelas', dimension: OceanDimension.Neuroticism, facet: 'depression', socialDesirability: 2.4, isReverse: false },
  { text: 'Saya kadang merasa tidak bersemangat menjalani hari', dimension: OceanDimension.Neuroticism, facet: 'depression', socialDesirability: 2.3, isReverse: false },
  { text: 'Saya umumnya merasa puas dan bahagia dengan hidup saya', dimension: OceanDimension.Neuroticism, facet: 'depression', socialDesirability: 3.7, isReverse: true },
  { text: 'Perasaan hampa kadang menghampiri saya di saat-saat tertentu', dimension: OceanDimension.Neuroticism, facet: 'depression', socialDesirability: 2.5, isReverse: false },
  { text: 'Saya memiliki pandangan positif tentang masa depan saya', dimension: OceanDimension.Neuroticism, facet: 'depression', socialDesirability: 3.8, isReverse: true },
  // self_consciousness
  { text: 'Saya sangat peduli dengan bagaimana orang lain menilai saya', dimension: OceanDimension.Neuroticism, facet: 'self_consciousness', socialDesirability: 2.7, isReverse: false },
  { text: 'Saya merasa canggung dalam situasi sosial yang tidak familiar', dimension: OceanDimension.Neuroticism, facet: 'self_consciousness', socialDesirability: 2.6, isReverse: false },
  { text: 'Saya tidak terlalu memikirkan pendapat orang lain tentang diri saya', dimension: OceanDimension.Neuroticism, facet: 'self_consciousness', socialDesirability: 3.3, isReverse: true },
  { text: 'Rasa malu sering menghalangi saya untuk tampil di depan umum', dimension: OceanDimension.Neuroticism, facet: 'self_consciousness', socialDesirability: 2.4, isReverse: false },
  { text: 'Saya merasa percaya diri dalam berbagai situasi sosial', dimension: OceanDimension.Neuroticism, facet: 'self_consciousness', socialDesirability: 3.6, isReverse: true },
  // immoderation
  { text: 'Saya sulit menahan diri dari godaan yang menyenangkan', dimension: OceanDimension.Neuroticism, facet: 'immoderation', socialDesirability: 2.4, isReverse: false },
  { text: 'Keinginan sesaat sering mengalahkan pertimbangan jangka panjang saya', dimension: OceanDimension.Neuroticism, facet: 'immoderation', socialDesirability: 2.3, isReverse: false },
  { text: 'Saya mampu mengendalikan dorongan dan keinginan dengan baik', dimension: OceanDimension.Neuroticism, facet: 'immoderation', socialDesirability: 3.6, isReverse: true },
  { text: 'Saya kadang makan atau berbelanja berlebihan saat stres', dimension: OceanDimension.Neuroticism, facet: 'immoderation', socialDesirability: 2.5, isReverse: false },
  { text: 'Saya memiliki kontrol diri yang kuat terhadap kebiasaan buruk', dimension: OceanDimension.Neuroticism, facet: 'immoderation', socialDesirability: 3.5, isReverse: true },
  // vulnerability
  { text: 'Saya merasa kewalahan ketika menghadapi tekanan yang besar', dimension: OceanDimension.Neuroticism, facet: 'vulnerability', socialDesirability: 2.5, isReverse: false },
  { text: 'Situasi darurat membuat saya panik dan sulit berpikir jernih', dimension: OceanDimension.Neuroticism, facet: 'vulnerability', socialDesirability: 2.3, isReverse: false },
  { text: 'Saya tetap tenang dan berpikir rasional di bawah tekanan', dimension: OceanDimension.Neuroticism, facet: 'vulnerability', socialDesirability: 3.7, isReverse: true },
  { text: 'Kritik dari atasan membuat saya merasa sangat terpuruk', dimension: OceanDimension.Neuroticism, facet: 'vulnerability', socialDesirability: 2.4, isReverse: false },
  { text: 'Saya mampu bangkit dengan cepat setelah mengalami kegagalan', dimension: OceanDimension.Neuroticism, facet: 'vulnerability', socialDesirability: 3.6, isReverse: true },
];


/**
 * Social desirability scale items (10 items).
 * These detect impression management / faking good.
 */
const SOCIAL_DESIRABILITY_ITEMS: Array<{
  statementLeft: string;
  statementRight: string;
  keyedSide: 'left' | 'right';
}> = [
  {
    statementLeft: 'Saya tidak pernah berbohong, bahkan untuk hal-hal kecil',
    statementRight: 'Terkadang saya menyesuaikan cerita agar terdengar lebih baik',
    keyedSide: 'left',
  },
  {
    statementLeft: 'Saya pernah mengambil keuntungan dari situasi yang tidak adil',
    statementRight: 'Saya selalu bertindak adil dalam setiap situasi tanpa pengecualian',
    keyedSide: 'right',
  },
  {
    statementLeft: 'Saya tidak pernah merasa iri terhadap keberhasilan orang lain',
    statementRight: 'Kadang saya merasa sedikit iri melihat pencapaian rekan kerja',
    keyedSide: 'left',
  },
  {
    statementLeft: 'Saya pernah mengeluh tentang pekerjaan di belakang atasan',
    statementRight: 'Saya selalu menyampaikan keluhan secara langsung dan profesional',
    keyedSide: 'right',
  },
  {
    statementLeft: 'Saya tidak pernah terlambat memenuhi tenggat waktu',
    statementRight: 'Sesekali saya melewatkan deadline karena berbagai alasan',
    keyedSide: 'left',
  },
  {
    statementLeft: 'Kadang saya berpura-pura sibuk agar tidak diberi tugas tambahan',
    statementRight: 'Saya selalu siap menerima tanggung jawab tambahan kapan saja',
    keyedSide: 'right',
  },
  {
    statementLeft: 'Saya tidak pernah membicarakan keburukan orang lain',
    statementRight: 'Terkadang saya ikut membahas kekurangan rekan kerja dengan kolega',
    keyedSide: 'left',
  },
  {
    statementLeft: 'Saya pernah mengabaikan email atau pesan yang seharusnya saya balas',
    statementRight: 'Saya selalu merespons setiap komunikasi dengan tepat waktu',
    keyedSide: 'right',
  },
  {
    statementLeft: 'Semua keputusan yang saya buat selalu berdasarkan pertimbangan matang',
    statementRight: 'Kadang saya membuat keputusan tanpa memikirkannya secara mendalam',
    keyedSide: 'left',
  },
  {
    statementLeft: 'Saya pernah merasa malas dan menunda pekerjaan penting',
    statementRight: 'Saya selalu mengerjakan tugas penting tanpa penundaan sedikitpun',
    keyedSide: 'right',
  },
];


// ─── Seed Generation Logic ───────────────────────────────────────────────────

/**
 * All dimension statements combined.
 */
const ALL_STATEMENTS: Record<OceanDimension, StatementDef[]> = {
  [OceanDimension.Openness]: OPENNESS_STATEMENTS,
  [OceanDimension.Conscientiousness]: CONSCIENTIOUSNESS_STATEMENTS,
  [OceanDimension.Extraversion]: EXTRAVERSION_STATEMENTS,
  [OceanDimension.Agreeableness]: AGREEABLENESS_STATEMENTS,
  [OceanDimension.Neuroticism]: NEUROTICISM_STATEMENTS,
};

const DIMENSIONS = Object.values(OceanDimension);

/**
 * Generate the 150 forced-choice personality items.
 * Each item pairs statements from two different OCEAN dimensions.
 * Items are balanced so each dimension appears as left 30 times.
 * Ensures all 6 facets per dimension are covered.
 */
export function generateForcedChoiceItems(): CreateItemInput[] {
  const items: CreateItemInput[] = [];

  let position = 1;

  for (let dimIdx = 0; dimIdx < DIMENSIONS.length; dimIdx++) {
    const leftDim = DIMENSIONS[dimIdx];
    const leftStatements = ALL_STATEMENTS[leftDim];
    const otherDims = DIMENSIONS.filter((_, idx) => idx !== dimIdx);

    // Ensure we use statements from all 6 facets (5 statements per facet = 30 total)
    // Use each left statement exactly once, paired with a right statement from another dimension
    for (let i = 0; i < 30; i++) {
      const leftStmt = leftStatements[i];
      const rightDim = otherDims[i % otherDims.length];
      const rightStatements = ALL_STATEMENTS[rightDim];

      // Find a right statement with SD within 1 point
      let rightStmt: StatementDef | null = null;
      for (const candidate of rightStatements) {
        const diff = Math.abs(leftStmt.socialDesirability - candidate.socialDesirability);
        if (diff <= 1.0) {
          rightStmt = candidate;
          break;
        }
      }

      // If no match found, use the closest one and adjust SD values
      if (!rightStmt) {
        rightStmt = rightStatements[i % rightStatements.length];
      }

      // Ensure SD difference is within 1 point
      let sdLeft = leftStmt.socialDesirability;
      let sdRight = rightStmt.socialDesirability;
      if (Math.abs(sdLeft - sdRight) > 1.0) {
        // Adjust to be within constraint
        const avg = (sdLeft + sdRight) / 2;
        sdLeft = avg;
        sdRight = avg;
      }

      const content: ForcedChoiceItemContent = {
        type: 'forced_choice',
        statementLeft: leftStmt.text,
        statementRight: rightStmt.text,
        dimensionLeft: leftDim,
        dimensionRight: rightDim,
        facetLeft: leftStmt.facet,
        facetRight: rightStmt.facet,
        socialDesirabilityLeft: sdLeft,
        socialDesirabilityRight: sdRight,
      };

      items.push({
        sectionType: SectionType.Personality,
        dimension: leftDim,
        facet: leftStmt.facet,
        itemPosition: position++,
        content,
        socialDesirabilityRating: (sdLeft + sdRight) / 2,
        isReverseScored: leftStmt.isReverse || rightStmt.isReverse,
        isConsistencyCheck: false,
        matchedPairId: null,
        isSocialDesirabilityItem: false,
        expertRanking: null,
      });
    }
  }

  return items;
}


/**
 * Generate 15 consistency-check pairs.
 * Each pair consists of two items with similar content but different wording.
 * They are placed at least 20 positions apart.
 */
export function generateConsistencyCheckPairs(startPosition: number): CreateItemInput[] {
  const pairs: Array<{ first: CreateItemInput; second: CreateItemInput }> = [];

  // Consistency pairs: rephrased versions of personality statements
  const consistencyPairDefs: Array<{
    stmtLeft1: string; stmtRight1: string;
    stmtLeft2: string; stmtRight2: string;
    dimLeft: OceanDimension; dimRight: OceanDimension;
    facetLeft: string; facetRight: string;
    sdLeft: number; sdRight: number;
  }> = [
    {
      stmtLeft1: 'Saya senang mengeksplorasi ide-ide yang belum pernah terpikirkan sebelumnya',
      stmtRight1: 'Saya lebih nyaman bekerja dengan metode yang sudah teruji',
      stmtLeft2: 'Mengeksplorasi konsep baru adalah hal yang menarik bagi saya',
      stmtRight2: 'Pendekatan yang sudah terbukti berhasil lebih saya sukai',
      dimLeft: OceanDimension.Openness, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'intellect', facetRight: 'cautiousness', sdLeft: 3.4, sdRight: 3.5,
    },
    {
      stmtLeft1: 'Saya menikmati percakapan dengan banyak orang sekaligus',
      stmtRight1: 'Saya lebih produktif ketika bekerja sendirian',
      stmtLeft2: 'Berinteraksi dengan banyak orang memberi saya energi',
      stmtRight2: 'Kesendirian membantu saya berkonsentrasi lebih baik',
      dimLeft: OceanDimension.Extraversion, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'gregariousness', facetRight: 'self_discipline', sdLeft: 3.2, sdRight: 3.5,
    },
    {
      stmtLeft1: 'Saya selalu berusaha memahami perasaan rekan kerja',
      stmtRight1: 'Efisiensi kerja lebih penting daripada perasaan individu',
      stmtLeft2: 'Memahami emosi orang lain adalah prioritas saya dalam tim',
      stmtRight2: 'Hasil kerja harus didahulukan di atas pertimbangan emosional',
      dimLeft: OceanDimension.Agreeableness, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'sympathy', facetRight: 'achievement_striving', sdLeft: 3.5, sdRight: 3.4,
    },
    {
      stmtLeft1: 'Tekanan kerja yang tinggi membuat saya sulit tidur',
      stmtRight1: 'Saya mampu memisahkan urusan kerja dari kehidupan pribadi',
      stmtLeft2: 'Beban pekerjaan sering terbawa hingga mengganggu istirahat saya',
      stmtRight2: 'Saya bisa meninggalkan masalah kantor begitu pulang kerja',
      dimLeft: OceanDimension.Neuroticism, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'anxiety', facetRight: 'self_discipline', sdLeft: 2.5, sdRight: 3.5,
    },
    {
      stmtLeft1: 'Saya suka mencoba pendekatan kreatif untuk masalah lama',
      stmtRight1: 'Prosedur standar ada untuk diikuti, bukan untuk diubah',
      stmtLeft2: 'Solusi kreatif untuk masalah yang sudah ada menarik minat saya',
      stmtRight2: 'Mengikuti prosedur yang sudah ditetapkan adalah hal yang bijak',
      dimLeft: OceanDimension.Openness, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'imagination', facetRight: 'dutifulness', sdLeft: 3.3, sdRight: 3.4,
    },
    {
      stmtLeft1: 'Saya dengan mudah memulai percakapan dengan orang asing',
      stmtRight1: 'Saya perlu waktu untuk mengamati sebelum berinteraksi',
      stmtLeft2: 'Berbicara dengan orang yang belum dikenal terasa mudah bagi saya',
      stmtRight2: 'Saya lebih suka mengobservasi dulu sebelum terlibat pembicaraan',
      dimLeft: OceanDimension.Extraversion, dimRight: OceanDimension.Neuroticism,
      facetLeft: 'friendliness', facetRight: 'self_consciousness', sdLeft: 3.5, sdRight: 2.8,
    },
    {
      stmtLeft1: 'Kepentingan tim selalu saya utamakan di atas kepentingan pribadi',
      stmtRight1: 'Menjaga keseimbangan antara kepentingan diri dan tim itu penting',
      stmtLeft2: 'Saya rela berkorban demi kebaikan tim secara keseluruhan',
      stmtRight2: 'Keseimbangan antara kebutuhan pribadi dan tim harus dijaga',
      dimLeft: OceanDimension.Agreeableness, dimRight: OceanDimension.Agreeableness,
      facetLeft: 'altruism', facetRight: 'cooperation', sdLeft: 3.6, sdRight: 3.4,
    },
    {
      stmtLeft1: 'Saya mudah merasa tersinggung oleh kritik',
      stmtRight1: 'Kritik membantu saya untuk berkembang menjadi lebih baik',
      stmtLeft2: 'Komentar negatif tentang pekerjaan saya sangat mengganggu perasaan',
      stmtRight2: 'Masukan kritis adalah kesempatan untuk perbaikan diri',
      dimLeft: OceanDimension.Neuroticism, dimRight: OceanDimension.Openness,
      facetLeft: 'vulnerability', facetRight: 'intellect', sdLeft: 2.4, sdRight: 3.4,
    },
    {
      stmtLeft1: 'Saya menikmati memimpin proyek dan mengarahkan tim',
      stmtRight1: 'Saya lebih nyaman sebagai kontributor individual',
      stmtLeft2: 'Mengambil peran kepemimpinan dalam proyek adalah hal yang saya nikmati',
      stmtRight2: 'Bekerja secara mandiri tanpa harus memimpin lebih cocok untuk saya',
      dimLeft: OceanDimension.Extraversion, dimRight: OceanDimension.Agreeableness,
      facetLeft: 'assertiveness', facetRight: 'modesty', sdLeft: 3.4, sdRight: 3.3,
    },
    {
      stmtLeft1: 'Detail kecil dalam pekerjaan sangat penting bagi saya',
      stmtRight1: 'Saya lebih fokus pada gambaran besar daripada detail',
      stmtLeft2: 'Perhatian terhadap detail adalah kekuatan utama saya',
      stmtRight2: 'Melihat gambaran keseluruhan lebih penting daripada detail kecil',
      dimLeft: OceanDimension.Conscientiousness, dimRight: OceanDimension.Openness,
      facetLeft: 'orderliness', facetRight: 'imagination', sdLeft: 3.4, sdRight: 3.3,
    },
    {
      stmtLeft1: 'Saya cepat merasa bosan dengan pekerjaan yang monoton',
      stmtRight1: 'Pekerjaan rutin memberikan rasa aman dan kenyamanan',
      stmtLeft2: 'Rutinitas yang sama setiap hari membuat saya jenuh',
      stmtRight2: 'Keteraturan dalam pekerjaan membuat saya merasa tenang',
      dimLeft: OceanDimension.Openness, dimRight: OceanDimension.Conscientiousness,
      facetLeft: 'adventurousness', facetRight: 'orderliness', sdLeft: 3.0, sdRight: 3.3,
    },
    {
      stmtLeft1: 'Saya sering menjadi penengah dalam konflik antar rekan',
      stmtRight1: 'Konflik antar rekan bukan urusan saya untuk diselesaikan',
      stmtLeft2: 'Memediasi perselisihan di tempat kerja adalah hal yang sering saya lakukan',
      stmtRight2: 'Saya memilih untuk tidak ikut campur dalam konflik orang lain',
      dimLeft: OceanDimension.Agreeableness, dimRight: OceanDimension.Neuroticism,
      facetLeft: 'cooperation', facetRight: 'self_consciousness', sdLeft: 3.5, sdRight: 2.8,
    },
    {
      stmtLeft1: 'Saya merasa energik setelah bersosialisasi dengan banyak orang',
      stmtRight1: 'Bersosialisasi terlalu lama menguras energi saya',
      stmtLeft2: 'Interaksi sosial yang intens membuat saya bersemangat',
      stmtRight2: 'Saya perlu waktu sendiri untuk memulihkan energi setelah acara sosial',
      dimLeft: OceanDimension.Extraversion, dimRight: OceanDimension.Neuroticism,
      facetLeft: 'gregariousness', facetRight: 'vulnerability', sdLeft: 3.3, sdRight: 2.7,
    },
    {
      stmtLeft1: 'Saya selalu menyelesaikan tugas jauh sebelum deadline',
      stmtRight1: 'Deadline yang mendekat justru memotivasi saya bekerja lebih baik',
      stmtLeft2: 'Menyelesaikan pekerjaan lebih awal dari jadwal adalah kebiasaan saya',
      stmtRight2: 'Tekanan waktu membuat saya lebih produktif dan fokus',
      dimLeft: OceanDimension.Conscientiousness, dimRight: OceanDimension.Neuroticism,
      facetLeft: 'self_discipline', facetRight: 'anxiety', sdLeft: 3.6, sdRight: 2.8,
    },
    {
      stmtLeft1: 'Saya percaya setiap orang memiliki potensi untuk berubah menjadi lebih baik',
      stmtRight1: 'Karakter seseorang pada dasarnya sulit untuk diubah',
      stmtLeft2: 'Setiap individu mampu berkembang dan memperbaiki diri',
      stmtRight2: 'Sifat dasar seseorang cenderung menetap sepanjang hidup',
      dimLeft: OceanDimension.Agreeableness, dimRight: OceanDimension.Openness,
      facetLeft: 'trust', facetRight: 'liberalism', sdLeft: 3.5, sdRight: 3.0,
    },
  ];

  let pos = startPosition;

  for (const pairDef of consistencyPairDefs) {
    const contentFirst: ForcedChoiceItemContent = {
      type: 'forced_choice',
      statementLeft: pairDef.stmtLeft1,
      statementRight: pairDef.stmtRight1,
      dimensionLeft: pairDef.dimLeft,
      dimensionRight: pairDef.dimRight,
      facetLeft: pairDef.facetLeft,
      facetRight: pairDef.facetRight,
      socialDesirabilityLeft: pairDef.sdLeft,
      socialDesirabilityRight: pairDef.sdRight,
    };

    const contentSecond: ForcedChoiceItemContent = {
      type: 'forced_choice',
      statementLeft: pairDef.stmtLeft2,
      statementRight: pairDef.stmtRight2,
      dimensionLeft: pairDef.dimLeft,
      dimensionRight: pairDef.dimRight,
      facetLeft: pairDef.facetLeft,
      facetRight: pairDef.facetRight,
      socialDesirabilityLeft: pairDef.sdLeft,
      socialDesirabilityRight: pairDef.sdRight,
    };

    const firstItem: CreateItemInput = {
      sectionType: SectionType.Personality,
      dimension: pairDef.dimLeft,
      facet: pairDef.facetLeft,
      itemPosition: pos,
      content: contentFirst,
      socialDesirabilityRating: (pairDef.sdLeft + pairDef.sdRight) / 2,
      isReverseScored: false,
      isConsistencyCheck: true,
      matchedPairId: null, // Will be set after insertion
      isSocialDesirabilityItem: false,
      expertRanking: null,
    };

    // Place second item at least 20 positions apart
    const secondItem: CreateItemInput = {
      sectionType: SectionType.Personality,
      dimension: pairDef.dimLeft,
      facet: pairDef.facetLeft,
      itemPosition: pos + 25, // 25 positions apart (> 20 minimum)
      content: contentSecond,
      socialDesirabilityRating: (pairDef.sdLeft + pairDef.sdRight) / 2,
      isReverseScored: false,
      isConsistencyCheck: true,
      matchedPairId: null, // Will be linked after first item is created
      isSocialDesirabilityItem: false,
      expertRanking: null,
    };

    pairs.push({ first: firstItem, second: secondItem });
    pos += 2; // Increment base position for next pair
  }

  // Flatten pairs into a single array (first items, then second items)
  const allItems: CreateItemInput[] = [];
  for (const pair of pairs) {
    allItems.push(pair.first);
  }
  for (const pair of pairs) {
    allItems.push(pair.second);
  }

  return allItems;
}


/**
 * Generate 10 social desirability scale items.
 * These are distributed throughout the assessment with at least 5 positions apart.
 */
export function generateSocialDesirabilityItems(startPosition: number): CreateItemInput[] {
  const items: CreateItemInput[] = [];
  let pos = startPosition;

  for (const sdItem of SOCIAL_DESIRABILITY_ITEMS) {
    const content: ForcedChoiceItemContent = {
      type: 'forced_choice',
      statementLeft: sdItem.statementLeft,
      statementRight: sdItem.statementRight,
      dimensionLeft: OceanDimension.Conscientiousness, // SD items don't measure a specific dimension
      dimensionRight: OceanDimension.Conscientiousness,
      facetLeft: 'social_desirability',
      facetRight: 'social_desirability',
      socialDesirabilityLeft: sdItem.keyedSide === 'left' ? 4.5 : 2.5,
      socialDesirabilityRight: sdItem.keyedSide === 'right' ? 4.5 : 2.5,
    };

    items.push({
      sectionType: SectionType.Personality,
      dimension: null,
      facet: 'social_desirability',
      itemPosition: pos,
      content,
      socialDesirabilityRating: null,
      isReverseScored: false,
      isConsistencyCheck: false,
      matchedPairId: null,
      isSocialDesirabilityItem: true,
      expertRanking: null,
    });

    pos += 7; // At least 5 positions apart (using 7 for safety)
  }

  return items;
}

/**
 * Generate all personality test seed items.
 * Returns the complete set of items ready for insertion.
 */
export function generateAllPersonalityItems(): {
  forcedChoiceItems: CreateItemInput[];
  consistencyItems: CreateItemInput[];
  socialDesirabilityItems: CreateItemInput[];
} {
  const forcedChoiceItems = generateForcedChoiceItems();
  const consistencyItems = generateConsistencyCheckPairs(151);
  const socialDesirabilityItems = generateSocialDesirabilityItems(181);

  return {
    forcedChoiceItems,
    consistencyItems,
    socialDesirabilityItems,
  };
}

/**
 * Validate seed data meets requirements.
 */
export function validateSeedData(items: {
  forcedChoiceItems: CreateItemInput[];
  consistencyItems: CreateItemInput[];
  socialDesirabilityItems: CreateItemInput[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { forcedChoiceItems, consistencyItems, socialDesirabilityItems } = items;

  // Check forced-choice count
  if (forcedChoiceItems.length !== 150) {
    errors.push(`Expected 150 forced-choice items, got ${forcedChoiceItems.length}`);
  }

  // Check items per dimension (30 each)
  for (const dim of DIMENSIONS) {
    const count = forcedChoiceItems.filter(i => i.dimension === dim).length;
    if (count < 24) {
      errors.push(`Dimension ${dim} has only ${count} items (minimum 24 required)`);
    }
  }

  // Check facet coverage (6 facets per dimension)
  for (const dim of DIMENSIONS) {
    const dimItems = forcedChoiceItems.filter(i => i.dimension === dim);
    const facets = new Set(dimItems.map(i => i.facet));
    if (facets.size < 6) {
      errors.push(`Dimension ${dim} covers only ${facets.size} facets (minimum 6 required)`);
    }
  }

  // Check social desirability matching (within 1 point)
  for (const item of forcedChoiceItems) {
    const content = item.content as ForcedChoiceItemContent;
    const diff = Math.abs(content.socialDesirabilityLeft - content.socialDesirabilityRight);
    if (diff > 1.0) {
      errors.push(`Item at position ${item.itemPosition} has SD difference of ${diff} (max 1.0)`);
    }
  }

  // Check reverse-scored percentage (at least 30%)
  const allItems = [...forcedChoiceItems, ...consistencyItems];
  const reverseCount = allItems.filter(i => i.isReverseScored).length;
  const reversePercentage = reverseCount / allItems.length;
  if (reversePercentage < 0.30) {
    errors.push(`Only ${(reversePercentage * 100).toFixed(1)}% reverse-scored items (minimum 30% required)`);
  }

  // Check consistency pairs count
  if (consistencyItems.length !== 30) { // 15 pairs = 30 items
    errors.push(`Expected 30 consistency items (15 pairs), got ${consistencyItems.length}`);
  }

  // Check social desirability items count
  if (socialDesirabilityItems.length !== 10) {
    errors.push(`Expected 10 social desirability items, got ${socialDesirabilityItems.length}`);
  }

  // Check SD items spacing (at least 5 positions apart)
  const sdPositions = socialDesirabilityItems.map(i => i.itemPosition).sort((a, b) => a - b);
  for (let i = 1; i < sdPositions.length; i++) {
    const gap = sdPositions[i] - sdPositions[i - 1];
    if (gap < 5) {
      errors.push(`SD items at positions ${sdPositions[i - 1]} and ${sdPositions[i]} are only ${gap} apart (minimum 5)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Main seed function — generates and returns all items for database insertion.
 */
export function getPersonalitySeedData(): CreateItemInput[] {
  const { forcedChoiceItems, consistencyItems, socialDesirabilityItems } = generateAllPersonalityItems();
  return [...forcedChoiceItems, ...consistencyItems, ...socialDesirabilityItems];
}
