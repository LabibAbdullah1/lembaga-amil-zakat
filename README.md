# LAZ Masjid Istiqamah, Rumbai — Sistem Informasi Lembaga Amil Zakat (ZIS & Zakat Fitrah)

Sistem Informasi Pengelolaan Zakat (Zakat Fitrah, Zakat Profesi, dan Zakat Perniagaan) berbasis **Laravel 13 + Inertia.js + React 19 + TypeScript + MySQL 8+** dengan arsitektur *RDBMS-first* untuk menjaga integritas saldo, batas syariat 8 Asnaf & Hak Amil maksimal 12,5%, pelacakan penerimaan mustahik per periode, serta transparansi publik secara *real-time*.

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
- Nomor BKK (`BKK-*`), kode program (`PRG-*`), dan kode dana (`ZKT-*`) dibuat otomatis oleh sistem dan dikunci agar tidak dapat diubah manual.
- Alur persetujuan berjenjang: `Draft` -> `Disetujui` -> `Disalurkan` (`sp_eksekusi_penyaluran`) + cetak **BKK PDF**.
- **Penguncian Program Khusus Amil (`ASN-03`):** program bertanda `khusus_amil = 1` otomatis mengunci pilihan penerima hanya kepada Amil Zakat terdaftar dan menjaga batas syariat **Hak Amil maksimal 12,5%** di tingkat trigger RDBMS.
- **Target & Progres Program:** pemantauan target dana/beras/KK vs realisasi dan penutupan program (`Selesai`) untuk membuka program tahun berikutnya, disertai peringatan otomatis apabila seluruh program telah selesai.

### 5. Laporan Analitik, Cetak PDF Resmi, & Audit Trail (`Admin`, `Ketua_DKM`)
- 4 analitik interaktif: Hierarki Kantong Dana (Recursive CTE), Pertumbuhan Tahunan YoY (`LAG`), Proporsi 8 Asnaf (`PieChart` & `BarChart`), dan Peringkat Kontribusi Muzaki (`DENSE_RANK`).
- Unduh **Laporan Periode Ramadhan (PDF)** dan **Laporan Tahunan Zakat Fitrah & Zakat Mal (PDF)** yang merangkum dana terhimpun, jumlah muzaki, penerima manfaat, dana tersalurkan, hak amil (`ASN-03`), dan ringkasan penyaluran per jenis zakat.
- Log audit otomatis (`log_audit_zis`) mencatat perubahan data beserta aktor `@app_user`.

---

## Teknologi yang Digunakan

- **Backend:** PHP `^8.3`, Laravel `^13.17`, Inertia.js Laravel `^3.7`, DomPDF (`barryvdh/laravel-dompdf` `^3.1`)
- **Frontend:** React `^19.0`, TypeScript `^5.7`, Tailwind CSS `^4.0`, Radix UI, Lucide Icons, Recharts, Vite `^8.0` + `vite-plugin-pwa`
- **Database:** MySQL 8+ (3 akun RDBMS terisolasi: `zis_admin`, `zis_aplikasi`, `zis_laporan`)

---

## Struktur Folder Proyek Secara Terperinci

```text
lembaga-amil-zakat/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   └── AuthenticatedSessionController.php   # Login, validasi akun aktif, dan logout sesi
│   │   │   ├── Master/
│   │   │   │   ├── JenisDanaController.php              # CRUD metadata kantong dana zakat + auto-generate kode ZKT-*
│   │   │   │   ├── PenggunaSistemController.php         # Manajemen akun panitia (5 peran) & toggle status aktif
│   │   │   │   ├── PeriodeRamadhanController.php        # Pengaturan periode Ramadhan, tarif fitrah, & periode aktif
│   │   │   │   └── ProgramPenyaluranController.php      # Program penyaluran, target/progres, khusus_amil, & tutup program
│   │   │   ├── AuditLogController.php                   # Penampil log audit RDBMS (log_audit_zis) dengan filter & paginasi
│   │   │   ├── DasarHukumController.php                 # Halaman referensi Al-Qur'an, Hadits, UU No. 23/2011, & Fatwa MUI
│   │   │   ├── DashboardController.php                  # Ringkasan KPI sesuai peran pengguna & grafik dashboard
│   │   │   ├── LaporanController.php                    # 4 query analitik + generator PDF Periode Ramadhan & Tahunan
│   │   │   ├── MustahikController.php                   # Direktori mustahik, indeks RT/RW, survei kelayakan, & status terima
│   │   │   ├── MuzakiController.php                     # Direktori muzaki, anggota keluarga KK, & riwayat setoran
│   │   │   ├── PenghimpunanController.php               # Loket cepat (sp_terima_zis_fitrah), void kwitansi, & cetak PDF
│   │   │   ├── PenyaluranController.php                 # Pengajuan BKK, kunci program Amil, persetujuan, eksekusi, & BKK PDF
│   │   │   └── TransparansiPublikController.php         # Portal publik read-only via koneksi mysql_laporan
│   │   ├── Middleware/
│   │   │   ├── EnsureRole.php                           # Pembatasan akses rute berdasarkan peran pengguna
│   │   │   ├── HandleInertiaRequests.php                # Berbagi props global Inertia (auth, flash, periodeAktif, hakAmil)
│   │   │   ├── SecurityHeaders.php                      # Header keamanan HTTP (nosniff, X-Frame-Options, Referrer-Policy)
│   │   │   └── SetRdbmsAppUser.php                      # Menyetel variabel sesi MySQL @app_user & logout otomatis jika nonaktif
│   │   └── Requests/
│   │       └── Auth/LoginRequest.php                    # Validasi kredensial login pengguna
│   ├── Models/
│   │   ├── PenggunaSistem.php                           # Model autentikasi tabel pengguna_sistem (5 peran panitia)
│   │   └── User.php                                     # Model bawaan Laravel
│   ├── Providers/
│   │   └── AppServiceProvider.php                       # Konfigurasi service container & bootstrapping aplikasi
│   └── Support/
│       └── RdbmsErrorHandler.php                        # Penangkap error SQLSTATE 45000 (SIGNAL trigger/SP) ke UI alert
│
├── database/
│   ├── factories/
│   │   └── UserFactory.php                              # Factory standar pengujian Laravel
│   ├── seeders/
│   │   └── DatabaseSeeder.php                           # Seeder PHP standar
│   └── sql/                                             # Sumber kebenaran skema & objek RDBMS (urutan eksekusi)
│       ├── 00_setup_user.sql                            # Pembuatan akun MySQL: zis_admin, zis_aplikasi, zis_laporan
│       ├── 02_ddl-v4.sql                                # DDL seluruh tabel relasional, index, & constraint
│       ├── 03_objek-v4.sql                              # 4 VIEW publik, FUNCTION, TRIGGER syariat, & STORED PROCEDURE
│       ├── 04_seed-v4.sql                               # Seed master + 3 tahun data bersih (2024-2026) & 12 BKK
│       ├── 05_uji-v4.sql                                # Skrip pengujian aturan bisnis & validasi trigger RDBMS
│       └── 99_pembersihan.sql                           # Skrip cleanup (DROP DATABASE & DROP USER proyek)
│
├── resources/
│   ├── js/
│   │   ├── app.tsx                                      # Entry point Inertia + React + Toaster notifikasi
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── OfflineBanner.tsx                    # Indikator status koneksi luring (PWA)
│   │   │   ├── ui/                                      # Komponen dasar shadcn/ui + Radix (alert, badge, button, card, dialog,
│   │   │   │                                            # dropdown-menu, input, label, select, separator, sheet, sonner, table, tabs)
│   │   │   └── zis/                                     # Komponen domain ZIS khusus aplikasi:
│   │   │       ├── MustahikSearchPicker.tsx             # Pencarian mustahik + indeks RT/RW + badge terima + kunci ASN-03
│   │   │       ├── MuzakiSearchPicker.tsx               # Pencarian muzaki asinkron untuk loket penghimpunan
│   │   │       ├── RdbmsAlert.tsx                       # Tampilan alert ramah saat RDBMS menolak aksi syariat
│   │   │       ├── RoleGuideBanner.tsx                  # Panduan ringkas alur kerja per peran di header
│   │   │       └── UserGuideDialog.tsx                  # Dialog panduan penggunaan lengkap aplikasi
│   │   ├── layouts/
│   │   │   └── AuthenticatedLayout.tsx                  # Layout utama panel admin/petugas (sidebar responsif & header)
│   │   ├── lib/
│   │   │   ├── format.ts                                # Helper formatRupiah, formatBerasKg, formatPercentage, formatTanggalIndonesia
│   │   │   └── utils.ts                                 # Helper penggabungan class Tailwind (cn)
│   │   ├── pages/
│   │   │   ├── Audit/Index.tsx                          # Halaman riwayat audit trail JSON (data lama vs baru)
│   │   │   ├── Auth/Login.tsx                           # Halaman masuk panitia/admin LAZ
│   │   │   ├── Dashboard/Index.tsx                      # Dashboard operasional & monitoring hak amil
│   │   │   ├── Laporan/Index.tsx                        # Pusat analitik grafik + unduh PDF Periode Ramadhan & Tahunan
│   │   │   ├── Loket/Index.tsx                          # Loket penerimaan zakat cepat + riwayat kwitansi
│   │   │   ├── Master/
│   │   │   │   ├── JenisDana.tsx                        # Kelola hierarki kantong dana zakat
│   │   │   │   ├── Pengguna.tsx                         # Kelola akun & peran pengurus
│   │   │   │   ├── Periode.tsx                          # Kelola periode Ramadhan & tarif fitrah per jiwa
│   │   │   │   └── Program.tsx                          # Kelola program penyaluran, progres target, tutup & tahun baru
│   │   │   ├── Mustahik/Index.tsx                       # Basis data mustahik, riwayat survei, & filter penerimaan periode
│   │   │   ├── Muzaki/
│   │   │   │   ├── Index.tsx                            # Direktori muzaki + filter RT/RW
│   │   │   │   └── Show.tsx                             # Detail profil muzaki, anggota keluarga, & riwayat zakat
│   │   │   ├── Penyaluran/
│   │   │   │   ├── Create.tsx                           # Pengajuan BKK baru (kolektif & perorangan, auto-BKK, kunci Amil)
│   │   │   │   ├── Index.tsx                            # Daftar dokumen BKK + peringatan jika seluruh program selesai
│   │   │   │   └── Show.tsx                             # Detail BKK, edit draf penerima, ACC/tolak Ketua DKM, & eksekusi
│   │   │   ├── Publik/Transparansi.tsx                  # Portal publik interaktif Masjid Istiqamah Rumbai + kalkulator zakat
│   │   │   └── Syariat/DasarHukum.tsx                   # Halaman dasar hukum & ketentuan 8 Asnaf / Hak Amil 12,5%
│   │   └── types/
│   │       └── index.d.ts                               # Definisi tipe TypeScript seluruh entitas & props Inertia
│   └── views/
│       ├── app.blade.php                                # Root HTML template Inertia + Vite
│       ├── welcome.blade.php                            # Template bawaan Laravel
│       └── pdf/
│           ├── bkk.blade.php                            # Template PDF Bukti Kas Keluar (BKK)
│           ├── kwitansi.blade.php                       # Template PDF Kwitansi Penerimaan Zakat
│           ├── laporan-ramadhan.blade.php               # Template PDF Laporan Resmi Periode Ramadhan
│           └── laporan-tahunan.blade.php                # Template PDF Laporan Tahunan Zakat Fitrah & Zakat Mal
│
├── routes/
│   ├── console.php                                      # Definisi command Artisan
│   └── web.php                                          # Seluruh rute web publik, autentikasi, & RBAC per peran
│
└── tests/
    ├── Feature/ExampleTest.php                          # Pengujian fitur HTTP Laravel
    ├── Unit/ExampleTest.php                             # Pengujian unit PHPUnit
    └── TestCase.php                                     # Base class test Laravel
```

---

## Setup Database (Urutan Eksekusi SQL)

Jalankan skrip SQL di `database/sql/` secara berurutan menggunakan akun `root` MySQL:

```bash
mysql -u root < database/sql/99_pembersihan.sql
mysql -u root < database/sql/00_setup_user.sql
mysql -u root < database/sql/02_ddl-v4.sql
mysql -u root < database/sql/03_objek-v4.sql
mysql -u root < database/sql/04_seed-v4.sql
```

*(Opsional)* Jalankan pengujian aturan bisnis database:

```bash
mysql -u root < database/sql/05_uji-v4.sql
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
