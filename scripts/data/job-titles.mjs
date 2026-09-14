/**
 * Localized occupational titles.
 *
 * faker has no job-title data for most locales, so `jobTitle()` fell back to
 * its English base and produced "Human Branding Strategist" for a Chinese
 * record and "Dynamic Factors تنفيذي" for an Emirati one — English syntax with
 * an Arabic word grafted on. Both read as broken.
 *
 * Titles here are written per country rather than translated word-for-word from
 * English: a Chinese 人力资源专员 and a German Personalspezialist are the same
 * job, not the same string. Each entry is the form that appears on a real
 * business card in that country.
 *
 * Usage: imported by scripts/build-names.mjs and merged into each country's job
 * pool, replacing the faker fallback for locales that lack native titles.
 */

/** Job titles by country. Keyed by ISO code. */
export const JOB_TITLES = {
  CN: [
    "软件工程师", "产品经理", "销售经理", "市场专员", "会计", "人力资源专员",
    "行政助理", "教师", "护士", "医生", "律师", "金融分析师",
    "数据分析师", "运营经理", "客服主管", "采购专员", "项目经理", "设计师",
    "翻译", "记者", "机械工程师", "电气工程师", "物流专员", "导游",
  ],
  TW: [
    "軟體工程師", "產品經理", "業務經理", "行銷專員", "會計師", "人力資源專員",
    "行政助理", "教師", "護理師", "醫師", "律師", "金融分析師",
    "資料分析師", "營運經理", "客服主管", "採購專員", "專案經理", "設計師",
    "翻譯", "記者", "機械工程師", "電子工程師", "物流專員", "導遊",
  ],
  HK: [
    "軟件工程師", "產品經理", "營業經理", "市場主任", "會計師", "人力資源主任",
    "行政助理", "教師", "護士", "醫生", "律師", "金融分析師",
    "數據分析師", "營運經理", "客戶服務主管", "採購主任", "項目經理", "設計師",
    "翻譯員", "記者", "機械工程師", "電機工程師", "物流主任", "導遊",
  ],
  MO: [
    "軟件工程師", "產品經理", "營業經理", "市場主任", "會計師", "人力資源主任",
    "行政助理", "教師", "護士", "醫生", "律師", "金融分析師",
    "數據分析師", "營運經理", "客戶服務主管", "採購主任", "項目經理", "設計師",
  ],
  KR: [
    "소프트웨어 엔지니어", "제품 관리자", "영업 관리자", "마케팅 담당자", "회계사", "인사 담당자",
    "행정 비서", "교사", "간호사", "의사", "변호사", "금융 분석가",
    "데이터 분석가", "운영 관리자", "고객 서비스 책임자", "구매 담당자", "프로젝트 관리자", "디자이너",
    "번역가", "기자", "기계 엔지니어", "전기 엔지니어", "물류 담당자", "관광 안내사",
  ],
  TH: [
    "วิศวกรซอฟต์แวร์", "ผู้จัดการผลิตภัณฑ์", "ผู้จัดการฝ่ายขาย", "เจ้าหน้าที่การตลาด", "นักบัญชี", "เจ้าหน้าที่ทรัพยากรบุคคล",
    "ผู้ช่วยธุรการ", "ครู", "พยาบาล", "แพทย์", "ทนายความ", "นักวิเคราะห์การเงิน",
    "นักวิเคราะห์ข้อมูล", "ผู้จัดการปฏิบัติการ", "หัวหน้าฝ่ายบริการลูกค้า", "เจ้าหน้าที่จัดซื้อ", "ผู้จัดการโครงการ", "นักออกแบบ",
  ],
  VN: [
    "Kỹ sư phần mềm", "Quản lý sản phẩm", "Quản lý kinh doanh", "Chuyên viên marketing", "Kế toán", "Chuyên viên nhân sự",
    "Trợ lý hành chính", "Giáo viên", "Y tá", "Bác sĩ", "Luật sư", "Chuyên viên phân tích tài chính",
    "Chuyên viên phân tích dữ liệu", "Quản lý vận hành", "Trưởng nhóm chăm sóc khách hàng", "Chuyên viên thu mua", "Quản lý dự án", "Nhà thiết kế",
  ],
  JP: [
    "ソフトウェアエンジニア", "プロダクトマネージャー", "営業マネージャー", "マーケティング担当", "経理担当", "人事担当",
    "一般事務", "教員", "看護師", "医師", "弁護士", "財務アナリスト",
    "データアナリスト", "運用マネージャー", "カスタマーサポート責任者", "購買担当", "プロジェクトマネージャー", "デザイナー",
    "翻訳者", "記者", "機械エンジニア", "電気エンジニア", "物流担当", "添乗員",
  ],
  ID: [
    "Insinyur Perangkat Lunak", "Manajer Produk", "Manajer Penjualan", "Staf Pemasaran", "Akuntan", "Staf Sumber Daya Manusia",
    "Asisten Administrasi", "Guru", "Perawat", "Dokter", "Pengacara", "Analis Keuangan",
    "Analis Data", "Manajer Operasional", "Supervisor Layanan Pelanggan", "Staf Pengadaan", "Manajer Proyek", "Desainer",
  ],
  MY: [
    "Jurutera Perisian", "Pengurus Produk", "Pengurus Jualan", "Eksekutif Pemasaran", "Akauntan", "Eksekutif Sumber Manusia",
    "Penolong Pentadbiran", "Guru", "Jururawat", "Doktor", "Peguam", "Penganalisis Kewangan",
    "Penganalisis Data", "Pengurus Operasi", "Penyelia Perkhidmatan Pelanggan", "Eksekutif Perolehan", "Pengurus Projek", "Pereka",
  ],
  AE: [
    "مهندس برمجيات", "مدير منتج", "مدير مبيعات", "أخصائي تسويق", "محاسب", "أخصائي موارد بشرية",
    "مساعد إداري", "معلم", "ممرض", "طبيب", "محامي", "محلل مالي",
    "محلل بيانات", "مدير عمليات", "مشرف خدمة العملاء", "أخصائي مشتريات", "مدير مشروع", "مصمم",
  ],
  SA: [
    "مهندس برمجيات", "مدير منتج", "مدير مبيعات", "أخصائي تسويق", "محاسب", "أخصائي موارد بشرية",
    "مساعد إداري", "معلم", "ممرض", "طبيب", "محامي", "محلل مالي",
    "محلل بيانات", "مدير عمليات", "مشرف خدمة العملاء", "أخصائي مشتريات", "مدير مشروع", "مصمم",
  ],
  IL: [
    "מהנדס תוכנה", "מנהל מוצר", "מנהל מכירות", "מומחה שיווק", "רואה חשבון", "מומחה משאבי אנוש",
    "עוזר מנהלי", "מורה", "אח", "רופא", "עורך דין", "אנליסט פיננסי",
    "אנליסט נתונים", "מנהל תפעול", "אחראי שירות לקוחות", "מומחה רכש", "מנהל פרויקט", "מעצב",
  ],
  RU: [
    "Разработчик программного обеспечения", "Менеджер по продукту", "Менеджер по продажам", "Специалист по маркетингу",
    "Бухгалтер", "Специалист по кадрам", "Административный помощник", "Учитель", "Медсестра", "Врач",
    "Юрист", "Финансовый аналитик", "Аналитик данных", "Операционный менеджер", "Руководитель службы поддержки",
    "Специалист по закупкам", "Руководитель проекта", "Дизайнер", "Переводчик", "Журналист",
  ],
  PL: [
    "Inżynier oprogramowania", "Kierownik produktu", "Kierownik sprzedaży", "Specjalista ds. marketingu",
    "Księgowy", "Specjalista ds. HR", "Asystent administracyjny", "Nauczyciel", "Pielęgniarka", "Lekarz",
    "Prawnik", "Analityk finansowy", "Analityk danych", "Kierownik operacyjny", "Kierownik obsługi klienta",
    "Specjalista ds. zakupów", "Kierownik projektu", "Projektant",
  ],
  TR: [
    "Yazılım Mühendisi", "Ürün Müdürü", "Satış Müdürü", "Pazarlama Uzmanı", "Muhasebeci", "İnsan Kaynakları Uzmanı",
    "İdari Asistan", "Öğretmen", "Hemşire", "Doktor", "Avukat", "Finansal Analist",
    "Veri Analisti", "Operasyon Müdürü", "Müşteri Hizmetleri Sorumlusu", "Satın Alma Uzmanı", "Proje Müdürü", "Tasarımcı",
  ],
  SE: [
    "Mjukvaruingenjör", "Produktchef", "Försäljningschef", "Marknadsföringsspecialist", "Revisor", "HR-specialist",
    "Administrativ assistent", "Lärare", "Sjuksköterska", "Läkare", "Jurist", "Finansanalytiker",
    "Dataanalytiker", "Driftchef", "Kundtjänstchef", "Inköpare", "Projektledare", "Formgivare",
  ],
  NO: [
    "Programvareingeniør", "Produktsjef", "Salgssjef", "Markedsspesialist", "Regnskapsfører", "HR-spesialist",
    "Administrativ assistent", "Lærer", "Sykepleier", "Lege", "Jurist", "Finansanalytiker",
    "Dataanalytiker", "Driftsleder", "Kundeservicesjef", "Innkjøper", "Prosjektleder", "Designer",
  ],
  NL: [
    "Software-engineer", "Productmanager", "Verkoopmanager", "Marketingmedewerker", "Accountant", "HR-medewerker",
    "Administratief assistent", "Docent", "Verpleegkundige", "Arts", "Advocaat", "Financieel analist",
    "Data-analist", "Operationeel manager", "Klantenservicechef", "Inkoper", "Projectmanager", "Ontwerper",
  ],
  DE: [
    "Softwareentwickler", "Produktmanager", "Vertriebsleiter", "Marketingfachkraft", "Buchhalter", "Personalspezialist",
    "Verwaltungsassistent", "Lehrer", "Krankenpfleger", "Arzt", "Rechtsanwalt", "Finanzanalyst",
    "Datenanalyst", "Betriebsleiter", "Kundendienstleiter", "Einkäufer", "Projektmanager", "Designer",
  ],
  FR: [
    "Ingénieur logiciel", "Chef de produit", "Directeur commercial", "Chargé de marketing", "Comptable", "Chargé des ressources humaines",
    "Assistant administratif", "Enseignant", "Infirmier", "Médecin", "Avocat", "Analyste financier",
    "Analyste de données", "Responsable des opérations", "Responsable du service client", "Acheteur", "Chef de projet", "Designer",
  ],
  IT: [
    "Ingegnere software", "Product manager", "Direttore vendite", "Specialista marketing", "Contabile", "Specialista risorse umane",
    "Assistente amministrativo", "Insegnante", "Infermiere", "Medico", "Avvocato", "Analista finanziario",
    "Analista dati", "Responsabile operativo", "Responsabile assistenza clienti", "Addetto acquisti", "Project manager", "Designer",
  ],
  ES: [
    "Ingeniero de software", "Gerente de producto", "Director de ventas", "Especialista en marketing", "Contable", "Especialista en recursos humanos",
    "Asistente administrativo", "Profesor", "Enfermero", "Médico", "Abogado", "Analista financiero",
    "Analista de datos", "Gerente de operaciones", "Responsable de atención al cliente", "Comprador", "Jefe de proyecto", "Diseñador",
  ],
  PT: [
    "Engenheiro de software", "Gestor de produto", "Diretor comercial", "Especialista de marketing", "Contabilista", "Especialista de recursos humanos",
    "Assistente administrativo", "Professor", "Enfermeiro", "Médico", "Advogado", "Analista financeiro",
    "Analista de dados", "Gestor de operações", "Responsável de apoio ao cliente", "Comprador", "Gestor de projeto", "Designer",
  ],
  BR: [
    "Engenheiro de software", "Gerente de produto", "Gerente de vendas", "Especialista de marketing", "Contador", "Especialista de recursos humanos",
    "Assistente administrativo", "Professor", "Enfermeiro", "Médico", "Advogado", "Analista financeiro",
    "Analista de dados", "Gerente de operações", "Supervisor de atendimento", "Comprador", "Gerente de projeto", "Designer",
  ],
  MX: [
    "Ingeniero de software", "Gerente de producto", "Gerente de ventas", "Especialista en marketing", "Contador", "Especialista en recursos humanos",
    "Asistente administrativo", "Maestro", "Enfermero", "Médico", "Abogado", "Analista financiero",
    "Analista de datos", "Gerente de operaciones", "Supervisor de atención a clientes", "Comprador", "Gerente de proyecto", "Diseñador",
  ],
};

/**
 * Company names by country.
 *
 * The generator built every company from English components ("Nimbus Digital
 * Ltd"), which is implausible for a Chinese or Korean record.
 */
