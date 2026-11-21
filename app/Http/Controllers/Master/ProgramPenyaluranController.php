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
                        pp.anggaran_rencana, pp.target_beras_kg, pp.target_penerima_kk, pp.khusus_amil,
                        pp.status_program,
                        COALESCE(real_bkk.jumlah_bkk_disalurkan, 0) AS jumlah_bkk_disalurkan,
                        COALESCE(real_bkk.realisasi_uang, 0) AS realisasi_uang,
                        COALESCE(real_bkk.realisasi_beras_kg, 0) AS realisasi_beras_kg,
                        COALESCE(real_kk.realisasi_penerima_kk, 0) AS realisasi_penerima_kk
                 FROM program_penyaluran pp
                 INNER JOIN jenis_dana jd ON jd.id = pp.jenis_dana_id
                 INNER JOIN periode_ramadhan pr ON pr.id = pp.periode_id
                 LEFT JOIN (
                     SELECT pd.program_id,
                            COUNT(pd.id) AS jumlah_bkk_disalurkan,
                            SUM(pd.total_disalurkan) AS realisasi_uang,
                            SUM(pd.total_beras_kg) AS realisasi_beras_kg
                     FROM penyaluran_dana pd
                     WHERE pd.status_persetujuan = 'Disalurkan'
                     GROUP BY pd.program_id
                 ) real_bkk ON real_bkk.program_id = pp.id
                 LEFT JOIN (
                     SELECT pd.program_id,
                            COUNT(DISTINCT dpm.mustahik_id) AS realisasi_penerima_kk
                     FROM penyaluran_dana pd
                     INNER JOIN detail_penyaluran_mustahik dpm ON dpm.penyaluran_id = pd.id
                     WHERE pd.status_persetujuan = 'Disalurkan'
                     GROUP BY pd.program_id
                 ) real_kk ON real_kk.program_id = pp.id
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
            'kode_program' => ['nullable', 'string', 'max:30'],
            'nama_program' => ['required', 'string', 'max:150'],
            'jenis_dana_id' => ['required', 'integer'],
            'periode_id' => ['required', 'integer'],
            'anggaran_rencana' => ['required', 'numeric', 'min:0'],
            'target_beras_kg' => ['nullable', 'numeric', 'min:0'],
            'target_penerima_kk' => ['nullable', 'integer', 'min:0'],
            'khusus_amil' => ['nullable', 'boolean'],
            'status_program' => ['required', 'in:Draft,Berjalan,Selesai'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated) {
            $kodeProgram = $this->generateKodeProgram((int) $validated['periode_id']);

            DB::connection('mysql')->statement(
                'INSERT INTO program_penyaluran (kode_program, nama_program, jenis_dana_id, periode_id, anggaran_rencana, target_beras_kg, target_penerima_kk, khusus_amil, status_program)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $kodeProgram,
                    trim($validated['nama_program']),
                    (int) $validated['jenis_dana_id'],
                    (int) $validated['periode_id'],
                    (float) $validated['anggaran_rencana'],
                    (float) ($validated['target_beras_kg'] ?? 0),
                    (int) ($validated['target_penerima_kk'] ?? 0),
                    ! empty($validated['khusus_amil']) ? 1 : 0,
                    $validated['status_program'],
                ]
            );

            return redirect()->route('master.program.index')
                ->with('success', sprintf('Program penyaluran %s (%s) berhasil ditambahkan.', $validated['nama_program'], $kodeProgram));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'kode_program' => ['nullable', 'string', 'max:30'],
            'nama_program' => ['required', 'string', 'max:150'],
            'jenis_dana_id' => ['required', 'integer'],
            'periode_id' => ['required', 'integer'],
            'anggaran_rencana' => ['required', 'numeric', 'min:0'],
            'target_beras_kg' => ['nullable', 'numeric', 'min:0'],
            'target_penerima_kk' => ['nullable', 'integer', 'min:0'],
            'khusus_amil' => ['nullable', 'boolean'],
            'status_program' => ['required', 'in:Draft,Berjalan,Selesai'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            $existing = DB::connection('mysql')->selectOne(
                'SELECT id, kode_program, jenis_dana_id, periode_id, khusus_amil FROM program_penyaluran WHERE id = ? LIMIT 1',
                [$id]
            );

            if (! $existing) {
                return redirect()->route('master.program.index')
                    ->with('error', 'Program penyaluran tidak ditemukan.');
            }

            $bkkCount = (int) (DB::connection('mysql')->selectOne(
                'SELECT COUNT(*) AS total FROM penyaluran_dana WHERE program_id = ?',
                [$id]
            )->total ?? 0);

            $newKhususAmil = ! empty($validated['khusus_amil']) ? 1 : 0;
            if (
                $bkkCount > 0 && (
                    (int) $existing->jenis_dana_id !== (int) $validated['jenis_dana_id'] ||
                    (int) $existing->periode_id !== (int) $validated['periode_id'] ||
                    (int) $existing->khusus_amil !== $newKhususAmil
                )
            ) {
                return back()->withErrors([
                    'rdbms' => 'PENOLAKAN INTEGRITAS: Program yang sudah memiliki dokumen BKK tidak dapat diubah Sumber Dana, Periode, atau Status Khusus Amil-nya.',
                ]);
            }

            DB::connection('mysql')->statement(
                'UPDATE program_penyaluran
                 SET nama_program = ?, jenis_dana_id = ?, periode_id = ?, anggaran_rencana = ?, target_beras_kg = ?, target_penerima_kk = ?, khusus_amil = ?, status_program = ?
                 WHERE id = ?',
                [
                    trim($validated['nama_program']),
                    (int) $validated['jenis_dana_id'],
                    (int) $validated['periode_id'],
                    (float) $validated['anggaran_rencana'],
                    (float) ($validated['target_beras_kg'] ?? 0),
                    (int) ($validated['target_penerima_kk'] ?? 0),
                    $newKhususAmil,
                    $validated['status_program'],
                    $id,
                ]
            );

            return redirect()->route('master.program.index')
                ->with('success', sprintf('Program penyaluran %s berhasil diperbarui.', $validated['nama_program']));
        });
    }

    private function generateKodeProgram(int $periodeId): string
    {
        $periode = DB::connection('mysql')->selectOne(
            'SELECT tahun_masehi FROM periode_ramadhan WHERE id = ? LIMIT 1',
            [$periodeId]
        );
        $tahun = $periode ? (int) $periode->tahun_masehi : (int) date('Y');
        $yy = substr((string) $tahun, -2);
        $prefix = "PRG-{$yy}-";

        $last = DB::connection('mysql')->selectOne(
            'SELECT kode_program FROM program_penyaluran WHERE kode_program LIKE ? ORDER BY id DESC LIMIT 1',
            [$prefix . '%']
        );

        $seq = 1;
        if ($last && preg_match('/-(\d+)$/', (string) $last->kode_program, $m)) {
            $seq = ((int) $m[1]) + 1;
        } else {
            $count = (int) (DB::connection('mysql')->selectOne(
                'SELECT COUNT(*) AS total FROM program_penyaluran WHERE periode_id = ?',
                [$periodeId]
            )->total ?? 0);
            $seq = $count + 1;
        }

        do {
            $candidate = sprintf('%s%03d', $prefix, $seq);
            $exists = DB::connection('mysql')->selectOne(
                'SELECT id FROM program_penyaluran WHERE kode_program = ? LIMIT 1',
                [$candidate]
            );
            $seq++;
        } while ($exists);

        return $candidate;
    }

    public function selesaikan(int $id): RedirectResponse
    {
        return RdbmsErrorHandler::run(function () use ($id) {
            $program = DB::connection('mysql')->selectOne(
                'SELECT id, nama_program, status_program FROM program_penyaluran WHERE id = ? LIMIT 1',
                [$id]
            );

            if (! $program) {
                return redirect()->route('master.program.index')
                    ->with('error', 'Program penyaluran tidak ditemukan.');
            }

            DB::connection('mysql')->statement(
                "UPDATE program_penyaluran SET status_program = 'Selesai' WHERE id = ?",
                [$id]
            );

            return redirect()->route('master.program.index')
                ->with('success', sprintf('Program "%s" telah ditandai Selesai dan dikunci untuk BKK baru.', $program->nama_program));
        });
    }
}
