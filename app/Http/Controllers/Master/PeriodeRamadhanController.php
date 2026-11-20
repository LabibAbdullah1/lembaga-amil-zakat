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

class PeriodeRamadhanController extends Controller
{
    public function index(): Response
    {
        $daftarPeriode = [];
        $rdbmsError = null;

        try {
            $daftarPeriode = DB::connection('mysql')->select(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan
                 ORDER BY tahun_masehi DESC, id DESC'
            );
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal membaca tabel periode_ramadhan: ' . $e->getMessage();
        }

        return Inertia::render('Master/Periode', [
            'daftarPeriode' => $daftarPeriode,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tahun_hijriah' => ['required', 'string', 'max:20'],
            'tahun_masehi' => ['required', 'integer', 'min:2020', 'max:2100'],
            'beras_per_jiwa_kg' => ['required', 'numeric', 'gt:0', 'max:20'],
            'nominal_fitrah_per_jiwa' => ['required', 'numeric', 'gt:0'],
            'status_aktif' => ['required', 'boolean'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated) {
            DB::connection('mysql')->statement(
                'INSERT INTO periode_ramadhan (tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif)
                 VALUES (?, ?, ?, ?, ?)',
                [
                    trim($validated['tahun_hijriah']),
                    (int) $validated['tahun_masehi'],
                    (float) $validated['beras_per_jiwa_kg'],
                    (float) $validated['nominal_fitrah_per_jiwa'],
                    $validated['status_aktif'] ? 1 : 0,
                ]
            );

            return redirect()->route('master.periode.index')
                ->with('success', sprintf('Periode Ramadhan %s H berhasil ditambahkan.', $validated['tahun_hijriah']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'tahun_hijriah' => ['required', 'string', 'max:20'],
            'tahun_masehi' => ['required', 'integer', 'min:2020', 'max:2100'],
            'beras_per_jiwa_kg' => ['required', 'numeric', 'gt:0', 'max:20'],
            'nominal_fitrah_per_jiwa' => ['required', 'numeric', 'gt:0'],
            'status_aktif' => ['required', 'boolean'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE periode_ramadhan
                 SET tahun_hijriah = ?, tahun_masehi = ?, beras_per_jiwa_kg = ?, nominal_fitrah_per_jiwa = ?, status_aktif = ?
                 WHERE id = ?',
                [
                    trim($validated['tahun_hijriah']),
                    (int) $validated['tahun_masehi'],
                    (float) $validated['beras_per_jiwa_kg'],
                    (float) $validated['nominal_fitrah_per_jiwa'],
                    $validated['status_aktif'] ? 1 : 0,
                    $id,
                ]
            );

            return redirect()->route('master.periode.index')
                ->with('success', sprintf('Periode Ramadhan %s H berhasil diperbarui.', $validated['tahun_hijriah']));
        });
    }

    public function toggleAktif(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'status_aktif' => ['required', 'boolean'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE periode_ramadhan SET status_aktif = ? WHERE id = ?',
                [$validated['status_aktif'] ? 1 : 0, $id]
            );

            $statusLabel = $validated['status_aktif'] ? 'diaktifkan' : 'dinonaktifkan';

            return redirect()->route('master.periode.index')
                ->with('success', "Status periode Ramadhan berhasil {$statusLabel}.");
        });
    }
}
