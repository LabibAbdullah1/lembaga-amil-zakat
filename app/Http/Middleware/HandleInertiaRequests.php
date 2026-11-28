<?php

namespace App\Http\Middleware;

use App\Models\PenggunaSistem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;
use Throwable;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $periodeAktif = null;
        $persentaseHakAmil = 0.0;
        $hakAmilPerKategori = [];

        if ($user instanceof PenggunaSistem) {
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
                }
            } catch (Throwable) {
                $periodeAktif = null;
                $persentaseHakAmil = 0.0;
                $hakAmilPerKategori = [];
            }
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user instanceof PenggunaSistem ? [
                    'id' => $user->id,
                    'nama_lengkap' => $user->nama_lengkap,
                    'username' => $user->username,
                    'email' => $user->email,
                    'no_hp' => $user->no_hp,
                    'peran' => $user->peran,
                    'status_aktif' => $user->isAktif(),
                ] : null,
            ],
            'periodeAktif' => $periodeAktif,
            'persentaseHakAmil' => $persentaseHakAmil,
            'hakAmilPerKategori' => $hakAmilPerKategori,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'notif_wa' => fn () => $request->session()->get('notif_wa'),
            ],
        ];
    }
}
