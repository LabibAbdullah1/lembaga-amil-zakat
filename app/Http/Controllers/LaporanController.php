<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class LaporanController extends Controller
{
    public function index(): Response
    {
        $hierarkiDana = [];
        $pertumbuhanYoy = [];
        $distribusiAsnaf = [];
        $peringkatMuzaki = [];
        $periodeAktif = null;
        $daftarPeriode = [];
        $daftarTahun = [];
        $rdbmsError = null;

        try {
            $periodeAktif = DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan
                 WHERE status_aktif = 1
                 LIMIT 1'
            );

            $daftarPeriode = DB::connection('mysql')->select(
                'SELECT id, tahun_hijriah, tahun_masehi, status_aktif
                 FROM periode_ramadhan
                 ORDER BY tahun_masehi DESC'
            );

            $daftarTahun = DB::connection('mysql')->select(
                "SELECT DISTINCT tahun FROM (
                    SELECT YEAR(tanggal_transaksi) AS tahun FROM transaksi_penghimpunan WHERE status_transaksi = 'Sah'
                    UNION
                    SELECT tahun_masehi AS tahun FROM periode_ramadhan
                ) t
                ORDER BY tahun DESC"
            );

            // Laporan Analitik 1: Hierarki Dana Zakat (Recursive CTE)
            $hierarkiDana = DB::connection('mysql')->select(
                "WITH RECURSIVE cte_hierarki_dana AS (
                    SELECT
                        id,
                        parent_id,
                        kode_dana,
                        nama_dana,
                        kategori_utama,
                        nama_dana AS induk_utama,
                        CAST(nama_dana AS CHAR(500)) AS jalur_hierarki,
                        1 AS level_kedalaman,
                        saldo_tersedia,
                        saldo_beras_kg
                    FROM jenis_dana
                    WHERE parent_id IS NULL
                      AND kategori_utama = 'Zakat'

                    UNION ALL

                    SELECT
                        jd.id,
                        jd.parent_id,
                        jd.kode_dana,
                        jd.nama_dana,
                        jd.kategori_utama,
                        cte.induk_utama,
                        CAST(CONCAT(cte.jalur_hierarki, ' -> ', jd.nama_dana) AS CHAR(500)) AS jalur_hierarki,
                        cte.level_kedalaman + 1 AS level_kedalaman,
                        jd.saldo_tersedia,
                        jd.saldo_beras_kg
                    FROM jenis_dana jd
                    INNER JOIN cte_hierarki_dana cte ON jd.parent_id = cte.id
                    WHERE jd.kategori_utama = 'Zakat'
                )
                SELECT
                    h.id,
                    h.kode_dana,
                    h.nama_dana,
                    h.kategori_utama,
                    h.induk_utama,
                    h.jalur_hierarki,
                    h.level_kedalaman,
                    COALESCE(himpun.total_himpun_uang, 0) AS total_penghimpunan_uang,
                    COALESCE(himpun.total_himpun_beras, 0) AS total_penghimpunan_beras_kg,
                    COALESCE(salur.total_salur_uang, 0) AS total_penyaluran_uang,
                    COALESCE(salur.total_salur_beras, 0) AS total_penyaluran_beras_kg,
                    h.saldo_tersedia,
                    h.saldo_beras_kg
                FROM cte_hierarki_dana h
                LEFT JOIN (
                    SELECT
                        dp.jenis_dana_id,
                        SUM(dp.nominal) AS total_himpun_uang,
                        SUM(dp.berat_beras_kg) AS total_himpun_beras
                    FROM detail_penghimpunan dp
                    INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
                    WHERE tp.status_transaksi = 'Sah'
                    GROUP BY dp.jenis_dana_id
                ) himpun ON himpun.jenis_dana_id = h.id
                LEFT JOIN (
                    SELECT
                        pd.jenis_dana_id,
                        SUM(pd.total_disalurkan) AS total_salur_uang,
                        SUM(pd.total_beras_kg) AS total_salur_beras
                    FROM penyaluran_dana pd
                    WHERE pd.status_persetujuan = 'Disalurkan'
                    GROUP BY pd.jenis_dana_id
                ) salur ON salur.jenis_dana_id = h.id
                ORDER BY h.jalur_hierarki ASC"
            );

            // Laporan Analitik 2: Pertumbuhan YoY (LAG Window Function per bulan yang sama tahun sebelumnya)
            $pertumbuhanYoy = DB::connection('mysql')->select(
                "WITH cte_bulanan AS (
                    SELECT
                        YEAR(tanggal_transaksi) AS tahun,
                        MONTH(tanggal_transaksi) AS bulan,
                        COUNT(id) AS jumlah_transaksi,
                        SUM(total_nominal) AS total_nominal_bulan,
                        SUM(total_beras_kg) AS total_beras_bulan_kg
                    FROM transaksi_penghimpunan
                    WHERE status_transaksi = 'Sah'
                    GROUP BY YEAR(tanggal_transaksi), MONTH(tanggal_transaksi)
                )
                SELECT
                    tahun,
                    bulan,
                    jumlah_transaksi,
                    total_nominal_bulan,
                    total_beras_bulan_kg,
                    LAG(total_nominal_bulan, 1) OVER (PARTITION BY bulan ORDER BY tahun ASC) AS nominal_tahun_lalu,
                    ROUND(
                        CASE
                            WHEN LAG(total_nominal_bulan, 1) OVER (PARTITION BY bulan ORDER BY tahun ASC) IS NULL
                                 OR LAG(total_nominal_bulan, 1) OVER (PARTITION BY bulan ORDER BY tahun ASC) = 0
                            THEN NULL
                            ELSE (
                                (total_nominal_bulan - LAG(total_nominal_bulan, 1) OVER (PARTITION BY bulan ORDER BY tahun ASC))
                                / LAG(total_nominal_bulan, 1) OVER (PARTITION BY bulan ORDER BY tahun ASC)
                            ) * 100
                        END,
                        2
                    ) AS pertumbuhan_yoy_persen
                FROM cte_bulanan
                ORDER BY tahun DESC, bulan DESC
                LIMIT 36"
            );

            // Laporan Analitik 3: Porsi Distribusi 8 Asnaf (SUM() OVER() Window Function)
            $distribusiAsnaf = DB::connection('mysql')->select(
                "WITH cte_asnaf AS (
                    SELECT
                        ka.kode_asnaf,
                        ka.nama_asnaf,
                        COUNT(DISTINCT CASE WHEN pd.status_persetujuan = 'Disalurkan' THEN dpm.mustahik_id END) AS jumlah_mustahik,
                        COALESCE(SUM(CASE WHEN pd.status_persetujuan = 'Disalurkan' THEN dpm.nominal_diterima ELSE 0 END), 0) AS total_nominal,
                        COALESCE(SUM(CASE WHEN pd.status_persetujuan = 'Disalurkan' THEN dpm.beras_diterima_kg ELSE 0 END), 0) AS total_beras_kg
                    FROM kategori_asnaf ka
                    LEFT JOIN mustahik m ON m.kategori_asnaf_id = ka.id
                    LEFT JOIN detail_penyaluran_mustahik dpm ON dpm.mustahik_id = m.id
                    LEFT JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                    GROUP BY ka.id, ka.kode_asnaf, ka.nama_asnaf
                )
                SELECT
                    kode_asnaf,
                    nama_asnaf,
                    jumlah_mustahik,
                    total_nominal,
                    total_beras_kg,
                    SUM(total_nominal) OVER () AS grand_total_nominal,
                    ROUND(
                        CASE
                            WHEN SUM(total_nominal) OVER () = 0 THEN 0
                            ELSE (total_nominal / SUM(total_nominal) OVER ()) * 100
                        END,
                        2
                    ) AS porsi_nominal_persen
                FROM cte_asnaf
                ORDER BY kode_asnaf ASC"
            );

            // Laporan Analitik 4: Peringkat Muzaki (DENSE_RANK() & Running Total Window Function pada periode aktif)
            $periodeIdBinding = $periodeAktif ? [(int) $periodeAktif->id] : [];
            $filterPeriodeSql = $periodeAktif ? 'AND tp.periode_id = ?' : '';

            $peringkatMuzaki = DB::connection('mysql')->select(
                "WITH cte_kontribusi_muzaki AS (
                    SELECT
                        m.id AS muzaki_id,
                        CONCAT(LEFT(m.nik, 4), '********', RIGHT(m.nik, 4)) AS nik_masked,
                        m.nama_lengkap,
                        m.jenis_muzaki,
                        COUNT(tp.id) AS frekuensi_setoran,
                        SUM(tp.total_nominal) AS total_donasi_uang,
                        SUM(tp.total_beras_kg) AS total_donasi_beras_kg
                    FROM transaksi_penghimpunan tp
                    INNER JOIN muzaki m ON m.id = tp.muzaki_id
                    WHERE tp.status_transaksi = 'Sah' {$filterPeriodeSql}
                    GROUP BY m.id, m.nik, m.nama_lengkap, m.jenis_muzaki
                )
                SELECT
                    DENSE_RANK() OVER (ORDER BY total_donasi_uang DESC, total_donasi_beras_kg DESC) AS peringkat,
                    muzaki_id,
                    nik_masked,
                    nama_lengkap,
                    jenis_muzaki,
                    frekuensi_setoran,
                    total_donasi_uang,
                    total_donasi_beras_kg,
                    SUM(total_donasi_uang) OVER (ORDER BY total_donasi_uang DESC, muzaki_id ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total_uang
                FROM cte_kontribusi_muzaki
                ORDER BY peringkat ASC, nama_lengkap ASC
                LIMIT 50",
                $periodeIdBinding
            );
        } catch (Throwable) {
            $hierarkiDana = [];
            $pertumbuhanYoy = [];
            $distribusiAsnaf = [];
            $peringkatMuzaki = [];
        }

        return Inertia::render('Laporan/Index', [
            'hierarkiDana' => $hierarkiDana,
            'pertumbuhanYoy' => $pertumbuhanYoy,
            'distribusiAsnaf' => $distribusiAsnaf,
            'peringkatMuzaki' => $peringkatMuzaki,
            'periodeAktif' => $periodeAktif,
            'daftarPeriode' => $daftarPeriode,
            'daftarTahun' => array_map(fn ($r) => (int) $r->tahun, $daftarTahun),
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function downloadPdfRamadhan(Request $request): HttpResponse
    {
        $periodeId = (int) $request->query('periode_id', 0);

        $periode = $periodeId > 0
            ? DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan WHERE id = ? LIMIT 1',
                [$periodeId]
            )
            : DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan ORDER BY status_aktif DESC, tahun_masehi DESC LIMIT 1'
            );

        if (! $periode) {
            abort(404, 'Periode Ramadhan tidak ditemukan.');
        }

        $pid = (int) $periode->id;
        $tahunPeriode = (int) $periode->tahun_masehi;

        $ringkasanHimpun = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT tp.muzaki_id) AS jumlah_muzaki,
                COUNT(tp.id) AS jumlah_transaksi,
                COALESCE(SUM(tp.total_nominal), 0) AS total_dana_uang,
                COALESCE(SUM(tp.total_beras_kg), 0) AS total_dana_beras_kg
             FROM transaksi_penghimpunan tp
             WHERE tp.status_transaksi = 'Sah' AND tp.periode_id = ?",
            [$pid]
        );

        $rincianHimpunDana = DB::connection('mysql')->select(
            "SELECT
                jd.kode_dana,
                jd.nama_dana,
                jd.kategori_utama,
                COUNT(DISTINCT tp.muzaki_id) AS jumlah_muzaki,
                COUNT(dp.id) AS jumlah_item,
                COALESCE(SUM(dp.nominal), 0) AS total_uang,
                COALESCE(SUM(dp.berat_beras_kg), 0) AS total_beras_kg
             FROM detail_penghimpunan dp
             INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
             INNER JOIN jenis_dana jd ON jd.id = dp.jenis_dana_id
             WHERE tp.status_transaksi = 'Sah' AND tp.periode_id = ?
             GROUP BY jd.id, jd.kode_dana, jd.nama_dana, jd.kategori_utama
             ORDER BY jd.kode_dana ASC",
            [$pid]
        );

        $ringkasanSalur = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT pd.id) AS jumlah_bkk,
                COUNT(DISTINCT dpm.mustahik_id) AS jumlah_penerima_manfaat,
                COUNT(dpm.id) AS total_penyerahan,
                COALESCE(SUM(dpm.nominal_diterima), 0) AS total_salur_uang,
                COALESCE(SUM(dpm.beras_diterima_kg), 0) AS total_salur_beras_kg
             FROM penyaluran_dana pd
             INNER JOIN detail_penyaluran_mustahik dpm ON dpm.penyaluran_id = pd.id
             WHERE pd.status_persetujuan = 'Disalurkan'
               AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?",
            [$tahunPeriode]
        );

        $danaAmil = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT dpm.mustahik_id) AS jumlah_amil,
                COALESCE(SUM(dpm.nominal_diterima), 0) AS total_uang_amil,
                COALESCE(SUM(dpm.beras_diterima_kg), 0) AS total_beras_amil_kg
             FROM penyaluran_dana pd
             INNER JOIN detail_penyaluran_mustahik dpm ON dpm.penyaluran_id = pd.id
             INNER JOIN mustahik m ON m.id = dpm.mustahik_id
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             WHERE pd.status_persetujuan = 'Disalurkan'
               AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?
               AND ka.kode_asnaf = 'ASN-03'",
            [$tahunPeriode]
        );

        $rincianAsnaf = DB::connection('mysql')->select(
            "SELECT
                ka.kode_asnaf,
                ka.nama_asnaf,
                COUNT(DISTINCT CASE WHEN pd.id IS NOT NULL THEN dpm.mustahik_id END) AS jumlah_mustahik,
                COALESCE(SUM(CASE WHEN pd.id IS NOT NULL THEN dpm.nominal_diterima ELSE 0 END), 0) AS total_uang,
                COALESCE(SUM(CASE WHEN pd.id IS NOT NULL THEN dpm.beras_diterima_kg ELSE 0 END), 0) AS total_beras_kg
             FROM kategori_asnaf ka
             LEFT JOIN mustahik m ON m.kategori_asnaf_id = ka.id
             LEFT JOIN detail_penyaluran_mustahik dpm ON dpm.mustahik_id = m.id
             LEFT JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                AND pd.status_persetujuan = 'Disalurkan'
                AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?
             GROUP BY ka.id, ka.kode_asnaf, ka.nama_asnaf
             ORDER BY ka.kode_asnaf ASC",
            [$tahunPeriode]
        );

        $catatanMustahik = DB::connection('mysql')->select(
            'SELECT
                m.nama_lengkap,
                m.alamat_rt_rw,
                ka.kode_asnaf,
                ka.nama_asnaf,
                jd.kode_dana,
                jd.nama_dana,
                cpm.jumlah_diterima_kali,
                cpm.total_nominal_diterima,
                cpm.total_beras_diterima_kg,
                cpm.terakhir_diterima_pada
             FROM catatan_penerimaan_mustahik cpm
             INNER JOIN mustahik m ON m.id = cpm.mustahik_id
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             INNER JOIN jenis_dana jd ON jd.id = cpm.jenis_dana_id
             WHERE cpm.periode_id = ?
             ORDER BY cpm.jumlah_diterima_kali DESC, m.nama_lengkap ASC, jd.kode_dana ASC
             LIMIT 100',
            [$pid]
        );

        $jumlahBelumTerima = (int) (DB::connection('mysql')->selectOne(
            "SELECT COUNT(*) AS total
             FROM mustahik m
             WHERE m.status_verifikasi = 'Layak'
               AND NOT EXISTS (
                   SELECT 1 FROM catatan_penerimaan_mustahik cpm
                   WHERE cpm.mustahik_id = m.id AND cpm.periode_id = ?
               )",
            [$pid]
        )->total ?? 0);

        $pdf = Pdf::loadView('pdf.laporan-ramadhan', [
            'periode' => $periode,
            'ringkasanHimpun' => $ringkasanHimpun,
            'rincianHimpunDana' => $rincianHimpunDana,
            'ringkasanSalur' => $ringkasanSalur,
            'danaAmil' => $danaAmil,
            'rincianAsnaf' => $rincianAsnaf,
            'catatanMustahik' => $catatanMustahik,
            'jumlahBelumTerima' => $jumlahBelumTerima,
            'dicetakPada' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('Laporan-Periode-Ramadhan-' . $periode->tahun_masehi . '.pdf');
    }

    public function downloadPdfTahunan(Request $request): HttpResponse
    {
        $tahun = (int) $request->query('tahun', 0);
        if ($tahun <= 0) {
            $periodeAktif = DB::connection('mysql')->selectOne(
                'SELECT tahun_masehi FROM periode_ramadhan WHERE status_aktif = 1 LIMIT 1'
            );
            $tahun = $periodeAktif ? (int) $periodeAktif->tahun_masehi : (int) date('Y');
        }

        $ringkasanHimpun = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT tp.muzaki_id) AS jumlah_muzaki,
                COUNT(tp.id) AS jumlah_transaksi,
                COALESCE(SUM(tp.total_nominal), 0) AS total_dana_uang,
                COALESCE(SUM(tp.total_beras_kg), 0) AS total_dana_beras_kg
             FROM transaksi_penghimpunan tp
             WHERE tp.status_transaksi = 'Sah' AND YEAR(tp.tanggal_transaksi) = ?",
            [$tahun]
        );

        $rincianHimpunDana = DB::connection('mysql')->select(
            "SELECT
                jd.kode_dana,
                jd.nama_dana,
                jd.kategori_utama,
                COUNT(DISTINCT tp.muzaki_id) AS jumlah_muzaki,
                COUNT(dp.id) AS jumlah_item,
                COALESCE(SUM(dp.nominal), 0) AS total_uang,
                COALESCE(SUM(dp.berat_beras_kg), 0) AS total_beras_kg
             FROM detail_penghimpunan dp
             INNER JOIN transaksi_penghimpunan tp ON tp.id = dp.transaksi_id
             INNER JOIN jenis_dana jd ON jd.id = dp.jenis_dana_id
             WHERE tp.status_transaksi = 'Sah' AND YEAR(tp.tanggal_transaksi) = ?
             GROUP BY jd.id, jd.kode_dana, jd.nama_dana, jd.kategori_utama
             ORDER BY jd.kategori_utama ASC, jd.kode_dana ASC",
            [$tahun]
        );

        $ringkasanSalur = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT pd.id) AS jumlah_bkk,
                COUNT(DISTINCT dpm.mustahik_id) AS jumlah_penerima_manfaat,
                COUNT(dpm.id) AS total_penyerahan,
                COALESCE(SUM(dpm.nominal_diterima), 0) AS total_salur_uang,
                COALESCE(SUM(dpm.beras_diterima_kg), 0) AS total_salur_beras_kg
             FROM penyaluran_dana pd
             INNER JOIN detail_penyaluran_mustahik dpm ON dpm.penyaluran_id = pd.id
             WHERE pd.status_persetujuan = 'Disalurkan'
               AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?",
            [$tahun]
        );

        $danaAmil = DB::connection('mysql')->selectOne(
            "SELECT
                COUNT(DISTINCT dpm.mustahik_id) AS jumlah_amil,
                COALESCE(SUM(dpm.nominal_diterima), 0) AS total_uang_amil,
                COALESCE(SUM(dpm.beras_diterima_kg), 0) AS total_beras_amil_kg
             FROM penyaluran_dana pd
             INNER JOIN detail_penyaluran_mustahik dpm ON dpm.penyaluran_id = pd.id
             INNER JOIN mustahik m ON m.id = dpm.mustahik_id
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             WHERE pd.status_persetujuan = 'Disalurkan'
               AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?
               AND ka.kode_asnaf = 'ASN-03'",
            [$tahun]
        );

        $rincianAsnaf = DB::connection('mysql')->select(
            "SELECT
                ka.kode_asnaf,
                ka.nama_asnaf,
                COUNT(DISTINCT CASE WHEN pd.id IS NOT NULL THEN dpm.mustahik_id END) AS jumlah_mustahik,
                COALESCE(SUM(CASE WHEN pd.id IS NOT NULL THEN dpm.nominal_diterima ELSE 0 END), 0) AS total_uang,
                COALESCE(SUM(CASE WHEN pd.id IS NOT NULL THEN dpm.beras_diterima_kg ELSE 0 END), 0) AS total_beras_kg
             FROM kategori_asnaf ka
             LEFT JOIN mustahik m ON m.kategori_asnaf_id = ka.id
             LEFT JOIN detail_penyaluran_mustahik dpm ON dpm.mustahik_id = m.id
             LEFT JOIN penyaluran_dana pd ON pd.id = dpm.penyaluran_id
                AND pd.status_persetujuan = 'Disalurkan'
                AND YEAR(COALESCE(pd.tanggal_penyaluran, pd.created_at)) = ?
             GROUP BY ka.id, ka.kode_asnaf, ka.nama_asnaf
             ORDER BY ka.kode_asnaf ASC",
            [$tahun]
        );

        $catatanMustahik = DB::connection('mysql')->select(
            'SELECT
                m.nama_lengkap,
                m.alamat_rt_rw,
                ka.kode_asnaf,
                ka.nama_asnaf,
                jd.kode_dana,
                jd.nama_dana,
                SUM(cpm.jumlah_diterima_kali) AS jumlah_diterima_kali,
                SUM(cpm.total_nominal_diterima) AS total_nominal_diterima,
                SUM(cpm.total_beras_diterima_kg) AS total_beras_diterima_kg,
                MAX(cpm.terakhir_diterima_pada) AS terakhir_diterima_pada
             FROM catatan_penerimaan_mustahik cpm
             INNER JOIN mustahik m ON m.id = cpm.mustahik_id
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             INNER JOIN jenis_dana jd ON jd.id = cpm.jenis_dana_id
             WHERE cpm.tahun_masehi = ?
             GROUP BY m.id, m.nama_lengkap, m.alamat_rt_rw, ka.kode_asnaf, ka.nama_asnaf, jd.id, jd.kode_dana, jd.nama_dana
             ORDER BY jumlah_diterima_kali DESC, m.nama_lengkap ASC, jd.kode_dana ASC
             LIMIT 120',
            [$tahun]
        );

        $jumlahBelumTerima = (int) (DB::connection('mysql')->selectOne(
            "SELECT COUNT(*) AS total
             FROM mustahik m
             WHERE m.status_verifikasi = 'Layak'
               AND NOT EXISTS (
                   SELECT 1 FROM catatan_penerimaan_mustahik cpm
                   WHERE cpm.mustahik_id = m.id AND cpm.tahun_masehi = ?
               )",
            [$tahun]
        )->total ?? 0);

        $pdf = Pdf::loadView('pdf.laporan-tahunan', [
            'tahun' => $tahun,
            'ringkasanHimpun' => $ringkasanHimpun,
            'rincianHimpunDana' => $rincianHimpunDana,
            'ringkasanSalur' => $ringkasanSalur,
            'danaAmil' => $danaAmil,
            'rincianAsnaf' => $rincianAsnaf,
            'catatanMustahik' => $catatanMustahik,
            'jumlahBelumTerima' => $jumlahBelumTerima,
            'dicetakPada' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('Laporan-Tahunan-Zakat-Fitrah-dan-Mal-' . $tahun . '.pdf');
    }
}
