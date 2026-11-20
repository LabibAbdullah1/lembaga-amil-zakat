<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Support\RdbmsErrorHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class JenisDanaController extends Controller
{
    public function index(): Response
    {
        $daftarDana = [];
        $rdbmsError = null;

        // DILARANG menghitung/mengubah saldo di PHP. Hanya membaca struktur & saldo dari RDBMS.
        try {
            $daftarDana = DB::connection('mysql')->select(
                'SELECT jd.id, jd.parent_id, p.nama_dana AS nama_induk, jd.kode_dana, jd.nama_dana,
                        jd.kategori_utama, jd.is_terikat, jd.saldo_tersedia, jd.saldo_beras_kg,
                        (SELECT COUNT(*) FROM jenis_dana c WHERE c.parent_id = jd.id) AS jumlah_sub_dana
                 FROM jenis_dana jd
                 LEFT JOIN jenis_dana p ON p.id = jd.parent_id
                 ORDER BY jd.kategori_utama ASC, jd.kode_dana ASC'
            );
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal membaca tabel jenis_dana: ' . $e->getMessage();
        }

        return Inertia::render('Master/JenisDana', [
            'daftarDana' => $daftarDana,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'parent_id' => ['nullable', 'integer'],
            'kode_dana' => ['required', 'string', 'max:30'],
            'nama_dana' => ['required', 'string', 'max:120'],
            'kategori_utama' => ['required', 'in:Zakat,Infak_Sedekah,Wakaf'],
            'is_terikat' => ['required', 'boolean'],
        ]);

        // DILARANG mengisi/mengubah saldo_tersedia atau saldo_beras_kg dari PHP; biarkan default RDBMS 0.
        return RdbmsErrorHandler::run(function () use ($validated) {
            DB::connection('mysql')->statement(
                'INSERT INTO jenis_dana (parent_id, kode_dana, nama_dana, kategori_utama, is_terikat, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    $validated['parent_id'] ?: null,
                    strtoupper(trim($validated['kode_dana'])),
                    trim($validated['nama_dana']),
                    $validated['kategori_utama'],
                    $validated['is_terikat'] ? 1 : 0,
                ]
            );

            return redirect()->route('master.jenis-dana.index')
                ->with('success', sprintf('Kantong dana %s (%s) berhasil ditambahkan.', $validated['nama_dana'], $validated['kode_dana']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'parent_id' => ['nullable', 'integer'],
            'kode_dana' => ['required', 'string', 'max:30'],
            'nama_dana' => ['required', 'string', 'max:120'],
            'kategori_utama' => ['required', 'in:Zakat,Infak_Sedekah,Wakaf'],
            'is_terikat' => ['required', 'boolean'],
        ]);

        // Hanya memperbarui metadata kantong dana, TIDAK PERNAH menyentuh saldo_tersedia / saldo_beras_kg.
        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE jenis_dana
                 SET parent_id = ?, kode_dana = ?, nama_dana = ?, kategori_utama = ?, is_terikat = ?, updated_at = NOW()
                 WHERE id = ?',
                [
                    $validated['parent_id'] ?: null,
                    strtoupper(trim($validated['kode_dana'])),
                    trim($validated['nama_dana']),
                    $validated['kategori_utama'],
                    $validated['is_terikat'] ? 1 : 0,
                    $id,
                ]
            );

            return redirect()->route('master.jenis-dana.index')
                ->with('success', sprintf('Metadata kantong dana %s berhasil diperbarui.', $validated['nama_dana']));
        });
    }
}
