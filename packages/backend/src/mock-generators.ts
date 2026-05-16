/**
 * Mock data generators for personality and SJT assessments.
 * 120 forced-choice personality items (24 per OCEAN dimension)
 * 30 SJT scenarios (6 per Kemenkeu value)
 */

// ─── Personality Items: 120 Forced-Choice (Bahasa Indonesia) ─────────────────

export function generateMockPersonalityItems() {
  const statements: [string, string][] = [
    // ═══ OPENNESS (items 0-23) ═══
    // Facet: Creativity (0-3)
    ['Saya sering menemukan cara-cara baru untuk menyelesaikan masalah yang sudah ada solusinya', 'Saya lebih memilih mengikuti prosedur yang sudah terbukti efektif'],
    ['Saya senang bereksperimen dengan pendekatan yang belum pernah dicoba sebelumnya', 'Saya merasa lebih produktif ketika menggunakan metode yang sudah familiar'],
    ['Saya sering membayangkan alternatif-alternatif yang tidak terpikirkan orang lain', 'Saya fokus pada solusi yang realistis dan sudah teruji'],
    ['Saya tertarik menciptakan sesuatu yang benar-benar orisinal', 'Saya lebih suka menyempurnakan hal-hal yang sudah ada'],
    // Facet: Curiosity (4-7)
    ['Saya selalu ingin memahami mengapa sesuatu bekerja dengan cara tertentu', 'Saya cukup puas mengetahui bahwa sesuatu berfungsi tanpa perlu tahu detailnya'],
    ['Saya gemar mempelajari topik-topik di luar bidang keahlian saya', 'Saya lebih memilih mendalami satu bidang yang sudah saya kuasai'],
    ['Pertanyaan yang belum terjawab membuat saya penasaran dan termotivasi', 'Saya lebih nyaman dengan kepastian daripada pertanyaan terbuka'],
    ['Saya sering membaca atau menonton konten tentang subjek yang sama sekali baru bagi saya', 'Saya lebih memilih konten yang relevan langsung dengan pekerjaan saya'],
    // Facet: Imagination (8-11)
    ['Saya sering membayangkan skenario-skenario hipotetis yang kompleks', 'Saya lebih fokus pada situasi nyata yang ada di depan mata'],
    ['Pikiran saya sering melayang ke kemungkinan-kemungkinan masa depan', 'Saya lebih suka berkonsentrasi pada tugas yang sedang dikerjakan saat ini'],
    ['Saya mudah membayangkan diri saya dalam situasi yang sangat berbeda dari kehidupan saya', 'Saya lebih realistis dalam memandang posisi dan kemampuan saya'],
    ['Saya sering memiliki ide-ide yang orang lain anggap tidak konvensional', 'Saya cenderung berpikir sejalan dengan pandangan umum'],
    // Facet: Aesthetics (12-15)
    ['Saya sangat memperhatikan keindahan dan harmoni dalam lingkungan kerja', 'Saya lebih mementingkan fungsionalitas daripada estetika'],
    ['Karya seni atau musik dapat mempengaruhi suasana hati saya secara mendalam', 'Saya menghargai seni tetapi tidak terlalu terpengaruh secara emosional'],
    ['Saya menikmati mengamati detail-detail kecil yang membuat sesuatu menjadi indah', 'Saya lebih memperhatikan gambaran besar daripada detail estetis'],
    ['Lingkungan yang tertata rapi dan estetis meningkatkan produktivitas saya', 'Saya bisa bekerja dengan baik di lingkungan apapun selama fungsional'],
    // Facet: Intellectual interests (16-19)
    ['Saya menikmati diskusi filosofis tentang makna dan tujuan hidup', 'Saya lebih tertarik pada percakapan praktis tentang hal-hal konkret'],
    ['Membaca buku atau artikel yang menantang pemikiran saya adalah kegiatan yang menyenangkan', 'Saya lebih memilih bacaan ringan yang menghibur'],
    ['Saya tertarik pada teori-teori yang menjelaskan fenomena kompleks', 'Saya lebih tertarik pada aplikasi praktis daripada teori'],
    ['Debat intelektual yang konstruktif membuat saya bersemangat', 'Saya lebih suka menghindari perdebatan dan mencari konsensus'],
    // Facet: Unconventionality (20-23)
    ['Saya sering mempertanyakan aturan dan tradisi yang sudah mapan', 'Saya menghormati tradisi dan aturan yang sudah teruji waktu'],
    ['Saya merasa nyaman dengan ambiguitas dan ketidakpastian', 'Saya lebih suka kejelasan dan struktur yang pasti'],
    ['Saya tertarik pada perspektif yang sangat berbeda dari pandangan mainstream', 'Saya lebih nyaman dengan pandangan yang diterima secara umum'],
    ['Saya tidak keberatan jika pendekatan saya berbeda dari kebanyakan orang', 'Saya lebih suka mengikuti cara yang sudah diterima bersama'],

    // ═══ CONSCIENTIOUSNESS (items 24-47) ═══
    // Facet: Organization (24-27)
    ['Saya selalu merencanakan kegiatan saya jauh-jauh hari sebelumnya', 'Saya lebih fleksibel dan menyesuaikan rencana sesuai situasi'],
    ['Meja kerja dan file digital saya selalu tersusun rapi dan sistematis', 'Saya memiliki sistem pengorganisasian sendiri yang mungkin terlihat berantakan bagi orang lain'],
    ['Saya membuat daftar tugas terperinci dan mengikutinya dengan ketat', 'Saya lebih suka mengalir dan menangani tugas sesuai prioritas yang berubah'],
    ['Saya merasa tidak nyaman jika jadwal saya tidak terstruktur dengan jelas', 'Saya justru merasa terkekang dengan jadwal yang terlalu ketat'],
    // Facet: Diligence (28-31)
    ['Saya terus bekerja pada tugas sampai benar-benar selesai meskipun sudah lelah', 'Saya tahu kapan harus berhenti dan melanjutkan dengan energi segar keesokan harinya'],
    ['Saya jarang menunda-nunda pekerjaan meskipun tidak menyenangkan', 'Saya kadang menunda tugas yang kurang menarik untuk mengerjakan yang lebih menantang'],
    ['Saya selalu menyelesaikan apa yang sudah saya mulai tanpa pengecualian', 'Saya bisa meninggalkan proyek yang ternyata tidak produktif'],
    ['Saya bekerja dengan intensitas tinggi dan konsisten sepanjang hari', 'Saya bekerja dalam ritme yang bervariasi sesuai energi dan inspirasi'],
    // Facet: Perfectionism (32-35)
    ['Saya memeriksa pekerjaan saya berulang kali untuk memastikan tidak ada kesalahan', 'Saya percaya bahwa hasil yang cukup baik lebih penting daripada sempurna'],
    ['Saya menetapkan standar yang sangat tinggi untuk setiap tugas yang saya kerjakan', 'Saya menyesuaikan standar dengan tingkat kepentingan tugas'],
    ['Detail kecil yang terlewat oleh orang lain sangat mengganggu saya', 'Saya bisa menerima ketidaksempurnaan kecil demi efisiensi waktu'],
    ['Saya tidak puas sampai hasil pekerjaan mencapai standar tertinggi yang mungkin', 'Saya puas ketika pekerjaan sudah memenuhi persyaratan yang ditetapkan'],
    // Facet: Prudence (36-39)
    ['Saya selalu mempertimbangkan konsekuensi jangka panjang sebelum mengambil keputusan', 'Saya percaya bahwa terkadang keputusan cepat lebih baik daripada analisis berlebihan'],
    ['Saya menghindari risiko yang tidak perlu dalam pekerjaan', 'Saya bersedia mengambil risiko yang diperhitungkan untuk hasil yang lebih besar'],
    ['Saya selalu memiliki rencana cadangan untuk mengantisipasi kemungkinan buruk', 'Saya percaya pada kemampuan saya untuk beradaptasi tanpa perlu rencana cadangan'],
    ['Saya berpikir panjang sebelum berkomitmen pada sesuatu', 'Saya lebih spontan dan percaya pada intuisi saya'],
    // Facet: Self-discipline (40-43)
    ['Saya mampu menahan godaan untuk melakukan hal yang menyenangkan demi menyelesaikan tugas', 'Saya percaya keseimbangan antara kerja dan kesenangan penting untuk produktivitas'],
    ['Saya tetap fokus pada tujuan meskipun ada banyak distraksi', 'Saya fleksibel dalam mengalihkan perhatian ketika ada hal penting yang muncul'],
    ['Saya disiplin mengikuti rutinitas yang sudah saya tetapkan', 'Saya menyesuaikan rutinitas sesuai kebutuhan dan suasana hati'],
    ['Saya jarang membiarkan emosi mengganggu produktivitas kerja saya', 'Saya mendengarkan sinyal emosional sebagai panduan kapan perlu istirahat'],
    // Facet: Achievement striving (44-47)
    ['Saya selalu berusaha melampaui target yang ditetapkan', 'Saya fokus memenuhi target dengan kualitas yang konsisten'],
    ['Saya merasa tidak puas jika tidak ada kemajuan yang terukur setiap harinya', 'Saya memahami bahwa kemajuan tidak selalu linear dan terukur'],
    ['Ambisi profesional adalah motivasi utama dalam hidup saya', 'Saya mencari keseimbangan antara pencapaian profesional dan aspek kehidupan lainnya'],
    ['Saya terus-menerus mencari cara untuk meningkatkan kinerja saya', 'Saya puas dengan kinerja yang sudah baik dan stabil'],

    // ═══ EXTRAVERSION (items 48-71) ═══
    // Facet: Sociability (48-51)
    ['Saya merasa berenergi setelah menghabiskan waktu bersama banyak orang', 'Saya membutuhkan waktu sendiri untuk mengisi ulang energi setelah bersosialisasi'],
    ['Saya aktif mencari kesempatan untuk berinteraksi dengan orang-orang baru', 'Saya lebih memilih memperdalam hubungan dengan orang-orang yang sudah saya kenal'],
    ['Saya merasa tidak nyaman jika harus bekerja sendirian dalam waktu lama', 'Saya sangat produktif ketika bekerja dalam ketenangan tanpa gangguan'],
    ['Acara sosial dan networking adalah hal yang saya nantikan', 'Saya menghadiri acara sosial karena kewajiban tetapi lebih suka waktu berkualitas dengan sedikit orang'],
    // Facet: Assertiveness (52-55)
    ['Saya tidak ragu mengambil peran pemimpin dalam situasi kelompok', 'Saya lebih nyaman sebagai kontributor yang mendukung pemimpin'],
    ['Saya dengan tegas menyampaikan ketidaksetujuan saya dalam diskusi', 'Saya memilih waktu dan cara yang tepat untuk menyampaikan perbedaan pendapat'],
    ['Saya sering menjadi orang pertama yang mengusulkan arah dalam rapat', 'Saya lebih suka mendengarkan dulu sebelum memberikan masukan'],
    ['Saya nyaman memberikan instruksi dan arahan kepada orang lain', 'Saya lebih suka berkolaborasi secara setara daripada mengarahkan'],
    // Facet: Energy level (56-59)
    ['Saya memiliki energi yang tampaknya tidak habis-habis sepanjang hari', 'Saya mengelola energi dengan hati-hati dan tahu kapan perlu beristirahat'],
    ['Saya bisa menangani banyak aktivitas sekaligus tanpa merasa kewalahan', 'Saya lebih efektif ketika fokus pada satu hal dalam satu waktu'],
    ['Tempo kerja saya cepat dan saya tidak sabar dengan proses yang lambat', 'Saya bekerja dengan tempo yang stabil dan teliti'],
    ['Saya selalu siap untuk tantangan baru bahkan di akhir hari kerja', 'Saya menghargai batasan energi dan menjaga keseimbangan kerja-istirahat'],
    // Facet: Excitement-seeking (60-63)
    ['Saya mencari pengalaman yang memacu adrenalin dan memberikan sensasi', 'Saya lebih menikmati aktivitas yang tenang dan dapat diprediksi'],
    ['Rutinitas yang monoton membuat saya gelisah dan tidak termotivasi', 'Saya menemukan kenyamanan dan efisiensi dalam rutinitas yang stabil'],
    ['Saya tertarik pada proyek-proyek berisiko tinggi dengan potensi hasil besar', 'Saya lebih memilih proyek dengan hasil yang dapat diprediksi'],
    ['Saya sering mencari variasi dan perubahan dalam pekerjaan sehari-hari', 'Saya menghargai konsistensi dan prediktabilitas dalam pekerjaan'],
    // Facet: Cheerfulness (64-67)
    ['Saya cenderung melihat sisi positif dari setiap situasi', 'Saya lebih realistis dan mempertimbangkan semua kemungkinan termasuk yang negatif'],
    ['Saya sering tertawa dan membuat suasana menjadi lebih ceria', 'Saya lebih serius dan fokus dalam interaksi profesional'],
    ['Optimisme saya menular kepada orang-orang di sekitar saya', 'Saya lebih memilih memberikan analisis objektif daripada optimisme'],
    ['Saya mudah merasa antusias dan bersemangat tentang hal-hal baru', 'Saya merespons hal baru dengan pertimbangan yang hati-hati'],
    // Facet: Friendliness (68-71)
    ['Saya dengan mudah membuat orang lain merasa nyaman dan diterima', 'Saya membutuhkan waktu untuk membangun kepercayaan sebelum membuka diri'],
    ['Saya secara alami hangat dan ramah kepada semua orang yang saya temui', 'Saya selektif dalam menunjukkan kehangatan dan lebih reserved pada awalnya'],
    ['Saya senang memulai percakapan dengan orang yang belum saya kenal', 'Saya menunggu orang lain memulai percakapan terlebih dahulu'],
    ['Saya merasa terhubung secara emosional dengan banyak orang di lingkungan kerja', 'Saya menjaga batas profesional yang jelas dalam hubungan kerja'],

    // ═══ AGREEABLENESS (items 72-95) ═══
    // Facet: Trust (72-75)
    ['Saya percaya bahwa kebanyakan orang memiliki niat baik', 'Saya berhati-hati dan memverifikasi niat orang sebelum mempercayai mereka'],
    ['Saya memberikan kepercayaan kepada rekan kerja baru sejak awal', 'Saya membangun kepercayaan secara bertahap berdasarkan bukti konsistensi'],
    ['Saya jarang mencurigai motif tersembunyi di balik tindakan orang lain', 'Saya selalu mempertimbangkan kemungkinan adanya agenda tersembunyi'],
    ['Saya percaya bahwa orang akan menepati komitmen mereka', 'Saya selalu memiliki rencana cadangan jika orang lain tidak menepati janji'],
    // Facet: Altruism (76-79)
    ['Membantu orang lain berhasil memberikan kepuasan yang mendalam bagi saya', 'Saya fokus pada pencapaian pribadi yang kemudian bisa menginspirasi orang lain'],
    ['Saya rela mengorbankan waktu pribadi untuk membantu rekan yang kesulitan', 'Saya membantu dalam batas yang tidak mengganggu tanggung jawab utama saya'],
    ['Keberhasilan tim lebih penting bagi saya daripada pengakuan individual', 'Saya percaya kontribusi individual yang kuat adalah fondasi keberhasilan tim'],
    ['Saya secara proaktif menawarkan bantuan tanpa diminta', 'Saya membantu ketika diminta agar tidak terkesan meragukan kemampuan orang lain'],
    // Facet: Cooperation (80-83)
    ['Saya lebih memilih berkompromi daripada mempertahankan posisi saya', 'Saya mempertahankan posisi yang saya yakini benar meskipun harus berdebat'],
    ['Harmoni dalam tim lebih penting daripada memenangkan argumen', 'Kebenaran dan kualitas keputusan lebih penting daripada menghindari konflik'],
    ['Saya mudah menyesuaikan pendekatan saya dengan preferensi kelompok', 'Saya konsisten dengan pendekatan yang saya yakini efektif'],
    ['Saya menghindari konfrontasi dan mencari jalan tengah', 'Saya tidak takut konfrontasi konstruktif demi hasil yang lebih baik'],
    // Facet: Modesty (84-87)
    ['Saya tidak suka menjadi pusat perhatian meskipun berhasil', 'Saya nyaman menerima pengakuan atas pencapaian saya'],
    ['Saya lebih suka membiarkan hasil kerja berbicara sendiri', 'Saya aktif mengkomunikasikan pencapaian untuk memastikan kontribusi diakui'],
    ['Saya merasa tidak nyaman menerima pujian berlebihan', 'Saya menerima pujian dengan percaya diri sebagai umpan balik positif'],
    ['Saya cenderung meremehkan kemampuan saya sendiri', 'Saya memiliki penilaian yang akurat dan percaya diri tentang kemampuan saya'],
    // Facet: Sympathy (88-91)
    ['Saya sangat terpengaruh oleh penderitaan orang lain', 'Saya berempati tetapi menjaga jarak emosional untuk tetap objektif'],
    ['Saya selalu berusaha memahami perasaan orang lain sebelum merespons', 'Saya merespons berdasarkan fakta dan logika terlebih dahulu'],
    ['Saya mudah merasakan emosi yang dialami orang di sekitar saya', 'Saya menjaga batasan emosional yang sehat dengan orang lain'],
    ['Kesejahteraan emosional rekan kerja adalah tanggung jawab bersama', 'Setiap orang bertanggung jawab atas kesejahteraan emosionalnya sendiri'],
    // Facet: Morality (92-95)
    ['Saya selalu jujur meskipun kejujuran itu merugikan diri sendiri', 'Saya mempertimbangkan konteks dan dampak sebelum memutuskan seberapa transparan saya'],
    ['Saya tidak pernah menggunakan manipulasi untuk mencapai tujuan', 'Saya menggunakan strategi persuasi yang cerdas untuk mencapai hasil terbaik'],
    ['Saya memperlakukan semua orang dengan standar keadilan yang sama', 'Saya menyesuaikan pendekatan berdasarkan situasi dan kebutuhan individu'],
    ['Prinsip moral saya tidak bisa dinegosiasikan dalam situasi apapun', 'Saya memahami bahwa situasi kompleks kadang memerlukan fleksibilitas etis'],

    // ═══ NEUROTICISM (items 96-119) ═══
    // Facet: Anxiety (96-99)
    ['Saya sering merasa khawatir tentang hal-hal yang mungkin salah', 'Saya jarang merasa cemas dan percaya bahwa masalah bisa diatasi saat muncul'],
    ['Pikiran tentang kemungkinan kegagalan sering mengganggu konsentrasi saya', 'Saya mampu menyingkirkan pikiran negatif dan fokus pada tugas'],
    ['Saya cenderung memikirkan skenario terburuk dalam situasi yang tidak pasti', 'Saya menghadapi ketidakpastian dengan ketenangan dan kepercayaan diri'],
    ['Menjelang deadline penting, saya sulit tidur karena memikirkan pekerjaan', 'Saya mampu memisahkan pekerjaan dari waktu istirahat dengan baik'],
    // Facet: Anger (100-103)
    ['Saya mudah merasa frustrasi ketika hal-hal tidak berjalan sesuai rencana', 'Saya menerima perubahan rencana dengan tenang dan mencari solusi alternatif'],
    ['Ketidakadilan membuat saya sangat marah dan sulit melupakan', 'Saya merespons ketidakadilan dengan tindakan konstruktif tanpa terbawa emosi'],
    ['Saya kadang menyesal karena bereaksi terlalu keras terhadap situasi', 'Saya mampu mengontrol reaksi emosional saya dalam situasi yang memancing'],
    ['Kritik yang tidak adil membuat saya defensif dan kesal', 'Saya menerima semua kritik sebagai informasi dan mengevaluasinya secara objektif'],
    // Facet: Depression (104-107)
    ['Saya kadang merasa tidak bersemangat tanpa alasan yang jelas', 'Saya umumnya merasa bersemangat dan termotivasi setiap hari'],
    ['Kegagalan membuat saya mempertanyakan kemampuan diri sendiri', 'Kegagalan adalah pembelajaran yang memperkuat tekad saya'],
    ['Saya kadang merasa bahwa usaha saya tidak akan menghasilkan perubahan berarti', 'Saya percaya bahwa setiap usaha berkontribusi pada hasil yang positif'],
    ['Ada saat-saat ketika saya merasa hampa dan kehilangan minat pada pekerjaan', 'Saya secara konsisten menemukan makna dan kepuasan dalam pekerjaan saya'],
    // Facet: Self-consciousness (108-111)
    ['Saya sangat peduli dengan bagaimana orang lain menilai saya', 'Saya fokus pada standar internal saya sendiri daripada penilaian orang lain'],
    ['Saya merasa canggung dalam situasi sosial yang tidak familiar', 'Saya merasa nyaman di hampir semua situasi sosial'],
    ['Membuat kesalahan di depan orang lain sangat memalukan bagi saya', 'Saya menerima kesalahan sebagai hal yang manusiawi dan tidak merasa malu'],
    ['Saya sering menganalisis ulang interaksi sosial dan khawatir telah mengatakan hal yang salah', 'Saya jarang memikirkan ulang percakapan yang sudah berlalu'],
    // Facet: Vulnerability (112-115)
    ['Tekanan yang tinggi membuat saya merasa kewalahan dan tidak berdaya', 'Saya justru berkinerja lebih baik di bawah tekanan'],
    ['Saya membutuhkan dukungan orang lain untuk menghadapi situasi sulit', 'Saya mampu mengatasi kesulitan secara mandiri'],
    ['Perubahan mendadak dalam rencana membuat saya stres dan bingung', 'Saya beradaptasi dengan cepat terhadap perubahan yang tidak terduga'],
    ['Saya merasa rapuh ketika menghadapi kritik dari atasan', 'Saya menerima kritik atasan sebagai masukan untuk perbaikan'],
    // Facet: Impulsiveness (116-119)
    ['Saya sering membuat keputusan berdasarkan dorongan sesaat yang kemudian saya sesali', 'Saya selalu berpikir matang sebelum mengambil keputusan'],
    ['Saya sulit menahan diri dari mengatakan hal-hal yang ada di pikiran saya', 'Saya memfilter pikiran saya dengan hati-hati sebelum berbicara'],
    ['Saya kadang bertindak tanpa memikirkan konsekuensinya', 'Saya selalu mempertimbangkan dampak tindakan saya sebelum bertindak'],
    ['Emosi saya sering mempengaruhi keputusan profesional saya', 'Saya mampu memisahkan emosi dari pengambilan keputusan profesional'],
  ];

  return statements.map((pair, i) => ({
    type: 'forced_choice' as const,
    itemId: `item-${i}`,
    statementLeft: pair[0],
    statementRight: pair[1],
    renderedAt: Date.now(),
  }));
}


// ─── SJT Scenarios: 30 Scenarios (Bahasa Indonesia) ──────────────────────────

export function generateMockSjtScenarios() {
  return [
    // ═══ INTEGRITAS (scenarios 1-6) ═══
    {
      itemId: 'sjt-1',
      scenarioText: 'Anda menemukan bahwa rekan kerja senior telah melakukan kesalahan pencatatan yang menguntungkan pihak tertentu selama 6 bulan terakhir. Rekan tersebut dikenal sebagai mentor bagi banyak pegawai junior dan memiliki reputasi baik di kantor. Anda belum yakin apakah ini kesengajaan atau kelalaian. Jika dilaporkan, hal ini bisa berdampak pada karir rekan tersebut dan dinamika tim.',
      options: [
        { id: 'a', text: 'Mendokumentasikan temuan secara lengkap dan melaporkannya melalui mekanisme pelaporan resmi tanpa memandang siapa yang terlibat' },
        { id: 'b', text: 'Menemui rekan tersebut secara pribadi untuk meminta klarifikasi dan memberikan kesempatan mengoreksi sebelum mengambil langkah formal' },
        { id: 'c', text: 'Berkonsultasi dengan atasan langsung tentang temuan tanpa menyebutkan nama untuk mendapatkan arahan' },
        { id: 'd', text: 'Mengumpulkan lebih banyak bukti secara diam-diam selama beberapa minggu untuk memastikan temuan tidak keliru sebelum bertindak' },
      ],
    },
    {
      itemId: 'sjt-2',
      scenarioText: 'Atasan Anda meminta Anda untuk mempercepat proses persetujuan dokumen penting dengan melewati beberapa tahap verifikasi standar. Alasannya adalah tekanan dari pihak eksternal yang berpengaruh dan tenggat waktu yang sangat ketat. Atasan menjamin bahwa dokumen tersebut sudah benar dan verifikasi hanya formalitas. Anda tahu bahwa prosedur verifikasi ada untuk mencegah kesalahan yang berpotensi merugikan negara.',
      options: [
        { id: 'a', text: 'Menolak dengan sopan dan menjelaskan bahwa prosedur verifikasi tidak bisa dilewati karena merupakan bagian dari pengendalian internal' },
        { id: 'b', text: 'Melakukan verifikasi cepat pada aspek-aspek paling kritis sambil mendokumentasikan instruksi atasan secara tertulis' },
        { id: 'c', text: 'Meminta atasan untuk memberikan instruksi tertulis resmi agar ada kejelasan tanggung jawab jika terjadi masalah' },
        { id: 'd', text: 'Mengikuti instruksi atasan karena beliau yang bertanggung jawab atas keputusan tersebut' },
      ],
    },
    {
      itemId: 'sjt-3',
      scenarioText: 'Anda menerima hadiah berupa voucher belanja senilai Rp 2 juta dari vendor yang baru saja memenangkan tender di unit Anda. Vendor tersebut mengatakan ini adalah ucapan terima kasih atas kerja sama yang baik dan bukan terkait tender. Beberapa rekan Anda juga menerima hadiah serupa. Aturan internal menyatakan bahwa gratifikasi harus dilaporkan dalam 30 hari.',
      options: [
        { id: 'a', text: 'Menolak hadiah tersebut dengan sopan dan menjelaskan kebijakan anti-gratifikasi kepada vendor' },
        { id: 'b', text: 'Menerima hadiah tetapi segera melaporkannya ke unit kepatuhan internal sesuai prosedur' },
        { id: 'c', text: 'Berkonsultasi dengan atasan tentang situasi ini sebelum mengambil keputusan' },
        { id: 'd', text: 'Mengembalikan hadiah dan menyarankan vendor untuk menyalurkan apresiasi melalui program CSR resmi' },
      ],
    },
    {
      itemId: 'sjt-4',
      scenarioText: 'Dalam proses audit internal, Anda menemukan bahwa laporan keuangan triwulanan unit Anda mengandung inkonsistensi yang jika diperbaiki akan membuat kinerja unit terlihat lebih rendah dari target. Perbaikan ini akan mempengaruhi penilaian kinerja seluruh tim dan berpotensi mengurangi tunjangan kinerja. Batas waktu pelaporan adalah besok.',
      options: [
        { id: 'a', text: 'Memperbaiki inkonsistensi segera dan melaporkan temuan beserta dampaknya kepada atasan dengan transparansi penuh' },
        { id: 'b', text: 'Melaporkan temuan kepada atasan dan meminta arahan tentang cara terbaik menangani koreksi dalam batas waktu yang ada' },
        { id: 'c', text: 'Memperbaiki inkonsistensi dan menyiapkan penjelasan tertulis tentang penyebab penurunan angka kinerja' },
        { id: 'd', text: 'Meminta perpanjangan waktu pelaporan untuk melakukan verifikasi menyeluruh sebelum mengambil keputusan' },
      ],
    },
    {
      itemId: 'sjt-5',
      scenarioText: 'Anda mengetahui bahwa seorang kolega menggunakan fasilitas kantor (kendaraan dinas dan staf) untuk keperluan pribadi secara rutin di akhir pekan. Kolega tersebut adalah orang yang sangat membantu Anda dalam pekerjaan dan pernah mendukung promosi Anda. Tidak ada yang pernah mempermasalahkan hal ini sebelumnya karena kolega tersebut memiliki posisi yang cukup tinggi.',
      options: [
        { id: 'a', text: 'Melaporkan melalui saluran whistleblowing yang tersedia karena ini merupakan penyalahgunaan aset negara' },
        { id: 'b', text: 'Berbicara secara pribadi dengan kolega tersebut tentang risiko yang dihadapi dan menyarankan untuk menghentikan praktik tersebut' },
        { id: 'c', text: 'Menyampaikan kekhawatiran kepada atasan langsung Anda tanpa menyebutkan nama secara spesifik' },
        { id: 'd', text: 'Tidak mengambil tindakan karena ini bukan tanggung jawab langsung Anda dan tidak merugikan pekerjaan Anda' },
      ],
    },
    {
      itemId: 'sjt-6',
      scenarioText: 'Anda diminta menjadi saksi dalam penandatanganan dokumen yang Anda tahu isinya tidak sepenuhnya akurat. Dokumen tersebut terkait dengan laporan realisasi anggaran yang akan disampaikan ke DPR. Pejabat yang meminta Anda mengatakan bahwa ketidakakuratan tersebut bersifat teknis dan akan dikoreksi di laporan berikutnya. Menolak bisa merusak hubungan kerja Anda.',
      options: [
        { id: 'a', text: 'Menolak menjadi saksi dan menjelaskan secara tertulis alasan penolakan berdasarkan ketidakakuratan yang ditemukan' },
        { id: 'b', text: 'Meminta agar ketidakakuratan diperbaiki terlebih dahulu sebelum Anda bersedia menjadi saksi' },
        { id: 'c', text: 'Menjadi saksi tetapi mencatat keberatan Anda secara tertulis dan menyimpan salinan sebagai dokumentasi' },
        { id: 'd', text: 'Berkonsultasi dengan bagian hukum tentang implikasi menjadi saksi dokumen yang tidak sepenuhnya akurat' },
      ],
    },

    // ═══ PROFESIONALISME (scenarios 7-12) ═══
    {
      itemId: 'sjt-7',
      scenarioText: 'Anda ditugaskan memimpin proyek implementasi sistem informasi baru yang memiliki tenggat waktu ketat dari Menteri. Di tengah proyek, Anda menyadari bahwa spesifikasi teknis memiliki beberapa kelemahan arsitektur yang bisa menyebabkan masalah keamanan data di kemudian hari. Memperbaiki kelemahan ini akan memundurkan jadwal sekitar tiga minggu dari target yang sudah dijanjikan.',
      options: [
        { id: 'a', text: 'Mengidentifikasi kelemahan secara spesifik, mengkuantifikasi risikonya, dan mempresentasikan opsi mitigasi kepada pemangku kepentingan dengan rekomendasi prioritas' },
        { id: 'b', text: 'Melaporkan temuan kepada atasan dengan justifikasi teknis yang jelas dan meminta keputusan tentang perpanjangan waktu versus risiko yang diterima' },
        { id: 'c', text: 'Melanjutkan proyek sesuai jadwal sambil mendokumentasikan kelemahan secara detail untuk diperbaiki dalam fase berikutnya' },
        { id: 'd', text: 'Mencari solusi teknis alternatif yang bisa mengatasi kelemahan tanpa memundurkan jadwal meskipun hasilnya tidak optimal' },
      ],
    },
    {
      itemId: 'sjt-8',
      scenarioText: 'Anda baru saja dipromosikan menjadi kepala seksi dan menemukan bahwa beberapa proses kerja di unit Anda sudah ketinggalan zaman dan tidak efisien. Staf senior yang sudah lama bekerja di unit tersebut resisten terhadap perubahan dan merasa cara lama sudah cukup baik. Anda memiliki ide-ide perbaikan tetapi khawatir akan kehilangan dukungan tim jika terlalu agresif melakukan perubahan.',
      options: [
        { id: 'a', text: 'Melakukan assessment menyeluruh terlebih dahulu, kemudian mengajak staf senior berdiskusi tentang area yang bisa ditingkatkan bersama' },
        { id: 'b', text: 'Memulai dengan perubahan kecil yang memberikan quick wins untuk membangun kepercayaan sebelum perubahan yang lebih besar' },
        { id: 'c', text: 'Menetapkan standar baru secara bertahap dengan timeline yang jelas dan memberikan pelatihan yang memadai' },
        { id: 'd', text: 'Fokus membangun hubungan dengan tim terlebih dahulu selama beberapa bulan sebelum mengusulkan perubahan apapun' },
      ],
    },
    {
      itemId: 'sjt-9',
      scenarioText: 'Anda sedang menangani kasus perpajakan yang kompleks dan menemukan bahwa regulasi yang berlaku memiliki celah interpretasi. Interpretasi yang menguntungkan wajib pajak akan mengurangi penerimaan negara secara signifikan, tetapi secara hukum bisa dibenarkan. Interpretasi yang ketat akan memberatkan wajib pajak tetapi mengamankan penerimaan. Atasan Anda cenderung pada interpretasi ketat.',
      options: [
        { id: 'a', text: 'Menyusun analisis komprehensif dari kedua interpretasi dengan dasar hukum masing-masing dan menyerahkan keputusan pada mekanisme yang tepat' },
        { id: 'b', text: 'Mengikuti interpretasi yang konsisten dengan yurisprudensi dan praktik yang sudah berjalan di institusi' },
        { id: 'c', text: 'Berkonsultasi dengan bagian hukum dan regulasi untuk mendapatkan pendapat resmi sebelum mengambil posisi' },
        { id: 'd', text: 'Mengikuti arahan atasan karena beliau memiliki pengalaman lebih dalam menangani kasus serupa' },
      ],
    },
    {
      itemId: 'sjt-10',
      scenarioText: 'Anda mendapat tugas presentasi penting di hadapan pejabat eselon I tentang capaian unit Anda. Saat mempersiapkan materi, Anda menyadari bahwa beberapa data yang diberikan tim Anda mengandung inkonsistensi dengan data dari sumber resmi lain. Waktu presentasi tinggal dua hari dan memperbaiki data memerlukan koordinasi dengan beberapa unit yang sulit dihubungi.',
      options: [
        { id: 'a', text: 'Menggunakan data yang bisa diverifikasi saja dan menandai area yang masih memerlukan konfirmasi dengan catatan transparansi' },
        { id: 'b', text: 'Berusaha maksimal menghubungi unit terkait untuk klarifikasi dan menyiapkan dua versi presentasi' },
        { id: 'c', text: 'Melaporkan masalah data kepada atasan dan meminta arahan apakah presentasi perlu ditunda' },
        { id: 'd', text: 'Menggunakan data dari sumber resmi yang tersedia dan menyiapkan penjelasan jika ada pertanyaan tentang perbedaan angka' },
      ],
    },
    {
      itemId: 'sjt-11',
      scenarioText: 'Anda menyadari bahwa kompetensi teknis Anda dalam bidang analisis data sudah tertinggal dibandingkan perkembangan terbaru. Beberapa tugas yang seharusnya bisa Anda selesaikan sendiri harus didelegasikan ke staf junior yang lebih mahir teknologi. Pelatihan formal yang tersedia tidak sesuai jadwal Anda, dan beban kerja sangat tinggi sehingga sulit meluangkan waktu belajar mandiri.',
      options: [
        { id: 'a', text: 'Mengalokasikan waktu belajar mandiri secara disiplin meskipun harus mengorbankan sebagian waktu pribadi, sambil meminta mentoring dari staf yang lebih mahir' },
        { id: 'b', text: 'Mengajukan permintaan pelatihan formal kepada atasan dengan justifikasi kebutuhan pengembangan kompetensi untuk efektivitas unit' },
        { id: 'c', text: 'Berkolaborasi dengan staf junior dalam proyek-proyek sebagai cara belajar sambil bekerja tanpa mengurangi produktivitas' },
        { id: 'd', text: 'Fokus pada kekuatan yang sudah dimiliki dan mendelegasikan tugas teknis kepada yang lebih kompeten sambil mengembangkan peran supervisory' },
      ],
    },
    {
      itemId: 'sjt-12',
      scenarioText: 'Anda menerima keluhan dari unit lain bahwa deliverable yang dihasilkan tim Anda tidak memenuhi standar kualitas yang diharapkan. Setelah ditelusuri, masalahnya adalah beban kerja yang berlebihan sehingga tim harus memilih antara kecepatan dan kualitas. Menambah staf tidak mungkin dalam waktu dekat, dan menolak pekerjaan tambahan akan berdampak pada hubungan antar unit.',
      options: [
        { id: 'a', text: 'Melakukan prioritisasi ulang beban kerja tim, mengkomunikasikan kapasitas realistis kepada semua pihak, dan menetapkan standar minimum yang tidak bisa dikompromikan' },
        { id: 'b', text: 'Mengidentifikasi proses yang bisa disederhanakan atau diotomasi untuk meningkatkan kapasitas tanpa mengorbankan kualitas' },
        { id: 'c', text: 'Menyusun proposal redistribusi beban kerja kepada atasan dengan data konkret tentang kapasitas versus permintaan' },
        { id: 'd', text: 'Menerima semua pekerjaan tetapi menegosiasikan timeline yang lebih realistis dengan unit peminta' },
      ],
    },

    // ═══ SINERGI (scenarios 13-18) ═══
    {
      itemId: 'sjt-13',
      scenarioText: 'Unit kerja Anda dan unit lain memiliki proyek yang saling terkait tetapi dengan timeline berbeda. Unit lain membutuhkan data dari tim Anda untuk melanjutkan pekerjaan mereka, tetapi menyediakan data tersebut akan mengalihkan sumber daya dari proyek prioritas Anda sendiri. Kedua proyek sama-sama penting bagi organisasi dan memiliki deadline yang tidak bisa diundur.',
      options: [
        { id: 'a', text: 'Mengatur pertemuan dengan kedua pihak untuk menemukan solusi yang mengakomodasi kebutuhan bersama dan menyepakati prioritas' },
        { id: 'b', text: 'Mengalokasikan sebagian kecil kapasitas tim untuk menyediakan data yang paling kritis bagi unit lain sambil menjaga progres proyek sendiri' },
        { id: 'c', text: 'Mengeskalasi ke atasan bersama untuk mendapatkan keputusan tentang prioritas dan alokasi sumber daya' },
        { id: 'd', text: 'Menawarkan timeline realistis untuk penyediaan data setelah proyek internal mencapai milestone kritis' },
      ],
    },
    {
      itemId: 'sjt-14',
      scenarioText: 'Dalam rapat koordinasi lintas direktorat, terjadi perbedaan pendapat yang tajam antara unit Anda dan unit lain tentang pendekatan implementasi kebijakan baru. Kedua pihak memiliki argumen yang valid berdasarkan perspektif masing-masing. Rapat mulai memanas dan beberapa peserta sudah menunjukkan tanda-tanda frustrasi. Keputusan harus diambil hari ini.',
      options: [
        { id: 'a', text: 'Mengusulkan untuk mengidentifikasi titik-titik kesepakatan terlebih dahulu, kemudian membahas area perbedaan dengan fokus pada tujuan bersama' },
        { id: 'b', text: 'Menyarankan pembentukan tim kecil gabungan untuk menyusun proposal kompromi yang mengakomodasi kepentingan kedua pihak' },
        { id: 'c', text: 'Mengusulkan pilot project dengan kedua pendekatan pada skala kecil untuk mendapatkan data empiris sebelum keputusan final' },
        { id: 'd', text: 'Meminta pimpinan rapat untuk mengambil keputusan berdasarkan pertimbangan strategis yang lebih luas' },
      ],
    },
    {
      itemId: 'sjt-15',
      scenarioText: 'Anda ditunjuk sebagai koordinator proyek lintas unit yang melibatkan lima direktorat berbeda. Setelah dua minggu berjalan, Anda menyadari bahwa dua direktorat tidak aktif berkontribusi dan selalu mengirim perwakilan yang berbeda ke setiap rapat sehingga tidak ada kontinuitas. Deadline proyek semakin dekat dan progres terhambat.',
      options: [
        { id: 'a', text: 'Menghubungi pimpinan kedua direktorat tersebut secara langsung untuk membahas hambatan dan meminta komitmen penunjukan personel tetap' },
        { id: 'b', text: 'Menyusun laporan progres yang transparan menunjukkan kontribusi setiap unit dan menyebarkannya ke semua pimpinan terkait' },
        { id: 'c', text: 'Mengadakan pertemuan bilateral dengan masing-masing direktorat untuk memahami kendala mereka dan mencari solusi bersama' },
        { id: 'd', text: 'Merestrukturisasi pembagian tugas agar pekerjaan bisa tetap berjalan meskipun tanpa kontribusi penuh dari kedua direktorat' },
      ],
    },
    {
      itemId: 'sjt-16',
      scenarioText: 'Tim Anda baru saja menyelesaikan sistem pelaporan yang canggih, tetapi unit lain yang seharusnya menggunakan sistem tersebut menolak karena merasa tidak dilibatkan dalam proses pengembangan. Mereka memiliki kekhawatiran tentang kompatibilitas dengan workflow mereka. Investasi waktu dan anggaran yang sudah dikeluarkan cukup besar.',
      options: [
        { id: 'a', text: 'Mengundang unit tersebut untuk sesi demonstrasi dan feedback, lalu menyesuaikan sistem berdasarkan masukan mereka meskipun memerlukan waktu tambahan' },
        { id: 'b', text: 'Menawarkan periode uji coba paralel di mana mereka bisa menggunakan sistem lama dan baru secara bersamaan untuk membuktikan manfaatnya' },
        { id: 'c', text: 'Membentuk tim gabungan untuk melakukan assessment kompatibilitas dan menyusun rencana adaptasi bersama' },
        { id: 'd', text: 'Mempresentasikan data dan bukti keunggulan sistem baru kepada pimpinan untuk mendapatkan dukungan top-down' },
      ],
    },
    {
      itemId: 'sjt-17',
      scenarioText: 'Anda bekerja dalam tim yang anggotanya berasal dari berbagai unit dengan budaya kerja yang sangat berbeda. Beberapa anggota terbiasa dengan pendekatan formal dan hierarkis, sementara yang lain lebih informal dan egaliter. Perbedaan ini mulai menimbulkan miskomunikasi dan ketegangan yang mempengaruhi produktivitas tim.',
      options: [
        { id: 'a', text: 'Memfasilitasi sesi team building untuk menyepakati norma kerja bersama yang mengakomodasi preferensi berbagai pihak' },
        { id: 'b', text: 'Menyusun panduan komunikasi tim yang jelas tentang kapan menggunakan pendekatan formal versus informal' },
        { id: 'c', text: 'Berbicara secara individual dengan anggota tim untuk memahami preferensi mereka dan mencari titik temu' },
        { id: 'd', text: 'Membiarkan tim menemukan keseimbangan sendiri secara alami sambil mengintervensi hanya jika konflik mengganggu deliverable' },
      ],
    },
    {
      itemId: 'sjt-18',
      scenarioText: 'Direktorat Anda diminta berkolaborasi dengan kementerian lain dalam proyek reformasi birokrasi. Namun, kementerian tersebut memiliki standar dan prosedur yang berbeda dari Kemenkeu. Tim Anda merasa bahwa standar Kemenkeu lebih tinggi dan khawatir kualitas output akan menurun jika mengikuti standar mitra. Mitra juga memiliki kekhawatiran serupa tentang standar mereka.',
      options: [
        { id: 'a', text: 'Mengusulkan pembentukan standar bersama yang mengambil elemen terbaik dari kedua institusi melalui workshop kolaboratif' },
        { id: 'b', text: 'Menyepakati standar minimum yang harus dipenuhi kedua pihak sambil memberikan fleksibilitas pada aspek yang tidak kritis' },
        { id: 'c', text: 'Membagi deliverable berdasarkan keahlian masing-masing institusi sehingga setiap pihak bekerja sesuai standar terbaiknya' },
        { id: 'd', text: 'Mengadopsi standar yang lebih tinggi sebagai acuan bersama dan menyediakan dukungan teknis bagi pihak yang perlu menyesuaikan' },
      ],
    },

    // ═══ PELAYANAN (scenarios 19-24) ═══
    {
      itemId: 'sjt-19',
      scenarioText: 'Seorang wajib pajak datang ke kantor pelayanan Anda menjelang jam tutup dengan masalah kompleks terkait restitusi pajak yang sudah tertunda berbulan-bulan. Wajib pajak tersebut terlihat sangat frustrasi karena sudah beberapa kali datang tanpa penyelesaian dan mengancam akan melaporkan ke media. Masalahnya memerlukan koordinasi dengan bagian lain yang sudah tutup untuk hari ini.',
      options: [
        { id: 'a', text: 'Menerima wajib pajak, mendengarkan masalahnya secara empatis, menyelesaikan bagian yang bisa ditangani hari ini, dan membuat janji tindak lanjut spesifik dengan timeline yang jelas' },
        { id: 'b', text: 'Menjelaskan bahwa masalah memerlukan koordinasi lintas bagian, membuat catatan lengkap, dan berkomitmen untuk menghubungi wajib pajak besok pagi dengan update' },
        { id: 'c', text: 'Menghubungi petugas bagian terkait melalui telepon untuk mendapatkan informasi awal meskipun sudah di luar jam kerja' },
        { id: 'd', text: 'Memberikan penjelasan transparan tentang proses dan kendala, menjadwalkan appointment khusus, dan memberikan nomor kontak langsung untuk follow-up' },
      ],
    },
    {
      itemId: 'sjt-20',
      scenarioText: 'Anda menerima banyak keluhan dari masyarakat tentang antrian panjang dan waktu tunggu yang lama di kantor pelayanan. Setelah analisis, Anda menemukan bahwa masalahnya bukan kekurangan staf tetapi proses yang tidak efisien dan distribusi beban kerja yang tidak merata antar loket. Perubahan proses memerlukan persetujuan dari beberapa level manajemen.',
      options: [
        { id: 'a', text: 'Menyusun proposal perbaikan proses dengan data konkret tentang bottleneck dan estimasi dampak, kemudian mempresentasikan ke manajemen' },
        { id: 'b', text: 'Mengimplementasikan perbaikan kecil yang tidak memerlukan persetujuan formal sambil menyiapkan proposal untuk perubahan yang lebih besar' },
        { id: 'c', text: 'Melakukan survei kepuasan pelanggan untuk mengumpulkan data pendukung yang lebih kuat sebelum mengajukan perubahan' },
        { id: 'd', text: 'Membentuk tim improvement yang melibatkan staf frontline untuk merancang solusi dari perspektif pelaksana' },
      ],
    },
    {
      itemId: 'sjt-21',
      scenarioText: 'Seorang pengusaha UMKM datang dengan kebingungan tentang kewajiban perpajakan barunya setelah omzetnya meningkat. Ia tidak memahami regulasi yang berlaku dan khawatir akan dikenakan sanksi. Pertanyaannya sebenarnya sederhana tetapi memerlukan penjelasan yang cukup panjang. Di belakangnya ada antrian panjang wajib pajak lain yang juga menunggu.',
      options: [
        { id: 'a', text: 'Memberikan penjelasan ringkas yang mencakup poin-poin kritis, menyediakan brosur atau panduan tertulis, dan menawarkan konsultasi lanjutan di waktu yang lebih leluasa' },
        { id: 'b', text: 'Menjelaskan secara lengkap dan sabar meskipun memakan waktu lebih lama karena pemahaman yang benar akan mencegah masalah di kemudian hari' },
        { id: 'c', text: 'Mengarahkan ke layanan konsultasi khusus atau helpdesk yang bisa memberikan penjelasan lebih mendalam tanpa mengganggu antrian' },
        { id: 'd', text: 'Memberikan penjelasan dasar dan menjadwalkan sesi edukasi kelompok untuk UMKM yang menghadapi situasi serupa' },
      ],
    },
    {
      itemId: 'sjt-22',
      scenarioText: 'Sistem layanan online Kemenkeu mengalami gangguan teknis menjelang batas waktu pelaporan. Ribuan wajib pajak tidak bisa mengakses sistem dan menghubungi call center yang sudah kewalahan. Anda adalah koordinator layanan dan harus memutuskan langkah yang tepat. Tim IT memperkirakan perbaikan memerlukan waktu 4-6 jam.',
      options: [
        { id: 'a', text: 'Segera mengeluarkan pengumuman resmi tentang gangguan dan estimasi waktu perbaikan, sambil mengaktifkan jalur layanan alternatif' },
        { id: 'b', text: 'Berkoordinasi dengan pimpinan untuk mempertimbangkan perpanjangan batas waktu pelaporan mengingat gangguan di luar kendali wajib pajak' },
        { id: 'c', text: 'Memobilisasi staf tambahan untuk call center dan menyiapkan panduan pelaporan manual sebagai alternatif sementara' },
        { id: 'd', text: 'Fokus pada pemulihan sistem secepat mungkin sambil menyiapkan komunikasi berkala tentang progres perbaikan' },
      ],
    },
    {
      itemId: 'sjt-23',
      scenarioText: 'Anda menerima feedback dari survei kepuasan bahwa meskipun layanan teknis sudah baik, masyarakat merasa petugas kurang ramah dan terkesan terburu-buru. Beberapa staf Anda memang sedang mengalami tekanan karena target pelayanan yang tinggi dan beban kerja yang bertambah. Menambah waktu per pelanggan akan mengurangi jumlah yang bisa dilayani per hari.',
      options: [
        { id: 'a', text: 'Mengadakan pelatihan soft skills dan service excellence sambil mengevaluasi apakah target kuantitatif perlu disesuaikan' },
        { id: 'b', text: 'Berdiskusi dengan tim tentang feedback tersebut dan bersama-sama mencari cara meningkatkan kualitas interaksi tanpa mengorbankan efisiensi' },
        { id: 'c', text: 'Mengimplementasikan sistem rotasi agar staf tidak burnout dan bisa memberikan layanan dengan energi yang lebih baik' },
        { id: 'd', text: 'Menyesuaikan target pelayanan untuk memberikan ruang bagi interaksi yang lebih berkualitas dengan setiap pelanggan' },
      ],
    },
    {
      itemId: 'sjt-24',
      scenarioText: 'Seorang lansia datang ke kantor Anda untuk mengurus dokumen perpajakan warisan. Beliau kesulitan memahami formulir digital dan tidak membawa dokumen lengkap. Prosedur standar mengharuskan semua dokumen lengkap sebelum proses bisa dimulai. Kantor Anda tidak memiliki layanan khusus untuk lansia atau penyandang disabilitas.',
      options: [
        { id: 'a', text: 'Mendampingi lansia tersebut secara personal, membantu mengidentifikasi dokumen yang kurang, dan menyediakan checklist sederhana untuk kunjungan berikutnya' },
        { id: 'b', text: 'Memproses bagian yang bisa dikerjakan dengan dokumen yang ada dan memberikan kemudahan untuk melengkapi sisanya tanpa harus datang ulang' },
        { id: 'c', text: 'Menghubungi keluarga atau pendamping lansia tersebut untuk membantu koordinasi kelengkapan dokumen' },
        { id: 'd', text: 'Mencatat kebutuhan ini sebagai masukan untuk pengembangan layanan inklusif dan sementara memberikan bantuan semaksimal mungkin' },
      ],
    },

    // ═══ KESEMPURNAAN (scenarios 25-30) ═══
    {
      itemId: 'sjt-25',
      scenarioText: 'Unit Anda telah menggunakan metode pelaporan yang sama selama lima tahun. Anda membaca tentang pendekatan baru berbasis data analytics yang digunakan otoritas pajak negara lain yang menghasilkan insight lebih mendalam dan efisiensi waktu 30%. Mengadopsi pendekatan baru memerlukan investasi waktu untuk belajar, pembelian tools, dan periode transisi di mana produktivitas mungkin menurun.',
      options: [
        { id: 'a', text: 'Melakukan pilot project kecil dengan pendekatan baru pada satu area untuk memvalidasi manfaatnya sebelum implementasi lebih luas' },
        { id: 'b', text: 'Menyusun proposal perbandingan dengan analisis cost-benefit yang komprehensif termasuk rencana transisi bertahap dan mitigasi risiko' },
        { id: 'c', text: 'Mempelajari pendekatan baru secara mandiri dan menerapkannya pada pekerjaan sendiri terlebih dahulu sebagai proof of concept' },
        { id: 'd', text: 'Mengundang praktisi dari institusi yang sudah mengadopsi pendekatan tersebut untuk sharing session dan assessment kesiapan' },
      ],
    },
    {
      itemId: 'sjt-26',
      scenarioText: 'Setelah evaluasi tahunan, Anda menemukan bahwa proses audit yang dilakukan unit Anda memiliki tingkat temuan berulang yang tinggi - masalah yang sama ditemukan di entitas yang sama tahun demi tahun. Ini menunjukkan bahwa rekomendasi audit tidak efektif menghasilkan perbaikan. Beberapa auditor senior merasa ini bukan tanggung jawab mereka karena tugas mereka hanya menemukan dan melaporkan.',
      options: [
        { id: 'a', text: 'Mengembangkan mekanisme follow-up yang lebih ketat dan mengubah pendekatan audit dari sekadar menemukan masalah menjadi memastikan perbaikan berkelanjutan' },
        { id: 'b', text: 'Menganalisis akar penyebab mengapa rekomendasi tidak diimplementasikan dan menyesuaikan format rekomendasi agar lebih actionable' },
        { id: 'c', text: 'Membangun program capacity building bagi entitas yang diaudit agar mereka mampu mengimplementasikan rekomendasi secara mandiri' },
        { id: 'd', text: 'Melaporkan pola temuan berulang ke manajemen senior sebagai indikator masalah sistemik yang memerlukan intervensi di level yang lebih tinggi' },
      ],
    },
    {
      itemId: 'sjt-27',
      scenarioText: 'Anda menyadari bahwa laporan bulanan yang dihasilkan tim Anda, meskipun akurat dan tepat waktu, jarang digunakan oleh pengambil keputusan karena formatnya terlalu teknis dan tidak memberikan insight yang actionable. Tim Anda sudah terbiasa dengan format ini dan merasa bangga dengan ketelitian teknisnya. Mengubah format berarti mengubah kebiasaan kerja yang sudah mapan.',
      options: [
        { id: 'a', text: 'Melakukan wawancara dengan pengambil keputusan untuk memahami kebutuhan informasi mereka, lalu merancang ulang format laporan bersama tim' },
        { id: 'b', text: 'Membuat versi executive summary yang ringkas dan actionable sebagai tambahan dari laporan teknis yang sudah ada' },
        { id: 'c', text: 'Mengadakan workshop dengan tim untuk mendemonstrasikan bagaimana laporan bisa lebih berdampak dan membangun ownership atas perubahan' },
        { id: 'd', text: 'Memperkenalkan dashboard visual interaktif yang memungkinkan pengambil keputusan mengeksplorasi data sesuai kebutuhan mereka' },
      ],
    },
    {
      itemId: 'sjt-28',
      scenarioText: 'Kemenkeu baru saja meluncurkan inisiatif transformasi digital. Unit Anda diminta mengidentifikasi proses yang bisa diotomasi. Anda menemukan bahwa proses rekonsiliasi data yang dilakukan manual oleh 5 staf bisa diotomasi hampir sepenuhnya. Namun, kelima staf tersebut khawatir akan kehilangan pekerjaan dan menolak perubahan. Mereka adalah pegawai yang loyal dan berkinerja baik.',
      options: [
        { id: 'a', text: 'Merancang rencana otomasi yang disertai program reskilling untuk kelima staf agar mereka bisa mengambil peran yang lebih bernilai tambah' },
        { id: 'b', text: 'Mengimplementasikan otomasi secara bertahap sambil melibatkan staf dalam proses desain dan pengujian sistem baru' },
        { id: 'c', text: 'Melakukan otomasi pada bagian yang paling repetitif terlebih dahulu dan mengalihkan staf ke tugas analitis yang memerlukan judgment manusia' },
        { id: 'd', text: 'Mempresentasikan visi perubahan kepada tim dengan penekanan pada peluang pengembangan karir yang lebih baik pasca-otomasi' },
      ],
    },
    {
      itemId: 'sjt-29',
      scenarioText: 'Anda menemukan bahwa SOP yang berlaku di unit Anda sudah tidak relevan dengan kondisi terkini karena perubahan regulasi dan teknologi. Beberapa langkah dalam SOP sudah tidak diperlukan tetapi masih dilakukan karena belum ada revisi resmi. Proses revisi SOP memerlukan persetujuan dari banyak pihak dan biasanya memakan waktu berbulan-bulan.',
      options: [
        { id: 'a', text: 'Menyusun draft revisi SOP yang komprehensif dengan justifikasi untuk setiap perubahan dan memulai proses persetujuan sambil mendokumentasikan praktik terkini' },
        { id: 'b', text: 'Mengidentifikasi langkah-langkah yang jelas sudah tidak relevan dan mengajukan persetujuan cepat untuk penghapusan langkah tersebut sebagai quick win' },
        { id: 'c', text: 'Membentuk tim revisi yang melibatkan pelaksana dan pemangku kepentingan untuk memastikan SOP baru realistis dan mendapat dukungan luas' },
        { id: 'd', text: 'Mendokumentasikan gap antara SOP dan praktik aktual sebagai risiko operasional dan mengeskalasi ke manajemen untuk prioritisasi' },
      ],
    },
    {
      itemId: 'sjt-30',
      scenarioText: 'Unit Anda berhasil mencapai target kinerja tahun ini, tetapi Anda menyadari bahwa pencapaian tersebut sebagian besar karena faktor eksternal yang menguntungkan, bukan karena peningkatan kapabilitas internal. Jika kondisi eksternal berubah tahun depan, unit Anda mungkin tidak mampu mempertahankan kinerja. Tim merasa puas dengan pencapaian dan tidak melihat urgensi untuk berubah.',
      options: [
        { id: 'a', text: 'Mempresentasikan analisis jujur kepada tim tentang faktor-faktor pencapaian dan mengajak mereka merancang strategi penguatan kapabilitas internal' },
        { id: 'b', text: 'Menetapkan target stretch untuk tahun depan yang memaksa pengembangan kapabilitas baru sambil merayakan pencapaian tahun ini' },
        { id: 'c', text: 'Melakukan benchmarking dengan unit berkinerja tinggi lainnya untuk mengidentifikasi area pengembangan yang bisa memperkuat fondasi kinerja' },
        { id: 'd', text: 'Mengembangkan skenario planning untuk berbagai kondisi eksternal dan mempersiapkan tim untuk beradaptasi dengan perubahan' },
      ],
    },
  ];
}
