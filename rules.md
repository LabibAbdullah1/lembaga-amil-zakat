# AI Coding Agent Rules (`rules.md`)
# Proyek: Sistem Informasi LAZ / ZIS & Zakat Fitrah Masjid (`laz-zis-masjid`)

Dokumen ini adalah **aturan mengikat (hard constraints)** bagi AI Coding Agent selama membangun aplikasi. Dilarang melanggar aturan di bawah ini dalam kondisi apa pun.

---

## 1. Aturan Fundamental Arsitektur RDBMS-First (ANTI-BIAS)
1. **DILARANG MEMINDAHKAN LOGIKA BISNIS INTI KE PHP/LARAVEL:**
   - Jangan pernah menulis kode PHP untuk menghitung ulang atau memperbarui kolom `jenis_dana.saldo_tersedia` atau `jenis_dana.saldo_beras_kg` secara manual via Eloquent (`$dana->increment(...)` atau `UPDATE jenis_dana SET saldo_tersedia = ...`).
   - Jangan pernah menulis validasi duplikat di PHP untuk menggantikan trigger/constraint RDBMS: cek kelayakan mustahik 365 hari, batas hak amil 12,5%, kesesuaian `jenis_dana_id` BKK vs program, atau larangan lompat status `Draft -> Disalurkan`.
   - **Tugas Laravel:** Hanya melakukan validasi format input HTTP (`FormRequest`), autentikasi/otorisasi peran, lalu mengeksekusi **Stored Procedure** (`DB::statement('CALL sp_...(...)')`) atau query `UPDATE` status yang sah.
2. **DILARANG MENGUBAH SKEMA DATABASE FASE 1:**
   - Database `db_laz_zis_masjid` (14 tabel, 4 VIEW, 3 FUNCTION, 12 TRIGGER, 6 STORED PROCEDURE, 1 EVENT) dianggap sudah final dan sudah terpasang di MariaDB.
   - **JANGAN** membuat file `database/migrations/*` yang me-`CREATE`, `ALTER`, atau `DROP` 14 tabel inti, maupun menimpa tabel `users` bawaan Laravel ke `pengguna_sistem`.
   - Untuk sesi/cache/queue Laravel jika butuh tabel tambahan, gunakan driver `file` atau `cookie` di `.env` (`SESSION_DRIVER=file`, `CACHE_STORE=file`) agar tidak mengotori skema `db_laz_zis_masjid`.
3. **WAJIB MENYUNTIKKAN `@app_user` UNTUK AUDIT TRAIL:**
   - Setiap request terautentikasi yang menyentuh database tulis (`mysql` / `zis_aplikasi`) **wajib** menjalankan `SET @app_user = ?` terlebih dahulu melalui middleware `SetRdbmsAppUser`.
4. **WAJIB MENANGKAP `QueryException` (`SQLSTATE 45000`):**
   - Setiap pemanggilan `CALL sp_*` atau `UPDATE` pada tabel yang memiliki trigger **wajib** dibungkus dalam `try { ... } catch (\Illuminate\Database\QueryException $e)` menggunakan `RdbmsErrorHandler`.
   - Tampilkan pesan penolakan asli dari `SIGNAL SQLSTATE '45000'` secara ramah di UI melalui Inertia error bag (`errors.rdbms`) dan Toast/Alert shadcn/ui.
5. **PEMISAHAN KONEKSI DATABASE:**
   - Gunakan koneksi default `mysql` (`zis_aplikasi`) untuk operasional internal panitia.
   - Gunakan koneksi `mysql_laporan` (`zis_laporan`) **secara eksklusif** pada `TransparansiPublikController` dan endpoint yang membaca 4 `VIEW` (`v_laporan_penyaluran_publik`, `v_saldo_jenis_dana`, `v_rekap_penyaluran_asnaf`, `v_rekap_penghimpunan_muzaki`). Jangan pernah memakai `zis_laporan` untuk query tabel asli (pasti ditolak MariaDB `ERROR 1142`).

---

## 2. Aturan Autentikasi & RBAC
1. Tabel autentikasi adalah `pengguna_sistem` (bukan `users`).
2. Kolom password adalah `password_hash` (bukan `password`). Model `PenggunaSistem` wajib meng-override `getAuthPassword()` dan `getAuthPasswordName()`.
3. Hanya akun dengan `status_aktif = 1` yang boleh login.
4. Peran (`peran`) bersifat exact-match enum: `'Admin'`, `'Amil_Penerima'`, `'Verifikator'`, `'Staf_Penyaluran'`, `'Ketua_DKM'`. Terapkan middleware `role:...` di `routes/web.php` dan kondisional menu di React.

---

## 3. Aturan Frontend (React + TypeScript + shadcn/ui + PWA)
1. **Strict TypeScript:** Semua file frontend wajib `.ts` / `.tsx`. Dilarang menggunakan `any` secara sembarangan; definisikan interface model sesuai skema tabel di `resources/js/types/index.d.ts`.
2. **UI Wajib shadcn/ui:** Gunakan komponen dari `@/components/ui/*` (Button, Card, Input, Label, Select, Dialog, Sheet, Table, Badge, Tabs, Sonner/Toast, Alert). Jangan mencampur library UI lain seperti MUI, AntD, atau Bootstrap.
3. **Mobile-First & Responsif:**
   - Semua tabel data harus memiliki tampilan alternatif *Card List* di layar mobile (`< md`) atau scroll horizontal yang rapi tanpa merusak layout (`overflow-x-hidden` pada body).
   - Format angka Rupiah (`Rp 1.500.000`) dan berat beras (`2,50 kg`) wajib konsisten dengan class `tabular-nums`.
4. **PWA Safety:**
   - Service Worker dilarang meng-cache respons `POST`/`PUT`/`PATCH`/`DELETE` maupun data saldo real-time.
   - Selalu tampilkan status offline bila `navigator.onLine === false` dan cegah submit transaksi keuangan saat offline.

---

## 4. Aturan Kualitas Kode & Keamanan
1. **Parameter Binding Wajib:** Semua raw query (`DB::select`, `DB::statement`) wajib memakai `?` binding. Dilarang keras interpolasi string variabel PHP ke dalam SQL.
2. **Jangan Duplikasi Logika:** Ekstrak helper format Rupiah/tanggal di `resources/js/lib/format.ts` dan handler error RDBMS di `app/Support/RdbmsErrorHandler.php`.
3. **Verifikasi Sebelum Selesai:** Setelah setiap perubahan kode, jalankan `npx tsc --noEmit` dan `npm run build` (serta `php artisan test` / `php -l`) untuk memastikan nol error kompilasi.
