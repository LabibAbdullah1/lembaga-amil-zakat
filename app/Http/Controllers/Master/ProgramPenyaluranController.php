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

class ProgramPenyaluranController extends Controller
{
    public function index(): Response
    {
        $daftarProgram = [];
        $daftarDanaOperasional = [];
        $daftarPeriode = [];
        $rdbmsError = null;

        try {
            $daftarProgram = DB::connection('mysql')->select(
                "SELECT pp.id, pp.kode_program, pp.nama_program, pp.jenis_dana_id,
                        jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        pp.periode_id, pr.tahun_hijriah, pr.tahun_masehi,
                        pp.anggaran_rencana, pp.status_program
                 FROM program_penyaluran pp
                 INNER JOIN jenis_dana jd ON jd.id = pp.jenis_dana_id
                 INNER JOIN periode_ramadhan pr ON pr.id = pp.periode_id
                 WHERE jd.kategori_utama = 'Zakat'
                 ORDER BY pr.tahun_masehi DESC, pp.kode_program ASC"
            );

            $daftarDanaOperasional = DB::connection('mysql')->select(
                "SELECT jd.id, jd.kode_dana, jd.nama_dana, jd.kategori_utama, jd.saldo_tersedia, jd.saldo_beras_kg
                 FROM jenis_dana jd
                 WHERE jd.kategori_utama = 'Zakat'
                   AND NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                 ORDER BY jd.kode_dana ASC"
            );

            $daftarPeriode = DB::connection('mysql')->select(
                'SELECT id, tahun_hijriah, tahun_masehi, status_aktif
                 FROM periode_ramadhan
                 ORDER BY status_aktif DESC, tahun_masehi DESC'
            );
        } catch (Throwable) {
            $daftarProgram = [];
        }

        return Inertia::render('Master/Program', [
            'daftarProgram' => $daftarProgram,
            'daftarDanaOperasional' => $daftarDanaOperasional,
            'daftarPeriode' => $daftarPeriode,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'kode_program' => ['required', 'string', 'max:30'],
            'nama_program' => ['required', 'string', 'max:150'],
            'jenis_dana_id' => ['required', 'integer'],
            'periode_id' => ['required', 'integer'],
            'anggaran_rencana' => ['required', 'numeric', 'min:0'],
            'status_program' => ['required', 'in:Draft,Berjalan,Selesai'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated) {
            DB::connection('mysql')->statement(
                'INSERT INTO program_penyaluran (kode_program, nama_program, jenis_dana_id, periode_id, anggaran_rencana, status_program)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [
                    strtoupper(trim($validated['kode_program'])),
                    trim($validated['nama_program']),
                    (int) $validated['jenis_dana_id'],
                    (int) $validated['periode_id'],
                    (float) $validated['anggaran_rencana'],
                    $validated['status_program'],
                ]
            );

            return redirect()->route('master.program.index')
                ->with('success', sprintf('Program penyaluran %s berhasil ditambahkan.', $validated['nama_program']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'kode_program' => ['required', 'string', 'max:30'],
            'nama_program' => ['required', 'string', 'max:150'],
            'jenis_dana_id' => ['required', 'integer'],
            'periode_id' => ['required', 'integer'],
            'anggaran_rencana' => ['required', 'numeric', 'min:0'],
            'status_program' => ['required', 'in:Draft,Berjalan,Selesai'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE program_penyaluran
                 SET kode_program = ?, nama_program = ?, jenis_dana_id = ?, periode_id = ?, anggaran_rencana = ?, status_program = ?
                 WHERE id = ?',
                [
                    strtoupper(trim($validated['kode_program'])),
                    trim($validated['nama_program']),
                    (int) $validated['jenis_dana_id'],
                    (int) $validated['periode_id'],
                    (float) $validated['anggaran_rencana'],
                    $validated['status_program'],
                    $id,
                ]
            );

            return redirect()->route('master.program.index')
                ->with('success', sprintf('Program penyaluran %s berhasil diperbarui.', $validated['nama_program']));
        });
    }
}
