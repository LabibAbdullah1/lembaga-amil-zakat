<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Master\JenisDanaController;
use App\Http\Controllers\Master\PenggunaSistemController;
use App\Http\Controllers\Master\PeriodeRamadhanController;
use App\Http\Controllers\Master\ProgramPenyaluranController;
use App\Http\Controllers\MuzakiController;
use App\Http\Controllers\PenghimpunanController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

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

        Route::get('/pengguna', [PenggunaSistemController::class, 'index'])->name('pengguna.index');
        Route::post('/pengguna', [PenggunaSistemController::class, 'store'])->name('pengguna.store');
        Route::put('/pengguna/{id}', [PenggunaSistemController::class, 'update'])->name('pengguna.update');
        Route::patch('/pengguna/{id}/toggle', [PenggunaSistemController::class, 'toggleAktif'])->name('pengguna.toggle');
    });

    // Modul Muzaki & Anggota Keluarga (Admin, Amil_Penerima)
    Route::middleware('role:Admin,Amil_Penerima')->group(function () {
        Route::get('/muzaki', [MuzakiController::class, 'index'])->name('muzaki.index');
        Route::post('/muzaki', [MuzakiController::class, 'store'])->name('muzaki.store');
        Route::get('/muzaki/{id}', [MuzakiController::class, 'show'])->name('muzaki.show');
        Route::put('/muzaki/{id}', [MuzakiController::class, 'update'])->name('muzaki.update');
        Route::post('/muzaki/{muzakiId}/anggota', [MuzakiController::class, 'storeAnggota'])->name('muzaki.anggota.store');
        Route::delete('/muzaki/{muzakiId}/anggota/{anggotaId}', [MuzakiController::class, 'destroyAnggota'])->name('muzaki.anggota.destroy');

        // Modul Loket Penghimpunan Cepat (POS Masjid)
        Route::get('/loket', [PenghimpunanController::class, 'index'])->name('loket.index');
        Route::post('/loket', [PenghimpunanController::class, 'store'])->name('loket.store');
        Route::post('/loket/{transaksiId}/batalkan', [PenghimpunanController::class, 'batalkan'])->name('loket.batalkan');
        Route::get('/loket/{transaksiId}/pdf', [PenghimpunanController::class, 'downloadPdf'])->name('loket.pdf');
    });
});
