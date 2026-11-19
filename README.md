# Backup Privat — Sistem Surat Menyurat HVC Jakarta

**Simpan repository ini sebagai PRIVATE.** Berisi backend dan tampilan aplikasi asli Google Apps Script dari versi administrasi yang terakhir ditangani dalam percakapan, beserta berkas Media.gs dan aset kertas.

## Isi
- `apps-script/Code.gs`: fungsi Apps Script, pembuatan surat, PDF, arsip, pengaturan.
- `apps-script/Index.html`: tampilan aplikasi administrasi V10 (logo tanpa 1% dan MC; tombol perapian sekali-pakai sudah disembunyikan).
- `apps-script/Media.gs`: gambar kop dan ornamen dalam format data kode untuk instalasi Apps Script.
- `LATAR_KERTAS_HVC_A4.png`: latar kertas surat.
- `LOGO_HVC_TANPA_1PCT_MC.png`: logo untuk Home.

## Penting
- **Jangan hidupkan GitHub Pages pada repository privat ini.**
- Jangan unggah file Sheets, tanda tangan asli, surat pribadi, atau data anggota.
- Kode ini merupakan **cadangan**, bukan penerapan otomatis ke Apps Script. Perubahan GitHub tidak otomatis mengubah aplikasi Google Anda.
- Untuk memulihkan: buka proyek Apps Script yang benar, salin file `Code.gs`, `Index.html`, dan `Media.gs` sesuai petunjuk Apps Script. **Sebelum mengganti proyek yang sedang aktif, buat cadangan.**
- Fungsi `setup()` pada proyek dapat membuat sheet/template/folder; **jangan jalankan ulang tanpa memahami dampaknya** pada proyek aktif.

## Versi kode
- Backend `Code.gs` dari pembaruan V7.
- Frontend administrasi `Index.html` dari pembaruan V10.
- `Media.gs` dari paket V2, sebagai aset untuk Apps Script.

## Kunjungi portal publik
Gunakan paket terpisah `HVC_GitHub_Pages_Siap_Upload.zip` untuk repository GitHub Pages **Public**.
