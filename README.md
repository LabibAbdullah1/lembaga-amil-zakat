# LAZ Masjid Istiqamah, Rumbai — Sistem Informasi Lembaga Amil Zakat (ZIS & Zakat Fitrah)

Sistem Informasi Pengelolaan Zakat (Zakat Fitrah, Zakat Profesi, dan Zakat Perniagaan) berbasis **Laravel 13 + Inertia.js + React 19 + TypeScript + MySQL 8+** dengan arsitektur *RDBMS-first* untuk menjaga integritas saldo, batas syariat 8 Asnaf & Hak Amil maksimal 12,5%, serta transparansi publik secara *real-time*.

---

## Fitur Utama

### 1. Portal Transparansi Publik (Tanpa Login)
- Mengakses data secara aman melalui koneksi terpisah `mysql_laporan` (`zis_laporan`) yang hanya memiliki hak `SELECT` pada 4 *VIEW* tersamar (*masked* NIK & nama).
- Menampilkan ringkasan saldo dana, distribusi 8 Asnaf dan riwayat penyaluran berdasarkan **tahun berjalan**, rekap muzaki terbaru, kalkulator Zakat Fitrah & Zakat Profesi, serta halaman Dasar Hukum Syariat.

### 2. Loket Penghimpunan Cepat & Manajemen Muzaki (`Admin`, `Amil_Penerima`)
- Pendaftaran Muzaki (`KK_Keluarga` / `Individu`) beserta anggota keluarga dan indeks wilayah RT/RW dengan pencarian asinkron otomatis.
- Input transaksi Zakat Fitrah (uang/beras) maupun Zakat Mal melalui *Stored Procedure* `sp_terima_zis_fitrah`, nomor kwitansi otomatis (`KWZ-*`), cetak **Kwitansi PDF**, dan pembatalan (*void*) terkontrol via `sp_batalkan_penghimpunan`.

### 3. Manajemen Mustahik, Survei Kelayakan, & Pelacakan Penerimaan (`Admin`, `Verifikator`, `Staf_Penyaluran`, `Ketua_DKM`)
- Pencatatan mustahik berdasarkan 8 golongan Asnaf (`ASN-01` s/d `ASN-08`) dan masa berlaku survei 365 hari (`sp_verifikasi_mustahik`).
- Pelacakan otomatis riwayat penerimaan mustahik per periode aktif & per jenis zakat pada tabel `catatan_penerimaan_mustahik` (`Belum Terima (0x)`, `Sudah Terima 1x`, `2x`, dst.).

### 4. Penyaluran Dana / BKK Multi-Mustahik (`Admin`, `Staf_Penyaluran`, `Ketua_DKM`)
- Nomor BKK (`BKK-*`), kode program (`PRG-*`), dan kode dana (`ZKT-*`) dibuat otomatis oleh sistem dan tidak dapat diubah manual.
- Alur persetujuan berjenjang: `Draft` -> `Disetujui` -> `Disalurkan` (`sp_eksekusi_penyaluran`) + cetak **BKK PDF**.
- **Penguncian Program Khusus Amil (`ASN-03`):** program bertanda `khusus_amil = 1` otomatis mengunci pilihan penerima hanya kepada Amil Zakat terdaftar dan menjaga batas syariat **Hak Amil maksimal 12,5%** di tingkat trigger RDBMS.
- **Target & Progres Program:** pemantauan target dana/beras/KK vs realisasi dan penutupan program (`Selesai`) untuk membuka program tahun berikutnya.

### 5. Laporan Analitik, Cetak PDF Resmi, & Audit Trail (`Admin`, `Ketua_DKM`)
- 4 analitik interaktif: Hierarki Kantong Dana (Recursive CTE), Pertumbuhan Tahunan YoY (`LAG`), Proporsi 8 Asnaf (`PieChart` & `BarChart`), dan Peringkat Kontribusi Muzaki (`DENSE_RANK`).
- Unduh **Laporan Periode Ramadhan (PDF)** dan **Laporan Tahunan Zakat Fitrah & Zakat Mal (PDF)** yang merangkum dana terhimpun, jumlah muzaki, penerima manfaat, dana tersalurkan, hak amil (`ASN-03`), dan ringkasan penerimaan per jenis zakat.
- Log audit otomatis (`log_audit_zis`) mencatat perubahan data beserta aktor `@app_user`.

---

## Teknologi yang Digunakan

- **Backend:** PHP `^8.3`, Laravel `^13.17`, Inertia.js Laravel `^3.7`, DomPDF (`barryvdh/laravel-dompdf` `^3.1`)
- **Frontend:** React `^19.0`, TypeScript `^5.7`, Tailwind CSS `^4.0`, Radix UI, Lucide Icons, Recharts, Vite `^8.0` + `vite-plugin-pwa`
- **Database:** MySQL 8+ (3 akun RDBMS terisolasi: `zis_admin`, `zis_aplikasi`, `zis_laporan`)

---

## Setup Database (Urutan Eksekusi SQL)

Seluruh skrip SQL berada di direktori `database/sql/`:

1. `00_setup_user.sql` — Membuat akun database `zis_admin`, `zis_aplikasi`, dan `zis_laporan` beserta hak akses minimum.
2. `02_ddl-v4.sql` — Membuat database `db_laz_zis_masjid` dan seluruh tabel relasional + constraint.
3. `03_objek-v4.sql` — Membuat 4 *VIEW* publik, *FUNCTION*, *TRIGGER*, dan *STORED PROCEDURE*.
4. `04_seed-v4.sql` — Mengisi data master, data dummy bersih 3 tahun terakhir (2024–2026), 12 program penyaluran, dan 12 BKK `Disalurkan`.
5. `05_uji-v4.sql` — Skrip pengujian aturan bisnis RDBMS (opsional).
6. `99_pembersihan.sql` — Menghapus database dan user proyek untuk reset bersih.

Contoh menjalankan pipeline bersih dari awal:

```bash
mysql -u root < database/sql/99_pembersihan.sql
mysql -u root < database/sql/00_setup_user.sql
mysql -u root < database/sql/02_ddl-v4.sql
mysql -u root < database/sql/03_objek-v4.sql
mysql -u root < database/sql/04_seed-v4.sql
```

---

## Instalasi & Menjalankan Aplikasi

```bash
# 1. Pasang dependensi PHP & JavaScript
composer install
npm install

# 2. Salin konfigurasi environment dan sesuaikan koneksi DB (.env)
cp .env.example .env
php artisan key:generate

# 3. Build aset frontend
npm run build

# 4. Jalankan server pengembangan
php artisan serve
```

---

## Akun Demo (Hasil Seed `04_seed-v4.sql`)

Password default seluruh akun seed: `password123`

| Username | Email | Peran |
| :--- | :--- | :--- |
| `labib_admin` | `admin@lazmasjid.id` | `Admin` |
| `ketua_dkm` | `ketua@lazmasjid.id` | `Ketua_DKM` |
| `amil_loket1` | `amil1@lazmasjid.id` | `Amil_Penerima` |
| `verifikator_rt` | `surveyor@lazmasjid.id` | `Verifikator` |
| `staf_penyaluran` | `penyaluran@lazmasjid.id` | `Staf_Penyaluran` |

---

## Pengujian & Verifikasi

```bash
npm run typecheck
npm run build
php artisan test
```
