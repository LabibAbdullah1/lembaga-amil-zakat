<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class TransparansiPublikController extends Controller
{
    public function index(): Response
    {
        $saldoDana = [];
        $rekapAsnaf = [];
        $laporanPenyaluranPublik = [];
        $rekapMuzaki = [];
        $rdbmsError = null;

        // ATURAN MUTLAK (rules.md #1.5 & design.md #2.1):
        // WAJIB menggunakan DB::connection('mysql_laporan') (akun zis_laporan) secara eksklusif
        // yang HANYA memiliki hak SELECT pada 4 VIEW dengan NIK & nama tersamar (masked).
        try {
            $saldoDana = DB::connection('mysql_laporan')
                ->select("SELECT * FROM v_saldo_jenis_dana WHERE kategori_utama = 'Zakat'");

            $rekapAsnaf = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_rekap_penyaluran_asnaf');

            $laporanPenyaluranPublik = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_laporan_penyaluran_publik LIMIT 100');

            $rekapMuzaki = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_rekap_penghimpunan_muzaki ORDER BY tanggal_transaksi_terakhir DESC, transaksi_terakhir_id DESC LIMIT 50');
        } catch (Throwable) {
            $saldoDana = [];
            $rekapAsnaf = [];
            $laporanPenyaluranPublik = [];
            $rekapMuzaki = [];
        }

        return Inertia::render('Publik/Transparansi', [
            'saldoDana' => $saldoDana,
            'rekapAsnaf' => $rekapAsnaf,
            'laporanPenyaluranPublik' => $laporanPenyaluranPublik,
            'rekapMuzaki' => $rekapMuzaki,
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
