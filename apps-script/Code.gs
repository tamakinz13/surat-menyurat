/**
 * SISTEM SURAT MENYURAT HVC JAKARTA
 * Google Apps Script + Google Sheets + Google Docs + Google Drive
 * Jalankan setup() SATU KALI dari proyek Apps Script yang terikat Google Sheets.
 * Versi 7: tanggal penutup di tengah; warna seluruh teks surat hitam dan font Arial 10;
 * revisi format arsip surat lama dengan PDF tersinkron. Versi 6: edit nomor surat keluar/masuk
 * tersinkron ke Google Docs/PDF dan tercatat pada log. Semua fitur V5 dipertahankan.
 * Sertakan Media.gs, lalu jalankan setup() dan terapkanKopDanOrnamenKeSemuaTemplate().
 * Akses web app harus dibatasi; lihat PANDUAN_PEMASANGAN_V2.md.
 */

const HVC = Object.freeze({
  TIMEZONE: 'Asia/Jakarta',
  MONTHS: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
  ROMAN: ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'],
  SHEETS: {
    OUT: 'Arsip', IN: 'Surat Masuk', SETTINGS: 'Pengaturan'
  },
  OUT_HEADERS: ['ID','Tanggal Surat','Nomor Surat','Jenis Surat','Kepada / Nama','Perihal','Petugas','Tautan Google Docs','Tautan PDF','Waktu Dibuat'],
  IN_HEADERS: ['ID','Tanggal Surat','Tanggal Diterima','Nomor Surat','Pengirim','Perihal','Catatan','Tautan Berkas','Waktu Dicatat'],
  SETTINGS_HEADERS: ['Kunci Pengaturan','Nilai','Penjelasan']
});

const JENIS_SURAT = [
  { id:'undangan', name:'Undangan Acara', code:'UND', icon:'calendar-days',
    fields:[
      {key:'tujuan',label:'Ditujukan kepada',type:'text',required:true,placeholder:'Seluruh anggota HVC Jakarta'},
      {key:'nama_acara',label:'Nama acara',type:'text',required:true,placeholder:'Kopdar Bulanan'},
      {key:'tanggal_acara',label:'Tanggal acara',type:'date',required:true},
      {key:'waktu_acara',label:'Waktu acara',type:'time',required:true},
      {key:'lokasi_acara',label:'Lokasi',type:'text',required:true},
      {key:'agenda',label:'Agenda / keterangan',type:'textarea',required:true}
    ]
  },
  { id:'pemberhentian', name:'Surat Pemberhentian', code:'SPN', icon:'user-x',
    fields:[
      {key:'nama_anggota',label:'Nama anggota',type:'text',required:true},
      {key:'id_registrasi',label:'ID registrasi',type:'text',required:true,placeholder:'#412'},
      {key:'no_kendaraan',label:'Nomor kendaraan',type:'text',required:false},
      {key:'jenis_pemberhentian',label:'Jenis pemberhentian',type:'select',required:true,options:['Dengan Hormat','Tidak Hormat']},
      {key:'alasan',label:'Dasar keputusan / alasan',type:'textarea',required:true},
      {key:'tanggal_berlaku',label:'Tanggal berlaku',type:'date',required:true}
    ]
  },
  { id:'dispensasi', name:'Izin / Dispensasi', code:'IZN', icon:'file-check',
    fields:[
      {key:'nama_anggota',label:'Nama pemohon',type:'text',required:true},
      {key:'id_registrasi',label:'ID registrasi',type:'text',required:false},
      {key:'instansi',label:'Instansi / sekolah / penerima',type:'text',required:true},
      {key:'tujuan',label:'Nama pejabat / pihak tujuan',type:'text',required:false},
      {key:'tanggal_mulai',label:'Mulai',type:'date',required:true},
      {key:'tanggal_selesai',label:'Selesai',type:'date',required:true},
      {key:'alasan',label:'Alasan dispensasi',type:'textarea',required:true},
      {key:'kegiatan',label:'Nama kegiatan',type:'text',required:false}
    ]
  },
  { id:'pengunduran_diri', name:'Keterangan Pengunduran Diri', code:'PDR', icon:'log-out',
    fields:[
      {key:'nama_anggota',label:'Nama anggota',type:'text',required:true},
      {key:'id_registrasi',label:'ID registrasi',type:'text',required:true},
      {key:'no_kendaraan',label:'Nomor kendaraan',type:'text',required:false},
      {key:'tanggal_berlaku',label:'Tanggal pengunduran diri',type:'date',required:true},
      {key:'keterangan',label:'Keterangan / dasar pengunduran diri',type:'textarea',required:true}
    ]
  },
  { id:'status_vakum', name:'Surat Keterangan Vakum', code:'VKM', icon:'pause-circle',
    fields:[
      {key:'nama_anggota',label:'Nama member / prospek',type:'text',required:true},
      {key:'id_registrasi',label:'ID registrasi',type:'text',required:true},
      {key:'no_kendaraan',label:'Nomor kendaraan',type:'text',required:false},
      {key:'mulai_vakum',label:'Mulai vakum',type:'date',required:true},
      {key:'sampai_vakum',label:'Sampai dengan (opsional)',type:'date',required:false},
      {key:'alasan',label:'Keterangan vakum',type:'textarea',required:true}
    ]
  }
];

/** KONTEN awal tiap template. Bisa diedit melalui Google Docs setelah setup(). */
const NASKAH = {
  undangan: [
    'Nomor : {{NOMOR}}', 'Lampiran : -', 'Hal : Undangan Acara', '',
    '{{KOTA}}, {{TANGGAL_SURAT}}', 'Kepada Yth. {{TUJUAN}}', 'Di tempat', '',
    'Dengan hormat,',
    'Dalam rangka kegiatan {{NAMA_ACARA}}, kami dari pengurus {{NAMA_KOMUNITAS}} mengundang Bapak/Ibu/Saudara/i untuk hadir pada:',
    'Hari / tanggal : {{TANGGAL_ACARA}}', 'Waktu : {{WAKTU_ACARA}}',
    'Tempat : {{LOKASI_ACARA}}', 'Agenda : {{AGENDA}}',
    'Demikian undangan ini kami sampaikan. Atas kehadiran dan kerja samanya kami ucapkan terima kasih.'
  ],
  pemberhentian: [
    'Nomor : {{NOMOR}}', 'Lampiran : -', 'Hal : {{PERIHAL}}', '',
    'P E R N Y A T A A N', '{{KOTA}}, {{TANGGAL_SURAT}}', '', 'Dengan hormat,',
    'Berdasarkan hasil keputusan pengurus {{NAMA_KOMUNITAS}}, dengan ini kami memberitahukan bahwa:',
    'Nama : {{NAMA_ANGGOTA}}', 'ID Registrasi : {{ID_REGISTRASI}}',
    'No. Kendaraan : {{NO_KENDARAAN}}', 'Keterangan : {{JENIS_PEMBERHENTIAN}}',
    'Dasar keputusan : {{ALASAN}}',
    'Terhitung sejak {{TANGGAL_BERLAKU}}, yang bersangkutan tidak lagi memiliki hak keanggotaan dalam {{NAMA_KOMUNITAS}}. Tindakan pribadi yang dilakukan setelah tanggal tersebut menjadi tanggung jawab yang bersangkutan, bukan tindakan atas nama komunitas.',
    'Demikian surat pernyataan ini dibuat untuk diketahui rekan-rekan club, community, dan pihak terkait.'
  ],
  dispensasi: [
    'Nomor : {{NOMOR}}', 'Lampiran : -', 'Hal : Permohonan Izin / Dispensasi', '',
    '{{KOTA}}, {{TANGGAL_SURAT}}', 'Kepada Yth. {{TUJUAN}}', '{{INSTANSI}}', '',
    'Dengan hormat,',
    'Kami dari pengurus {{NAMA_KOMUNITAS}} memohon izin / dispensasi bagi:',
    'Nama : {{NAMA_ANGGOTA}}', 'ID Registrasi : {{ID_REGISTRASI}}',
    'Tanggal : {{TANGGAL_MULAI}} s.d. {{TANGGAL_SELESAI}}',
    'Kegiatan : {{KEGIATAN}}', 'Alasan : {{ALASAN}}',
    'Besar harapan kami Bapak/Ibu dapat mempertimbangkan permohonan ini. Atas perhatian dan kebijaksanaannya, kami ucapkan terima kasih.'
  ],
  pengunduran_diri: [
    'Nomor : {{NOMOR}}', 'Lampiran : -', 'Hal : Surat Pengunduran Diri', '',
    'P E R N Y A T A A N', '{{KOTA}}, {{TANGGAL_SURAT}}', '', 'Dengan hormat,',
    'Berdasarkan pernyataan pengunduran diri yang telah diajukan, pengurus {{NAMA_KOMUNITAS}} dengan ini menyatakan bahwa:',
    'Nama : {{NAMA_ANGGOTA}}', 'ID Registrasi : {{ID_REGISTRASI}}',
    'No. Kendaraan : {{NO_KENDARAAN}}', 'Keterangan : {{KETERANGAN}}',
    'Yang bersangkutan bukan lagi menjadi anggota {{NAMA_KOMUNITAS}} terhitung sejak {{TANGGAL_BERLAKU}}. Tindakan setelah tanggal tersebut bukan menjadi tanggung jawab organisasi.',
    'Atas perhatian dan kerja sama rekan-rekan club dan community, kami mengucapkan terima kasih.'
  ],
  status_vakum: [
    'SURAT KETERANGAN VAKUM', 'Nomor : {{NOMOR}}', '',
    'P E R N Y A T A A N', '{{KOTA}}, {{TANGGAL_SURAT}}', '', 'Dengan hormat,',
    'Kami dari pengurus {{NAMA_KOMUNITAS}} memberitahukan bahwa member / prospek berikut berstatus vakum:',
    'Nama : {{NAMA_ANGGOTA}}', 'ID Registrasi : {{ID_REGISTRASI}}',
    'No. Kendaraan : {{NO_KENDARAAN}}', 'Mulai vakum : {{MULAI_VAKUM}}',
    'Sampai dengan : {{SAMPAI_VAKUM}}', 'Keterangan : {{ALASAN}}',
    'Selama masa vakum, penggunaan nama komunitas untuk tindakan pribadi tanpa persetujuan pengurus bukan merupakan tanggung jawab organisasi.',
    'Demikian surat keterangan ini kami buat agar dapat diketahui oleh rekan-rekan club dan community. Terima kasih atas kerja samanya.'
  ]
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Surat Menyurat • Honda Vario Club')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}

/**
 * Jalankan manual melalui tombol Run di editor Apps Script terikat Google Sheet.
 * Idempoten: Arsip yang sudah ada tidak dihapus; template yang sudah ada tidak diganti.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Buka Google Sheets → Ekstensi → Apps Script, lalu jalankan setup() dari sana.');
  PropertiesService.getScriptProperties().setProperty('HVC_SHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(HVC.TIMEZONE);
  ensureSheet_(ss,HVC.SHEETS.OUT,HVC.OUT_HEADERS);
  ensureSheet_(ss,HVC.SHEETS.IN,HVC.IN_HEADERS);
  ensureSheet_(ss,HVC.SHEETS.SETTINGS,HVC.SETTINGS_HEADERS);
  ensureSheet_(ss,'Riwayat Perubahan',['Waktu','Akun','Ruang Arsip','ID','Tanggal Lama','Tanggal Baru','Catatan']);
  ensureSheet_(ss,'Riwayat Nomor',['Waktu','Akun','Ruang Arsip','ID Surat','Nomor Lama','Nomor Baru','Keterangan']);
  ensureSheet_(ss,'Riwayat Format',['Waktu','Akun','ID Surat','Nomor Surat','Tautan PDF Lama','Tautan PDF Baru','Keterangan']);
  const ownerEmail = Session.getEffectiveUser().getEmail() || '';
  const defaults = [
    ['NAMA_KOMUNITAS','Honda Vario Club Jakarta','Tercetak pada kop dan isi surat'],
    ['KOTA','Jakarta','Kota pada penanggalan'],
    ['NAMA_KETUA','Nama Ketua Umum','Ganti dengan nama ketua yang sah'],
    ['EMAIL_PENGURUS',ownerEmail,'Daftar akun pengurus diizinkan (pisahkan dengan koma); jangan kosong'],
    ['RESTART_NOMOR','PER_TAHUN','PER_TAHUN atau PER_BULAN'],
    ['KOP_IMAGE_ID','','Diisi otomatis dengan PNG kop asli HVC dari Media.gs; dapat diganti'],
    ['ORNAMEN_BAWAH_IMAGE_ID','','Diisi otomatis dengan PNG ornamen/footer asli HVC; dapat diganti'],
    ['FOLDER_ASET_ID','','Folder gambar kop dan ornamen HVC di Drive'],
    ['A4_BACKGROUND_IMAGE_ID','','Gambar latar A4 penuh dari Word HVC, dibuat otomatis'],
    ['MASTER_A4_ID','','ID Google Docs master A4 dengan watermark yang dipasang sekali'],
    ['A4_ACTIVE','TIDAK','YA jika 5 template aktif sudah memakai watermark A4'],
    ['TTD_KETUA_FILE_ID','','ID gambar tanda tangan ketua PNG/JPG yang diizinkan'],
    ['FOLDER_INDUK_ID','','Terisi otomatis saat setup'],
    ['FOLDER_DOCS_ID','','Terisi otomatis saat setup'],
    ['FOLDER_PDF_ID','','Terisi otomatis saat setup'],
    ['FOLDER_MASUK_ID','','Terisi otomatis saat setup'],
    ['FOLDER_TEMPLATE_ID','','Terisi otomatis saat setup']
  ];
  JENIS_SURAT.forEach(t => {
    defaults.push(['KODE_'+t.id.toUpperCase(), 'HVC-'+t.code+'-JKT', 'Bagian tengah nomor surat jenis '+t.name]);
    defaults.push(['TEMPLATE_'+t.id.toUpperCase()+'_ID', '', 'ID Google Docs template '+t.name]);
  });
  insertMissingSettings_(ss.getSheetByName(HVC.SHEETS.SETTINGS),defaults);
  // Migrasi dari V1/V2/V3: hanya hapus empat baris konfigurasi jenis nonaktif.
  // Dokumen Google Docs di Drive dan semua arsip yang sudah ada tetap aman.
  hapusPengaturanJenisNonaktif_(ss.getSheetByName(HVC.SHEETS.SETTINGS));
  let c = readSettings_();
  const root = c.FOLDER_INDUK_ID ? DriveApp.getFolderById(c.FOLDER_INDUK_ID) : DriveApp.createFolder('HVC JAKARTA - Administrasi Surat');
  const folders = {
    FOLDER_INDUK_ID:root.getId(),
    FOLDER_DOCS_ID: getOrCreateFolder_(root,'01 - Google Docs Surat Keluar',c.FOLDER_DOCS_ID).getId(),
    FOLDER_PDF_ID: getOrCreateFolder_(root,'02 - PDF Surat Keluar',c.FOLDER_PDF_ID).getId(),
    FOLDER_MASUK_ID: getOrCreateFolder_(root,'03 - Lampiran Surat Masuk',c.FOLDER_MASUK_ID).getId(),
    FOLDER_TEMPLATE_ID: getOrCreateFolder_(root,'00 - TEMPLATE (Boleh Diedit)',c.FOLDER_TEMPLATE_ID).getId(),
    FOLDER_ASET_ID: getOrCreateFolder_(root,'04 - ASET KOP & ORNAMEN',c.FOLDER_ASET_ID).getId()
  };
  saveSettingsMap_(folders);
  c = readSettings_();
  pastikanAsetTemplateHVC_(c);
  pastikanLatarA4_(readSettings_());
  c = readSettings_();
  const templateFolder = DriveApp.getFolderById(c.FOLDER_TEMPLATE_ID);
  JENIS_SURAT.forEach(t => {
    const key = 'TEMPLATE_'+t.id.toUpperCase()+'_ID';
    if (!c[key]) {
      const id = createTemplate_(t,c,templateFolder);
      saveSettingsMap_({[key]:id});
    }
  });
  SpreadsheetApp.flush();
  Logger.log('Pemasangan berhasil. Spreadsheet: '+ss.getUrl()+' | Folder: '+root.getUrl());
  return {spreadsheetUrl:ss.getUrl(),folderUrl:root.getUrl()};
}

function getInitData() {
  guard_();
  const c = readSettings_();
  const outgoing = getSheet_('Arsip').getLastRow()-1;
  const incoming = getSheet_('Surat Masuk').getLastRow()-1;
  const month = Utilities.formatDate(new Date(),HVC.TIMEZONE,'yyyy-MM');
  let thisMonth = 0;
  const sh = getSheet_('Arsip');
  if (sh.getLastRow()>1) {
    const dates = sh.getRange(2,2,sh.getLastRow()-1,1).getValues();
    thisMonth = dates.filter(a => normalisasiTanggalSheet_(a[0]).startsWith(month)).length;
  }
  return {
    today: Utilities.formatDate(new Date(),HVC.TIMEZONE,'yyyy-MM-dd'),
    types: JENIS_SURAT,
    name:c.NAMA_KOMUNITAS,
    city:c.KOTA,
    docsFolderUrl:DriveApp.getFolderById(c.FOLDER_DOCS_ID).getUrl(),
    pdfFolderUrl:DriveApp.getFolderById(c.FOLDER_PDF_ID).getUrl(),
    rootFolderUrl:DriveApp.getFolderById(c.FOLDER_INDUK_ID).getUrl(),
    templateLinks:JENIS_SURAT.map(t => ({id:t.id,name:t.name,url:'https://docs.google.com/document/d/'+c['TEMPLATE_'+t.id.toUpperCase()+'_ID']+'/edit'})),
    stats:{outgoing:Math.max(0,outgoing),incoming:Math.max(0,incoming),month:thisMonth},
    settings:publicSettings_(c),
    masterUrl:c.MASTER_A4_ID?'https://docs.google.com/document/d/'+c.MASTER_A4_ID+'/edit':'',
    backgroundImageUrl:c.A4_BACKGROUND_IMAGE_ID?DriveApp.getFileById(c.A4_BACKGROUND_IMAGE_ID).getUrl():''
  };
}

function buatSurat(payload) {
  guard_();
  if (!payload || typeof payload!=='object') throw new Error('Data formulir kosong.');
  const type = JENIS_SURAT.find(t => t.id===payload.type);
  if (!type) throw new Error('Jenis surat tidak dikenali.');
  const c = readSettings_();
  const date = parseDate_(payload.date,'Tanggal surat');
  const values = {};
  type.fields.forEach(f => {
    let v = String((payload.data || {})[f.key] == null ? '' : payload.data[f.key]).trim();
    if (f.required && !v) throw new Error('Kolom "'+f.label+'" wajib diisi.');
    if (v.length>3000) throw new Error('Kolom '+f.label+' terlalu panjang (maks. 3000 karakter).');
    if (f.type==='date' && v) parseDate_(v,f.label);
    if (f.type==='select' && !f.options.includes(v)) throw new Error('Pilihan '+f.label+' tidak valid.');
    if (f.type==='time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error('Waktu '+f.label+' tidak valid.');
    values[f.key]=v;
  });
  if (type.id==='dispensasi' && values.tanggal_selesai<values.tanggal_mulai) throw new Error('Tanggal selesai mendahului tanggal mulai.');
  if (type.id==='status_vakum' && values.sampai_vakum && values.sampai_vakum<values.mulai_vakum) throw new Error('Tanggal akhir vakum mendahului tanggal mulai.');
  const petugas = String(payload.petugas||'').trim();
  if (!petugas || petugas.length>120) throw new Error('Nama petugas wajib diisi (maks. 120 karakter).');
  const templateId = c['TEMPLATE_'+type.id.toUpperCase()+'_ID'];
  if (!templateId) throw new Error('Template Google Docs untuk '+type.name+' belum terpasang. Jalankan setup().');
  const code = c['KODE_'+type.id.toUpperCase()] || ('HVC-'+type.code+'-JKT');
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new Error('Kode surat hanya boleh huruf, angka, tanda - dan _.');
  const number = nextNumber_(code,payload.date,c.RESTART_NOMOR);
  const perihal = type.id==='pemberhentian' ? ('Pemberhentian '+values.jenis_pemberhentian) : type.name;
  const recipient = recipient_(type.id,values);
  const niceDate = dateToIndo_(payload.date);
  const safeName = safeFilename_(number+' - '+perihal+' - '+recipient);
  const data = {
    NOMOR:number, NOMOR_SURAT:number, TANGGAL_SURAT:niceDate,
    NAMA_KOMUNITAS:c.NAMA_KOMUNITAS, KOTA:c.KOTA, NAMA_KETUA:c.NAMA_KETUA,
    PERIHAL:perihal, NAMA_PETUGAS:petugas
  };
  type.fields.forEach(f => { data[f.key.toUpperCase()] = f.type==='date' && values[f.key] ? dateToIndo_(values[f.key]) : values[f.key] || '-'; });
  if (type.id==='pemberhentian') data.JENIS_PEMBERHENTIAN='Diberhentikan Secara '+values.jenis_pemberhentian;
  // Jika nama tujuan opsional kosong, hindari kepala surat tanpa penerima.
  if (type.id==='dispensasi' && !values.tujuan) data.TUJUAN='Pimpinan / pihak yang berwenang';
  const docsFolder = DriveApp.getFolderById(c.FOLDER_DOCS_ID);
  const pdfFolder = DriveApp.getFolderById(c.FOLDER_PDF_ID);
  let copied=null, pdf=null;
  try {
    copied = DriveApp.getFileById(templateId).makeCopy(safeName,docsFolder);
    const doc = DocumentApp.openById(copied.getId());
    const body = doc.getBody();
    Object.keys(data).forEach(key => body.replaceText('\\{\\{'+key+'\\}\\}',String(data[key]).replace(/\$/g,'\\$')));
    insertSignature_(body,'TTD_KETUA',c.TTD_KETUA_FILE_ID);
    // Bersihkan sisa placeholder khusus yang tidak dipakai.
    body.replaceText('\\{\\{[A-Z0-9_]+\\}\\}','-');
    // V7: tetapkan font hitam yang seragam dan pusatkan tanggal penutup.
    seragamkanDokumenSuratHVC_(doc);
    doc.saveAndClose();
    const blob = copied.getAs(MimeType.PDF).setName(safeName+'.pdf');
    pdf = pdfFolder.createFile(blob);
    const id = Utilities.getUuid();
    getSheet_(HVC.SHEETS.OUT).appendRow([
      id,payload.date,number,type.name,cell_(recipient),cell_(perihal),cell_(petugas),
      copied.getUrl(),pdf.getUrl(),timestamp_()
    ]);
    return {ok:true,number:number,docsUrl:copied.getUrl(),pdfUrl:pdf.getUrl(),message:'Surat tersimpan di arsip.'};
  } catch (error) {
    // Nomor yang sudah dicadangkan tidak diulang, demi mencegah nomor ganda.
    if (pdf) {try {pdf.setTrashed(true);} catch (_){}}
    if (copied) {try {copied.setTrashed(true);} catch (_){}}
    throw new Error('Surat gagal dibuat: '+error.message+' (nomor yang sudah dipesan tidak digunakan kembali).');
  }
}

function simpanSuratMasuk(payload) {
  guard_();
  if (!payload || typeof payload!=='object') throw new Error('Form surat masuk kosong.');
  const tanggalSurat = String(payload.tanggalSurat||'');
  const tanggalTerima = String(payload.tanggalTerima||'');
  parseDate_(tanggalSurat,'Tanggal surat');
  parseDate_(tanggalTerima,'Tanggal diterima');
  const fields = ['nomor','pengirim','perihal'];
  fields.forEach(k => {if (!String(payload[k]||'').trim()) throw new Error('Kolom '+k+' wajib diisi.');});
  let link = String(payload.link||'').trim();
  if (link && !/^https:\/\//i.test(link)) throw new Error('Tautan berkas harus dimulai dengan https://');
  const f = payload.file;
  if (f && f.base64) {
    if (link) throw new Error('Pilih salah satu: unggah berkas ATAU isi tautan, jangan keduanya.');
    if (!/^[\w.() -]{1,150}$/.test(String(f.name||''))) throw new Error('Nama berkas mengandung karakter yang tidak didukung.');
    const type = String(f.mimeType||'');
    const allowed = ['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(type)) throw new Error('Lampiran hanya PDF, JPG, PNG, atau DOCX.');
    if (String(f.base64).length > 11*1024*1024) throw new Error('Ukuran berkas terlalu besar. Maksimal 7 MB.');
    const bytes=Utilities.base64Decode(String(f.base64));
    if (bytes.length>7*1024*1024) throw new Error('Lampiran maksimal 7 MB.');
    const blob=Utilities.newBlob(bytes,type,safeFilename_(f.name));
    const file=DriveApp.getFolderById(readSettings_().FOLDER_MASUK_ID).createFile(blob);
    link=file.getUrl();
  }
  const row=[Utilities.getUuid(),tanggalSurat,tanggalTerima,
    cell_(payload.nomor),cell_(payload.pengirim),cell_(payload.perihal),
    cell_(String(payload.catatan||'').slice(0,3000)),link,timestamp_()];
  getSheet_(HVC.SHEETS.IN).appendRow(row);
  return {ok:true,message:'Surat masuk berhasil dicatat.',fileUrl:link};
}

function cariArsip(filters) {
  guard_();
  filters=filters || {};
  const isIncoming=filters.scope==='masuk';
  const sh=getSheet_(isIncoming ? HVC.SHEETS.IN : HVC.SHEETS.OUT);
  if (sh.getLastRow()<=1) return [];
  const rows=sh.getRange(2,1,sh.getLastRow()-1,isIncoming?9:10).getValues().map(r=>r.map((v,i)=>
    (i===1 || (isIncoming && i===2)) ? normalisasiTanggalSheet_(v) : String(v==null?'':v)
  ));
  const keyword=String(filters.keyword||'').toLowerCase().trim();
  const start=String(filters.start||'').trim();
  const end=String(filters.end||'').trim();
  const type=String(filters.type||'').trim();
  return rows.map((r,i) => ({raw:r,index:i})).reverse().filter(x => {
    const r=x.raw;
    const date=r[isIncoming?2:1];
    if (start && date<start) return false;
    if (end && date>end) return false;
    if (type && !isIncoming && r[3]!==type) return false;
    if (keyword && !r.some(cell => String(cell).toLowerCase().includes(keyword))) return false;
    return true;
  }).slice(0,300).map(x => {
    const r=x.raw;
    return isIncoming ? {
      id:r[0],date:r[1],received:r[2],number:r[3],sender:r[4],subject:r[5],note:r[6],fileUrl:r[7],created:r[8]
    } : {
      id:r[0],date:r[1],number:r[2],type:r[3],recipient:r[4],subject:r[5],officer:r[6],docsUrl:r[7],pdfUrl:r[8],created:r[9]
    };
  });
}

/** Ubah tanggal yang telah tercatat. Untuk surat keluar, DOCS + PDF ikut diselaraskan.
 * Nomor surat tetap. Perubahan lintas bulan/tahun ditolak agar nomor konsisten.
 */
function ubahTanggalArsip(payload) {
  guard_();
  if (!payload || !['keluar','masuk'].includes(payload.scope)) throw new Error('Jenis arsip tidak valid.');
  const id=String(payload.id||'').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('ID surat tidak valid.');
  const outgoing=payload.scope==='keluar';
  const date=String(payload.date||'');
  parseDate_(date,'Tanggal surat');
  const received=outgoing?'':String(payload.received||'');
  if (!outgoing) parseDate_(received,'Tanggal diterima');
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh=getSheet_(outgoing?HVC.SHEETS.OUT:HVC.SHEETS.IN);
    const ids=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues():[];
    const index=ids.findIndex(r=>r[0]===id);
    if(index<0)throw new Error('Surat tidak ditemukan di arsip.');
    const row=index+2;
    const prev=normalisasiTanggalSheet_(sh.getRange(row,2).getValue());
    if (!outgoing) {
      const oldReceived=normalisasiTanggalSheet_(sh.getRange(row,3).getValue());
      sh.getRange(row,2,1,2).setNumberFormat('@').setValues([[date,received]]);
      catatPerubahan_(payload.scope,id,prev+' / '+oldReceived,date+' / '+received,'Tanggal surat dan tanggal diterima diubah manual');
      return {ok:true,message:'Tanggal surat masuk berhasil diperbarui.'};
    }
    if (prev.slice(0,7)!==date.slice(0,7)) {
      throw new Error('Tanggal surat keluar tidak boleh pindah bulan/tahun karena nomor surat memakai bulan dan tahun. Buat surat baru bila periode berubah.');
    }
    if(prev===date)return {ok:true,message:'Tanggal surat belum berubah.'};
    const docId=String(sh.getRange(row,8).getValue()).match(/\/document\/d\/([\w-]+)/);
    if(!docId) throw new Error('Tautan Google Docs surat keluar tidak valid.');
    const doc=DocumentApp.openById(docId[1]);
    const oldText=dateToIndo_(prev),newText=dateToIndo_(date);
    if (!gantiTanggalSuratDiParagraf_(doc.getBody(),oldText,newText)) {
      throw new Error('Tanggal surat sebelumnya tidak ditemukan pada paragraf bertanggal di Google Docs (mungkin telah diedit manual). Mohon periksa dokumen.');
    }
    doc.saveAndClose();
    const c=readSettings_();
    let newPdf;
    try {
      const filename=safeFilename_(String(sh.getRange(row,3).getValue())+' - revisi tanggal '+date)+'.pdf';
      newPdf=DriveApp.getFolderById(c.FOLDER_PDF_ID).createFile(DriveApp.getFileById(docId[1]).getAs(MimeType.PDF).setName(filename));
      const oldUrl=String(sh.getRange(row,9).getValue());
      sh.getRange(row,2).setNumberFormat('@').setValue(date);
      sh.getRange(row,9).setValue(newPdf.getUrl());
      catatPerubahan_(payload.scope,id,prev,date,'Docs disesuaikan dan PDF dibuat ulang; nomor tetap');
      const oldPdfId=(oldUrl.match(/\/file\/d\/([\w-]+)/)||[])[1];
      if(oldPdfId){try{DriveApp.getFileById(oldPdfId).setTrashed(true);}catch(_){}}
    }catch(e) {
      // Bila PDF gagal, balikkan tanggal pada Docs agar tidak berbeda dari arsip.
      try {const d=DocumentApp.openById(docId[1]);gantiTanggalSuratDiParagraf_(d.getBody(),newText,oldText);d.saveAndClose();}catch(_){}
      if(newPdf){try{newPdf.setTrashed(true);}catch(_){}}
      throw e;
    }
    return {ok:true,message:'Tanggal surat keluar, Google Docs, dan PDF sudah diperbarui.'};
  } finally {lock.releaseLock();}
}
/**
 * V6. Memperbaiki nomor arsip surat keluar (Docs & PDF sinkron) dan masuk (data arsip saja).
 * Mengunci operasi agar dua pengurus tidak menetapkan nomor yang sama.
 * Nomor keluar harus mengikuti bulan/tahun Tanggal Surat; nomor masuk bebas sesuai pengirim.
 */
function ubahNomorArsip(payload) {
  guard_();
  if(!payload || !['keluar','masuk'].includes(payload.scope)) throw new Error('Jenis arsip tidak valid.');
  const id=String(payload.id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('ID surat tidak valid.');
  const outgoing=payload.scope==='keluar';
  const next=String(payload.number||'').trim();
  if(!next || next.length>150 || /[\r\n]/.test(next))throw new Error('Nomor surat harus diisi, tanpa baris baru (maks. 150 karakter).');
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh=getSheet_(outgoing?HVC.SHEETS.OUT:HVC.SHEETS.IN);
    if(sh.getLastRow()<=1) throw new Error('Arsip kosong.');
    const ids=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
    const ix=ids.findIndex(r=>r[0]===id);
    if(ix<0)throw new Error('Surat tidak ditemukan pada arsip.');
    const row=ix+2, col=outgoing?3:4;
    const old=String(sh.getRange(row,col).getDisplayValue()).trim();
    if(old===next)return {ok:true,message:'Nomor surat belum berubah.'};
    if(!outgoing) {
      // Log nomor wajib memiliki sheet (setup V6) sebelum data ditulis.
      getSheet_('Riwayat Nomor');
      sh.getRange(row,col).setNumberFormat('@').setValue(cell_(next));
      let warning='';
      try {catatNomorHVC_(payload.scope,id,old,next,'Nomor surat masuk diperbaiki pada arsip; dokumen pengirim tidak diubah');}
      catch(e){warning=' Peringatan: log riwayat gagal dicatat ('+e.message+').';}
      return {ok:true,message:'Nomor surat masuk berhasil diperbaiki pada arsip.'+warning};
    }
    const date=normalisasiTanggalSheet_(sh.getRange(row,2).getValue());
    parseDate_(date,'Tanggal arsip');
    const parsed=next.match(/^(\d{1,5})\/([A-Za-z0-9_-]{2,60})\/(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\/(\d{4})$/);
    if(!parsed)throw new Error('Format nomor keluar harus seperti 001/HVC-PDR-JKT/XI/2026.');
    const roman=HVC.ROMAN[Number(date.slice(5,7))-1],year=date.slice(0,4);
    if(parsed[3]!==roman || parsed[4]!==year)
      throw new Error('Bulan/tahun pada nomor harus sesuai tanggal surat ('+roman+'/'+year+'). Ubah tanggal melalui tombol Tanggal bila diperlukan.');
    const serial=Number(parsed[1]);
    if(serial<1)throw new Error('Nomor urut harus lebih dari nol.');
    const all=sh.getRange(2,3,sh.getLastRow()-1,1).getDisplayValues();
    if(all.some((r,i)=>{
      if(i===ix)return false;
      const other=String(r[0]).trim();
      if(other.toUpperCase()===next.toUpperCase())return true;
      const parts=other.match(/^(\d+)\/([^/]+)\/([IVX]+)\/(\d{4})$/);
      return !!parts && Number(parts[1])===serial && parts[2].toUpperCase()===parsed[2].toUpperCase() &&
        parts[3]===parsed[3] && parts[4]===parsed[4];
    }))throw new Error('Nomor tersebut sudah dipakai surat keluar lain. Gunakan nomor berbeda.');
    const c=readSettings_();
    const suffix=c.RESTART_NOMOR==='PER_BULAN'?date.slice(0,7):year;
    const prop='HVC_SEQ_'+parsed[2]+'_'+suffix;
    const reserved=Number(PropertiesService.getScriptProperties().getProperty(prop)||0);
    if(serial<=reserved && !all.some((r,i)=>i!==ix && String(r[0]).trim()===next))
      throw new Error('Nomor urut '+serial+' sudah pernah dicadangkan otomatis. Gunakan nomor yang lebih tinggi dari '+reserved+' atau periksa nomor pada arsip agar tidak terjadi bentrok.');
    const docUrl=String(sh.getRange(row,8).getValue());
    const docId=(docUrl.match(/\/document\/d\/([\w-]+)/)||[])[1];
    if(!docId)throw new Error('Tautan Google Docs pada arsip tidak valid.');
    const docFile=DriveApp.getFileById(docId);
    const oldName=docFile.getName();
    const oldPart=safeFilename_(old),newPart=safeFilename_(next);
    const newName=oldName.indexOf(oldPart)===0?newPart+oldName.slice(oldPart.length):newPart+' - revisi nomor';
    const pdfFolder=DriveApp.getFolderById(c.FOLDER_PDF_ID);
    const oldPdfUrl=String(sh.getRange(row,9).getValue());
    getSheet_('Riwayat Nomor'); // Wajib menjalankan setup() V6 sebelum mengedit nomor.
    const doc=DocumentApp.openById(docId),body=doc.getBody();
    const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern=escapeRegex(old);
    if(!body.findText(pattern))throw new Error('Nomor lama tidak ditemukan pada Google Docs. Periksa apakah dokumen pernah diedit manual. Arsip belum diubah.');
    let newPdf=null;
    try {
      body.replaceText(pattern,next.replace(/\$/g,'\\$'));
      doc.saveAndClose();
      newPdf=pdfFolder.createFile(docFile.getAs(MimeType.PDF).setName(safeFilename_(newName)+'.pdf'));
      sh.getRange(row,3).setNumberFormat('@').setValue(next);
      sh.getRange(row,9).setValue(newPdf.getUrl());
    } catch(e) {
      try {sh.getRange(row,3).setNumberFormat('@').setValue(old);}catch(_){}
      try {sh.getRange(row,9).setValue(oldPdfUrl);}catch(_){}
      try {const rollback=DocumentApp.openById(docId);rollback.getBody().replaceText(escapeRegex(next),old.replace(/\$/g,'\\$'));rollback.saveAndClose();}catch(_){}
      if(newPdf){try{newPdf.setTrashed(true);}catch(_){}}
      throw new Error('Nomor gagal disimpan; perubahan dipulihkan bila memungkinkan: '+e.message);
    }
    try {docFile.setName(newName);}catch(_){}
    const oldPdfId=(oldPdfUrl.match(/\/file\/d\/([\w-]+)/)||[])[1];
    if(oldPdfId){try{DriveApp.getFileById(oldPdfId).setTrashed(true);}catch(_){}}
    let warning='';
    try {catatNomorHVC_('keluar',id,old,next,'Nomor pada Docs dan PDF direvisi; PDF lama dipindahkan ke Sampah');}
    catch(e){warning=' Peringatan: log riwayat nomor gagal dicatat ('+e.message+').';}
    return {ok:true,message:'Nomor surat keluar, Google Docs, PDF, dan arsip sudah diperbarui.'+warning};
  } finally {lock.releaseLock();}
}
function catatNomorHVC_(scope,id,oldNumber,newNumber,note) {
  const sh=getSheet_('Riwayat Nomor');
  sh.appendRow([timestamp_(),Session.getActiveUser().getEmail(),scope,id,oldNumber,newNumber,note]);
}

/** Hanya ganti baris tanggal formal (contoh: Jakarta, 18 November 2026).
 * Mencegah perubahan tidak sengaja pada tanggal acara/kegiatan yang sama.
 */
function gantiTanggalSuratDiParagraf_(body,oldText,newText) {
  let changes=0;
  const escape=oldText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(let i=0;i<body.getNumChildren();i++) {
    const elem=body.getChild(i);
    if(elem.getType()!==DocumentApp.ElementType.PARAGRAPH) continue;
    const line=elem.asParagraph().getText().trim();
    const formal=line===oldText || new RegExp('^[^,\\n]{2,60},\\s*'+escape+'$').test(line);
    if(formal) {elem.asParagraph().editAsText().replaceText(escape,newText);changes++;}
  }
  return changes;
}
function catatPerubahan_(scope,id,lama,baru,catatan){
  const sh=getSheet_('Riwayat Perubahan');
  sh.appendRow([timestamp_(),Session.getActiveUser().getEmail(),scope,id,lama,baru,catatan]);
}

function simpanPengaturan(patch) {
  guard_();
  if (!patch || typeof patch!=='object') throw new Error('Tidak ada pengaturan.');
  const allowed = ['NAMA_KOMUNITAS','KOTA','NAMA_KETUA','RESTART_NOMOR',
    'KOP_IMAGE_ID','ORNAMEN_BAWAH_IMAGE_ID','TTD_KETUA_FILE_ID'];
  JENIS_SURAT.forEach(t => allowed.push('KODE_'+t.id.toUpperCase()));
  const changes={};
  Object.keys(patch).forEach(k => {
    if (!allowed.includes(k)) return;
    const value=String(patch[k]||'').trim();
    if (value.length>300) throw new Error('Pengaturan '+k+' terlalu panjang.');
    if (k.startsWith('KODE_') && !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Kode surat hanya boleh huruf, angka, - dan _.');
    if (k==='RESTART_NOMOR' && !['PER_TAHUN','PER_BULAN'].includes(value)) throw new Error('Reset nomor harus PER_TAHUN atau PER_BULAN.');
    if (k==='NAMA_KOMUNITAS' || k==='NAMA_KETUA' || k==='KOTA') if (!value) throw new Error(k+' tidak boleh kosong.');
    if ((k==='KOP_IMAGE_ID'||k==='ORNAMEN_BAWAH_IMAGE_ID'||k==='TTD_KETUA_FILE_ID') && value) {
      try {
        const mime=DriveApp.getFileById(value).getMimeType();
        if (!['image/png','image/jpeg'].includes(mime)) throw new Error('Berkas bukan PNG/JPG.');
      } catch (e) {throw new Error('ID gambar pada '+k+' tidak dapat dibaca: '+e.message);}
    }
    changes[k]=value;
  });
  saveSettingsMap_(changes);
  return {ok:true,message:'Pengaturan tersimpan. Untuk mengubah kop atau ornamen pada template yang sudah ada, klik tombol Terapkan Kop + Ornamen.',settings:publicSettings_(readSettings_())};
}

function publicSettings_(c) {
  const keys=['NAMA_KOMUNITAS','KOTA','NAMA_KETUA','RESTART_NOMOR',
    'KOP_IMAGE_ID','ORNAMEN_BAWAH_IMAGE_ID','TTD_KETUA_FILE_ID'];
  JENIS_SURAT.forEach(t => keys.push('KODE_'+t.id.toUpperCase()));
  const result={};
  keys.forEach(k => result[k]=c[k]||'');
  result.hasSignature=!!c.TTD_KETUA_FILE_ID;
  result.a4Active=c.A4_ACTIVE==='YA';
  return result;
}

function ensureSheet_(ss,name,headers) {
  const sh=ss.getSheetByName(name)||ss.insertSheet(name);
  if (sh.getLastRow()===0) sh.appendRow(headers);
  if (sh.getRange(1,1,1,headers.length).getValues()[0].join('|')!==headers.join('|')) {
    throw new Error('Header sheet '+name+' berubah. Kembalikan baris pertama sesuai petunjuk sebelum setup ulang.');
  }
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,headers.length).setBackground('#0b3054').setFontColor('#ffffff').setFontWeight('bold');
  sh.setColumnWidths(1,headers.length,156);
  if (name===HVC.SHEETS.OUT) {sh.setColumnWidth(5,220);sh.setColumnWidth(6,220);}
  if (name===HVC.SHEETS.IN) {sh.setColumnWidth(5,210);sh.setColumnWidth(6,210);}
  if (name===HVC.SHEETS.SETTINGS) {sh.setColumnWidth(1,280);sh.setColumnWidth(2,340);sh.setColumnWidth(3,450);}
  return sh;
}
function insertMissingSettings_(sh,items) {
  const existing=sh.getLastRow()>1 ? sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().map(r=>r[0]) : [];
  items.forEach(item => {if(!existing.includes(item[0])) sh.appendRow(item);});
}
/** Migrasi V4: sembunyikan permanen kedua jenis lama dari konfigurasi aplikasi.
 * Hanya baris konfigurasi yang dihapus, bukan arsip surat atau file Google Docs di Drive.
 */
function hapusPengaturanJenisNonaktif_(sh) {
  const nonaktif = [
    'KODE_KETERANGAN_SISWA', 'KODE_PEMBERITAHUAN_ORTU',
    'TEMPLATE_KETERANGAN_SISWA_ID', 'TEMPLATE_PEMBERITAHUAN_ORTU_ID'
  ];
  for (let row=sh.getLastRow(); row>=2; row--) {
    const key=String(sh.getRange(row,1).getValue()).trim();
    if (nonaktif.includes(key)) sh.deleteRow(row);
  }
}
function saveSettingsMap_(changes) {
  const sh=getSheet_(HVC.SHEETS.SETTINGS);
  if (!Object.keys(changes).length) return;
  const rows=sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),2).getValues();
  const rowByKey={};
  rows.forEach((r,i) => { if(r[0]) rowByKey[r[0]]=i+2; });
  Object.keys(changes).forEach(k => {
    if (rowByKey[k]) sh.getRange(rowByKey[k],2).setValue(String(changes[k]));
    else sh.appendRow([k,String(changes[k]),'Ditambahkan otomatis']);
  });
}
function readSettings_() {
  const sh=getSheet_(HVC.SHEETS.SETTINGS);
  const rows=sh.getLastRow()>1 ? sh.getRange(2,1,sh.getLastRow()-1,2).getDisplayValues() : [];
  const res={}; rows.forEach(r => {if(r[0]) res[String(r[0]).trim()]=String(r[1]||'').trim();});
  return res;
}
function getSheet_(name) {
  const id=PropertiesService.getScriptProperties().getProperty('HVC_SHEET_ID');
  if (!id) throw new Error('Belum setup. Jalankan fungsi setup() satu kali dari editor Google Apps Script.');
  const sh=SpreadsheetApp.openById(id).getSheetByName(name);
  if(!sh) throw new Error('Sheet '+name+' tidak ditemukan.');
  return sh;
}
function guard_() {
  const c=readSettings_();
  const allowed=String(c.EMAIL_PENGURUS||'').toLowerCase().split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean);
  const user=String(Session.getActiveUser().getEmail()||'').toLowerCase().trim();
  if (!allowed.length) throw new Error('Akses ditutup: isi EMAIL_PENGURUS di sheet Pengaturan.');
  if (!user || !allowed.includes(user)) throw new Error('Akses ditolak. Buka menggunakan akun Google pengurus yang terdaftar. Jika email tidak terdeteksi, gunakan deployment "dijalankan sebagai pengguna yang mengakses".');
  return true;
}
function getOrCreateFolder_(parent,name,id) {
  if(id) return DriveApp.getFolderById(id);
  const existing=parent.getFoldersByName(name);
  return existing.hasNext()?existing.next():parent.createFolder(name);
}
/**
 * Memastikan kop dan ornamen tersedia di Drive tanpa perlu upload manual.
 * Jangan mengganti gambar pilihan pengurus ketika KOP_IMAGE_ID / ORNAMEN_BAWAH_IMAGE_ID sudah diisi.
 */
function pastikanAsetTemplateHVC_(c) {
  if (!c.FOLDER_ASET_ID) throw new Error('Folder aset belum dibuat. Jalankan setup() dahulu.');
  const asetFolder = DriveApp.getFolderById(c.FOLDER_ASET_ID);
  const updates = {};
  const img = [
    {key:'KOP_IMAGE_ID',jenis:'kop'},
    {key:'ORNAMEN_BAWAH_IMAGE_ID',jenis:'footer'}
  ];
  img.forEach(x => {
    if (c[x.key]) {
      const file = DriveApp.getFileById(c[x.key]);
      if (!['image/png','image/jpeg'].includes(file.getMimeType())) {
        throw new Error('ID '+x.key+' harus menunjuk berkas PNG atau JPG.');
      }
      return;
    }
    if (typeof hvcMediaBlob_ !== 'function') {
      throw new Error('File Media.gs belum dipasang. Tambahkan Media.gs dari paket HVC versi 2 ke proyek Apps Script.');
    }
    const blob = hvcMediaBlob_(x.jenis);
    const iter = asetFolder.getFilesByName(blob.getName());
    const file = iter.hasNext() ? iter.next() : asetFolder.createFile(blob);
    updates[x.key] = file.getId();
  });
  if (Object.keys(updates).length) saveSettingsMap_(updates);
}

/**
 * LATAR A4 PENUH: gambar asli halaman Word HVC disimpan ke Drive otomatis.
 * Google Docs tidak mempunyai API publik untuk memasang IMAGE WATERMARK otomatis.
 * Pasang sekali melalui menu Sisipkan > Watermark di dokumen master.
 */
function pastikanLatarA4_(c) {
  if (c.A4_BACKGROUND_IMAGE_ID) {
    DriveApp.getFileById(c.A4_BACKGROUND_IMAGE_ID).getName();
    return c.A4_BACKGROUND_IMAGE_ID;
  }
  if (typeof hvcBackgroundA4Blob_!=='function') {
    throw new Error('Media.gs versi 3 belum dipasang. Ganti Media.gs dan jalankan setup().');
  }
  const folder=DriveApp.getFolderById(c.FOLDER_ASET_ID);
  const blob=hvcBackgroundA4Blob_();
  const files=folder.getFilesByName(blob.getName());
  const file=files.hasNext()?files.next():folder.createFile(blob);
  saveSettingsMap_({A4_BACKGROUND_IMAGE_ID:file.getId()});
  return file.getId();
}

/** Siapkan dokumen master A4 sekali. Pasang watermark melalui menu Google Docs. */
function siapkanMasterA4() {
  guard_();
  const c=readSettings_();
  pastikanLatarA4_(c);
  const latest=readSettings_();
  if (latest.MASTER_A4_ID) return {
    masterUrl:'https://docs.google.com/document/d/'+latest.MASTER_A4_ID+'/edit',
    backgroundUrl:DriveApp.getFileById(latest.A4_BACKGROUND_IMAGE_ID).getUrl(),
    message:'Dokumen master sudah tersedia. Buka, sisipkan Watermark gambar A4, lalu klik Terapkan Latar A4 di aplikasi.'
  };
  const doc=DocumentApp.create('MASTER HVC - LATAR A4 PENUH (PASANG WATERMARK SEKALI)');
  const body=doc.getBody();
  body.setPageWidth(595.28).setPageHeight(841.89);
  body.setMarginLeft(52).setMarginRight(52).setMarginTop(120).setMarginBottom(120);
  body.clear();
  body.appendParagraph('MASTER HVC – A4').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('1. Klik Sisipkan / Insert → Watermark → Gambar / Image.');
  body.appendParagraph('2. Ambil file LATAR_KERTAS_HVC_A4.png dari folder aset HVC di Google Drive.');
  body.appendParagraph('3. Matikan opsi Pudar / Faded dan sesuaikan skala sampai memenuhi kertas A4.');
  body.appendParagraph('4. Kembali ke aplikasi → Pengaturan → Terapkan Latar A4.');
  body.appendParagraph('Catatan: teks panduan ini akan dibuang dari template surat saat penerapan.');
  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(latest.FOLDER_TEMPLATE_ID));
  saveSettingsMap_({MASTER_A4_ID:doc.getId()});
  return {
    masterUrl:doc.getUrl(),backgroundUrl:DriveApp.getFileById(latest.A4_BACKGROUND_IMAGE_ID).getUrl(),
    message:'Master A4 dibuat. Pasang watermark gambar menggunakan menu Google Docs, kemudian terapkan ke semua template.'
  };
}

/** Salin isi template lama (termasuk perubahan naskah oleh pengurus) ke master watermark. */
function salinBodyKeMaster_(fromBody,toBody) {
  toBody.clear();
  for (let i=0;i<fromBody.getNumChildren();i++) {
    const el=fromBody.getChild(i), tp=el.getType();
    if (tp===DocumentApp.ElementType.PARAGRAPH) toBody.appendParagraph(el.copy().asParagraph());
    else if (tp===DocumentApp.ElementType.TABLE) toBody.appendTable(el.copy().asTable());
    else if (tp===DocumentApp.ElementType.LIST_ITEM) toBody.appendListItem(el.copy().asListItem());
  }
}

/**
 * Mengganti 5 template secara aman dengan copy dari master yang sudah diberi watermark.
 * Template sebelumnya dibackup; arsip surat lama dan nomor tidak diubah.
 */
function terapkanLatarA4KeSemuaTemplate() {
  guard_();
  const c=readSettings_();
  if (!c.MASTER_A4_ID) throw new Error('Master belum dibuat. Klik Siapkan Master A4 lebih dahulu.');
  const master=DriveApp.getFileById(c.MASTER_A4_ID);
  const folder=DriveApp.getFolderById(c.FOLDER_TEMPLATE_ID);
  const root=DriveApp.getFolderById(c.FOLDER_INDUK_ID);
  const backup=getOrCreateFolder_(root,'05 - CADANGAN TEMPLATE SEBELUM A4','');
  const changes={},rows=[];
  JENIS_SURAT.forEach(t=> {
    const key='TEMPLATE_'+t.id.toUpperCase()+'_ID';
    const oldId=c[key];
    if (!oldId) throw new Error('Template belum ada untuk '+t.name+'. Jalankan setup().');
    const newCopy=master.makeCopy('TEMPLATE HVC A4 - '+t.name,folder);
    try {
      const oldDoc=DocumentApp.openById(oldId);
      const newDoc=DocumentApp.openById(newCopy.getId());
      const body=newDoc.getBody();
      salinBodyKeMaster_(oldDoc.getBody(),body);
      body.setPageWidth(595.28).setPageHeight(841.89);
      body.setMarginLeft(52).setMarginRight(52).setMarginTop(120).setMarginBottom(120);
      newDoc.saveAndClose();
      changes[key]=newCopy.getId();
      rows.push({name:t.name,previousId:oldId,newId:newCopy.getId()});
    } catch (e) {
      newCopy.setTrashed(true);
      throw new Error('Gagal mengonversi '+t.name+': '+e.message+'. Template lama tetap aktif.');
    }
  });
  // Perbarui semua ID secara bersamaan setelah semua dokumen baru berhasil dibuat.
  changes.A4_ACTIVE='YA';
  saveSettingsMap_(changes);
  rows.forEach(r=>{
    try {DriveApp.getFileById(r.previousId).setName('CADANGAN V2 - '+r.name+' - '+timestamp_()).moveTo(backup);}catch(_){}
  });
  return {ok:true,updated:rows.length,message:'Lima template aktif menggunakan master watermark A4. Periksa satu PDF percobaan sebelum terbit resmi.'};
}

/**
 * Gambar kop di header dan ornamen di footer, berlaku di semua halaman.
 * Teks isi surat di BODY tidak diganti agar template dapat tetap diedit pengurus.
 */
function pasangHeaderFooterHVC_(doc,c) {
  const body = doc.getBody();
  // A4 = 595,28 × 841,89 pt. Ruang header/footer disisihkan dari isi surat.
  body.setPageWidth(595.28).setPageHeight(841.89);
  body.setMarginLeft(52).setMarginRight(52).setMarginTop(125).setMarginBottom(132);
  if (!c.KOP_IMAGE_ID || !c.ORNAMEN_BAWAH_IMAGE_ID) {
    throw new Error('ID kop dan ornamen belum lengkap di sheet Pengaturan.');
  }
  const header = doc.getHeader() || doc.addHeader();
  const footer = doc.getFooter() || doc.addFooter();
  sisipGambarRapi_(header,c.KOP_IMAGE_ID,480);
  sisipGambarRapi_(footer,c.ORNAMEN_BAWAH_IMAGE_ID,480);
}

function sisipGambarRapi_(bagian,fileId,lebarMaks) {
  const berkas = DriveApp.getFileById(fileId);
  if (!['image/png','image/jpeg'].includes(berkas.getMimeType())) {
    throw new Error('Berkas gambar harus PNG/JPG: '+berkas.getName());
  }
  // clear() mencegah penumpukan gambar saat tombol diterapkan ulang.
  bagian.clear();
  const img = bagian.appendImage(berkas.getBlob());
  const w0 = img.getWidth(), h0 = img.getHeight();
  const w1 = Math.min(w0,lebarMaks);
  img.setWidth(w1).setHeight(Math.round(h0*w1/w0));
  const p = img.getParent().asParagraph();
  p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  p.setSpacingBefore(0).setSpacingAfter(0);
}

function hapusKopLamaDiBody_(body) {
  // Dari v1 hanya paragraf awal berisi gambar atau tulisan kop yang dihapus.
  // Teks surat yang ditulis pengurus tidak diubah.
  const max = Math.min(7,body.getNumChildren());
  for (let i=max-1; i>=0; i--) {
    const el=body.getChild(i);
    if (el.getType()===DocumentApp.ElementType.PARAGRAPH) {
      const p=el.asParagraph(), line=p.getText().trim();
      const punyaSatuChild=p.getNumChildren()===1;
      const hanyaGambar=(punyaSatuChild && p.getChild(0).getType()===DocumentApp.ElementType.INLINE_IMAGE);
      const aturanLama=(punyaSatuChild && p.getChild(0).getType()===DocumentApp.ElementType.HORIZONTAL_RULE);
      if (line==='{{NAMA_KOMUNITAS}}' || line.startsWith('ABSOLUTE BROTHERHOOD') ||
          (hanyaGambar && i<4) || (aturanLama && i<5)) {
        el.removeFromParent();
      }
    } else if (el.getType()===DocumentApp.ElementType.HORIZONTAL_RULE && i<5) {
      el.removeFromParent();
    }
  }
}


/**
 * V5: meratakan seluruh label : isi memakai tabel tanpa garis.
 * Jangan pakai spasi biasa untuk penyelarasan Google Docs (font proporsional).
 * Label dikenal saja yang diubah, sehingga paragraf narasi tidak tersentuh.
 */
const LABEL_TITIK_DUA_HVC_ = Object.freeze({
  'nomor':'Nomor',
  'lampiran':'Lampiran',
  'hal':'Hal',
  'nama':'Nama',
  'id registrasi':'ID Registrasi',
  'no. kendaraan':'No. Kendaraan',
  'no kendaraan':'No. Kendaraan',
  'keterangan':'Keterangan',
  'dasar keputusan':'Dasar keputusan',
  'tanggal':'Tanggal',
  'kegiatan':'Kegiatan',
  'alasan':'Alasan',
  'hari / tanggal':'Hari / tanggal',
  'hari/tanggal':'Hari / tanggal',
  'waktu':'Waktu',
  'tempat':'Tempat',
  'agenda':'Agenda',
  'mulai vakum':'Mulai vakum',
  'sampai dengan':'Sampai dengan'
});

function bacaBarisTitikDuaHVC_(paragraph) {
  if (paragraph.getType() !== DocumentApp.ElementType.PARAGRAPH) return null;
  const line = paragraph.asParagraph().getText();
  const match = line.match(/^\s*([^:\n]{1,38}?)\s*:\s*(.*?)\s*$/);
  if (!match) return null;
  const key = match[1].trim().replace(/\s+/g,' ').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(LABEL_TITIK_DUA_HVC_,key)) return null;
  return [LABEL_TITIK_DUA_HVC_[key], ':', match[2]];
}

/**
 * Mengubah satu kelompok paragraf "label : isi" menjadi satu tabel.
 * Seluruh blok menggunakan lebar kolom yang sama (pt), termasuk Nomor dan Nama.
 * Teks {{PLACEHOLDER}} tetap disalin apa adanya agar pengisian otomatis berjalan.
 * Aman dijalankan berkali-kali karena paragraf lama sudah berubah menjadi tabel.
 */
function rapikanBlokTitikDuaHVC_(body) {
  let converted = 0;
  let i = 0;
  while (i < body.getNumChildren()) {
    const group = [];
    let j = i;
    while (j < body.getNumChildren()) {
      const row = bacaBarisTitikDuaHVC_(body.getChild(j));
      if (!row) break;
      group.push(row);
      j++;
    }
    if (!group.length) { i++; continue; }
    const table = body.insertTable(i,group);
    table.setBorderWidth(0);
    // A4 dengan margin 52 pt per sisi menghasilkan area teks ~491 pt.
    // Lebar 104+16+360=480 pt; semua : sejajar secara vertikal.
    [104,16,360].forEach((width,index)=>table.setColumnWidth(index,width));
    for (let r=0; r<group.length; r++) {
      for (let col=0; col<3; col++) {
        const cell=table.getCell(r,col);
        cell.setPaddingTop(2).setPaddingBottom(2);
        cell.setPaddingLeft(col===1?0:2).setPaddingRight(col===1?0:2);
        const p=cell.getChild(0).asParagraph();
        p.setSpacingBefore(0).setSpacingAfter(0);
        p.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
        const t=p.editAsText();
        t.setFontFamily('Arial').setFontSize(10);
        if (col===0) t.setBold(true);
      }
    }
    // Hapus paragraf sumber, tepat setelah tabel yang baru disisipkan.
    for (let k=0;k<group.length;k++) body.getChild(i+1).removeFromParent();
    converted+=group.length;
    i++; // Lanjut dari blok berikutnya; tabel yang sudah jadi akan dilewati.
  }
  return converted;
}

/**
 * Dijalankan dari Pengaturan atau dari tombol Run Apps Script satu kali sesudah upgrade.
 * Mengoreksi 5 template Google Docs aktif tanpa menyentuh arsip surat keluar/masuk.
 * Dokumen master watermark A4 dan gambar header/footer tidak dihapus.
 * Untuk keamanan, membuat copy cadangan HANYA bila ada baris yang perlu dikoreksi.
 */
function rapikanSemuaTemplateHVC() {
  guard_();
  const c=readSettings_();
  const root=DriveApp.getFolderById(c.FOLDER_INDUK_ID);
  const folder=getOrCreateFolder_(root,'06 - CADANGAN SEBELUM RAPI TITIK DUA','');
  const results=[];
  JENIS_SURAT.forEach(type => {
    const id=c['TEMPLATE_'+type.id.toUpperCase()+'_ID'];
    if (!id) throw new Error('ID template '+type.name+' belum ditemukan. Jalankan setup() terlebih dulu.');
    const doc=DocumentApp.openById(id);
    const body=doc.getBody();
    let count=0;
    for(let i=0;i<body.getNumChildren();i++) {
      if (bacaBarisTitikDuaHVC_(body.getChild(i))) count++;
    }
    if (count) {
      DriveApp.getFileById(id).makeCopy('SEBELUM FORMAT V5 - '+type.name+' - '+timestamp_(),folder);
      const updated=rapikanBlokTitikDuaHVC_(body);
      results.push({nama:type.name,baris:updated});
    } else {
      results.push({nama:type.name,baris:0});
    }
    doc.saveAndClose();
  });
  const total=results.reduce((sum,r)=>sum+r.baris,0);
  return {
    ok:true,
    total:total,
    templates:results,
    message:total?
      'Berhasil merapikan '+total+' baris pada lima template. Surat baru akan memakai format titik dua yang sejajar.':
      'Kelima template sudah rapi; tidak ada baris yang perlu diubah.'
  };
}

function createTemplate_(type,c,folder) {
  const gunakanMaster=(c.A4_ACTIVE==='YA' && !!c.MASTER_A4_ID);
  const doc=gunakanMaster ? DocumentApp.openById(DriveApp.getFileById(c.MASTER_A4_ID).makeCopy('TEMPLATE HVC A4 - '+type.name,folder).getId()) : DocumentApp.create('TEMPLATE HVC - '+type.name);
  const body=doc.getBody(); body.clear();
  if (!gunakanMaster) pasangHeaderFooterHVC_(doc,c);
  else {body.setPageWidth(595.28).setPageHeight(841.89);body.setMarginLeft(52).setMarginRight(52);body.setMarginTop(120).setMarginBottom(120);}
  const lines=NASKAH[type.id];
  lines.forEach(line => {
    const p=body.appendParagraph(line);
    p.editAsText().setFontFamily('Arial').setFontSize(10);
    p.setSpacingAfter(line ? 6 : 1);
    if (line.startsWith('SURAT KETERANGAN') || line==='P E R N Y A T A A N') {
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      p.editAsText().setBold(true).setFontSize(12);
    }
  });
  rapikanBlokTitikDuaHVC_(body);
  body.appendParagraph('');
  body.appendParagraph('{{KOTA}}, {{TANGGAL_SURAT}}').setAlignment(DocumentApp.HorizontalAlignment.CENTER).editAsText().setFontSize(10);
  // V6: hanya Ketua Umum; rata tengah. Nama dan gambar mengikuti Pengaturan.
  body.appendParagraph('Mengetahui,').setAlignment(DocumentApp.HorizontalAlignment.CENTER)
      .setSpacingAfter(4).editAsText().setFontSize(10);
  sisipBlokKetuaTengahHVC_(body,body.getNumChildren());
  seragamkanDokumenSuratHVC_(doc);
  doc.saveAndClose();
  const file=DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  return doc.getId();
}

/** Blok tanda tangan tunggal di tengah untuk surat baru dan template yang dimigrasi. */
function sisipBlokKetuaTengahHVC_(body,index) {
  const lines = [
    {text:'Ketua Umum {{NAMA_KOMUNITAS}}',after:10,bold:false},
    {text:'{{TTD_KETUA}}',after:13,bold:false},
    {text:'{{NAMA_KETUA}}',after:4,bold:true}
  ];
  lines.forEach((item,i) => {
    const p=body.insertParagraph(index+i,item.text);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    p.setSpacingBefore(0).setSpacingAfter(item.after);
    p.editAsText().setFontFamily('Arial').setFontSize(10).setBold(item.bold);
  });
}
/** Pendeteksian sengaja ketat agar tabel milik pengurus tidak terhapus. */
function tabelTtdLamaHVC_(el) {
  if (el.getType()!==DocumentApp.ElementType.TABLE) return false;
  const t=el.asTable();
  if(t.getNumRows()!==3) return false;
  if([0,1,2].some(r=>t.getRow(r).getNumCells()!==2))return false;
  const col=(r,c)=>t.getCell(r,c).getText().trim();
  return col(0,0).startsWith('Ketua Umum') && col(0,1).startsWith('Wakil Ketua') &&
    col(1,0).includes('{{TTD_KETUA}}') && col(1,1).includes('{{TTD_WAKIL}}') &&
    col(2,0).includes('{{NAMA_KETUA}}') && col(2,1).includes('{{NAMA_WAKIL}}');
}
/**
 * Menyesuaikan 5 template yang sudah terpasang dari versi lama.
 * Hanya tabel TTD versi lama yang berstruktur standar yang diganti.
 * Tiap template yang diubah dibackup; arsip surat/PDF yang sudah terbit tidak disentuh.
 */
function terapkanTandaTanganKetuaTengah() {
  guard_();
  const c=readSettings_();
  const root=DriveApp.getFolderById(c.FOLDER_INDUK_ID);
  const backup=getOrCreateFolder_(root,'07 - CADANGAN SEBELUM TTD TENGAH','');
  let updated=0,already=0;
  const skipped=[];
  JENIS_SURAT.forEach(t=>{
    const id=c['TEMPLATE_'+t.id.toUpperCase()+'_ID'];
    if(!id)throw new Error('ID template '+t.name+' belum tersedia. Jalankan setup().');
    const doc=DocumentApp.openById(id),body=doc.getBody();
    let index=-1;
    for(let i=body.getNumChildren()-1;i>=0;i--) {
      if(tabelTtdLamaHVC_(body.getChild(i))) {index=i;break;}
    }
    if(index===-1) {
      const all=body.getText();
      if(all.includes('{{TTD_KETUA}}') && !all.includes('{{TTD_WAKIL}}'))already++;
      else skipped.push(t.name);
      doc.saveAndClose();
      return;
    }
    DriveApp.getFileById(id).makeCopy('SEBELUM TTD TENGAH - '+t.name+' - '+timestamp_(),backup);
    body.getChild(index).removeFromParent();
    sisipBlokKetuaTengahHVC_(body,index);
    // Posisi Mengetahui, juga diratakan tengah tanpa mengganggu baris tanggal.
    for(let j=Math.max(0,index-3);j<index;j++){
      const el=body.getChild(j);
      if(el.getType()===DocumentApp.ElementType.PARAGRAPH &&
         /^Mengetahui\s*,?$/i.test(el.asParagraph().getText().trim())) {
        el.asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
    doc.saveAndClose();
    updated++;
  });
  return {ok:true,updated,already,skipped,
    message:'Blok tanda tangan Ketua Umum telah dipusatkan pada '+updated+' template. '+already+
    ' template sudah tunggal.'+(skipped.length?' Periksa manual template kustom: '+skipped.join(', ')+'.':'')};
}

function insertSignature_(body,placeholder,fileId) {
  const pattern='\\{\\{'+placeholder+'\\}\\}';
  let found=body.findText(pattern);
  if (!found) return;
  const text=found.getElement().asText();
  const start=found.getStartOffset();
  text.deleteText(start,found.getEndOffsetInclusive());
  const parent=text.getParent();
  if (!fileId) {
    // Tidak memasang tanda tangan tanpa ID gambar yang disetujui.
    return;
  }
  const imgBlob=DriveApp.getFileById(fileId).getBlob();
  const para=parent.asParagraph();
  const newImage=para.insertInlineImage(para.getChildIndex(text)+1,imgBlob);
  const oldWidth=newImage.getWidth();
  const newWidth=Math.min(oldWidth,110);
  newImage.setWidth(newWidth).setHeight(Math.round(newImage.getHeight()*newWidth/oldWidth));
}
function nextNumber_(code,isoDate,resetRule) {
  const year = isoDate.slice(0,4);
  const monthIndex = Number(isoDate.slice(5,7))-1;
  const keySuffix = resetRule==='PER_BULAN' ? isoDate.slice(0,7) : year;
  const key = 'HVC_SEQ_'+code+'_'+keySuffix;
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props=PropertiesService.getScriptProperties();
    const previous=Number(props.getProperty(key)||0);
    let maxArchive=0;
    const sh=getSheet_(HVC.SHEETS.OUT);
    if(sh.getLastRow()>1) {
      const rows=sh.getRange(2,3,sh.getLastRow()-1,1).getDisplayValues();
      const y=year;
      const month=HVC.ROMAN[monthIndex];
      rows.forEach(r => {
        const m=String(r[0]).match(/^(\d+)\/([^/]+)\/([IVX]+)\/(\d{4})$/);
        if(m && m[2]===code && m[4]===y && (resetRule!=='PER_BULAN'||m[3]===month)) {
          maxArchive=Math.max(maxArchive,Number(m[1]));
        }
      });
    }
    const next=Math.max(previous,maxArchive)+1;
    props.setProperty(key,String(next));
    return String(next).padStart(3,'0')+'/'+code+'/'+HVC.ROMAN[monthIndex]+'/'+year;
  } finally {lock.releaseLock();}
}
function parseDate_(s,label) {
  const str=String(s||'');
  const m=str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) throw new Error(label+' wajib berformat YYYY-MM-DD.');
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const val=new Date(y,mo-1,d,12,0,0);
  if(val.getFullYear()!==y||val.getMonth()!==mo-1||val.getDate()!==d) throw new Error(label+' bukan tanggal yang valid.');
  return val;
}
function normalisasiTanggalSheet_(v) {
  if (v instanceof Date) return Utilities.formatDate(v,HVC.TIMEZONE,'yyyy-MM-dd');
  const s=String(v==null?'':v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):s;
}
function dateToIndo_(iso) {const d=parseDate_(iso,'Tanggal');return d.getDate()+' '+HVC.MONTHS[d.getMonth()]+' '+d.getFullYear();}
function recipient_(type,v) {
  return ({undangan:v.tujuan,pemberhentian:v.nama_anggota,dispensasi:v.nama_anggota,
    pengunduran_diri:v.nama_anggota,status_vakum:v.nama_anggota})[type]||'Penerima';
}
function safeFilename_(s) { return String(s||'berkas').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\s+/g,' ').trim().slice(0,160); }
function cell_(s) {const v=String(s==null?'':s).trim();return /^[=+@-]/.test(v) ? "'"+v:v;}
function timestamp_(){return Utilities.formatDate(new Date(),HVC.TIMEZONE,'yyyy-MM-dd HH:mm:ss');}

/**
 * Versi 2. Jalankan SETELAH mengganti Code.gs, menambah Media.gs,
 * dan menjalankan setup() untuk menambah kunci Pengaturan.
 * Aman diulangi: tidak membuat template ganda atau mengubah isi surat.
 */
function terapkanKopDanOrnamenKeSemuaTemplate() {
  guard_();
  if (readSettings_().A4_ACTIVE==='YA') throw new Error('Mode latar A4 sudah aktif. Gunakan Master A4 untuk mengubah background, jangan tombol Header/Footer V2.');
  let c = readSettings_();
  pastikanAsetTemplateHVC_(c);
  c = readSettings_();
  const hasil=[];
  JENIS_SURAT.forEach(t => {
    const id = c['TEMPLATE_'+t.id.toUpperCase()+'_ID'];
    if (!id) throw new Error('Template '+t.name+' tidak ditemukan. Jalankan setup().');
    const doc = DocumentApp.openById(id);
    hapusKopLamaDiBody_(doc.getBody());
    pasangHeaderFooterHVC_(doc,c);
    doc.saveAndClose();
    hasil.push(t.name);
  });
  return {updated:hasil.length,names:hasil,
    message:'Kop atas dan ornamen bawah sudah terpasang pada '+hasil.length+' template Google Docs.'};
}

/**
 * Gunakan desain persis dari berkas Word HVC (kop versi crop + footer asli).
 * Pakai bila versi lama pernah memakai gambar kop yang berbeda.
 * TTD dan arsip tidak diubah.
 */
function gunakanDesainAsliHVC() {
  guard_();
  saveSettingsMap_({KOP_IMAGE_ID:'',ORNAMEN_BAWAH_IMAGE_ID:''});
  return terapkanKopDanOrnamenKeSemuaTemplate();
}

/** Alias untuk halaman web lama yang masih menggunakan nama fungsi v1. */
function terapkanKopKeSemuaTemplate() {
  return terapkanKopDanOrnamenKeSemuaTemplate();
}


/**
 * V7 — Format resmi yang sama untuk semua surat HVC.
 * Huruf isi dokumen: Arial 10 pt, hitam pekat. Format tebal (bold) tetap.
 * Gambar kop, watermark, ornamen dan gambar tanda tangan TIDAK disentuh.
 */
function seragamkanElemenHVC_(element) {
  const kind=element.getType();
  if(kind===DocumentApp.ElementType.TEXT) {
    const t=element.asText();
    if(t.getText().length) {
      t.setFontFamily('Arial');
      t.setFontSize(10);
      t.setForegroundColor('#000000');
    }
    return;
  }
  if(kind===DocumentApp.ElementType.TABLE) {
    const table=element.asTable();
    for(let r=0;r<table.getNumRows();r++) {
      const row=table.getRow(r);
      for(let c=0;c<row.getNumCells();c++) seragamkanElemenHVC_(row.getCell(c));
    }
    return;
  }
  // Paragraph, list-item, table-cell, body, header and footer contain
  // nested text; visit children instead of rewriting their text content.
  if(typeof element.getNumChildren==='function') {
    for(let i=0;i<element.getNumChildren();i++) seragamkanElemenHVC_(element.getChild(i));
  }
}

/**
 * Hanya tanggal PENUTUP sebelum 'Mengetahui' yang dipusatkan.
 * Tanggal di pembuka surat tidak berubah.
 * Mendukung {{KOTA}}, {{TANGGAL_SURAT}} serta tanggal terisi di surat lama.
 */
function pusatkanTanggalPenutupHVC_(body) {
  const ET=DocumentApp.ElementType;
  let mengetahui=-1;
  for(let i=body.getNumChildren()-1;i>=0;i--) {
    const e=body.getChild(i);
    if(e.getType()!==ET.PARAGRAPH)continue;
    if(/^Mengetahui\s*[,.:]?$/i.test(e.asParagraph().getText().trim())) {
      mengetahui=i;
      break;
    }
  }
  if(mengetahui<0)return false;
  for(let i=mengetahui-1;i>=Math.max(0,mengetahui-6);i--) {
    const e=body.getChild(i);
    if(e.getType()!==ET.PARAGRAPH)continue;
    const p=e.asParagraph(),line=p.getText().trim();
    if(!line)continue;
    const placeholder=/\{\{TANGGAL_SURAT\}\}/.test(line) && /\{\{KOTA\}\}/.test(line);
    const isDate=/^[A-Za-zÀ-ÿ .'-]{2,40},\s*[0-3]?\d\s+[A-Za-zÀ-ÿ]+\s+\d{4}$/u.test(line);
    if(!placeholder && !isDate) return false;
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    p.setSpacingBefore(3).setSpacingAfter(3);
    return true;
  }
  return false;
}

/** Diterapkan pada template, salinan surat baru, atau Docs arsip terpilih. */
function seragamkanDokumenSuratHVC_(doc) {
  const body=doc.getBody();
  const centered=pusatkanTanggalPenutupHVC_(body);
  seragamkanElemenHVC_(body);
  // Header/footer hanya dinormalkan bila memiliki teks; gambar tetap utuh.
  const header=doc.getHeader();
  const footer=doc.getFooter();
  if(header)seragamkanElemenHVC_(header);
  if(footer)seragamkanElemenHVC_(footer);
  return {tanggalPenutup:centered};
}

/**
 * Ubah 5 template Google Docs yang SUDAH ADA (bukan buat ulang).
 * Selalu cadangkan template lebih dahulu. Tidak mengubah nomor, isi,
 * data arsip, tanda tangan, ataupun desain latar A4.
 */
function seragamkanSemuaTemplateHVC() {
  guard_();
  const c=readSettings_();
  const root=DriveApp.getFolderById(c.FOLDER_INDUK_ID);
  const backup=getOrCreateFolder_(root,'08 - CADANGAN SEBELUM FONT HITAM DAN TANGGAL','');
  const results=[];
  JENIS_SURAT.forEach(type=>{
    const id=c['TEMPLATE_'+type.id.toUpperCase()+'_ID'];
    if(!id) throw new Error('Template '+type.name+' belum tersedia. Jalankan setup().');
    const file=DriveApp.getFileById(id);
    file.makeCopy('BACKUP SEBELUM V7 - '+type.name+' - '+timestamp_(),backup);
    const doc=DocumentApp.openById(id);
    const status=seragamkanDokumenSuratHVC_(doc);
    doc.saveAndClose();
    results.push({nama:type.name,tanggalTengah:status.tanggalPenutup});
  });
  const tidakTerbaca=results.filter(x=>!x.tanggalTengah).map(x=>x.nama);
  return {
    ok:tidakTerbaca.length===0,templates:results,
    message:tidakTerbaca.length===0?
      'Berhasil: lima template memakai teks hitam Arial 10 pt dan tanggal penutup di tengah. Coba buat surat baru.':
      'Font dan warna telah diseragamkan. Periksa posisi tanggal pada template kustom: '+tidakTerbaca.join(', ')+'.'
  };
}

/**
 * Opsi bagi arsip surat keluar yang sudah diterbitkan: rapikan 1 dokumen
 * terpilih, buat ulang PDF, dan simpan riwayat. Tidak menyentuh surat lain.
 */
function rapikanFormatArsipKeluarHVC(payload) {
  guard_();
  const id=String(payload&&payload.id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('ID arsip tidak valid.');
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh=getSheet_(HVC.SHEETS.OUT);
    const last=sh.getLastRow();
    if(last<2)throw new Error('Arsip surat keluar kosong.');
    const ids=sh.getRange(2,1,last-1,1).getDisplayValues();
    const found=ids.findIndex(x=>x[0]===id);
    if(found<0)throw new Error('Surat tidak ditemukan.');
    const row=found+2;
    const number=String(sh.getRange(row,3).getValue());
    const docUrl=String(sh.getRange(row,8).getValue());
    const docId=(docUrl.match(/\/document\/d\/([\w-]+)/)||[])[1];
    if(!docId)throw new Error('Tautan Google Docs dalam arsip tidak valid.');
    const oldPdfUrl=String(sh.getRange(row,9).getValue());
    const c=readSettings_();
    const root=DriveApp.getFolderById(c.FOLDER_INDUK_ID);
    const backup=getOrCreateFolder_(root,'09 - CADANGAN DOCS SURAT SEBELUM REVISI FORMAT','');
    DriveApp.getFileById(docId).makeCopy('BACKUP FORMAT - '+safeFilename_(number)+' - '+timestamp_(),backup);
    const doc=DocumentApp.openById(docId);
    // Tolak dokumen kustom tak dikenal sebelum melakukan penyeragaman teks.
    const isStandard=pusatkanTanggalPenutupHVC_(doc.getBody());
    if(!isStandard) {
      doc.saveAndClose();
      throw new Error('Tanggal penutup tidak ditemukan. Periksa tata letak Google Docs. Dokumen asal tidak diubah.');
    }
    seragamkanDokumenSuratHVC_(doc);
    doc.saveAndClose();
    let pdf=null;
    try {
      const name=safeFilename_(number+' - REVISI FORMAT')+'.pdf';
      pdf=DriveApp.getFolderById(c.FOLDER_PDF_ID).createFile(
        DriveApp.getFileById(docId).getAs(MimeType.PDF).setName(name));
      // Update arsip terlebih dahulu, baru catat riwayat. Jika gagal,
      // tautan lama dipulihkan pada blok catch sebelum PDF baru dibuang.
      sh.getRange(row,9).setValue(pdf.getUrl());
      getSheet_('Riwayat Format').appendRow([
        timestamp_(),Session.getActiveUser().getEmail()||'Pengurus',id,number,
        oldPdfUrl,pdf.getUrl(),'Tanggal penutup di tengah; huruf Arial 10 hitam'
      ]);
      const oldId=(oldPdfUrl.match(/\/file\/d\/([\w-]+)/)||[])[1];
      if(oldId){try{DriveApp.getFileById(oldId).setTrashed(true);}catch(_){}}
      return {ok:true,docsUrl:docUrl,pdfUrl:pdf.getUrl(),
        message:'Format surat ini berhasil diperbaiki. Google Docs dan tautan PDF di arsip sudah diperbarui.'};
    } catch(err) {
      // Pulihkan tautan PDF lama bila ekspor, pencatatan atau penulisan gagal.
      try{sh.getRange(row,9).setValue(oldPdfUrl);}catch(_){}
      if(pdf){try{pdf.setTrashed(true);}catch(_){}}
      throw new Error('Google Docs sudah dirapikan, tetapi pembaruan PDF gagal: '+err.message+
        '. Periksa Docs dan PDF lama di arsip; backup dokumen tersedia.');
    }
  } finally { lock.releaseLock(); }
}
