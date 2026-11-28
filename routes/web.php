<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\DasarHukumController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GaleriKegiatanController;
use App\Http\Controllers\LaporanController;
use App\Http\Controllers\Master\JenisDanaController;
use App\Http\Controllers\Master\PenggunaSistemController;
use App\Http\Controllers\Master\PeriodeRamadhanController;
use App\Http\Controllers\Master\ProgramPenyaluranController;
use App\Http\Controllers\MustahikController;
use App\Http\Controllers\MuzakiController;
use App\Http\Controllers\PenghimpunanController;
use App\Http\Controllers\PenyaluranController;
use App\Http\Controllers\TransparansiPublikController;
use Illuminate\Support\Facades\Route;

// Portal Transparansi Publik, Dasar Hukum Syariat, & Kwitansi Digital (Tanpa Login)
Route::get('/', [TransparansiPublikController::class, 'index'])->name('home');
Route::get('/transparansi', [TransparansiPublikController::class, 'index'])->name('transparansi.index');
Route::get('/dasar-hukum', [DasarHukumController::class, 'index'])->name('dasar-hukum.index');
Route::get('/kwitansi/unduh/{noKwitansi}', [PenghimpunanController::class, 'publicPdf'])->name('kwitansi.public');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->name('login.store');
});

Route::middleware(['auth', 'rdbms.user'])->group(function () {
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('role:Admin,Amil_Penerima,Verifikator,Staf_Penyaluran,Ketua_DKM')
        ->name('dashboard');

    // Modul Master Data (Khusus Admin)
    Route::middleware('role:Admin')->prefix('master')->name('master.')->group(function () {
        Route::get('/periode', [PeriodeRamadhanController::class, 'index'])->name('periode.index');
        Route::post('/periode', [PeriodeRamadhanController::class, 'store'])->name('periode.store');
        Route::put('/periode/{id}', [PeriodeRamadhanController::class, 'update'])->name('periode.update');
        Route::patch('/periode/{id}/toggle', [PeriodeRamadhanController::class, 'toggleAktif'])->name('periode.toggle');

        Route::get('/jenis-dana', [JenisDanaController::class, 'index'])->name('jenis-dana.index');
        Route::post('/jenis-dana', [JenisDanaController::class, 'store'])->name('jenis-dana.store');
        Route::put('/jenis-dana/{id}', [JenisDanaController::class, 'update'])->name('jenis-dana.update');

        Route::get('/program', [ProgramPenyaluranController::class, 'index'])->name('program.index');
        Route::post('/program', [ProgramPenyaluranController::class, 'store'])->name('program.store');
        Route::put('/program/{id}', [ProgramPenyaluranController::class, 'update'])->name('program.update');
        Route::patch('/program/{id}/selesai', [ProgramPenyaluranController::class, 'selesaikan'])->name('program.selesai');

        Route::get('/pengguna', [PenggunaSistemController::class, 'index'])->name('pengguna.index');
        Route::post('/pengguna', [PenggunaSistemController::class, 'store'])->name('pengguna.store');
        Route::put('/pengguna/{id}', [PenggunaSistemController::class, 'update'])->name('pengguna.update');
        Route::patch('/pengguna/{id}/toggle', [PenggunaSistemController::class, 'toggleAktif'])->name('pengguna.toggle');

        Route::get('/galeri', [GaleriKegiatanController::class, 'index'])->name('galeri.index');
        Route::post('/galeri', [GaleriKegiatanController::class, 'store'])->name('galeri.store');
        Route::post('/galeri/{id}', [GaleriKegiatanController::class, 'update'])->name('galeri.update');
        Route::patch('/galeri/{id}/toggle', [GaleriKegiatanController::class, 'toggleTampil'])->name('galeri.toggle');
        Route::delete('/galeri/{id}', [GaleriKegiatanController::class, 'destroy'])->name('galeri.destroy');
    });

    // Modul Muzaki & Loket Penghimpunan Cepat (Admin, Amil_Penerima)
    Route::middleware('role:Admin,Amil_Penerima')->group(function () {
        Route::get('/muzaki', [MuzakiController::class, 'index'])->name('muzaki.index');
        Route::post('/muzaki', [MuzakiController::class, 'store'])->name('muzaki.store');
        Route::get('/muzaki/{id}', [MuzakiController::class, 'show'])->name('muzaki.show');
        Route::put('/muzaki/{id}', [MuzakiController::class, 'update'])->name('muzaki.update');
        Route::post('/muzaki/{muzakiId}/anggota', [MuzakiController::class, 'storeAnggota'])->name('muzaki.anggota.store');
        Route::delete('/muzaki/{muzakiId}/anggota/{anggotaId}', [MuzakiController::class, 'destroyAnggota'])->name('muzaki.anggota.destroy');

        Route::get('/loket', [PenghimpunanController::class, 'index'])->name('loket.index');
        Route::post('/loket', [PenghimpunanController::class, 'store'])->name('loket.store');
        Route::post('/loket/{transaksiId}/batalkan', [PenghimpunanController::class, 'batalkan'])->name('loket.batalkan');
        Route::get('/loket/{transaksiId}/pdf', [PenghimpunanController::class, 'downloadPdf'])->name('loket.pdf');
    });

    // Modul Mustahik & Survei Verifikator (Verifikator, Staf_Penyaluran, Admin, Ketua_DKM)
    Route::middleware('role:Admin,Verifikator,Staf_Penyaluran,Ketua_DKM')->group(function () {
        Route::get('/mustahik', [MustahikController::class, 'index'])->name('mustahik.index');
        Route::post('/mustahik', [MustahikController::class, 'store'])->name('mustahik.store');
        Route::put('/mustahik/{id}', [MustahikController::class, 'update'])->name('mustahik.update');
    });

    // Input Survei Lapangan via sp_verifikasi_mustahik (Khusus Verifikator, Admin, Ketua_DKM)
    Route::middleware('role:Admin,Verifikator,Ketua_DKM')->group(function () {
        Route::post('/mustahik/{mustahikId}/verifikasi', [MustahikController::class, 'verifikasi'])
            ->name('mustahik.verifikasi');
    });

    // Modul Penyaluran Dana / BKK Multi-Mustahik (Staf_Penyaluran, Ketua_DKM, Admin)
    Route::middleware('role:Admin,Staf_Penyaluran,Ketua_DKM')->group(function () {
        Route::get('/penyaluran', [PenyaluranController::class, 'index'])->name('penyaluran.index');
        Route::get('/penyaluran/buat', [PenyaluranController::class, 'create'])->name('penyaluran.create');
        Route::post('/penyaluran', [PenyaluranController::class, 'store'])->name('penyaluran.store');
        Route::get('/penyaluran/{id}', [PenyaluranController::class, 'show'])->name('penyaluran.show');
        Route::post('/penyaluran/{penyaluranId}/mustahik', [PenyaluranController::class, 'tambahMustahik'])
            ->name('penyaluran.mustahik.store');
        Route::put('/penyaluran/{penyaluranId}/mustahik', [PenyaluranController::class, 'updateDetailMustahik'])
            ->name('penyaluran.mustahik.update');
        Route::delete('/penyaluran/{penyaluranId}/mustahik/{detailId}', [PenyaluranController::class, 'hapusDetailMustahik'])
            ->name('penyaluran.mustahik.destroy');
        Route::get('/penyaluran/{penyaluranId}/pdf', [PenyaluranController::class, 'downloadPdf'])
            ->name('penyaluran.pdf');
    });

    // Persetujuan, Penolakan, & Eksekusi Pencairan BKK (Khusus Ketua_DKM, Admin)
    Route::middleware('role:Ketua_DKM,Admin')->group(function () {
        Route::post('/penyaluran/{penyaluranId}/setujui', [PenyaluranController::class, 'setujui'])
            ->name('penyaluran.setujui');
        Route::post('/penyaluran/{penyaluranId}/tolak', [PenyaluranController::class, 'tolak'])
            ->name('penyaluran.tolak');
        Route::post('/penyaluran/{penyaluranId}/eksekusi', [PenyaluranController::class, 'eksekusi'])
            ->name('penyaluran.eksekusi');

        // Modul 4 Laporan Analitik Wajib & Audit Trail JSON (Admin, Ketua_DKM)
        Route::get('/laporan', [LaporanController::class, 'index'])->name('laporan.index');
        Route::get('/laporan/pdf/periode-ramadhan', [LaporanController::class, 'downloadPdfRamadhan'])
            ->name('laporan.pdf.ramadhan');
        Route::get('/laporan/pdf/tahunan', [LaporanController::class, 'downloadPdfTahunan'])
            ->name('laporan.pdf.tahunan');
        Route::get('/audit', [AuditLogController::class, 'index'])->name('audit.index');
    });
});
