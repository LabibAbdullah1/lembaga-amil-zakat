<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

class PenyaluranController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = trim((string) $request->query('status', 'SEMUA'));
        $search = trim((string) $request->query('q', ''));

        $daftarBkk = [];
        $rdbmsError = null;

        try {
            $sql = 'SELECT pd.id, pd.no_bkk, pd.program_id, pp.kode_program, pp.nama_program,
                           pd.jenis_dana_id, jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                           pd.pembuat_id, ps1.nama_lengkap AS nama_pembuat,
                           pd.penyetuju_id, ps2.nama_lengkap AS nama_penyetuju,
                           pd.tanggal_penyaluran, pd.total_disalurkan, pd.total_beras_kg,
                           pd.status_persetujuan, pd.catatan_penolakan,
                           (SELECT COUNT(*) FROM detail_penyaluran_mustahik dpm WHERE dpm.penyaluran_id = pd.id) AS jumlah_penerima
                    FROM penyaluran_dana pd
                    INNER JOIN program_penyaluran pp ON pp.id = pd.program_id
                    INNER JOIN jenis_dana jd ON jd.id = pd.jenis_dana_id
                    INNER JOIN pengguna_sistem ps1 ON ps1.id = pd.pembuat_id
                    LEFT JOIN pengguna_sistem ps2 ON ps2.id = pd.penyetuju_id
                    WHERE 1=1';
            $bindings = [];

            if (in_array($statusFilter, ['Draft', 'Disetujui', 'Disalurkan', 'Ditolak'], true)) {
                $sql .= ' AND pd.status_persetujuan = ?';
                $bindings[] = $statusFilter;
            }

            if ($search !== '') {
                $sql .= ' AND (pd.no_bkk LIKE ? OR pp.nama_program LIKE ? OR jd.nama_dana LIKE ?)';
                $like = '%' . $search . '%';
                $bindings[] = $like;
                $bindings[] = $like;
                $bindings[] = $like;
            }

            $sql .= ' ORDER BY pd.id DESC LIMIT 150';

            $daftarBkk = DB::connection('mysql')->select($sql, $bindings);
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal memuat daftar BKK penyaluran: ' . $e->getMessage();
        }

        return Inertia::render('Penyaluran/Index', [
            'daftarBkk' => $daftarBkk,
            'filters' => [
                'status' => $statusFilter,
                'q' => $search,
            ],
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function create(): Response
    {
        $daftarProgram = [];
        $daftarDanaOperasional = [];
        $daftarMustahik = [];
        $rdbmsError = null;

        try {
            $daftarProgram = DB::connection('mysql')->select(
                'SELECT pp.id, pp.kode_program, pp.nama_program, pp.jenis_dana_id,
                        jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        jd.saldo_tersedia, jd.saldo_beras_kg,
                        pp.periode_id, pr.tahun_hijriah, pr.tahun_masehi,
                        pp.anggaran_rencana, pp.status_program
                 FROM program_penyaluran pp
                 INNER JOIN jenis_dana jd ON jd.id = pp.jenis_dana_id
                 INNER JOIN periode_ramadhan pr ON pr.id = pp.periode_id
                 WHERE pp.status_program IN (\'Draft\', \'Berjalan\')
                 ORDER BY pr.status_aktif DESC, pp.kode_program ASC'
            );

            $daftarDanaOperasional = DB::connection('mysql')->select(
                'SELECT jd.id, jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        jd.saldo_tersedia, jd.saldo_beras_kg
                 FROM jenis_dana jd
                 WHERE NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                 ORDER BY jd.kategori_utama ASC, jd.kode_dana ASC'
            );

            $daftarMustahik = DB::connection('mysql')->select(
                'SELECT m.id, m.nik, m.nama_lengkap, m.kategori_asnaf_id,
                        ka.kode_asnaf, ka.nama_asnaf,
                        m.alamat_rt_rw, m.status_verifikasi, m.tanggal_verifikasi_terakhir,
                        fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat
                 FROM mustahik m
                 INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                 ORDER BY fn_cek_kelayakan_mustahik(m.id) DESC, m.nama_lengkap ASC
                 LIMIT 300'
            );
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal memuat form pengajuan BKK: ' . $e->getMessage();
        }

        return Inertia::render('Penyaluran/Create', [
            'daftarProgram' => $daftarProgram,
            'daftarDanaOperasional' => $daftarDanaOperasional,
            'daftarMustahik' => $daftarMustahik,
            'saranNoBkk' => $this->generateNoBkk(),
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'no_bkk' => ['nullable', 'string', 'max:40'],
            'program_id' => ['required', 'integer'],
            'jenis_dana_id' => ['required', 'integer'],
            'mustahik_id' => ['required', 'integer'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'beras_kg' => ['required', 'numeric', 'min:0'],
        ]);

        $noBkk = ! empty($validated['no_bkk'])
            ? strtoupper(trim($validated['no_bkk']))
            : $this->generateNoBkk();

        $pembuatId = (int) $request->user()->id;

        // DILARANG menduplikasi validasi syariat di PHP!
        // Seluruh cek kelayakan mustahik 365 hari, batas hak amil 12,5%, dan kesesuaian jenis_dana_id program vs BKK
        // dilakukan oleh CALL sp_buat_pengajuan_penyaluran(...) dan trigger RDBMS.
        return RdbmsErrorHandler::run(function () use ($validated, $noBkk, $pembuatId) {
            DB::connection('mysql')->statement(
                'CALL sp_buat_pengajuan_penyaluran(?, ?, ?, ?, ?, ?, ?)',
                [
                    $noBkk,
                    (int) $validated['program_id'],
                    (int) $validated['jenis_dana_id'],
                    $pembuatId,
                    (int) $validated['mustahik_id'],
                    (float) $validated['nominal'],
                    (float) $validated['beras_kg'],
                ]
            );

            $created = DB::connection('mysql')->selectOne(
                'SELECT id FROM penyaluran_dana WHERE no_bkk = ? LIMIT 1',
                [$noBkk]
            );

            if ($created && isset($created->id)) {
                return redirect()->route('penyaluran.show', (int) $created->id)
                    ->with('success', sprintf('Draf BKK %s beserta penerima pertama berhasil dibuat. Anda dapat menambahkan mustahik berikutnya.', $noBkk));
            }

            return redirect()->route('penyaluran.index')
                ->with('success', sprintf('Draf BKK %s berhasil dibuat.', $noBkk));
        });
    }

    public function show(int $id): Response
    {
        $bkk = null;
        $detailMustahik = [];
        $daftarMustahik = [];
        $rdbmsError = null;

        try {
            $bkk = DB::connection('mysql')->selectOne(
                'SELECT pd.id, pd.no_bkk, pd.program_id, pp.kode_program, pp.nama_program,
                        pd.jenis_dana_id, jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        jd.saldo_tersedia, jd.saldo_beras_kg,
                        pd.pembuat_id, ps1.nama_lengkap AS nama_pembuat,
                        pd.penyetuju_id, ps2.nama_lengkap AS nama_penyetuju,
                        pd.tanggal_penyaluran, pd.total_disalurkan, pd.total_beras_kg,
                        pd.status_persetujuan, pd.catatan_penolakan,
                        pd.created_at, pd.updated_at
                 FROM penyaluran_dana pd
                 INNER JOIN program_penyaluran pp ON pp.id = pd.program_id
                 INNER JOIN jenis_dana jd ON jd.id = pd.jenis_dana_id
                 INNER JOIN pengguna_sistem ps1 ON ps1.id = pd.pembuat_id
                 LEFT JOIN pengguna_sistem ps2 ON ps2.id = pd.penyetuju_id
                 WHERE pd.id = ?
                 LIMIT 1',
                [$id]
            );

            if (! $bkk) {
                abort(404, 'Dokumen BKK tidak ditemukan.');
            }

            $detailMustahik = DB::connection('mysql')->select(
                'SELECT dpm.id, dpm.penyaluran_id, dpm.mustahik_id,
                        m.nik AS nik_mustahik, m.nama_lengkap AS nama_mustahik, m.alamat_rt_rw,
                        m.status_verifikasi, fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat,
                        ka.kode_asnaf, ka.nama_asnaf,
                        dpm.nominal_diterima, dpm.beras_diterima_kg,
                        dpm.status_serah_terima, dpm.waktu_serah_terima
                 FROM detail_penyaluran_mustahik dpm
                 INNER JOIN mustahik m ON m.id = dpm.mustahik_id
                 INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                 WHERE dpm.penyaluran_id = ?
                 ORDER BY dpm.id ASC',
                [$id]
            );

            $daftarMustahik = DB::connection('mysql')->select(
                'SELECT m.id, m.nik, m.nama_lengkap, m.kategori_asnaf_id,
                        ka.kode_asnaf, ka.nama_asnaf,
                        m.status_verifikasi, fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat
                 FROM mustahik m
                 INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                 ORDER BY fn_cek_kelayakan_mustahik(m.id) DESC, m.nama_lengkap ASC
                 LIMIT 300'
            );
        } catch (Throwable $e) {
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }
            $rdbmsError = 'Gagal memuat detail BKK: ' . $e->getMessage();
        }

        return Inertia::render('Penyaluran/Show', [
            'bkk' => $bkk,
            'detailMustahik' => $detailMustahik,
            'daftarMustahik' => $daftarMustahik,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function tambahMustahik(Request $request, int $penyaluranId): RedirectResponse
    {
        $validated = $request->validate([
            'mustahik_id' => ['required', 'integer'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'beras_kg' => ['required', 'numeric', 'min:0'],
        ]);

        // Penambahan mustahik ke BKK Draft dilakukan melalui CALL sp_tambah_mustahik_bkk(?, ?, ?, ?).
        // Duplikasi mustahik dalam 1 BKK, kelayakan 365 hari, dan batas hak amil 12,5% divalidasi oleh RDBMS.
        return RdbmsErrorHandler::run(function () use ($penyaluranId, $validated) {
            DB::connection('mysql')->statement(
                'CALL sp_tambah_mustahik_bkk(?, ?, ?, ?)',
                [
                    $penyaluranId,
                    (int) $validated['mustahik_id'],
                    (float) $validated['nominal'],
                    (float) $validated['beras_kg'],
                ]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Penerima mustahik berhasil ditambahkan ke dalam BKK.');
        });
    }

    public function setujui(Request $request, int $penyaluranId): RedirectResponse
    {
        $penyetujuId = (int) $request->user()->id;

        // Transisi state machine Draft -> Disetujui divalidasi oleh trg_before_update_penyaluran_dana di RDBMS.
        return RdbmsErrorHandler::run(function () use ($penyaluranId, $penyetujuId) {
            DB::connection('mysql')->statement(
                'UPDATE penyaluran_dana
                 SET status_persetujuan = \'Disetujui\', penyetuju_id = ?, updated_at = NOW()
                 WHERE id = ?',
                [$penyetujuId, $penyaluranId]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'BKK telah disetujui oleh Ketua DKM. Selanjutnya dana siap dicairkan melalui Eksekusi Penyaluran.');
        });
    }

    public function tolak(Request $request, int $penyaluranId): RedirectResponse
    {
        $validated = $request->validate([
            'catatan_penolakan' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'catatan_penolakan.required' => 'Catatan alasan penolakan BKK wajib diisi oleh Ketua DKM.',
        ]);

        $penyetujuId = (int) $request->user()->id;

        // Transisi state machine Draft -> Ditolak divalidasi oleh trg_before_update_penyaluran_dana di RDBMS.
        return RdbmsErrorHandler::run(function () use ($penyaluranId, $penyetujuId, $validated) {
            DB::connection('mysql')->statement(
                'UPDATE penyaluran_dana
                 SET status_persetujuan = \'Ditolak\', penyetuju_id = ?, catatan_penolakan = ?, updated_at = NOW()
                 WHERE id = ?',
                [$penyetujuId, trim($validated['catatan_penolakan']), $penyaluranId]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Pengajuan BKK telah ditolak beserta catatan penolakan.');
        });
    }

    public function eksekusi(Request $request, int $penyaluranId): RedirectResponse
    {
        $penyetujuId = (int) $request->user()->id;

        // Pencairan dana Disetujui -> Disalurkan dengan FOR UPDATE pessimistic locking, pemotongan saldo jenis_dana,
        // dan update status_serah_terima = 'Sudah' dieksekusi sepenuhnya oleh CALL sp_eksekusi_penyaluran(?, ?).
        return RdbmsErrorHandler::run(function () use ($penyaluranId, $penyetujuId) {
            DB::connection('mysql')->statement(
                'CALL sp_eksekusi_penyaluran(?, ?)',
                [$penyaluranId, $penyetujuId]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Penyaluran BKK berhasil dieksekusi (Disalurkan). Saldo kantong dana telah dipotong dengan FOR UPDATE lock oleh RDBMS.');
        });
    }

    public function downloadPdf(int $penyaluranId): HttpResponse
    {
        $bkk = DB::connection('mysql')->selectOne(
            'SELECT pd.id, pd.no_bkk, pd.tanggal_penyaluran, pd.total_disalurkan, pd.total_beras_kg,
                    pd.status_persetujuan, pd.catatan_penolakan,
                    pp.kode_program, pp.nama_program,
                    jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                    ps1.nama_lengkap AS nama_pembuat,
                    ps2.nama_lengkap AS nama_penyetuju
             FROM penyaluran_dana pd
             INNER JOIN program_penyaluran pp ON pp.id = pd.program_id
             INNER JOIN jenis_dana jd ON jd.id = pd.jenis_dana_id
             INNER JOIN pengguna_sistem ps1 ON ps1.id = pd.pembuat_id
             LEFT JOIN pengguna_sistem ps2 ON ps2.id = pd.penyetuju_id
             WHERE pd.id = ?
             LIMIT 1',
            [$penyaluranId]
        );

        if (! $bkk) {
            abort(404, 'Dokumen BKK tidak ditemukan.');
        }

        $detailMustahik = DB::connection('mysql')->select(
            'SELECT dpm.id, m.nik AS nik_mustahik, m.nama_lengkap AS nama_mustahik, m.alamat_rt_rw,
                    ka.kode_asnaf, ka.nama_asnaf,
                    dpm.nominal_diterima, dpm.beras_diterima_kg,
                    dpm.status_serah_terima, dpm.waktu_serah_terima
             FROM detail_penyaluran_mustahik dpm
             INNER JOIN mustahik m ON m.id = dpm.mustahik_id
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             WHERE dpm.penyaluran_id = ?
             ORDER BY dpm.id ASC',
            [$penyaluranId]
        );

        $pdf = Pdf::loadView('pdf.bkk', [
            'bkk' => $bkk,
            'detailMustahik' => $detailMustahik,
        ])->setPaper('a4', 'portrait');

        $safeFilename = 'BKK-' . preg_replace('/[^A-Za-z0-9\-]/', '_', (string) $bkk->no_bkk) . '.pdf';

        return $pdf->download($safeFilename);
    }

    private function generateNoBkk(): string
    {
        $yearMonth = now()->format('Ym');
        $suffix = strtoupper(Str::random(4));

        return sprintf('BKK-%s-%s', $yearMonth, $suffix);
    }
}
