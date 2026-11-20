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
        $hakAmilPerKategori = [];
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
                ->select("SELECT * FROM v_saldo_jenis_dana WHERE kategori_utama = 'Zakat'");

            $rekapAsnaf = DB::connection('mysql_laporan')
                ->select('SELECT * FROM v_rekap_penyaluran_asnaf');
        } catch (QueryException) {
            $saldoDana = [];
            $rekapAsnaf = [];
        } catch (Throwable) {
            $saldoDana = [];
            $rekapAsnaf = [];
        }

        // 2. Baca ringkasan periode aktif & fn_persentase_hak_amil dari koneksi mysql (zis_aplikasi)
        try {
            $periodeAktif = DB::connection('mysql')
                ->selectOne('SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif FROM periode_ramadhan WHERE status_aktif = 1 LIMIT 1');

            if ($periodeAktif && isset($periodeAktif->id)) {
                $periodeId = (int) $periodeAktif->id;
                $berasPerJiwa = max(0.01, (float) ($periodeAktif->beras_per_jiwa_kg ?? 2.5));
                $nominalPerJiwa = (float) ($periodeAktif->nominal_fitrah_per_jiwa ?? 45000);

                $kategoriRows = DB::connection('mysql')->select(
                    "SELECT jd.id AS jenis_dana_id,
                            jd.kode_dana,
                            jd.nama_dana,
                            COALESCE((
                                SELECT SUM(dp.nominal + ((dp.berat_beras_kg / ?) * ?))
                                FROM detail_penghimpunan dp
                                INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
                                WHERE tp.periode_id = ?
                                  AND tp.status_transaksi = 'Sah'
                                  AND dp.jenis_dana_id = jd.id
                            ), 0) AS total_himpun_rupiah,
                            COALESCE((
                                SELECT SUM(dpm.nominal_diterima + ((dpm.beras_diterima_kg / ?) * ?))
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                INNER JOIN program_penyaluran pp ON pp.id = pd.program_id
                                INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                                INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                                WHERE pp.periode_id = ?
                                  AND pd.jenis_dana_id = jd.id
                                  AND ka.kode_asnaf = 'ASN-03'
                                  AND pd.status_persetujuan IN ('Draft', 'Disetujui', 'Disalurkan')
                            ), 0) AS total_amil_rupiah
                     FROM jenis_dana jd
                     WHERE jd.kategori_utama = 'Zakat'
                       AND NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                     ORDER BY jd.kode_dana ASC",
                    [$berasPerJiwa, $nominalPerJiwa, $periodeId, $berasPerJiwa, $nominalPerJiwa, $periodeId]
                );

                $maxPersen = 0.0;
                foreach ($kategoriRows as $row) {
                    $himpun = (float) ($row->total_himpun_rupiah ?? 0.0);
                    $amil = (float) ($row->total_amil_rupiah ?? 0.0);
                    $kuotaMaks = round($himpun * 0.125, 2);
                    $sisaKuota = max(0.0, round($kuotaMaks - $amil, 2));
                    $persen = $himpun > 0 ? round(($amil / $himpun) * 100, 2) : 0.0;

                    if ($persen > $maxPersen) {
                        $maxPersen = $persen;
                    }

                    $hakAmilPerKategori[] = [
                        'jenis_dana_id' => (int) $row->jenis_dana_id,
                        'kode_dana' => (string) $row->kode_dana,
                        'nama_dana' => (string) $row->nama_dana,
                        'total_himpun_rupiah' => $himpun,
                        'total_amil_rupiah' => $amil,
                        'kuota_maksimal_rupiah' => $kuotaMaks,
                        'sisa_kuota_rupiah' => $sisaKuota,
                        'persentase_amil' => $persen,
                    ];
                }

                $persentaseHakAmil = $maxPersen;

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
        } catch (Throwable) {
            // Biarkan fallback ringkasan bernilai 0 bila layanan data belum aktif.
        }

        return Inertia::render('Dashboard/Index', [
            'saldoDana' => $saldoDana,
            'rekapAsnaf' => $rekapAsnaf,
            'periodeAktif' => $periodeAktif,
            'persentaseHakAmil' => $persentaseHakAmil,
            'hakAmilPerKategori' => $hakAmilPerKategori,
            'ringkasanPeriode' => $ringkasanPeriode,
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
