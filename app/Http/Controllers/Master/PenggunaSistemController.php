<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\PenggunaSistem;
use App\Support\RdbmsErrorHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PenggunaSistemController extends Controller
{
    public function index(): Response
    {
        $daftarPengguna = [];
        $rdbmsError = null;

        try {
            $daftarPengguna = DB::connection('mysql')->select(
                'SELECT id, nama_lengkap, username, email, no_hp, peran, status_aktif, created_at
                 FROM pengguna_sistem
                 ORDER BY status_aktif DESC, peran ASC, nama_lengkap ASC'
            );
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal membaca tabel pengguna_sistem: ' . $e->getMessage();
        }

        return Inertia::render('Master/Pengguna', [
            'daftarPengguna' => $daftarPengguna,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash'],
            'email' => ['required', 'email', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:25'],
            'password' => ['required', 'string', 'min:6'],
            'peran' => ['required', Rule::in(PenggunaSistem::DAFTAR_PERAN)],
            'status_aktif' => ['required', 'boolean'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated) {
            $passwordHash = Hash::make($validated['password']);

            DB::connection('mysql')->statement(
                'INSERT INTO pengguna_sistem (nama_lengkap, username, email, no_hp, password_hash, peran, status_aktif, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [
                    trim($validated['nama_lengkap']),
                    strtolower(trim($validated['username'])),
                    strtolower(trim($validated['email'])),
                    $validated['no_hp'] ? trim($validated['no_hp']) : null,
                    $passwordHash,
                    $validated['peran'],
                    $validated['status_aktif'] ? 1 : 0,
                ]
            );

            return redirect()->route('master.pengguna.index')
                ->with('success', sprintf('Akun panitia %s (%s) berhasil dibuat.', $validated['nama_lengkap'], $validated['peran']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash'],
            'email' => ['required', 'email', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:25'],
            'password' => ['nullable', 'string', 'min:6'],
            'peran' => ['required', Rule::in(PenggunaSistem::DAFTAR_PERAN)],
            'status_aktif' => ['required', 'boolean'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            if (! empty($validated['password'])) {
                $passwordHash = Hash::make($validated['password']);

                DB::connection('mysql')->statement(
                    'UPDATE pengguna_sistem
                     SET nama_lengkap = ?, username = ?, email = ?, no_hp = ?, password_hash = ?, peran = ?, status_aktif = ?, updated_at = NOW()
                     WHERE id = ?',
                    [
                        trim($validated['nama_lengkap']),
                        strtolower(trim($validated['username'])),
                        strtolower(trim($validated['email'])),
                        $validated['no_hp'] ? trim($validated['no_hp']) : null,
                        $passwordHash,
                        $validated['peran'],
                        $validated['status_aktif'] ? 1 : 0,
                        $id,
                    ]
                );
            } else {
                DB::connection('mysql')->statement(
                    'UPDATE pengguna_sistem
                     SET nama_lengkap = ?, username = ?, email = ?, no_hp = ?, peran = ?, status_aktif = ?, updated_at = NOW()
                     WHERE id = ?',
                    [
                        trim($validated['nama_lengkap']),
                        strtolower(trim($validated['username'])),
                        strtolower(trim($validated['email'])),
                        $validated['no_hp'] ? trim($validated['no_hp']) : null,
                        $validated['peran'],
                        $validated['status_aktif'] ? 1 : 0,
                        $id,
                    ]
                );
            }

            return redirect()->route('master.pengguna.index')
                ->with('success', sprintf('Data pengguna %s berhasil diperbarui.', $validated['nama_lengkap']));
        });
    }

    public function toggleAktif(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'status_aktif' => ['required', 'boolean'],
        ]);

        $currentUser = $request->user();
        if ($currentUser && (int) $currentUser->id === $id && ! $validated['status_aktif']) {
            return back()->withErrors([
                'rdbms' => 'PENOLAKAN OTORISASI: Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif login.',
            ]);
        }

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE pengguna_sistem SET status_aktif = ?, updated_at = NOW() WHERE id = ?',
                [$validated['status_aktif'] ? 1 : 0, $id]
            );

            return redirect()->route('master.pengguna.index')
                ->with('success', 'Status aktif akun panitia berhasil diperbarui.');
        });
    }
}
