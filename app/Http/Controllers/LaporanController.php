<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
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
        $rdbmsError = null;

        try {
            $periodeAktif = DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan
                 WHERE status_aktif = 1
                 LIMIT 1'
            );

            // Laporan Analitik 1: Hierarki Dana (Recursive CTE)
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
        } catch (QueryException $e) {
            $rdbmsError = RdbmsErrorHandler::extractCleanMessage($e);
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal mengeksekusi query laporan analitik: ' . $e->getMessage();
        }

        return Inertia::render('Laporan/Index', [
            'hierarkiDana' => $hierarkiDana,
            'pertumbuhanYoy' => $pertumbuhanYoy,
            'distribusiAsnaf' => $distribusiAsnaf,
            'peringkatMuzaki' => $peringkatMuzaki,
            'periodeAktif' => $periodeAktif,
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
