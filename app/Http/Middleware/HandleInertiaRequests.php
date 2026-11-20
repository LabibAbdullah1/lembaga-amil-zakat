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

        if ($user instanceof PenggunaSistem) {
            try {
                $periodeAktif = DB::connection('mysql')
                    ->selectOne('SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif FROM periode_ramadhan WHERE status_aktif = 1 LIMIT 1');

                if ($periodeAktif && isset($periodeAktif->id)) {
                    $amilRow = DB::connection('mysql')
                        ->selectOne('SELECT fn_persentase_hak_amil(?) AS persentase', [(int) $periodeAktif->id]);

                    $persentaseHakAmil = (float) ($amilRow->persentase ?? 0.0);
                }
            } catch (Throwable) {
                $periodeAktif = null;
                $persentaseHakAmil = 0.0;
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
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
