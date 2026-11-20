<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $saldoDana = [];
        $rekapAsnaf = [];
        $periodeAktif = null;
        $persentaseHakAmil = 0.0;
        $ringkasanPeriode = [
            'jumlah_kwitansi_sah' => 0,
            'total_penghimpunan_uang' => 0.0,
            'total_penghimpunan_beras_kg' => 0.0,
            'jumlah_bkk_disalurkan' => 0,
            'total_penyaluran_uang' => 0.0,
            'total_penyaluran_beras_kg' => 0.0,
            'jumlah_mustahik_layak' => 0,
            'jumlah_mustahik_menunggu' => 0,
        ];
        $rdbmsError = null;

        // 1. Baca v_saldo_jenis_dana dan v_rekap_penyaluran_asnaf secara eksklusif dari koneksi mysql_laporan (zis_laporan)
        try {
            $saldoDana = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_saldo_jenis_dana');

            $rekapAsnaf = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_rekap_penyaluran_asnaf');
        } catch (QueryException $e) {
            $rdbmsError = RdbmsErrorHandler::extractCleanMessage($e);
        } catch (Throwable $e) {
            $rdbmsError = 'Koneksi ke v_saldo_jenis_dana (mysql_laporan) belum tersedia: ' . $e->getMessage();
        }

        // 2. Baca ringkasan periode aktif & fn_persentase_hak_amil dari koneksi mysql (zis_aplikasi)
        try {
            $periodeAktif = DB::connection('mysql')
                ->selectOne('SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif FROM periode_ramadhan WHERE status_aktif = 1 LIMIT 1');

            if ($periodeAktif && isset($periodeAktif->id)) {
                $periodeId = (int) $periodeAktif->id;

                $amilRow = DB::connection('mysql')
                    ->selectOne('SELECT fn_persentase_hak_amil(?) AS persentase', [$periodeId]);
                $persentaseHakAmil = (float) ($amilRow->persentase ?? 0.0);

                $himpunRow = DB::connection('mysql')
                    ->selectOne(
                        "SELECT COUNT(*) AS jumlah_kwitansi, COALESCE(SUM(total_nominal), 0) AS total_uang, COALESCE(SUM(total_beras_kg), 0) AS total_beras FROM transaksi_penghimpunan WHERE periode_id = ? AND status_transaksi = 'Sah'",
                        [$periodeId]
                    );

                $salurRow = DB::connection('mysql')
                    ->selectOne(
                        "SELECT COUNT(pd.id) AS jumlah_bkk, COALESCE(SUM(pd.total_disalurkan), 0) AS total_uang, COALESCE(SUM(pd.total_beras_kg), 0) AS total_beras FROM penyaluran_dana pd INNER JOIN program_penyaluran pp ON pp.id = pd.program_id WHERE pp.periode_id = ? AND pd.status_persetujuan = 'Disalurkan'",
                        [$periodeId]
                    );

                $ringkasanPeriode['jumlah_kwitansi_sah'] = (int) ($himpunRow->jumlah_kwitansi ?? 0);
                $ringkasanPeriode['total_penghimpunan_uang'] = (float) ($himpunRow->total_uang ?? 0.0);
                $ringkasanPeriode['total_penghimpunan_beras_kg'] = (float) ($himpunRow->total_beras ?? 0.0);
                $ringkasanPeriode['jumlah_bkk_disalurkan'] = (int) ($salurRow->jumlah_bkk ?? 0);
                $ringkasanPeriode['total_penyaluran_uang'] = (float) ($salurRow->total_uang ?? 0.0);
                $ringkasanPeriode['total_penyaluran_beras_kg'] = (float) ($salurRow->total_beras ?? 0.0);
            }

            $mustahikRow = DB::connection('mysql')
                ->selectOne(
                    "SELECT COALESCE(SUM(CASE WHEN fn_cek_kelayakan_mustahik(id) = 1 THEN 1 ELSE 0 END), 0) AS layak_aktif, COALESCE(SUM(CASE WHEN status_verifikasi = 'Menunggu' THEN 1 ELSE 0 END), 0) AS menunggu FROM mustahik"
                );

            $ringkasanPeriode['jumlah_mustahik_layak'] = (int) ($mustahikRow->layak_aktif ?? 0);
            $ringkasanPeriode['jumlah_mustahik_menunggu'] = (int) ($mustahikRow->menunggu ?? 0);
        } catch (QueryException $e) {
            if ($rdbmsError === null) {
                $rdbmsError = RdbmsErrorHandler::extractCleanMessage($e);
            }
        } catch (Throwable) {
            // Biarkan fallback ringkasan bernilai 0 bila database belum terhubung.
        }

        return Inertia::render('Dashboard/Index', [
            'saldoDana' => $saldoDana,
            'rekapAsnaf' => $rekapAsnaf,
            'periodeAktif' => $periodeAktif,
            'persentaseHakAmil' => $persentaseHakAmil,
            'ringkasanPeriode' => $ringkasanPeriode,
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
