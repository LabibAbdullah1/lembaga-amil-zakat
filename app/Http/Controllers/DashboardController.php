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
                            jd.saldo_tersedia,
                            jd.saldo_beras_kg,
                            COALESCE((
                                SELECT SUM(dp.nominal)
                                FROM detail_penghimpunan dp
                                INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
                                WHERE tp.status_transaksi = 'Sah'
                                  AND dp.jenis_dana_id = jd.id
                                  AND (jd.kode_dana <> 'ZKT-FTR' OR tp.periode_id = ?)
                            ), 0) AS himpun_uang,
                            COALESCE((
                                SELECT SUM(dp.berat_beras_kg)
                                FROM detail_penghimpunan dp
                                INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
                                WHERE tp.status_transaksi = 'Sah'
                                  AND dp.jenis_dana_id = jd.id
                                  AND (jd.kode_dana <> 'ZKT-FTR' OR tp.periode_id = ?)
                            ), 0) AS himpun_beras,
                            COALESCE((
                                SELECT SUM(dpm.nominal_diterima)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND pd.status_persetujuan = 'Disalurkan'
                            ), 0) AS disalurkan_uang,
                            COALESCE((
                                SELECT SUM(dpm.beras_diterima_kg)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND pd.status_persetujuan = 'Disalurkan'
                            ), 0) AS disalurkan_beras,
                            COALESCE((
                                SELECT SUM(dpm.nominal_diterima)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                                INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND ka.kode_asnaf = 'ASN-03'
                                  AND pd.status_persetujuan IN ('Draft', 'Disetujui', 'Disalurkan')
                            ), 0) AS amil_uang,
                            COALESCE((
                                SELECT SUM(dpm.beras_diterima_kg)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                                INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND ka.kode_asnaf = 'ASN-03'
                                  AND pd.status_persetujuan IN ('Draft', 'Disetujui', 'Disalurkan')
                            ), 0) AS amil_beras,
                            COALESCE((
                                SELECT SUM(dpm.nominal_diterima)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                                INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND ka.kode_asnaf <> 'ASN-03'
                                  AND pd.status_persetujuan IN ('Draft', 'Disetujui', 'Disalurkan')
                            ), 0) AS non_amil_uang,
                            COALESCE((
                                SELECT SUM(dpm.beras_diterima_kg)
                                FROM detail_penyaluran_mustahik dpm
                                INNER JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                                INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                                INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                                WHERE pd.jenis_dana_id = jd.id
                                  AND ka.kode_asnaf <> 'ASN-03'
                                  AND pd.status_persetujuan IN ('Draft', 'Disetujui', 'Disalurkan')
                            ), 0) AS non_amil_beras
                     FROM jenis_dana jd
                     WHERE jd.kategori_utama = 'Zakat'
                       AND NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                     ORDER BY jd.kode_dana ASC",
                    [$periodeId, $periodeId]
                );

                $maxPersen = 0.0;
                foreach ($kategoriRows as $row) {
                    $saldoUang = (float) ($row->saldo_tersedia ?? 0.0);
                    $saldoBeras = (float) ($row->saldo_beras_kg ?? 0.0);
                    $himpunUang = (float) ($row->himpun_uang ?? 0.0);
                    $himpunBeras = (float) ($row->himpun_beras ?? 0.0);
                    $disalurkanUang = (float) ($row->disalurkan_uang ?? 0.0);
                    $disalurkanBeras = (float) ($row->disalurkan_beras ?? 0.0);

                    $poolUang = max($himpunUang, $saldoUang + $disalurkanUang);
                    $poolBeras = max($himpunBeras, $saldoBeras + $disalurkanBeras);
                    $poolSetaraRp = $poolUang + (($poolBeras / $berasPerJiwa) * $nominalPerJiwa);

                    $amilUang = (float) ($row->amil_uang ?? 0.0);
                    $amilBeras = (float) ($row->amil_beras ?? 0.0);
                    $amilSetaraRp = $amilUang + (($amilBeras / $berasPerJiwa) * $nominalPerJiwa);

                    $nonAmilUang = (float) ($row->non_amil_uang ?? 0.0);
                    $nonAmilBeras = (float) ($row->non_amil_beras ?? 0.0);
                    $nonAmilSetaraRp = $nonAmilUang + (($nonAmilBeras / $berasPerJiwa) * $nominalPerJiwa);

                    $kuotaAmilUang = round($poolUang * 0.125, 2);
                    $kuotaAmilBeras = round($poolBeras * 0.125, 2);
                    $sisaAmilUang = min($saldoUang, max(0.0, round($kuotaAmilUang - $amilUang, 2)));
                    $sisaAmilBeras = min($saldoBeras, max(0.0, round($kuotaAmilBeras - $amilBeras, 2)));

                    $kuotaNonAmilUang = round($poolUang * 0.875, 2);
                    $kuotaNonAmilBeras = round($poolBeras * 0.875, 2);
                    $sisaNonAmilUang = max(0.0, round($saldoUang - max(0.0, $kuotaAmilUang - $amilUang), 2));
                    $sisaNonAmilBeras = max(0.0, round($saldoBeras - max(0.0, $kuotaAmilBeras - $amilBeras), 2));

                    $kuotaMaksSetaraRp = round($poolSetaraRp * 0.125, 2);
                    $sisaKuotaSetaraRp = max(0.0, round($kuotaMaksSetaraRp - $amilSetaraRp, 2));
                    $persenAmil = $poolSetaraRp > 0 ? round(($amilSetaraRp / $poolSetaraRp) * 100, 2) : 0.0;
                    $persenNonAmil = $poolSetaraRp > 0 ? round(($nonAmilSetaraRp / $poolSetaraRp) * 100, 2) : 0.0;

                    if ($persenAmil > $maxPersen) {
                        $maxPersen = $persenAmil;
                    }

                    $hakAmilPerKategori[] = [
                        'jenis_dana_id' => (int) $row->jenis_dana_id,
                        'kode_dana' => (string) $row->kode_dana,
                        'nama_dana' => (string) $row->nama_dana,
                        'is_terikat_periode_ramadhan' => ((string) $row->kode_dana === 'ZKT-FTR'),
                        'saldo_uang_tersedia' => $saldoUang,
                        'saldo_beras_tersedia' => $saldoBeras,
                        'pool_total_uang' => $poolUang,
                        'pool_total_beras' => $poolBeras,
                        'kuota_amil_uang' => $kuotaAmilUang,
                        'kuota_amil_beras' => $kuotaAmilBeras,
                        'terpakai_amil_uang' => $amilUang,
                        'terpakai_amil_beras' => $amilBeras,
                        'sisa_kuota_amil_uang' => $sisaAmilUang,
                        'sisa_kuota_amil_beras' => $sisaAmilBeras,
                        'kuota_non_amil_uang' => $kuotaNonAmilUang,
                        'kuota_non_amil_beras' => $kuotaNonAmilBeras,
                        'terpakai_non_amil_uang' => $nonAmilUang,
                        'terpakai_non_amil_beras' => $nonAmilBeras,
                        'sisa_kuota_non_amil_uang' => $sisaNonAmilUang,
                        'sisa_kuota_non_amil_beras' => $sisaNonAmilBeras,
                        'jatah_per_asnaf_uang' => $kuotaAmilUang,
                        'jatah_per_asnaf_beras' => $kuotaAmilBeras,
                        'total_himpun_rupiah' => $poolSetaraRp,
                        'total_amil_rupiah' => $amilSetaraRp,
                        'kuota_maksimal_rupiah' => $kuotaMaksSetaraRp,
                        'sisa_kuota_rupiah' => $sisaKuotaSetaraRp,
                        'persentase_amil' => $persenAmil,
                        'persentase_non_amil' => $persenNonAmil,
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
