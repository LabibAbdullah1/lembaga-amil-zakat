# Product Requirements Document (PRD)
# Sistem Informasi Lembaga Amil Zakat (LAZ / ZIS) & Zakat Fitrah Masjid

**Versi Dokumen:** 2.0 (Self-Contained Agile Master PRD — Laravel + React + TypeScript + shadcn/ui + PWA)  
**Nama Proyek:** `laz-zis-masjid`  
**Database Target:** `db_laz_zis_masjid` (MariaDB 10.6+ / MySQL 8.0+)  
**Arsitektur Utama:** RDBMS-First Business Logic + Thin-Controller Laravel Monorepo (Inertia.js + React + TypeScript + shadcn/ui + PWA)  
**Peran Penyusun:** Software Engineer & Software Engineering Manager

---

## 1. Ringkasan Eksekutif & Visi Produk

### 1.1 Latar Belakang & Tujuan
Operasional panitia zakat fitrah, zakat mal, infak, sedekah, dan wakaf (ZISWAF) di masjid—khususnya pada puncak bulan Ramadhan—membutuhkan sistem yang **cepat saat input di loket**, **tahan terhadap kesalahan manusia dan race condition**, **patuh terhadap aturan syariat Islam**, serta **transparan bagi jamaah/publik**.

Proyek ini membangun aplikasi web modern berbasis **Progressive Web App (PWA)** yang dapat di-install langsung di smartphone panitia maupun dijalankan di desktop sekretariat masjid. 

### 1.2 Prinsip Arsitektur Fundamental: RDBMS-First
**Seluruh integritas data dan aturan bisnis inti berada di level RDBMS (MariaDB)** melalui `CHECK` constraint, `UNIQUE` constraint, `FOREIGN KEY`, `TRIGGER`, `FUNCTION`, `STORED PROCEDURE`, `VIEW`, dan `EVENT SCHEDULER`.  
Aplikasi **Laravel** berperan sebagai:
1. **Thin Orchestrator & Execution Layer**: Memanggil Stored Procedure (`CALL sp_*`), menyuntikkan variabel sesi `@app_user` untuk jejak audit, dan menangani error `SQLSTATE '45000'` secara ramah di UI.
2. **Application-Level Supporting Logic**: Autentikasi & sesi Laravel, otorisasi RBAC (5 peran + portal publik), generator nomor dokumen (`KWZ-*`, `BKK-*`), cetak/unduh PDF kwitansi & BKK, filter/pagination laporan dari `VIEW`, serta kapabilitas PWA.

> **Catatan Penting:** Dokumen ini bersifat **mandiri (self-contained)**. Seluruh skema tabel, objek database, aturan syariat, dan kontrak teknis telah dirangkum lengkap di sini agar aplikasi dapat dibangun di repositori baru mana pun tanpa bergantung pada file eksternal.

---

## 2. Target Pengguna, Peran (RBAC), & Persona

Sistem memiliki **5 peran internal** (tersimpan di tabel `pengguna_sistem.peran`) dan **1 akses publik/auditor** tanpa login:

| No | Peran (`peran`) | Persona | Tanggung Jawab Utama | Akun DB yang Digunakan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `Admin` | Sekretaris / Operator Sistem | Mengelola master data (`jenis_dana`, `periode_ramadhan`, `pengguna_sistem`, `program_penyaluran`), memantau `log_audit_zis`, serta memiliki akses supervisi operasional. | `zis_aplikasi` |
| 2 | `Amil_Penerima` | Kasir Loket Zakat Masjid | Mendaftarkan muzaki & anggota keluarga, mencatat transaksi penerimaan ZIS/Fitrah secara cepat, mencetak kwitansi, dan mengajukan pembatalan (void) jika salah input. | `zis_aplikasi` |
| 3 | `Verifikator` | Tim Survei Lapangan (RT/RW) | Mendaftarkan calon mustahik dan menginput hasil survei kelayakan lapangan (`Layak` / `Tidak_Layak`). | `zis_aplikasi` |
| 4 | `Staf_Penyaluran` | Staf Distribusi & Program | Membuat program penyaluran, menyusun draf Bukti Kas Keluar (BKK) multi-mustahik, dan mencatat serah terima fisik. | `zis_aplikasi` |
| 5 | `Ketua_DKM` | Pimpinan / Penyetuju Masjid | Meninjau draf BKK, menyetujui (`Disetujui`), menolak (`Ditolak`), serta mengeksekusi pencairan dana (`Disalurkan`). | `zis_aplikasi` |
| 6 | *Publik / Auditor* | Jamaah / Donatur / Auditor Eksternal | Mengakses portal transparansi publik untuk melihat saldo dana, penyaluran per asnaf, dan laporan penyaluran dengan data sensitif tersamar (*masked*). | `zis_laporan` (Read-Only `VIEW`) |

---

## 3. Aturan Bisnis Inti & Kepatuhan Syariat (Ditegakkan oleh RDBMS)

Setiap aturan di bawah ini **wajib** ditegakkan oleh database dan **tidak boleh** diduplikasi atau dilonggarkan di kode PHP/TypeScript:

1. **Hierarki Jenis Dana Bertingkat (Self-Referencing 3 Level):**
   - Mendukung induk dan sub-dana (`Zakat` → `Zakat Fitrah` / `Zakat Mal` → `Zakat Profesi` / `Zakat Perniagaan`; `Infak_Sedekah` → `Terikat` / `Tidak Terikat`; `Wakaf` → `Wakaf Tunai`).
2. **Satu Periode Ramadhan Aktif:**
   - Maksimal hanya **1 baris** pada `periode_ramadhan` yang boleh memiliki `status_aktif = 1` pada satu waktu (`trg_before_insert_periode_ramadhan`, `trg_before_update_periode_ramadhan`).
3. **Proteksi Saldo Anti-Negatif (Uang & Beras):**
   - Saldo uang (`saldo_tersedia`) dan saldo beras (`saldo_beras_kg`) pada setiap kantong `jenis_dana` dipisahkan dan **dilarang bernilai < 0** (`CHECK` constraint + validasi `TRIGGER` + `FOR UPDATE` locking).
4. **Otomasi Hitung Jiwa KK & Sinkronisasi Header-Detail:**
   - Fungsi `fn_hitung_jiwa_muzaki(muzaki_id)` menghitung jumlah anggota keluarga terdaftar (minimal 1 jiwa).
   - Setiap detail penghimpunan atau detail penyaluran yang masuk otomatis memperbarui total di tabel header (`transaksi_penghimpunan` / `penyaluran_dana`) dan saldo `jenis_dana` melalui trigger.
5. **Mekanisme Void / Reversal Kwitansi (Anti-Hapus Transaksi):**
   - Kwitansi penghimpunan tidak dihapus secara fisik, melainkan diubah statusnya dari `Sah` menjadi `Dibatalkan` via `sp_batalkan_penghimpunan`. Trigger otomatis membalikkan (mengurangi) saldo uang/beras pada `jenis_dana` dan mencatatnya ke `log_audit_zis`.
6. **Validasi Kelayakan Mustahik & Kedaluwarsa 365 Hari:**
   - Dana berkategori `Zakat` hanya boleh dialokasikan kepada mustahik dengan `status_verifikasi = 'Layak'` dan `DATEDIFF(CURDATE(), tanggal_verifikasi_terakhir) <= 365`.
   - `evt_kedaluwarsa_verifikasi_mustahik` berjalan setiap hari mengubah status `Layak` yang melewati 365 hari menjadi `Kedaluwarsa`.
7. **Batas Maksimal Hak Amil 12,5% (Uang + Konversi Beras):**
   - Total penyaluran dana `Zakat` kepada golongan `ASN-03` (Amil) — mencakup nominal uang dan konversi beras fitrah menggunakan tarif `periode_ramadhan` aktif — tidak boleh melebihi **12,50%** dari total penghimpunan `Zakat` yang `Sah` pada periode yang sama (`fn_persentase_hak_amil` & `trg_before_insert_detail_penyaluran`).
8. **Kunci Kesesuaian Kantong Dana Program & BKK:**
   - `jenis_dana_id` pada `penyaluran_dana` (BKK) wajib identik dengan `jenis_dana_id` pada `program_penyaluran` (`trg_before_insert_penyaluran_dana`) untuk mencegah kebocoran dana zakat ke program infak/fisik non-zakat.
9. **Larangan Duplikasi Mustahik dalam Satu BKK:**
   - Satu mustahik hanya boleh muncul satu kali dalam satu BKK (`UNIQUE (penyaluran_id, mustahik_id)`).
10. **Alur Persetujuan Penyaluran Ketat (State Machine):**
    - Alur sah: `Draft` → `Disetujui` → `Disalurkan` (atau `Draft` → `Ditolak`).
    - Dilarang melompat langsung dari `Draft` ke `Disalurkan`.
    - Status `Disalurkan` dan `Ditolak` bersifat final (immutable).
    - Saldo `jenis_dana` baru terpotong saat transisi sah `Disetujui` → `Disalurkan` melalui `sp_eksekusi_penyaluran` dengan *pessimistic locking* (`SELECT ... FOR UPDATE`).
11. **Jejak Audit Otomatis (JSON & Partisi Tahunan):**
    - Seluruh perubahan `mustahik`, `penyaluran_dana`, `transaksi_penghimpunan` (void), dan perubahan manual saldo `jenis_dana` otomatis terekam ke tabel terpartisi `log_audit_zis` dalam format `JSON_OBJECT()` beserta identitas pelaku (`COALESCE(@app_user, USER())`).
12. **Kerahasiaan Data Publik (Data Masking):**
    - Akses publik melalui `zis_laporan` hanya bisa membaca 4 `VIEW` dan diblokir total dari 14 tabel asli. NIK dan nama mustahik/muzaki disamarkan di level `VIEW`.

---

## 4. Kontrak Lengkap RDBMS (`db_laz_zis_masjid`)

### 4.1 Daftar 14 Tabel & Kolom Kunci

1. **`jenis_dana`**: `id`, `parent_id` (FK self), `kode_dana` (UQ), `nama_dana`, `kategori_utama` (`Zakat|Infak_Sedekah|Wakaf`), `is_terikat`, `saldo_tersedia` (`>=0`), `saldo_beras_kg` (`>=0`), timestamps.
2. **`kategori_asnaf`**: `id`, `kode_asnaf` (UQ: `ASN-01` s.d. `ASN-08`), `nama_asnaf`, `deskripsi`.
3. **`periode_ramadhan`**: `id`, `tahun_hijriah` (UQ), `tahun_masehi`, `beras_per_jiwa_kg` (`>0`, default `2.50`), `nominal_fitrah_per_jiwa` (`>0`), `status_aktif` (`0|1`).
4. **`pengguna_sistem`**: `id`, `nama_lengkap`, `username` (UQ), `email` (UQ), `no_hp`, `password_hash`, `remember_token`, `peran` (`Admin|Amil_Penerima|Verifikator|Staf_Penyaluran|Ketua_DKM`), `status_aktif`, timestamps.
5. **`muzaki`**: `id`, `nik` (`CHAR(16)`, UQ), `nama_lengkap`, `no_hp`, `alamat_rt_rw`, `jenis_muzaki` (`Individu|KK_Keluarga`), timestamps.
6. **`anggota_keluarga_muzaki`**: `id`, `muzaki_id` (FK cascade), `nama_anggota`, `status_hubungan` (`Kepala_Keluarga|Istri|Anak|Tanggungan_Lain`).
7. **`mustahik`**: `id`, `nik` (`CHAR(16)`, UQ), `nama_lengkap`, `kategori_asnaf_id` (FK), `alamat_rt_rw`, `status_verifikasi` (`Menunggu|Layak|Tidak_Layak|Kedaluwarsa`), `tanggal_verifikasi_terakhir`, timestamps.
8. **`verifikasi_mustahik`**: `id`, `mustahik_id` (FK cascade), `verifikator_id` (FK), `tanggal_verifikasi`, `hasil` (`Layak|Tidak_Layak`), `catatan_survei`.
9. **`transaksi_penghimpunan`**: `id`, `no_kwitansi` (UQ), `muzaki_id` (FK), `periode_id` (FK), `amil_id` (FK), `tanggal_transaksi`, `metode_bayar` (`Tunai|Transfer|QRIS|Beras|Campuran`), `total_nominal` (`>=0`), `total_beras_kg` (`>=0`), `status_transaksi` (`Sah|Dibatalkan`), `alasan_batal`.
10. **`detail_penghimpunan`**: `id`, `transaksi_id` (FK cascade), `jenis_dana_id` (FK), `jumlah_jiwa` (`>=1`), `nominal` (`>=0`), `berat_beras_kg` (`>=0`), `CHECK (nominal > 0 OR berat_beras_kg > 0)`.
11. **`program_penyaluran`**: `id`, `kode_program` (UQ), `nama_program`, `jenis_dana_id` (FK), `periode_id` (FK), `anggaran_rencana` (`>=0`), `status_program` (`Draft|Berjalan|Selesai`).
12. **`penyaluran_dana`**: `id`, `no_bkk` (UQ), `program_id` (FK), `jenis_dana_id` (FK), `pembuat_id` (FK), `penyetuju_id` (FK nullable), `tanggal_penyaluran`, `total_disalurkan` (`>=0`), `total_beras_kg` (`>=0`), `status_persetujuan` (`Draft|Disetujui|Disalurkan|Ditolak`), `catatan_penolakan`, timestamps.
13. **`detail_penyaluran_mustahik`**: `id`, `penyaluran_id` (FK cascade), `mustahik_id` (FK), `nominal_diterima` (`>=0`), `beras_diterima_kg` (`>=0`), `status_serah_terima` (`Belum|Sudah`), `waktu_serah_terima`, `petugas_serah_id` (FK nullable), `UNIQUE (penyaluran_id, mustahik_id)`.
14. **`log_audit_zis`**: `id`, `nama_tabel`, `record_id`, `aksi` (`INSERT|UPDATE|DELETE`), `data_lama`, `data_baru`, `dilakukan_oleh`, `waktu_kejadian`, `PRIMARY KEY (id, waktu_kejadian)` dengan `PARTITION BY RANGE (YEAR(waktu_kejadian))`.

### 4.2 Kontrak Stored Procedure & Function

| Tipe | Nama Objek | Parameter | Fungsi di Aplikasi |
| :--- | :--- | :--- | :--- |
| **SP** | `sp_terima_zis_fitrah` | `(p_no_kwitansi, p_muzaki_id, p_periode_id, p_amil_id, p_metode_bayar, p_jenis_dana_id, p_jumlah_jiwa, p_nominal, p_berat_beras_kg)` | Mencatat setoran ZIS/Fitrah atomik & auto-update saldo. |
| **SP** | `sp_batalkan_penghimpunan` | `(p_transaksi_id, p_alasan_batal)` | Void kwitansi + pembalikan saldo + audit log. |
| **SP** | `sp_verifikasi_mustahik` | `(p_mustahik_id, p_verifikator_id, p_hasil, p_catatan)` | Simpan riwayat survei + update status & tanggal verifikasi mustahik. |
| **SP** | `sp_buat_pengajuan_penyaluran` | `(p_no_bkk, p_program_id, p_jenis_dana_id, p_pembuat_id, p_mustahik_id, p_nominal, p_beras_kg)` | Membuat header BKK (`Draft`) + penerima pertama dengan validasi syariat. |
| **SP** | `sp_tambah_mustahik_bkk` | `(p_penyaluran_id, p_mustahik_id, p_nominal, p_beras_kg)` | Menambahkan penerima ke BKK berstatus `Draft`. |
| **SP** | `sp_eksekusi_penyaluran` | `(p_penyaluran_id, p_penyetuju_id)` | Mencairkan BKK `Disetujui` → `Disalurkan` dengan `FOR UPDATE` locking + update serah terima. |
| **FN** | `fn_persentase_hak_amil` | `(p_periode_id)` → `DECIMAL(6,2)` | Menampilkan realisasi % hak amil periode aktif di dashboard. |
| **FN** | `fn_cek_kelayakan_mustahik` | `(p_mustahik_id)` → `TINYINT(1)` | Badge status kelayakan real-time di daftar mustahik/BKK. |
| **FN** | `fn_hitung_jiwa_muzaki` | `(p_muzaki_id)` → `INT UNSIGNED` | Auto-fill jumlah jiwa zakat fitrah di form loket. |

### 4.3 Kontrak 4 VIEW & 4 Laporan Analitik Wajib

- **4 VIEW** (diakses via koneksi `zis_laporan`):
  1. `v_laporan_penyaluran_publik` (NIK & nama mustahik disamarkan, hanya `Disalurkan`).
  2. `v_saldo_jenis_dana` (Rekap saldo uang & beras beserta induk dana).
  3. `v_rekap_penyaluran_asnaf` (Total mustahik terbantu, uang, & beras per 8 asnaf).
  4. `v_rekap_penghimpunan_muzaki` (Frekuensi & total donasi per muzaki & periode, NIK disamarkan).
- **4 Laporan Analitik Wajib** (dieksekusi via `DB::connection('mysql_laporan')->select(...)` atau `DB::select` read-only):
  1. **Hierarki Dana (Recursive CTE):** Penghimpunan, penyaluran, dan sisa saldo uang & beras berjenjang dari induk ke sub-dana.
  2. **Pertumbuhan YoY (`LAG` Window Function):** Perbandingan penghimpunan per bulan terhadap bulan yang sama tahun sebelumnya.
  3. **Porsi 8 Asnaf (`SUM() OVER()` Window Function):** Distribusi persentase penyaluran per golongan asnaf.
  4. **Peringkat Muzaki (`DENSE_RANK()` & Running Total Window Function):** Leaderboard kontribusi donatur pada periode aktif.

---

## 5. Manajemen Proyek Agile (Epics, User Stories, & Sprint Roadmap)

Proyek dikerjakan dalam **4 Sprint (masing-masing 1 minggu)** dengan definisi *Definition of Done (DoD)* yang ketat: kode TypeScript lolos typecheck (`tsc --noEmit`), build Vite sukses, UI responsif di mobile & desktop, PWA installable, dan seluruh skenario penolakan RDBMS tertangani dengan pesan error yang jelas.

### Sprint 1: Fondasi Monorepo, Auth RBAC, PWA & Dashboard Saldo
- **Epic E1 — Setup Infrastruktur & Koneksi RDBMS:**
  - *US-1.1:* Sebagai Developer, saya dapat menjalankan Laravel + Inertia.js + React + TypeScript + shadcn/ui dalam 1 repositori dengan dukungan Vite PWA.
  - *US-1.2:* Sebagai Sistem, saya memisahkan koneksi database `mysql` (`zis_aplikasi`) dan `mysql_laporan` (`zis_laporan`), serta otomatis mengeksekusi `SET @app_user = ?` untuk setiap request user yang login.
- **Epic E2 — Autentikasi & Otorisasi 5 Peran:**
  - *US-2.1:* Sebagai Pengguna Internal, saya dapat login menggunakan `username` atau `email` dengan verifikasi `password_hash` pada tabel `pengguna_sistem` dan `status_aktif = 1`.
  - *US-2.2:* Sebagai Pengguna, menu sidebar/bottom-nav dan akses rute saya dibatasi otomatis sesuai peran (`Admin`, `Amil_Penerima`, `Verifikator`, `Staf_Penyaluran`, `Ketua_DKM`).

### Sprint 2: Master Data, Muzaki, & Loket Penghimpunan Cepat (POS Masjid)
- **Epic E3 — Pengelolaan Master Data (Admin):**
  - *US-3.1:* Sebagai Admin, saya dapat mengelola `periode_ramadhan` (takaran beras & nominal fitrah per jiwa) dan mengaktifkan periode (ditolak RDBMS jika masih ada periode lain aktif).
  - *US-3.2:* Sebagai Admin, saya dapat melihat pohon hierarki `jenis_dana`, mengelola `program_penyaluran`, dan mengelola akun `pengguna_sistem`.
- **Epic E4 — Manajemen Muzaki & Loket Penghimpunan:**
  - *US-4.1:* Sebagai Amil Penerima, saya dapat mencari/mendaftarkan `muzaki` beserta `anggota_keluarga_muzaki` dan melihat hitungan jiwa otomatis (`fn_hitung_jiwa_muzaki`).
  - *US-4.2:* Sebagai Amil Penerima di HP/tablet loket masjid, saya dapat menginput transaksi Zakat Fitrah (uang/beras/campuran), Zakat Mal, Infak, atau Wakaf melalui `sp_terima_zis_fitrah` dalam < 30 detik.
  - *US-4.3:* Sebagai Amil Penerima, saya dapat mencetak/mengunduh kwitansi PDF dan melakukan pembatalan/void kwitansi (`sp_batalkan_penghimpunan`) dengan alasan wajib.

### Sprint 3: Mustahik, Survei Verifikator, & Alur Penyaluran (BKK)
- **Epic E5 — Manajemen Mustahik & Survei Lapangan:**
  - *US-5.1:* Sebagai Verifikator, saya dapat mendaftarkan mustahik baru (`Menunggu`) dan menginput hasil survei kelayakan (`Layak` / `Tidak_Layak`) via `sp_verifikasi_mustahik` langsung dari HP saat survei lapangan.
  - *US-5.2:* Sebagai Staf, saya dapat melihat badge masa berlaku verifikasi (hijau jika `fn_cek_kelayakan_mustahik = 1`, merah jika `Kedaluwarsa` / `> 365 hari`).
- **Epic E6 — Pengajuan, Persetujuan, & Pencairan BKK Multi-Mustahik:**
  - *US-6.1:* Sebagai Staf Penyaluran, saya dapat membuat BKK `Draft` (`sp_buat_pengajuan_penyaluran`) dan menambahkan beberapa mustahik (`sp_tambah_mustahik_bkk`), dengan indikator real-time persentase hak amil (`fn_persentase_hak_amil` maks 12,5%).
  - *US-6.2:* Sebagai Ketua DKM, saya dapat menyetujui (`Disetujui`) atau menolak (`Ditolak` + `catatan_penolakan`) BKK, lalu mengeksekusi pencairan (`sp_eksekusi_penyaluran`) yang aman dari race condition.
  - *US-6.3:* Jika RDBMS menolak transaksi (`SQLSTATE 45000`), UI menampilkan Toast/Alert error spesifik dari pesan trigger (misal: hak amil > 12,5%, mustahik kedaluwarsa, saldo kurang).

### Sprint 4: Pelaporan Analitik, Audit Log, Portal Transparansi Publik, & Hardening PWA
- **Epic E7 — Laporan Analitik & Audit Trail:**
  - *US-7.1:* Sebagai Admin/Ketua DKM, saya dapat melihat 4 Laporan Analitik Wajib (Hierarki Recursive CTE, Pertumbuhan YoY, Porsi 8 Asnaf dengan grafik, dan Peringkat Muzaki) serta mengekspornya.
  - *US-7.2:* Sebagai Admin/Ketua DKM, saya dapat memantau `log_audit_zis` dengan diff visual JSON `data_lama` vs `data_baru`.
- **Epic E8 — Portal Transparansi Publik & PWA Optimization:**
  - *US-8.1:* Sebagai Jamaah/Publik (tanpa login), saya dapat mengakses halaman `/transparansi` yang membaca data dari `zis_laporan` (`VIEW` dengan NIK & nama tersamar).
  - *US-8.2:* Sebagai Pengguna Mobile, saya dapat meng-install aplikasi ke Home Screen (PWA) dengan ikon, splash screen, offline notice, dan performa Lighthouse PWA memenuhi standar.

---

## 6. Kebutuhan Non-Fungsional (NFR)
1. **Performa:** Query laporan pada > 52.000 baris transaksi harus berjalan cepat memanfaatkan 4 index komposit (`< 500 ms`). Halaman Inertia memakai partial reload & pagination server-side.
2. **Keamanan:**
   - Password di-hash menggunakan Bcrypt (`Hash::make()` / `$2y$`).
   - CSRF protection aktif di seluruh form mutasi Inertia.
   - Akun `zis_laporan` terisolasi hanya untuk halaman publik & laporan `VIEW`.
   - Tidak ada raw SQL concatenation dari input pengguna (wajib parameter binding `?`).
3. **Responsivitas & Aksesibilitas:** Mobile-first UI (komponen shadcn/ui `Sheet` untuk mobile drawer, `Bottom Navigation` untuk peran kasir/verifikator di HP, tabel otomatis berubah menjadi *card list* di layar `< 768px`).
4. **PWA & Keterandalan Jaringan:**
   - Installable di Android Chrome & iOS Safari.
   - Transaksi finansial (`POST`/`PUT`/`CALL sp_*`) **wajib online** (Network-Only); jika offline, PWA menampilkan banner status jaringan agar tidak terjadi transaksi ganda atau saldo tidak sinkron.
