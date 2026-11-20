<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MuzakiController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $jenisFilter = trim((string) $request->query('jenis', 'SEMUA'));

        $daftarMuzaki = [];
        $rdbmsError = null;

        try {
            $sql = 'SELECT m.id, m.nik, m.nama_lengkap, m.no_hp, m.alamat_rt_rw, m.jenis_muzaki,
                           fn_hitung_jiwa_muzaki(m.id) AS jumlah_jiwa,
                           (SELECT COUNT(*) FROM anggota_keluarga_muzaki ak WHERE ak.muzaki_id = m.id) AS jumlah_anggota_terdaftar,
                           m.created_at
                    FROM muzaki m
                    WHERE 1=1';
            $bindings = [];

            if ($search !== '') {
                $sql .= ' AND (m.nik LIKE ? OR m.nama_lengkap LIKE ? OR COALESCE(m.no_hp, \'\') LIKE ? OR COALESCE(m.alamat_rt_rw, \'\') LIKE ?)';
                $like = '%' . $search . '%';
                $bindings[] = $like;
                $bindings[] = $like;
                $bindings[] = $like;
                $bindings[] = $like;
            }

            if (in_array($jenisFilter, ['Individu', 'KK_Keluarga'], true)) {
                $sql .= ' AND m.jenis_muzaki = ?';
                $bindings[] = $jenisFilter;
            }

            $sql .= ' ORDER BY m.nama_lengkap ASC LIMIT 200';

            $daftarMuzaki = DB::connection('mysql')->select($sql, $bindings);
        } catch (Throwable) {
            $daftarMuzaki = [];
        }

        return Inertia::render('Muzaki/Index', [
            'daftarMuzaki' => $daftarMuzaki,
            'filters' => [
                'q' => $search,
                'jenis' => $jenisFilter,
            ],
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function show(int $id): Response
    {
        $muzaki = null;
        $anggotaKeluarga = [];
        $riwayatSetoran = [];
        $rdbmsError = null;

        try {
            $muzaki = DB::connection('mysql')->selectOne(
                'SELECT m.id, m.nik, m.nama_lengkap, m.no_hp, m.alamat_rt_rw, m.jenis_muzaki,
                        fn_hitung_jiwa_muzaki(m.id) AS jumlah_jiwa, m.created_at, m.updated_at
                 FROM muzaki m
                 WHERE m.id = ? LIMIT 1',
                [$id]
            );

            if (! $muzaki) {
                abort(404, 'Data Muzaki tidak ditemukan.');
            }

            $anggotaKeluarga = DB::connection('mysql')->select(
                'SELECT id, muzaki_id, nama_anggota, status_hubungan
                 FROM anggota_keluarga_muzaki
                 WHERE muzaki_id = ?
                 ORDER BY id ASC',
                [$id]
            );

            $riwayatSetoran = DB::connection('mysql')->select(
                'SELECT tp.id, tp.no_kwitansi, tp.tanggal_transaksi, tp.metode_bayar,
                        tp.total_nominal, tp.total_beras_kg, tp.status_transaksi, tp.alasan_batal,
                        pr.tahun_hijriah, pr.tahun_masehi, ps.nama_lengkap AS nama_amil
                 FROM transaksi_penghimpunan tp
                 INNER JOIN periode_ramadhan pr ON pr.id = tp.periode_id
                 INNER JOIN pengguna_sistem ps ON ps.id = tp.amil_id
                 WHERE tp.muzaki_id = ?
                 ORDER BY tp.tanggal_transaksi DESC, tp.id DESC
                 LIMIT 50',
                [$id]
            );
        } catch (Throwable $e) {
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }
            $rdbmsError = 'Gagal memuat detail muzaki: ' . $e->getMessage();
        }

        return Inertia::render('Muzaki/Show', [
            'muzaki' => $muzaki,
            'anggotaKeluarga' => $anggotaKeluarga,
            'riwayatSetoran' => $riwayatSetoran,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/'],
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:25'],
            'alamat_rt_rw' => ['nullable', 'string', 'max:200'],
            'jenis_muzaki' => ['required', 'in:Individu,KK_Keluarga'],
        ], [
            'nik.size' => 'NIK wajib terdiri dari tepat 16 digit angka.',
            'nik.regex' => 'NIK hanya boleh berisi 16 digit angka.',
        ]);

        return RdbmsErrorHandler::run(function () use ($validated) {
            DB::connection('mysql')->statement(
                'INSERT INTO muzaki (nik, nama_lengkap, no_hp, alamat_rt_rw, jenis_muzaki, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    $validated['nik'],
                    trim($validated['nama_lengkap']),
                    $validated['no_hp'] ? trim($validated['no_hp']) : null,
                    $validated['alamat_rt_rw'] ? trim($validated['alamat_rt_rw']) : null,
                    $validated['jenis_muzaki'],
                ]
            );

            return back()->with('success', sprintf('Muzaki %s (NIK: %s) berhasil didaftarkan.', $validated['nama_lengkap'], $validated['nik']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/'],
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:25'],
            'alamat_rt_rw' => ['nullable', 'string', 'max:200'],
            'jenis_muzaki' => ['required', 'in:Individu,KK_Keluarga'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            if ($validated['jenis_muzaki'] === 'Individu') {
                $countRow = DB::connection('mysql')->selectOne(
                    'SELECT COUNT(*) AS total FROM anggota_keluarga_muzaki WHERE muzaki_id = ?',
                    [$id]
                );

                if (((int) ($countRow->total ?? 0)) > 0) {
                    return back()->withErrors([
                        'rdbms' => 'Muzaki ini masih memiliki daftar anggota keluarga/tanggungan terdaftar. Hapus anggota tanggungan terlebih dahulu sebelum mengubah jenis menjadi Individu.',
                    ]);
                }
            }

            DB::connection('mysql')->statement(
                'UPDATE muzaki
                 SET nik = ?, nama_lengkap = ?, no_hp = ?, alamat_rt_rw = ?, jenis_muzaki = ?, updated_at = NOW()
                 WHERE id = ?',
                [
                    $validated['nik'],
                    trim($validated['nama_lengkap']),
                    $validated['no_hp'] ? trim($validated['no_hp']) : null,
                    $validated['alamat_rt_rw'] ? trim($validated['alamat_rt_rw']) : null,
                    $validated['jenis_muzaki'],
                    $id,
                ]
            );

            return back()->with('success', sprintf('Data Muzaki %s berhasil diperbarui.', $validated['nama_lengkap']));
        });
    }

    public function storeAnggota(Request $request, int $muzakiId): RedirectResponse
    {
        $validated = $request->validate([
            'nama_anggota' => ['required', 'string', 'max:120'],
            'status_hubungan' => ['required', 'in:Kepala_Keluarga,Istri,Anak,Tanggungan_Lain'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $muzakiId) {
            $muzaki = DB::connection('mysql')->selectOne(
                'SELECT id, nama_lengkap, jenis_muzaki FROM muzaki WHERE id = ? LIMIT 1',
                [$muzakiId]
            );

            if (! $muzaki) {
                abort(404, 'Data Muzaki tidak ditemukan.');
            }

            if ($muzaki->jenis_muzaki === 'Individu') {
                return redirect()->route('muzaki.show', $muzakiId)
                    ->withErrors([
                        'rdbms' => sprintf(
                            'Muzaki %s terdaftar sebagai Individu sehingga tidak dapat menambahkan anggota tanggungan. Silakan ubah jenis Muzaki menjadi KK Keluarga terlebih dahulu.',
                            $muzaki->nama_lengkap
                        ),
                    ]);
            }

            DB::connection('mysql')->statement(
                'INSERT INTO anggota_keluarga_muzaki (muzaki_id, nama_anggota, status_hubungan)
                 VALUES (?, ?, ?)',
                [
                    $muzakiId,
                    trim($validated['nama_anggota']),
                    $validated['status_hubungan'],
                ]
            );

            return redirect()->route('muzaki.show', $muzakiId)
                ->with('success', sprintf('Anggota keluarga %s berhasil ditambahkan.', $validated['nama_anggota']));
        });
    }

    public function destroyAnggota(int $muzakiId, int $anggotaId): RedirectResponse
    {
        return RdbmsErrorHandler::run(function () use ($muzakiId, $anggotaId) {
            DB::connection('mysql')->statement(
                'DELETE FROM anggota_keluarga_muzaki WHERE id = ? AND muzaki_id = ?',
                [$anggotaId, $muzakiId]
            );

            return redirect()->route('muzaki.show', $muzakiId)
                ->with('success', 'Anggota keluarga berhasil dihapus dari KK Muzaki.');
        });
    }
}
