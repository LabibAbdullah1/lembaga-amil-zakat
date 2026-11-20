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
            ],
        ];
    }
}
