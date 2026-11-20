# Master Prompt Eksekusi Proyek (`prompt_master.md`)
# Sistem Informasi LAZ / ZIS & Zakat Fitrah Masjid (Laravel + React + TS + shadcn/ui + PWA)

Gunakan dokumen ini sebagai **panduan prompt bertahap** saat Anda membangun aplikasi di folder/repositori baru (di luar folder proyek database lama). Salin `prd.md`, `design.md`, `rules.md`, dan `prompt_master.md` ke root folder proyek baru Anda terlebih dahulu.

---

## PROMPT 0: System Context & Inisialisasi Proyek (Jalankan Pertama Kali)

```text
Bertindaklah sebagai Senior Full-Stack Software Engineer (Laravel, Inertia.js, React, TypeScript, shadcn/ui, PWA) dan Database Architect.

Baca dengan teliti tiga dokumen referensi utama di root proyek ini:
1. `rules.md` (Aturan mutlak RDBMS-First — WAJIB dipatuhi 100%)
2. `prd.md` (Spesifikasi produk, kontrak 14 tabel, 6 Stored Procedure, 3 Function, 12 Trigger, 4 View, dan Sprint Agile)
3. `design.md` (Arsitektur monorepo, dual DB connection, UI/UX shadcn/ui, dan PWA)

TUGAS SPRINT 0 (INISIALISASI MONOREPO):
1. Inisialisasi proyek Laravel terbaru dengan React + TypeScript menggunakan Inertia.js (`@inertiajs/react`) dan Vite.
2. Instal dan konfigurasi Tailwind CSS serta `shadcn/ui` (komponen dasar: button, card, input, label, select, badge, dialog, sheet, table, tabs, alert, sonner, dropdown-menu, separator).
3. Instal dan konfigurasi `vite-plugin-pwa` agar aplikasi menjadi Progressive Web App (PWA) yang installable di HP (tambahkan `manifest`, ikon placeholder SVG/PNG 192x192 & 512x512, dan strategi caching aman: aset statis CacheFirst, endpoint transaksi & Inertia NetworkOnly/NetworkFirst).
4. Konfigurasikan `.env.example` dan `config/database.php` untuk:
   - Koneksi `mysql` (`zis_aplikasi` ke `db_laz_zis_masjid`)
   - Koneksi `mysql_laporan` (`zis_laporan` ke `db_laz_zis_masjid`)
   - `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync` (agar tidak membuat tabel Laravel baru di `db_laz_zis_masjid`).
5. JANGAN membuat migration yang mengubah 14 tabel inti di `db_laz_zis_masjid`.
6. Verifikasi dengan `npx tsc --noEmit` dan `npm run build` hingga sukses tanpa error.
```

---

## PROMPT 1: Sprint 1 — Fondasi Auth `pengguna_sistem`, RBAC, Middleware `@app_user`, & Dashboard

```text
Lanjutkan ke SPRINT 1 berdasarkan `prd.md`, `design.md`, dan `rules.md`.

TUGAS SPRINT 1:
1. Buat `App\Models\PenggunaSistem` (`extends Authenticatable`) yang terhubung ke tabel `pengguna_sistem`, dengan override `getAuthPassword()` dan `getAuthPasswordName()` mengarah ke `password_hash`, serta cek `status_aktif = 1`.
2. Buat halaman & controller Login (`resources/js/pages/Auth/Login.tsx`) yang mendukung login via `username` atau `email` menggunakan komponen `shadcn/ui`.
3. Buat `App\Http\Middleware\SetRdbmsAppUser` untuk menjalankan `DB::statement('SET @app_user = ?', [...])` pada setiap request user terautentikasi, dan `App\Http\Middleware\EnsureRole` untuk otorisasi 5 peran (`Admin`, `Amil_Penerima`, `Verifikator`, `Staf_Penyaluran`, `Ketua_DKM`).
4. Buat `App\Support\RdbmsErrorHandler` untuk menangkap `QueryException` (`SQLSTATE 45000` / error `1644` & duplicate `1062`) dan mengembalikan pesan bersih ke Inertia error bag `rdbms`.
5. Buat `AuthenticatedLayout.tsx` yang responsif:
   - Desktop: Sidebar navigasi sesuai peran + Header menampilkan Periode Ramadhan Aktif & badge Realisasi Hak Amil (`SELECT fn_persentase_hak_amil(?)`).
   - Mobile (`< 768px`): Bottom Navigation Bar + `Sheet` menu drawer + `OfflineBanner.tsx` (deteksi `navigator.onLine`) + tombol Install PWA jika `beforeinstallprompt` tersedia.
6. Buat halaman `Dashboard/Index.tsx` yang membaca saldo dari `v_saldo_jenis_dana` (koneksi `mysql_laporan`) dan ringkasan periode aktif.
7. Jalankan `npx tsc --noEmit` dan `npm run build` untuk memastikan zero error.
```

---

## PROMPT 2: Sprint 2 — Master Data, Muzaki, & Loket Penghimpunan Cepat (POS Masjid)

```text
Lanjutkan ke SPRINT 2 berdasarkan `prd.md`, `design.md`, dan `rules.md`. Ingat: JANGAN hitung atau update saldo di PHP!

TUGAS SPRINT 2:
1. **Modul Master Data (Khusus `Admin`):**
   - `PeriodeRamadhanController` & `Master/Periode.tsx`: CRUD periode dan toggle aktif (tangkap `SQLSTATE 45000` jika trigger menolak > 1 periode aktif).
   - `JenisDanaController` & `Master/JenisDana.tsx`: Tampilan pohon hierarki 3 level (`Zakat`, `Infak_Sedekah`, `Wakaf`) beserta saldo uang & beras read-only.
   - `ProgramPenyaluranController` & `Master/Program.tsx`: CRUD program penyaluran.
   - `PenggunaSistemController` & `Master/Pengguna.tsx`: Kelola akun panitia (hash password dengan `Hash::make()` ke `password_hash`, aktif/nonaktifkan user).
2. **Modul Muzaki (`Admin`, `Amil_Penerima`):**
   - `MuzakiController` & `Muzaki/Index.tsx`, `Muzaki/Show.tsx`: Pencarian cepat berdasarkan NIK/Nama/HP, CRUD `muzaki` dan `anggota_keluarga_muzaki`, serta tampilan jumlah jiwa otomatis dari `SELECT fn_hitung_jiwa_muzaki(?)`.
3. **Modul Loket Penghimpunan Cepat (`Amil_Penerima`, `Admin`):**
   - `PenghimpunanController` & `Loket/Index.tsx`:
     - Form entri cepat mobile-friendly: pilih Muzaki, otomatis tarik `fn_hitung_jiwa_muzaki`, pilih `jenis_dana` (hanya sub-dana leaf/operasional), pilih `metode_bayar` (`Tunai`, `Transfer`, `QRIS`, `Beras`, `Campuran`), hitung saran nominal/kg berdasarkan `periode_ramadhan` aktif, lalu simpan via `DB::statement('CALL sp_terima_zis_fitrah(...)')`.
     - Generator nomor kwitansi otomatis di controller (format `KWZ-YYYYMM-XXXXXX`).
     - Tabel & Card List riwayat kwitansi (filter `Sah` / `Dibatalkan`, pencarian, pagination).
     - Tombol **Cetak/Download PDF Kwitansi** dan tombol **Batalkan (Void) Kwitansi** yang memanggil `CALL sp_batalkan_penghimpunan(?, ?)` dengan dialog konfirmasi + alasan wajib.
4. Jalankan `npx tsc --noEmit` dan `npm run build` untuk memastikan zero error.
```

---

## PROMPT 3: Sprint 3 — Mustahik, Survei Verifikator, & Penyaluran BKK Multi-Mustahik

```text
Lanjutkan ke SPRINT 3 berdasarkan `prd.md`, `design.md`, dan `rules.md`. Seluruh validasi syariat (kelayakan, 365 hari, hak amil 12,5%, kesesuaian dana program, dan state machine BKK) wajib diserahkan ke RDBMS!

TUGAS SPRINT 3:
1. **Modul Mustahik & Survei (`Verifikator`, `Staf_Penyaluran`, `Admin`, `Ketua_DKM`):**
   - `MustahikController` & `Mustahik/Index.tsx`: Daftar mustahik lengkap dengan filter 8 Asnaf (`kategori_asnaf`), filter status (`Menunggu`, `Layak`, `Tidak_Layak`, `Kedaluwarsa`), dan badge hasil `fn_cek_kelayakan_mustahik(id)`.
   - Form tambah/edit mustahik baru.
   - Modal/Page **Input Survei Lapangan** (khusus `Verifikator` / `Admin` / `Ketua_DKM`) yang memanggil `CALL sp_verifikasi_mustahik(?, ?, ?, ?)` serta menampilkan riwayat dari `verifikasi_mustahik`.
2. **Modul Penyaluran Dana / BKK (`Staf_Penyaluran`, `Ketua_DKM`, `Admin`):**
   - `PenyaluranController` & `Penyaluran/Index.tsx`, `Create.tsx`, `Show.tsx`:
     - Indikator real-time di header: `Persentase Hak Amil: X.XX% / Maks 12.50%` (dari `fn_persentase_hak_amil`).
     - Buat BKK `Draft` + penerima pertama via `CALL sp_buat_pengajuan_penyaluran(...)` (generator `no_bkk`: `BKK-YYYYMM-XXXX`).
     - Pada halaman detail BKK `Draft`, form tambah penerima tambahan memanggil `CALL sp_tambah_mustahik_bkk(...)`.
     - Khusus `Ketua_DKM`: tombol **Setujui (`Disetujui`)**, **Tolak (`Ditolak` + `catatan_penolakan`)**, dan **Eksekusi Pencairan (`Disalurkan`)** yang memanggil `CALL sp_eksekusi_penyaluran(?, ?)`.
     - Pastikan setiap `QueryException` (`SQLSTATE 45000`) dari trigger (mustahik tidak layak/kedaluwarsa, hak amil > 12,5%, dana tidak cocok dengan program, duplikat mustahik, atau saldo kurang) tampil jelas di `RdbmsAlert.tsx`.
     - Cetak/Download PDF BKK untuk tanda terima fisik.
3. Jalankan `npx tsc --noEmit` dan `npm run build`.
```

---

## PROMPT 4: Sprint 4 — 4 Laporan Analitik Wajib, Audit Log, Portal Publik, & Final Polish

```text
Lanjutkan ke SPRINT 4 berdasarkan `prd.md`, `design.md`, dan `rules.md`.

TUGAS SPRINT 4:
1. **Modul 4 Laporan Analitik Wajib (`Admin`, `Ketua_DKM`):**
   - `LaporanController` & `Laporan/Index.tsx` dengan 4 Tab:
     - Tab 1: **Hierarki Dana (Recursive CTE)** — tampilkan pohon `induk_utama`, `jalur_hierarki`, penghimpunan, penyaluran, dan sisa saldo uang & beras.
     - Tab 2: **Pertumbuhan YoY (`LAG` Window Function)** — tabel & grafik Recharts perbandingan bulan yang sama antar tahun beserta `% pertumbuhan`.
     - Tab 3: **Distribusi 8 Asnaf (`SUM() OVER()`)** — tabel & grafik donut/bar porsi penyaluran per asnaf.
     - Tab 4: **Peringkat Muzaki (`DENSE_RANK()` & Running Total)** — leaderboard kontribusi donatur pada periode aktif.
2. **Modul Audit Trail (`Admin`, `Ketua_DKM`):**
   - `AuditLogController` & `Audit/Index.tsx`: membaca `log_audit_zis` dengan filter `nama_tabel`, `aksi`, rentang tanggal, dan tampilan diff rapi untuk `data_lama` vs `data_baru` (JSON).
3. **Portal Transparansi Publik (`/` atau `/transparansi`, Tanpa Login):**
   - `TransparansiPublikController` & `Publik/Transparansi.tsx`: WAJIB menggunakan `DB::connection('mysql_laporan')` membaca `v_saldo_jenis_dana`, `v_rekap_penyaluran_asnaf`, dan `v_laporan_penyaluran_publik` (NIK & nama tersamar otomatis).
4. **Verifikasi Akhir:**
   - Pastikan tidak ada TypeScript error (`npx tsc --noEmit`), build production sukses (`npm run build`), dan manifest PWA + service worker aktif di hasil build `public/build/`.
```
