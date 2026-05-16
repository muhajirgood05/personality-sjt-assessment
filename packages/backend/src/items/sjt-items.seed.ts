/**
 * SJT Item Bank Seeding Script
 *
 * Seeds 30 SJT scenarios (6 per Kemenkeu value) into the items table.
 * Each scenario presents a realistic Kemenkeu workplace situation with
 * 4-5 response options ranked by subject matter experts.
 *
 * All content is in Bahasa Indonesia.
 * Scenarios are designed to be difficult to fake — no obviously "correct" answer.
 */

import { KemenkeuValue, SjtScenarioContent, SjtOption } from '@assessment/shared';
import { CreateSjtScenarioInput } from './sjt.repository';

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function makeScenario(
  kemenkeuValue: KemenkeuValue,
  scenarioText: string,
  options: Omit<SjtOption, 'id'>[]
): { content: SjtScenarioContent; expertRanking: number[] } {
  const sjtOptions: SjtOption[] = options.map((opt, idx) => ({
    id: String.fromCharCode(97 + idx), // a, b, c, d, e
    text: opt.text,
    expertRank: opt.expertRank,
  }));

  return {
    content: {
      type: 'sjt_scenario',
      scenarioText,
      wordCount: countWords(scenarioText),
      kemenkeuValue,
      options: sjtOptions,
    },
    expertRanking: sjtOptions.map((o) => o.expertRank),
  };
}

// ─── INTEGRITAS Scenarios ────────────────────────────────────────────────────

const integritasScenarios = [
  makeScenario(
    KemenkeuValue.Integritas,
    'Anda adalah pejabat pengadaan di unit kerja Kemenkeu. Seorang vendor yang sering memenangkan tender mengundang Anda makan malam di restoran mewah untuk "membahas kerja sama ke depan". Vendor tersebut menyebutkan bahwa beberapa kolega Anda di unit lain sudah biasa menerima undangan serupa. Anda tahu bahwa dalam waktu dekat akan ada proses pengadaan baru di mana vendor ini kemungkinan akan ikut serta.',
    [
      { text: 'Menolak undangan dengan sopan dan menjelaskan bahwa Anda perlu menjaga independensi sebagai pejabat pengadaan, lalu melaporkan kejadian ini ke atasan sebagai informasi.', expertRank: 1 },
      { text: 'Menerima undangan tetapi memastikan pembicaraan hanya bersifat umum, dan tidak membahas proses pengadaan yang akan datang.', expertRank: 3 },
      { text: 'Menolak undangan dan langsung melaporkan vendor tersebut ke unit kepatuhan internal karena mencurigai adanya upaya gratifikasi.', expertRank: 2 },
      { text: 'Mengabaikan undangan tanpa memberikan respons, berharap vendor tidak akan menghubungi lagi.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Integritas,
    'Saat melakukan audit internal, Anda menemukan bahwa rekan kerja senior yang sangat Anda hormati telah melakukan kesalahan pencatatan yang menguntungkan pihak tertentu. Kesalahan ini bersifat sistematis selama 6 bulan terakhir dan melibatkan nominal yang cukup signifikan. Rekan tersebut dikenal sebagai mentor bagi banyak pegawai junior dan memiliki reputasi baik di kantor. Anda belum yakin apakah ini kesengajaan atau kelalaian.',
    [
      { text: 'Mendokumentasikan temuan secara lengkap dan melaporkannya melalui mekanisme pelaporan resmi tanpa memandang siapa yang terlibat, sambil menjaga kerahasiaan proses.', expertRank: 1 },
      { text: 'Menemui rekan tersebut secara pribadi untuk meminta klarifikasi sebelum mengambil langkah formal, memberikan kesempatan untuk menjelaskan.', expertRank: 2 },
      { text: 'Berkonsultasi dengan atasan langsung Anda tentang temuan tersebut tanpa menyebutkan nama, untuk mendapatkan arahan tentang langkah selanjutnya.', expertRank: 3 },
      { text: 'Menunda pelaporan sambil mengumpulkan lebih banyak bukti untuk memastikan temuan Anda tidak keliru, mengingat dampaknya terhadap reputasi rekan tersebut.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Integritas,
    'Anda diminta atasan untuk mempercepat proses persetujuan dokumen anggaran yang seharusnya memerlukan review dari tiga unit berbeda. Atasan menjelaskan bahwa ada tekanan dari pimpinan tinggi untuk menyelesaikan sebelum akhir tahun anggaran. Dua unit sudah memberikan persetujuan, tetapi unit ketiga belum menyelesaikan review karena ada pertanyaan teknis yang belum terjawab. Atasan menyarankan agar Anda "memproses saja dulu" sambil menunggu review unit ketiga menyusul.',
    [
      { text: 'Menjelaskan kepada atasan bahwa prosedur review tiga unit ada untuk alasan yang penting, dan menawarkan untuk membantu mempercepat review unit ketiga agar tetap sesuai prosedur.', expertRank: 1 },
      { text: 'Menghubungi unit ketiga untuk memahami kendala mereka dan mencari solusi agar review bisa diselesaikan lebih cepat tanpa mengorbankan kualitas.', expertRank: 2 },
      { text: 'Memproses dokumen sesuai instruksi atasan tetapi mencatat secara tertulis bahwa review unit ketiga belum selesai, dan meminta konfirmasi tertulis dari atasan.', expertRank: 3 },
      { text: 'Langsung memproses dokumen karena dua dari tiga unit sudah menyetujui dan tekanan dari pimpinan tinggi harus diprioritaskan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Integritas,
    'Anda mengetahui bahwa seorang kolega menggunakan fasilitas kantor (kendaraan dinas dan staf) untuk keperluan pribadi di akhir pekan. Hal ini bukan rahasia di unit kerja Anda, dan beberapa orang menganggapnya sebagai hal yang wajar mengingat kolega tersebut sering lembur. Namun Anda menyadari bahwa penggunaan tersebut tidak sesuai dengan ketentuan yang berlaku tentang pemanfaatan aset negara.',
    [
      { text: 'Menyampaikan secara langsung kepada kolega bahwa penggunaan fasilitas tersebut tidak sesuai ketentuan, dan menyarankan agar dihentikan sebelum ada pihak yang melaporkan.', expertRank: 1 },
      { text: 'Melaporkan melalui saluran pengaduan internal secara anonim agar masalah ditangani tanpa konfrontasi langsung.', expertRank: 2 },
      { text: 'Membahas masalah ini dalam rapat unit sebagai isu umum tentang penggunaan aset negara, tanpa menyebut nama siapa pun.', expertRank: 3 },
      { text: 'Tidak mengambil tindakan karena bukan tanggung jawab Anda untuk mengawasi perilaku rekan kerja, dan hal tersebut sudah menjadi kebiasaan di unit.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Integritas,
    'Anda sedang mempersiapkan laporan kinerja tahunan unit. Atasan meminta Anda untuk "menyesuaikan" beberapa angka capaian agar terlihat lebih baik dalam presentasi ke pimpinan. Penyesuaian yang diminta tidak sepenuhnya fiktif — lebih kepada pemilihan metrik yang menguntungkan dan pengabaian data yang kurang baik. Atasan berargumen bahwa semua unit melakukan hal serupa dan ini adalah bagian dari "strategi komunikasi".',
    [
      { text: 'Menyajikan data secara lengkap dan akurat, tetapi menyusun narasi yang konstruktif dengan menunjukkan tren perbaikan dan rencana tindak lanjut untuk area yang belum optimal.', expertRank: 1 },
      { text: 'Menolak menyesuaikan data dan menjelaskan kepada atasan risiko jika ketidakakuratan terungkap, serta menawarkan alternatif penyajian yang tetap jujur.', expertRank: 2 },
      { text: 'Mengikuti instruksi atasan untuk menyesuaikan angka karena ini adalah keputusan manajerial dan Anda hanya pelaksana.', expertRank: 4 },
      { text: 'Menyajikan data sesuai permintaan atasan tetapi menyimpan versi asli sebagai dokumentasi pribadi untuk berjaga-jaga.', expertRank: 3 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Integritas,
    'Dalam proses seleksi penerimaan pegawai baru, Anda menjadi anggota panitia. Seorang pejabat senior yang bukan bagian dari panitia menghubungi Anda secara informal dan meminta agar Anda "memperhatikan" salah satu peserta yang ternyata adalah keponakan pejabat tersebut. Pejabat itu tidak secara eksplisit meminta Anda berbuat curang, tetapi implikasinya jelas. Peserta tersebut memiliki kualifikasi yang memadai meskipun bukan yang terbaik.',
    [
      { text: 'Menjelaskan dengan sopan bahwa Anda akan menilai semua peserta secara objektif berdasarkan kriteria yang ditetapkan, dan menyarankan agar pejabat tersebut tidak menghubungi anggota panitia lain.', expertRank: 1 },
      { text: 'Melaporkan komunikasi tersebut kepada ketua panitia seleksi agar ada catatan resmi dan transparansi dalam proses.', expertRank: 2 },
      { text: 'Mengabaikan permintaan tersebut tanpa merespons, dan tetap menilai secara objektif tanpa membuat masalah.', expertRank: 3 },
      { text: 'Memberikan penilaian sedikit lebih tinggi kepada peserta tersebut karena kualifikasinya memang memadai dan Anda tidak ingin berkonflik dengan pejabat senior.', expertRank: 4 },
    ]
  ),
];

// ─── PROFESIONALISME Scenarios ───────────────────────────────────────────────

const profesionalismeScenarios = [
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Anda ditugaskan memimpin proyek implementasi sistem baru yang memiliki tenggat waktu ketat. Di tengah proyek, Anda menyadari bahwa spesifikasi teknis yang diberikan oleh konsultan memiliki beberapa kelemahan yang bisa menyebabkan masalah di kemudian hari. Memperbaiki kelemahan ini akan memundurkan jadwal sekitar dua minggu. Tim Anda sudah bekerja lembur dan semangat mereka mulai menurun.',
    [
      { text: 'Mengidentifikasi kelemahan secara spesifik, menganalisis dampak dan risiko masing-masing, lalu mempresentasikan opsi kepada pemangku kepentingan dengan rekomendasi prioritas perbaikan yang paling kritis.', expertRank: 1 },
      { text: 'Melaporkan temuan kepada atasan dan meminta perpanjangan waktu dengan justifikasi teknis yang jelas, sambil menyusun rencana kerja revisi.', expertRank: 2 },
      { text: 'Melanjutkan proyek sesuai jadwal sambil mendokumentasikan kelemahan yang ditemukan untuk diperbaiki dalam fase pemeliharaan setelah implementasi.', expertRank: 3 },
      { text: 'Meminta konsultan untuk memperbaiki spesifikasi dan menunda seluruh proyek sampai spesifikasi sempurna.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Anda baru saja dipromosikan menjadi kepala seksi dan menemukan bahwa beberapa proses kerja di seksi Anda sudah ketinggalan zaman dan tidak efisien. Staf senior yang sudah lama bekerja di seksi tersebut merasa nyaman dengan cara kerja lama dan menunjukkan resistensi terhadap perubahan. Mereka memiliki pengetahuan institusional yang sangat berharga dan hubungan baik dengan unit-unit lain.',
    [
      { text: 'Melibatkan staf senior dalam proses identifikasi masalah dan perancangan solusi, memanfaatkan pengetahuan mereka sambil secara bertahap memperkenalkan perbaikan yang disepakati bersama.', expertRank: 1 },
      { text: 'Mengadakan sesi diskusi terbuka untuk memahami alasan di balik proses yang ada, kemudian bersama-sama menyusun rencana modernisasi bertahap dengan timeline yang realistis.', expertRank: 2 },
      { text: 'Menerapkan perubahan secara bertahap dimulai dari proses yang paling jelas tidak efisien, sambil memberikan pelatihan dan dukungan kepada staf.', expertRank: 3 },
      { text: 'Menunda perubahan sampai Anda lebih memahami dinamika tim dan membangun hubungan yang lebih kuat dengan staf senior.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Anda diminta untuk menyiapkan analisis kebijakan fiskal dalam waktu tiga hari untuk rapat pimpinan. Topiknya kompleks dan Anda merasa belum memiliki keahlian yang cukup mendalam di bidang tersebut. Ada kolega di unit lain yang ahli dalam topik ini, tetapi meminta bantuannya mungkin akan terlihat bahwa Anda tidak kompeten. Atasan Anda tampaknya yakin bahwa Anda mampu menyelesaikannya sendiri.',
    [
      { text: 'Mengkomunikasikan kepada atasan bahwa Anda akan mengerjakan analisis tersebut dan berencana berkonsultasi dengan kolega yang ahli untuk memastikan kualitas output, karena akurasi analisis lebih penting dari persepsi.', expertRank: 1 },
      { text: 'Memulai riset mandiri terlebih dahulu, lalu menghubungi kolega ahli untuk memvalidasi temuan dan mendapatkan perspektif tambahan.', expertRank: 2 },
      { text: 'Mengerjakan analisis sendiri sebaik mungkin dengan memanfaatkan literatur dan data yang tersedia, lalu meminta review dari atasan sebelum finalisasi.', expertRank: 3 },
      { text: 'Meminta atasan untuk menugaskan kolega yang lebih ahli karena Anda khawatir hasilnya tidak akan memenuhi standar yang diharapkan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Tim Anda baru saja menyelesaikan proyek besar yang berhasil. Namun, Anda menyadari bahwa ada satu komponen yang meskipun berfungsi, tidak memenuhi standar kualitas internal yang seharusnya. Tidak ada pihak luar yang menyadari kekurangan ini, dan memperbaikinya akan membutuhkan waktu tambahan dua minggu serta biaya yang tidak dianggarkan. Tim sudah kelelahan dan ingin segera beralih ke proyek berikutnya.',
    [
      { text: 'Mendiskusikan temuan dengan tim secara transparan, menjelaskan pentingnya standar kualitas, dan bersama-sama menyusun rencana perbaikan yang mempertimbangkan kondisi tim.', expertRank: 1 },
      { text: 'Melaporkan kekurangan kepada atasan dengan analisis risiko dan rekomendasi, membiarkan keputusan akhir ada di tingkat yang lebih tinggi.', expertRank: 2 },
      { text: 'Menjadwalkan perbaikan sebagai prioritas pertama di kuartal berikutnya, mendokumentasikan kekurangan sebagai technical debt yang harus diselesaikan.', expertRank: 3 },
      { text: 'Membiarkan komponen tersebut karena sudah berfungsi dan tidak ada yang menyadari kekurangannya, fokus pada proyek berikutnya.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Anda menghadiri pelatihan teknis yang dibiayai kantor selama satu minggu. Materi pelatihan ternyata sebagian besar sudah Anda kuasai, dan Anda merasa waktu Anda lebih baik digunakan untuk menyelesaikan pekerjaan yang menumpuk di kantor. Beberapa peserta lain juga terlihat tidak antusias. Namun, ada beberapa sesi di hari-hari terakhir yang mungkin memberikan wawasan baru.',
    [
      { text: 'Tetap mengikuti pelatihan secara penuh sambil mencari peluang untuk memperdalam pemahaman, berdiskusi dengan instruktur tentang aplikasi lanjutan, dan berbagi pengetahuan dengan peserta lain.', expertRank: 1 },
      { text: 'Mengikuti semua sesi tetapi memanfaatkan waktu istirahat untuk menyelesaikan pekerjaan kantor yang mendesak melalui laptop.', expertRank: 2 },
      { text: 'Menghubungi atasan untuk mendiskusikan apakah sebaiknya Anda kembali ke kantor lebih awal mengingat materi sudah dikuasai.', expertRank: 3 },
      { text: 'Hadir secara fisik di pelatihan tetapi mengerjakan tugas kantor selama sesi berlangsung karena pekerjaan kantor lebih mendesak.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Profesionalisme,
    'Anda menerima tugas untuk mereview pekerjaan rekan sejawat sebelum diserahkan ke pimpinan. Setelah review, Anda menemukan beberapa kesalahan substansial yang jika tidak diperbaiki bisa berdampak pada keputusan kebijakan. Rekan tersebut sudah bekerja keras dan tenggat penyerahan adalah besok pagi. Memberikan feedback yang jujur mungkin akan membuat rekan tersebut harus lembur semalaman.',
    [
      { text: 'Memberikan feedback yang spesifik dan konstruktif tentang kesalahan yang ditemukan, menawarkan bantuan untuk memperbaiki bagian yang paling kritis, dan menjelaskan mengapa perbaikan ini penting.', expertRank: 1 },
      { text: 'Menyampaikan temuan kesalahan secara langsung dan jelas kepada rekan tersebut, memberikan waktu untuk memperbaiki, dan menawarkan diri untuk review ulang setelah perbaikan.', expertRank: 2 },
      { text: 'Memperbaiki kesalahan-kesalahan tersebut sendiri tanpa memberitahu rekan, agar dokumen bisa diserahkan tepat waktu.', expertRank: 3 },
      { text: 'Menyetujui dokumen dengan catatan minor saja karena rekan sudah bekerja keras dan kesalahan mungkin tidak akan terdeteksi oleh pimpinan.', expertRank: 4 },
    ]
  ),
];

// ─── SINERGI Scenarios ────────────────────────────────────────────────────────

const sinergiScenarios = [
  makeScenario(
    KemenkeuValue.Sinergi,
    'Unit kerja Anda dan unit lain di Kemenkeu memiliki proyek yang saling terkait tetapi dengan timeline yang berbeda. Unit lain membutuhkan data dari tim Anda untuk melanjutkan pekerjaan mereka, tetapi menyediakan data tersebut akan mengalihkan sumber daya dari proyek prioritas Anda sendiri. Atasan Anda menekankan pentingnya menyelesaikan proyek internal tepat waktu, sementara unit lain sudah beberapa kali mengirim permintaan.',
    [
      { text: 'Mengatur pertemuan dengan kedua pihak (atasan Anda dan perwakilan unit lain) untuk menemukan solusi yang mengakomodasi kebutuhan bersama, mungkin dengan menyepakati jadwal penyediaan data bertahap.', expertRank: 1 },
      { text: 'Mengalokasikan sebagian kecil waktu tim untuk menyediakan data yang paling kritis bagi unit lain, sambil tetap memprioritaskan proyek internal.', expertRank: 2 },
      { text: 'Menjelaskan situasi kepada unit lain dan menawarkan timeline realistis kapan data bisa disediakan setelah proyek internal mencapai milestone tertentu.', expertRank: 3 },
      { text: 'Memprioritaskan proyek internal sesuai arahan atasan dan meminta unit lain untuk menunggu sampai proyek Anda selesai.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Sinergi,
    'Dalam rapat koordinasi lintas unit, terjadi perbedaan pendapat yang tajam antara unit Anda dan unit lain tentang pendekatan implementasi kebijakan baru. Kedua pihak memiliki argumen yang valid berdasarkan perspektif dan pengalaman masing-masing. Suasana rapat mulai memanas dan beberapa peserta sudah menunjukkan sikap defensif terhadap kritik. Sebagai salah satu peserta yang dihormati kedua belah pihak, Anda diminta untuk memberikan pandangan Anda.',
    [
      { text: 'Mengakui validitas kedua perspektif, mengidentifikasi titik-titik kesamaan, dan mengusulkan pendekatan yang mengintegrasikan kekuatan dari kedua proposal sambil meminimalkan kelemahan masing-masing.', expertRank: 1 },
      { text: 'Menyarankan agar rapat dijeda sebentar untuk meredakan suasana, kemudian mengusulkan pembentukan tim kecil dari kedua unit untuk menyusun proposal kompromi.', expertRank: 2 },
      { text: 'Menyampaikan pandangan unit Anda dengan data dan fakta yang mendukung, tetapi menyatakan keterbukaan untuk mempertimbangkan masukan dari unit lain.', expertRank: 3 },
      { text: 'Mendukung posisi unit Anda sepenuhnya karena Anda yakin pendekatan unit Anda lebih tepat berdasarkan pengalaman sebelumnya.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Sinergi,
    'Anda baru bergabung dengan tim proyek lintas fungsi yang anggotanya berasal dari berbagai unit dengan latar belakang dan budaya kerja yang berbeda. Beberapa anggota tim cenderung bekerja secara individual dan jarang berbagi informasi. Akibatnya, terjadi duplikasi pekerjaan dan miskomunikasi yang menghambat kemajuan proyek. Sebagai anggota tim (bukan pemimpin), Anda melihat peluang untuk memperbaiki dinamika ini.',
    [
      { text: 'Mengambil inisiatif untuk membuat sistem berbagi informasi sederhana (misalnya dokumen bersama atau grup komunikasi), dan secara konsisten membagikan progress Anda sendiri sebagai contoh.', expertRank: 1 },
      { text: 'Mengusulkan kepada pemimpin proyek untuk mengadakan standup meeting singkat secara rutin agar semua anggota saling mengetahui progress masing-masing.', expertRank: 2 },
      { text: 'Secara proaktif menghubungi anggota tim yang pekerjaannya berkaitan dengan tugas Anda untuk berkoordinasi dan menghindari duplikasi.', expertRank: 3 },
      { text: 'Fokus menyelesaikan bagian Anda dengan baik dan berharap anggota lain juga akan melakukan hal yang sama.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Sinergi,
    'Unit Anda berhasil mengembangkan sistem informasi yang sangat efektif untuk mengelola data internal. Unit lain yang mengetahui keberhasilan ini meminta bantuan untuk mengadopsi sistem serupa, tetapi mereka memiliki kebutuhan yang sedikit berbeda. Membantu mereka akan membutuhkan waktu dan tenaga dari tim Anda yang sudah memiliki beban kerja penuh. Di sisi lain, jika sistem ini diadopsi lebih luas, akan ada manfaat sinergi data antar unit.',
    [
      { text: 'Menyusun dokumentasi dan panduan implementasi yang bisa digunakan unit lain secara mandiri, sambil menawarkan sesi konsultasi terbatas untuk pertanyaan spesifik.', expertRank: 1 },
      { text: 'Mengusulkan pembentukan tim gabungan kecil dengan perwakilan dari kedua unit untuk melakukan transfer pengetahuan secara terstruktur dalam jangka waktu tertentu.', expertRank: 2 },
      { text: 'Menawarkan akses ke kode sumber dan dokumentasi teknis, tetapi menjelaskan bahwa tim Anda tidak bisa memberikan dukungan aktif karena keterbatasan kapasitas.', expertRank: 3 },
      { text: 'Menolak dengan sopan karena membantu unit lain bukan bagian dari target kinerja unit Anda dan akan mengganggu pekerjaan yang sudah direncanakan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Sinergi,
    'Anda memimpin sub-tim dalam proyek besar yang melibatkan tiga sub-tim berbeda. Sub-tim Anda sudah menyelesaikan bagian mereka lebih awal, sementara dua sub-tim lain mengalami kesulitan dan tertinggal dari jadwal. Keberhasilan proyek secara keseluruhan bergantung pada penyelesaian semua bagian. Anggota tim Anda ingin segera beralih ke tugas lain yang sudah menunggu.',
    [
      { text: 'Menawarkan bantuan spesifik kepada sub-tim yang tertinggal berdasarkan keahlian yang dimiliki tim Anda, sambil mengkomunikasikan kepada anggota tim tentang pentingnya keberhasilan proyek secara keseluruhan.', expertRank: 1 },
      { text: 'Mengadakan pertemuan dengan pemimpin sub-tim lain untuk memahami kendala mereka dan bersama-sama mencari solusi, termasuk kemungkinan redistribusi tugas.', expertRank: 2 },
      { text: 'Melaporkan situasi kepada manajer proyek dan menyarankan agar dilakukan penyesuaian timeline atau penambahan sumber daya untuk sub-tim yang tertinggal.', expertRank: 3 },
      { text: 'Menyelesaikan dokumentasi bagian Anda dengan sempurna dan memastikan serah terima yang jelas, lalu beralih ke tugas berikutnya sesuai rencana.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Sinergi,
    'Dalam sebuah forum diskusi kebijakan, Anda menyadari bahwa ide yang Anda usulkan minggu lalu kini dipresentasikan oleh kolega dari unit lain sebagai ide mereka, dengan sedikit modifikasi. Kolega tersebut mendapat pujian dari pimpinan. Anda memiliki bukti email bahwa Anda yang pertama mengusulkan ide tersebut. Beberapa rekan Anda juga menyadari situasi ini dan menunggu reaksi Anda.',
    [
      { text: 'Mendekati kolega tersebut secara pribadi, mengapresiasi pengembangan ide tersebut, dan menyarankan untuk berkolaborasi lebih lanjut karena Anda memiliki pemikiran tambahan yang bisa memperkuat proposal.', expertRank: 1 },
      { text: 'Dalam forum, menambahkan kontribusi dengan menyebutkan bahwa Anda senang ide yang pernah Anda diskusikan sebelumnya mendapat pengembangan lebih lanjut, dan menawarkan perspektif tambahan.', expertRank: 2 },
      { text: 'Membiarkan situasi tersebut karena yang penting adalah ide baik terimplementasi, terlepas dari siapa yang mendapat kredit.', expertRank: 3 },
      { text: 'Menunjukkan bukti email kepada pimpinan untuk mengklarifikasi bahwa ide tersebut berasal dari Anda.', expertRank: 4 },
    ]
  ),
];

// ─── PELAYANAN Scenarios ──────────────────────────────────────────────────────

const pelayananScenarios = [
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Seorang wajib pajak datang ke kantor pelayanan Anda menjelang jam tutup dengan masalah yang kompleks terkait restitusi pajak. Wajib pajak tersebut terlihat frustrasi karena sudah beberapa kali datang tanpa penyelesaian. Masalahnya memerlukan koordinasi dengan bagian lain yang sudah tutup untuk hari ini. Antrian sudah kosong tetapi staf Anda sudah bersiap untuk pulang.',
    [
      { text: 'Menerima wajib pajak tersebut, mendengarkan masalahnya secara lengkap, menyelesaikan bagian yang bisa ditangani hari ini, dan membuat janji tindak lanjut yang spesifik dengan bagian terkait untuk keesokan harinya.', expertRank: 1 },
      { text: 'Menjelaskan bahwa masalah ini memerlukan koordinasi lintas bagian, membuat catatan lengkap tentang kasusnya, dan menjamin bahwa besok pagi akan menjadi prioritas pertama yang ditangani.', expertRank: 2 },
      { text: 'Memberikan penjelasan tentang proses yang diperlukan dan menjadwalkan appointment khusus di hari berikutnya ketika semua pihak terkait tersedia.', expertRank: 3 },
      { text: 'Mengarahkan wajib pajak untuk datang kembali besok pagi saat semua bagian sudah beroperasi karena masalahnya tidak bisa diselesaikan tanpa koordinasi lintas bagian.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Anda menerima keluhan dari pemangku kepentingan bahwa proses perizinan di unit Anda terlalu lama dan berbelit-belit. Setelah ditelusuri, Anda menemukan bahwa prosedur yang ada memang sudah ketinggalan zaman dan beberapa langkah sebenarnya redundan. Namun, mengubah prosedur memerlukan persetujuan dari beberapa pihak dan prosesnya sendiri bisa memakan waktu berbulan-bulan. Sementara itu, keluhan terus berdatangan.',
    [
      { text: 'Mengidentifikasi langkah-langkah yang bisa disederhanakan tanpa mengubah regulasi formal, menerapkan perbaikan cepat yang bisa dilakukan dalam kewenangan Anda, sambil secara paralel mengajukan proposal perubahan prosedur formal.', expertRank: 1 },
      { text: 'Menyusun proposal perbaikan prosedur yang komprehensif dengan data keluhan sebagai justifikasi, dan mempresentasikannya kepada pimpinan untuk mendapatkan dukungan percepatan persetujuan.', expertRank: 2 },
      { text: 'Membuat panduan yang lebih jelas untuk pemangku kepentingan tentang persyaratan dan tahapan proses, sehingga mereka bisa mempersiapkan dokumen dengan lebih baik dan mengurangi waktu proses.', expertRank: 3 },
      { text: 'Menjelaskan kepada pemangku kepentingan bahwa prosedur yang ada sudah ditetapkan dan perubahan memerlukan waktu, sambil memastikan setiap permohonan diproses sesuai SLA yang berlaku.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Unit Anda meluncurkan layanan digital baru yang menggantikan proses manual sebelumnya. Sebagian besar pengguna berhasil beradaptasi dengan baik, tetapi ada sekelompok pengguna yang umumnya berusia lanjut yang kesulitan menggunakan sistem baru dan mengeluh bahwa mereka merasa "dipaksa" menggunakan teknologi yang tidak mereka pahami. Beberapa dari mereka mengancam akan mengajukan keluhan formal ke ombudsman. Kebijakan kantor adalah mendorong penggunaan layanan digital untuk efisiensi.',
    [
      { text: 'Menyediakan jalur bantuan khusus (helpdesk atau pendampingan langsung) untuk pengguna yang kesulitan, sambil secara bertahap membantu mereka menjadi mandiri dalam menggunakan sistem digital.', expertRank: 1 },
      { text: 'Mengadakan sesi pelatihan khusus dengan pendekatan yang sabar dan bertahap untuk kelompok pengguna yang kesulitan, dengan materi yang disesuaikan dengan tingkat literasi digital mereka.', expertRank: 2 },
      { text: 'Menyediakan opsi layanan manual sementara untuk pengguna yang benar-benar tidak mampu menggunakan sistem digital, sambil terus mendorong migrasi bertahap.', expertRank: 3 },
      { text: 'Menjelaskan bahwa layanan digital adalah kebijakan yang harus diikuti semua pengguna dan menyediakan panduan tertulis yang bisa mereka pelajari sendiri.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Anda menangani kasus seorang pengusaha kecil yang mengajukan keberatan atas tagihan pajak yang menurutnya tidak sesuai. Setelah diperiksa, ternyata tagihan tersebut memang benar secara hukum, tetapi Anda melihat bahwa pengusaha tersebut tidak memahami peraturan yang berlaku dan mungkin bisa memanfaatkan fasilitas keringanan yang tersedia. Memberikan informasi tentang fasilitas tersebut bukan bagian dari tugas Anda yang spesifik.',
    [
      { text: 'Menjelaskan dasar hukum tagihan dengan bahasa yang mudah dipahami, kemudian secara proaktif menginformasikan tentang fasilitas keringanan yang mungkin bisa dimanfaatkan dan mengarahkan ke unit yang menangani.', expertRank: 1 },
      { text: 'Menjelaskan tagihan secara detail dan menyarankan pengusaha tersebut untuk berkonsultasi dengan unit pelayanan yang bisa memberikan informasi tentang opsi-opsi yang tersedia.', expertRank: 2 },
      { text: 'Menjelaskan bahwa tagihan sudah sesuai peraturan dan memberikan informasi umum tentang hak-hak wajib pajak termasuk mekanisme keberatan formal.', expertRank: 3 },
      { text: 'Menjelaskan bahwa tagihan sudah benar dan memproses keberatan sesuai prosedur standar tanpa memberikan informasi tambahan yang bukan bagian dari tugas Anda.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Sistem layanan online unit Anda mengalami gangguan teknis yang cukup serius dan menyebabkan beberapa transaksi penting gagal diproses. Anda menerima banyak telepon dan email keluhan dari pengguna yang panik karena tenggat pelaporan mereka sudah sangat dekat. Tim IT sedang bekerja keras memperbaiki masalah tetapi belum bisa memberikan estimasi waktu pemulihan yang pasti kepada Anda.',
    [
      { text: 'Segera menginformasikan situasi kepada semua pengguna yang terdampak melalui berbagai kanal, menyediakan alternatif proses manual sementara, dan memberikan jaminan bahwa tenggat akan diperpanjang jika gangguan berlanjut.', expertRank: 1 },
      { text: 'Menghubungi pengguna yang sudah mengeluh satu per satu untuk menjelaskan situasi, menawarkan bantuan manual untuk kasus yang paling mendesak, dan memberikan update berkala tentang progress perbaikan.', expertRank: 2 },
      { text: 'Membuat pengumuman resmi tentang gangguan sistem dan estimasi waktu pemulihan, serta menyediakan nomor hotline khusus untuk pengguna yang membutuhkan bantuan mendesak.', expertRank: 3 },
      { text: 'Menunggu sampai tim IT memberikan estimasi pasti, kemudian menginformasikan kepada pengguna tentang kapan sistem akan kembali normal.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Pelayanan,
    'Anda ditugaskan untuk merancang ulang formulir permohonan yang digunakan oleh ribuan pemangku kepentingan. Formulir lama memiliki 30 field yang harus diisi, dan banyak keluhan tentang kerumitannya. Setelah analisis, Anda menemukan bahwa 10 field sebenarnya bisa dihilangkan atau diisi otomatis dari database, tetapi beberapa unit internal masih membutuhkan data tersebut untuk keperluan mereka. Menghilangkan field tersebut akan memerlukan unit-unit itu mengakses data dari sumber lain.',
    [
      { text: 'Merancang formulir baru yang lebih sederhana untuk pengguna dengan hanya field yang benar-benar diperlukan dari mereka, sambil membangun integrasi backend yang menyediakan data tambahan ke unit internal dari sumber yang sudah ada.', expertRank: 1 },
      { text: 'Mengusulkan formulir bertahap di mana field wajib minimal ditampilkan pertama, dan field tambahan hanya muncul jika relevan berdasarkan jawaban sebelumnya (conditional logic).', expertRank: 2 },
      { text: 'Berkoordinasi dengan unit-unit internal untuk memahami kebutuhan data mereka yang sebenarnya, dan mencari kompromi antara kesederhanaan formulir dan kebutuhan informasi.', expertRank: 3 },
      { text: 'Mengurangi jumlah field menjadi 20 sebagai kompromi, menghilangkan yang paling jarang digunakan sambil mempertahankan yang diminta unit internal.', expertRank: 4 },
    ]
  ),
];

// ─── KESEMPURNAAN Scenarios ───────────────────────────────────────────────────

const kesempurnaanScenarios = [
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Unit Anda telah menggunakan metode pelaporan yang sama selama lima tahun. Metode ini berfungsi dengan baik dan semua orang sudah terbiasa. Namun, Anda membaca tentang pendekatan baru yang digunakan oleh kementerian lain yang menghasilkan insight lebih mendalam dan efisiensi waktu 30%. Mengadopsi pendekatan baru memerlukan investasi waktu untuk belajar dan periode transisi di mana produktivitas mungkin menurun sementara.',
    [
      { text: 'Melakukan pilot project kecil dengan pendekatan baru pada satu area pelaporan untuk memvalidasi manfaatnya dalam konteks unit Anda, sebelum mengusulkan adopsi yang lebih luas.', expertRank: 1 },
      { text: 'Menyusun proposal perbandingan antara metode lama dan baru dengan analisis cost-benefit yang jelas, termasuk rencana transisi bertahap dan mitigasi risiko.', expertRank: 2 },
      { text: 'Mempelajari pendekatan baru secara mandiri dan menerapkannya pada pekerjaan Anda sendiri terlebih dahulu untuk membuktikan efektivitasnya sebelum merekomendasikan ke tim.', expertRank: 3 },
      { text: 'Mempertahankan metode yang sudah berjalan baik karena risiko transisi tidak sebanding dengan potensi peningkatan, terutama jika metode saat ini sudah memenuhi kebutuhan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Setelah menyelesaikan audit rutin, Anda menemukan bahwa meskipun semua prosedur sudah diikuti dengan benar, ada pola inefisiensi sistemik yang menyebabkan pemborosan waktu sekitar 15% di seluruh unit. Masalah ini bukan pelanggaran dan tidak ada yang "salah" secara formal, tetapi Anda melihat peluang perbaikan yang signifikan. Mengangkat isu ini mungkin dianggap sebagai kritik terhadap sistem yang sudah mapan.',
    [
      { text: 'Mendokumentasikan temuan dengan data kuantitatif yang jelas, mengidentifikasi akar penyebab inefisiensi, dan menyusun rekomendasi perbaikan yang spesifik dan terukur untuk dipresentasikan kepada pimpinan.', expertRank: 1 },
      { text: 'Membahas temuan dengan rekan-rekan yang terlibat dalam proses tersebut untuk mendapatkan perspektif mereka dan bersama-sama mengembangkan solusi sebelum mengangkatnya ke level yang lebih tinggi.', expertRank: 2 },
      { text: 'Mencatat temuan dalam laporan audit sebagai "area peluang perbaikan" dengan rekomendasi umum, membiarkan pimpinan memutuskan apakah akan ditindaklanjuti.', expertRank: 3 },
      { text: 'Tidak mengangkat isu ini karena semua prosedur sudah diikuti dengan benar dan 15% inefisiensi mungkin adalah trade-off yang bisa diterima untuk stabilitas proses.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Anda diminta untuk mengembangkan SOP baru untuk proses yang selama ini dilakukan secara ad hoc. Ada dua pendekatan: membuat SOP yang sangat detail dan komprehensif (membutuhkan 3 bulan) atau membuat SOP yang lebih ringkas dan fleksibel (membutuhkan 1 bulan) yang bisa disempurnakan seiring waktu. Tim Anda lebih menyukai pendekatan ringkas karena mereka ingin segera memiliki panduan. Namun Anda khawatir SOP ringkas akan menimbulkan inkonsistensi.',
    [
      { text: 'Membuat SOP dengan tingkat detail yang memadai untuk area-area kritis (di mana inkonsistensi berdampak tinggi), dan lebih fleksibel untuk area yang risikonya rendah, dengan mekanisme review berkala untuk penyempurnaan.', expertRank: 1 },
      { text: 'Memulai dengan SOP ringkas yang mencakup prinsip-prinsip utama dan decision tree untuk situasi kritis, lalu menjadwalkan iterasi penyempurnaan setiap bulan berdasarkan feedback implementasi.', expertRank: 2 },
      { text: 'Membuat SOP komprehensif karena investasi waktu di awal akan menghemat waktu dan mencegah masalah di kemudian hari, sambil menyediakan quick reference guide untuk penggunaan sehari-hari.', expertRank: 3 },
      { text: 'Membuat SOP ringkas sesuai preferensi tim agar segera bisa digunakan, dengan catatan bahwa penyempurnaan akan dilakukan nanti jika diperlukan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Anda bertanggung jawab atas program pelatihan internal di unit Anda. Evaluasi menunjukkan bahwa peserta memberikan rating kepuasan tinggi (4.5/5), tetapi assessment pasca-pelatihan menunjukkan bahwa transfer pengetahuan ke pekerjaan sehari-hari hanya sekitar 40%. Artinya, peserta senang dengan pelatihan tetapi tidak banyak menerapkan apa yang dipelajari. Mengubah format pelatihan akan memerlukan investasi lebih besar dan mungkin menurunkan rating kepuasan.',
    [
      { text: 'Merancang ulang program dengan fokus pada aplikasi praktis dan follow-up pasca-pelatihan, menerima bahwa rating kepuasan mungkin turun tetapi efektivitas transfer pengetahuan akan meningkat.', expertRank: 1 },
      { text: 'Menambahkan komponen action learning dan mentoring pasca-pelatihan untuk meningkatkan transfer pengetahuan, sambil mempertahankan elemen-elemen pelatihan yang disukai peserta.', expertRank: 2 },
      { text: 'Melakukan analisis mendalam tentang hambatan transfer pengetahuan (apakah masalah desain pelatihan, lingkungan kerja, atau dukungan atasan) sebelum memutuskan perubahan.', expertRank: 3 },
      { text: 'Mempertahankan format pelatihan yang ada karena rating kepuasan tinggi menunjukkan kualitas yang baik, dan rendahnya transfer mungkin disebabkan faktor di luar kendali program pelatihan.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Tim Anda baru saja menyelesaikan implementasi sistem yang memenuhi semua persyaratan yang ditetapkan. Namun, selama proses pengujian, Anda menemukan bahwa user experience bisa ditingkatkan secara signifikan dengan beberapa perubahan desain yang tidak ada dalam spesifikasi awal. Perubahan ini akan membutuhkan waktu tambahan satu minggu dan tidak diminta oleh siapa pun. Sistem sudah dijadwalkan untuk go-live minggu depan.',
    [
      { text: 'Mendokumentasikan peluang perbaikan UX dengan mockup dan justifikasi dampak terhadap pengguna, mengusulkan implementasi sebagai update segera setelah go-live agar jadwal tidak terganggu tetapi perbaikan tetap terlaksana.', expertRank: 1 },
      { text: 'Mempresentasikan temuan kepada pemangku kepentingan dengan demonstrasi perbandingan, membiarkan mereka memutuskan apakah menunda go-live satu minggu untuk perbaikan UX.', expertRank: 2 },
      { text: 'Mengimplementasikan perbaikan UX yang paling berdampak (yang bisa diselesaikan dalam 2-3 hari) sebelum go-live, dan menjadwalkan sisanya untuk iterasi berikutnya.', expertRank: 3 },
      { text: 'Melanjutkan go-live sesuai jadwal karena sistem sudah memenuhi semua persyaratan yang ditetapkan dan perubahan tambahan bisa menimbulkan risiko baru.', expertRank: 4 },
    ]
  ),
  makeScenario(
    KemenkeuValue.Kesempurnaan,
    'Anda menerima feedback dari pengguna bahwa laporan bulanan yang dihasilkan unit Anda, meskipun akurat, sulit dipahami oleh pembaca non-teknis. Laporan ini sudah menggunakan format standar yang ditetapkan oleh regulasi. Beberapa kolega berpendapat bahwa format standar sudah cukup dan tugas mereka hanya menyajikan data, bukan "mendidik" pembaca. Namun Anda melihat bahwa laporan yang sulit dipahami mengurangi efektivitas pengambilan keputusan.',
    [
      { text: 'Membuat laporan dengan dua layer: mempertahankan format standar regulasi sebagai lampiran teknis, dan menambahkan executive summary dengan visualisasi dan narasi yang mudah dipahami pembaca non-teknis.', expertRank: 1 },
      { text: 'Mengusulkan perbaikan format laporan kepada pimpinan dengan contoh konkret bagaimana penyajian yang lebih baik bisa meningkatkan kualitas keputusan, sambil tetap memenuhi persyaratan regulasi.', expertRank: 2 },
      { text: 'Menambahkan glossary dan catatan penjelasan pada laporan yang ada untuk membantu pembaca non-teknis memahami istilah dan angka-angka kunci.', expertRank: 3 },
      { text: 'Mempertahankan format standar karena sudah sesuai regulasi dan tanggung jawab unit adalah menyajikan data yang akurat, bukan menyesuaikan dengan tingkat pemahaman setiap pembaca.', expertRank: 4 },
    ]
  ),
];

// ─── Seed Data Assembly ──────────────────────────────────────────────────────

/**
 * All 30 SJT scenarios organized by Kemenkeu value.
 */
export const sjtSeedData: CreateSjtScenarioInput[] = [
  ...integritasScenarios,
  ...profesionalismeScenarios,
  ...sinergiScenarios,
  ...pelayananScenarios,
  ...kesempurnaanScenarios,
].map((scenario, index) => ({
  dimension: scenario.content.kemenkeuValue,
  itemPosition: index + 1,
  content: scenario.content,
  expertRanking: scenario.expertRanking,
}));

/**
 * Seeds the SJT item bank into the database.
 * Clears existing SJT items before seeding to ensure idempotency.
 */
export async function seedSjtItems(db: import('../db/connection').Database): Promise<void> {
  const { SjtRepository } = await import('./sjt.repository');
  const repo = new SjtRepository(db);

  // Clear existing SJT items for idempotent seeding
  await db.query(`DELETE FROM items WHERE section_type = 'sjt'`);

  // Insert all scenarios
  await repo.createBatch(sjtSeedData);

  console.log(`[SJT Seed] Successfully seeded ${sjtSeedData.length} SJT scenarios:`);
  console.log(`  - Integritas: ${integritasScenarios.length} scenarios`);
  console.log(`  - Profesionalisme: ${profesionalismeScenarios.length} scenarios`);
  console.log(`  - Sinergi: ${sinergiScenarios.length} scenarios`);
  console.log(`  - Pelayanan: ${pelayananScenarios.length} scenarios`);
  console.log(`  - Kesempurnaan: ${kesempurnaanScenarios.length} scenarios`);
}

// ─── CLI Execution ───────────────────────────────────────────────────────────

if (require.main === module) {
  import('../db/connection').then(async ({ getDatabase, closeDatabase }) => {
    try {
      const db = getDatabase();
      await seedSjtItems(db);
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      console.error('[SJT Seed] Failed to seed SJT items:', error);
      process.exit(1);
    }
  });
}
