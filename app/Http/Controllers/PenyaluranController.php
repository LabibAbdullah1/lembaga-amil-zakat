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
    /**
     * Melampirkan catatan penerimaan periode/tahun aktif per jenis dana zakat
     * kepada setiap kandidat mustahik agar petugas BKK dapat melihat riwayat penerimaannya.
     */
    /**
     * Memastikan jika program berstatus khusus_amil = 1, hanya mustahik golongan ASN-03 (Amil) yang boleh dipilih.
     */
    private function validateKhususAmilProgram(int $programId, array $daftarPenerima): ?string
    {
        $program = DB::connection('mysql')->selectOne(
            'SELECT nama_program, khusus_amil FROM program_penyaluran WHERE id = ? LIMIT 1',
            [$programId]
        );

        if (! $program || (int) $program->khusus_amil !== 1) {
            return null;
        }

        $ids = array_values(array_unique(array_map(fn ($item) => (int) $item['mustahik_id'], $daftarPenerima)));
        if (count($ids) === 0) {
            return null;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $nonAmil = DB::connection('mysql')->selectOne(
            "SELECT m.nama_lengkap, ka.kode_asnaf, ka.nama_asnaf
             FROM mustahik m
             INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
             WHERE m.id IN ({$placeholders})
               AND ka.kode_asnaf <> 'ASN-03'
             LIMIT 1",
            $ids
        );

        if ($nonAmil) {
            return sprintf(
                'PENGUNCIAN PROGRAM AMIL: Program "%s" khusus untuk Amil Zakat (ASN-03). "%s" (%s - %s) tidak berhak menerima dari program ini.',
                $program->nama_program,
                $nonAmil->nama_lengkap,
                $nonAmil->kode_asnaf,
                $nonAmil->nama_asnaf
            );
        }

        return null;
    }

    private function attachPenerimaanPeriodeAktif(array $daftarMustahik): array
    {
        if (count($daftarMustahik) === 0) {
            return [];
        }

        $periodeAktif = DB::connection('mysql')->selectOne(
            'SELECT id, tahun_masehi FROM periode_ramadhan WHERE status_aktif = 1 ORDER BY tahun_masehi DESC LIMIT 1'
        );
        $tahunAktif = $periodeAktif ? (int) $periodeAktif->tahun_masehi : (int) date('Y');

        $rows = DB::connection('mysql')->select(
            'SELECT cpm.mustahik_id, cpm.jenis_dana_id, jd.kode_dana, jd.nama_dana,
                    SUM(cpm.jumlah_diterima_kali) AS jumlah_diterima_kali,
                    SUM(cpm.total_nominal_diterima) AS total_nominal_diterima,
                    SUM(cpm.total_beras_diterima_kg) AS total_beras_diterima_kg,
                    MAX(cpm.terakhir_diterima_pada) AS terakhir_diterima_pada
             FROM catatan_penerimaan_mustahik cpm
             INNER JOIN jenis_dana jd ON jd.id = cpm.jenis_dana_id
             WHERE cpm.tahun_masehi = ?
             GROUP BY cpm.mustahik_id, cpm.jenis_dana_id, jd.kode_dana, jd.nama_dana
             ORDER BY jd.kode_dana ASC',
            [$tahunAktif]
        );

        $map = [];
        foreach ($rows as $row) {
            $mid = (int) $row->mustahik_id;
            $map[$mid][] = [
                'jenis_dana_id' => (int) $row->jenis_dana_id,
                'kode_dana' => $row->kode_dana,
                'nama_dana' => $row->nama_dana,
                'jumlah_diterima_kali' => (int) $row->jumlah_diterima_kali,
                'total_nominal_diterima' => (float) $row->total_nominal_diterima,
                'total_beras_diterima_kg' => (float) $row->total_beras_diterima_kg,
                'terakhir_diterima_pada' => $row->terakhir_diterima_pada,
            ];
        }

        foreach ($daftarMustahik as $m) {
            $items = $map[(int) $m->id] ?? [];
            $m->penerimaan_periode_ini = $items;
            $m->total_kali_terima = array_sum(array_column($items, 'jumlah_diterima_kali'));
        }

        return $daftarMustahik;
    }
    public function index(Request $request): Response
    {
        $statusFilter = trim((string) $request->query('status', 'SEMUA'));
        $search = trim((string) $request->query('q', ''));

        $daftarBkk = [];
        $rdbmsError = null;

        try {
            $sql = "SELECT pd.id, pd.no_bkk, pd.program_id, pp.kode_program, pp.nama_program,
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
                    WHERE jd.kategori_utama = 'Zakat'";
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
        } catch (Throwable) {
            $daftarBkk = [];
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
        $daftarAsnaf = [];
        $rdbmsError = null;

        try {
            $daftarProgram = DB::connection('mysql')->select(
                "SELECT pp.id, pp.kode_program, pp.nama_program, pp.jenis_dana_id,
                        jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        jd.saldo_tersedia, jd.saldo_beras_kg,
                        pp.periode_id, pr.tahun_hijriah, pr.tahun_masehi,
                        pp.anggaran_rencana, pp.khusus_amil, pp.status_program
                 FROM program_penyaluran pp
                 INNER JOIN jenis_dana jd ON jd.id = pp.jenis_dana_id
                 INNER JOIN periode_ramadhan pr ON pr.id = pp.periode_id
                 WHERE pp.status_program IN ('Draft', 'Berjalan')
                   AND jd.kategori_utama = 'Zakat'
                 ORDER BY pr.status_aktif DESC, pp.kode_program ASC"
            );

            $daftarDanaOperasional = DB::connection('mysql')->select(
                "SELECT jd.id, jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        jd.saldo_tersedia, jd.saldo_beras_kg
                 FROM jenis_dana jd
                 WHERE jd.kategori_utama = 'Zakat'
                   AND NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                 ORDER BY jd.kode_dana ASC"
            );

            $daftarMustahik = $this->attachPenerimaanPeriodeAktif(
                DB::connection('mysql')->select(
                    'SELECT m.id, m.nik, m.nama_lengkap, m.kategori_asnaf_id,
                            ka.kode_asnaf, ka.nama_asnaf,
                            m.alamat_rt_rw, m.status_verifikasi, m.tanggal_verifikasi_terakhir,
                            fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat
                     FROM mustahik m
                     INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                     ORDER BY fn_cek_kelayakan_mustahik(m.id) DESC, ka.kode_asnaf ASC, m.nama_lengkap ASC
                     LIMIT 2000'
                )
            );

            $daftarAsnaf = DB::connection('mysql')->select(
                'SELECT id, kode_asnaf, nama_asnaf, deskripsi
                 FROM kategori_asnaf
                 ORDER BY kode_asnaf ASC'
            );
        } catch (Throwable) {
            $daftarProgram = [];
        }

        return Inertia::render('Penyaluran/Create', [
            'daftarProgram' => $daftarProgram,
            'daftarDanaOperasional' => $daftarDanaOperasional,
            'daftarMustahik' => $daftarMustahik,
            'daftarAsnaf' => $daftarAsnaf,
            'saranNoBkk' => $this->generateNoBkk(),
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Mendukung 2 mode input:
        // 1. Mode Kolektif / Kelompok (daftar `penerima` array berisi beberapa mustahik sekaligus)
        // 2. Mode Perorangan tunggal (`mustahik_id`, `nominal`, `beras_kg`)
        if ($request->has('penerima') && is_array($request->input('penerima'))) {
            $rawPenerima = $request->input('penerima');
            foreach ($rawPenerima as $idx => $item) {
                $rawPenerima[$idx]['nominal'] = ($item['nominal'] ?? '') === '' ? 0 : $item['nominal'];
                $rawPenerima[$idx]['beras_kg'] = ($item['beras_kg'] ?? '') === '' ? 0 : $item['beras_kg'];
            }
            $request->merge(['penerima' => $rawPenerima]);

            $validated = $request->validate([
                'no_bkk' => ['nullable', 'string', 'max:40'],
                'program_id' => ['required', 'integer'],
                'jenis_dana_id' => ['required', 'integer'],
                'penerima' => ['required', 'array', 'min:1'],
                'penerima.*.mustahik_id' => ['required', 'integer', 'distinct'],
                'penerima.*.nominal' => ['required', 'numeric', 'min:0'],
                'penerima.*.beras_kg' => ['required', 'numeric', 'min:0'],
            ], [
                'penerima.required' => 'Pilih minimal 1 mustahik penerima dalam pengajuan BKK.',
                'penerima.min' => 'Pilih minimal 1 mustahik penerima dalam pengajuan BKK.',
                'penerima.*.mustahik_id.distinct' => 'Terdapat duplikasi nama mustahik dalam daftar penerima yang dipilih.',
            ]);

            $daftarPenerima = array_values($validated['penerima']);
        } else {
            $request->merge([
                'nominal' => ($request->input('nominal') === '' || $request->input('nominal') === null) ? 0 : $request->input('nominal'),
                'beras_kg' => ($request->input('beras_kg') === '' || $request->input('beras_kg') === null) ? 0 : $request->input('beras_kg'),
            ]);

            $validated = $request->validate([
                'no_bkk' => ['nullable', 'string', 'max:40'],
                'program_id' => ['required', 'integer'],
                'jenis_dana_id' => ['required', 'integer'],
                'mustahik_id' => ['required', 'integer'],
                'nominal' => ['required', 'numeric', 'min:0'],
                'beras_kg' => ['required', 'numeric', 'min:0'],
            ]);

            $daftarPenerima = [
                [
                    'mustahik_id' => (int) $validated['mustahik_id'],
                    'nominal' => (float) $validated['nominal'],
                    'beras_kg' => (float) $validated['beras_kg'],
                ],
            ];
        }

        $noBkk = ! empty($validated['no_bkk'])
            ? strtoupper(trim($validated['no_bkk']))
            : $this->generateNoBkk();

        if ($errAmil = $this->validateKhususAmilProgram((int) $validated['program_id'], $daftarPenerima)) {
            return back()->withErrors(['penerima' => $errAmil])->with('error', $errAmil);
        }

        $pembuatId = (int) $request->user()->id;

        // Eksekusi sekali jalan (Batch / Kolektif) menggunakan Stored Procedure RDBMS:
        // 1. Penerima pertama membuat header BKK Draft melalui CALL sp_buat_pengajuan_penyaluran(...)
        // 2. Penerima ke-2 s.d. ke-N ditambahkan berurutan melalui CALL sp_tambah_mustahik_bkk(...)
        return RdbmsErrorHandler::run(function () use ($validated, $daftarPenerima, $noBkk, $pembuatId) {
            $penerimaPertama = $daftarPenerima[0];

            DB::connection('mysql')->statement(
                'CALL sp_buat_pengajuan_penyaluran(?, ?, ?, ?, ?, ?, ?)',
                [
                    $noBkk,
                    (int) $validated['program_id'],
                    (int) $validated['jenis_dana_id'],
                    $pembuatId,
                    (int) $penerimaPertama['mustahik_id'],
                    (float) $penerimaPertama['nominal'],
                    (float) $penerimaPertama['beras_kg'],
                ]
            );

            $created = DB::connection('mysql')->selectOne(
                'SELECT id FROM penyaluran_dana WHERE no_bkk = ? LIMIT 1',
                [$noBkk]
            );

            $penyaluranId = $created && isset($created->id) ? (int) $created->id : null;

            if ($penyaluranId && count($daftarPenerima) > 1) {
                $totalPenerima = count($daftarPenerima);
                for ($i = 1; $i < $totalPenerima; $i++) {
                    $item = $daftarPenerima[$i];
                    DB::connection('mysql')->statement(
                        'CALL sp_tambah_mustahik_bkk(?, ?, ?, ?)',
                        [
                            $penyaluranId,
                            (int) $item['mustahik_id'],
                            (float) $item['nominal'],
                            (float) $item['beras_kg'],
                        ]
                    );
                }
            }

            $jumlah = count($daftarPenerima);

            if ($penyaluranId) {
                return redirect()->route('penyaluran.show', $penyaluranId)
                    ->with('success', sprintf('Draf BKK %s berhasil disusun sekali jalan untuk %d mustahik penerima.', $noBkk, $jumlah));
            }

            return redirect()->route('penyaluran.index')
                ->with('success', sprintf('Draf BKK %s berhasil dibuat untuk %d mustahik.', $noBkk, $jumlah));
        });
    }

    public function show(int $id): Response
    {
        $bkk = null;
        $detailMustahik = [];
        $daftarMustahik = [];
        $daftarAsnaf = [];
        $rdbmsError = null;

        try {
            $bkk = DB::connection('mysql')->selectOne(
                'SELECT pd.id, pd.no_bkk, pd.program_id, pp.kode_program, pp.nama_program,
                        pd.jenis_dana_id, jd.kode_dana, jd.nama_dana, jd.kategori_utama,
                        pp.khusus_amil,
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

            $daftarMustahik = $this->attachPenerimaanPeriodeAktif(
                DB::connection('mysql')->select(
                    'SELECT m.id, m.nik, m.nama_lengkap, m.kategori_asnaf_id,
                            ka.kode_asnaf, ka.nama_asnaf,
                            m.alamat_rt_rw, m.status_verifikasi, fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat
                     FROM mustahik m
                     INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                     ORDER BY fn_cek_kelayakan_mustahik(m.id) DESC, ka.kode_asnaf ASC, m.nama_lengkap ASC
                     LIMIT 2000'
                )
            );

            $daftarAsnaf = DB::connection('mysql')->select(
                'SELECT id, kode_asnaf, nama_asnaf, deskripsi
                 FROM kategori_asnaf
                 ORDER BY kode_asnaf ASC'
            );
        } catch (Throwable $e) {
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }
            $bkk = null;
        }

        return Inertia::render('Penyaluran/Show', [
            'bkk' => $bkk,
            'detailMustahik' => $detailMustahik,
            'daftarMustahik' => $daftarMustahik,
            'daftarAsnaf' => $daftarAsnaf,
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function tambahMustahik(Request $request, int $penyaluranId): RedirectResponse
    {
        // Mendukung penambahan kolektif (array `penerima`) maupun satu per satu
        if ($request->has('penerima') && is_array($request->input('penerima'))) {
            $rawPenerima = $request->input('penerima');
            foreach ($rawPenerima as $idx => $item) {
                $rawPenerima[$idx]['nominal'] = ($item['nominal'] ?? '') === '' ? 0 : $item['nominal'];
                $rawPenerima[$idx]['beras_kg'] = ($item['beras_kg'] ?? '') === '' ? 0 : $item['beras_kg'];
            }
            $request->merge(['penerima' => $rawPenerima]);

            $validated = $request->validate([
                'penerima' => ['required', 'array', 'min:1'],
                'penerima.*.mustahik_id' => ['required', 'integer', 'distinct'],
                'penerima.*.nominal' => ['required', 'numeric', 'min:0'],
                'penerima.*.beras_kg' => ['required', 'numeric', 'min:0'],
            ]);

            $daftarPenerima = array_values($validated['penerima']);
        } else {
            $request->merge([
                'nominal' => ($request->input('nominal') === '' || $request->input('nominal') === null) ? 0 : $request->input('nominal'),
                'beras_kg' => ($request->input('beras_kg') === '' || $request->input('beras_kg') === null) ? 0 : $request->input('beras_kg'),
            ]);

            $validated = $request->validate([
                'mustahik_id' => ['required', 'integer'],
                'nominal' => ['required', 'numeric', 'min:0'],
                'beras_kg' => ['required', 'numeric', 'min:0'],
            ]);

            $daftarPenerima = [
                [
                    'mustahik_id' => (int) $validated['mustahik_id'],
                    'nominal' => (float) $validated['nominal'],
                    'beras_kg' => (float) $validated['beras_kg'],
                ],
            ];
        }

        $bkk = DB::connection('mysql')->selectOne(
            'SELECT program_id FROM penyaluran_dana WHERE id = ? LIMIT 1',
            [$penyaluranId]
        );

        if ($bkk && ($errAmil = $this->validateKhususAmilProgram((int) $bkk->program_id, $daftarPenerima))) {
            return back()->withErrors(['mustahik_id' => $errAmil])->with('error', $errAmil);
        }

        return RdbmsErrorHandler::run(function () use ($penyaluranId, $daftarPenerima) {
            foreach ($daftarPenerima as $item) {
                DB::connection('mysql')->statement(
                    'CALL sp_tambah_mustahik_bkk(?, ?, ?, ?)',
                    [
                        $penyaluranId,
                        (int) $item['mustahik_id'],
                        (float) $item['nominal'],
                        (float) $item['beras_kg'],
                    ]
                );
            }

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', sprintf('%d mustahik penerima berhasil ditambahkan sekaligus ke dalam BKK.', count($daftarPenerima)));
        });
    }

    public function updateDetailMustahik(Request $request, int $penyaluranId): RedirectResponse
    {
        $bkk = DB::connection('mysql')->selectOne(
            'SELECT id, status_persetujuan FROM penyaluran_dana WHERE id = ? LIMIT 1',
            [$penyaluranId]
        );

        if (! $bkk) {
            abort(404, 'Dokumen BKK tidak ditemukan.');
        }

        if ($bkk->status_persetujuan !== 'Draft') {
            return back()->withErrors([
                'rdbms' => 'PENOLAKAN SISTEM: Nilai penerima hanya dapat diubah ketika dokumen BKK masih berstatus Draft (sebelum di-ACC).',
            ]);
        }

        $rawItems = is_array($request->input('items')) ? $request->input('items') : [];
        foreach ($rawItems as $idx => $item) {
            $rawItems[$idx]['nominal_diterima'] = ($item['nominal_diterima'] ?? '') === '' ? 0 : $item['nominal_diterima'];
            $rawItems[$idx]['beras_diterima_kg'] = ($item['beras_diterima_kg'] ?? '') === '' ? 0 : $item['beras_diterima_kg'];
        }
        $request->merge(['items' => $rawItems]);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.nominal_diterima' => ['required', 'numeric', 'min:0'],
            'items.*.beras_diterima_kg' => ['required', 'numeric', 'min:0'],
        ]);

        return RdbmsErrorHandler::run(function () use ($penyaluranId, $validated) {
            foreach ($validated['items'] as $row) {
                DB::connection('mysql')->statement(
                    'UPDATE detail_penyaluran_mustahik
                     SET nominal_diterima = ?, beras_diterima_kg = ?
                     WHERE id = ? AND penyaluran_id = ?',
                    [
                        (float) $row['nominal_diterima'],
                        (float) $row['beras_diterima_kg'],
                        (int) $row['id'],
                        $penyaluranId,
                    ]
                );
            }

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Nilai penerimaan mustahik dan total keterangan BKK berhasil disinkronkan.');
        });
    }

    public function hapusDetailMustahik(int $penyaluranId, int $detailId): RedirectResponse
    {
        $bkk = DB::connection('mysql')->selectOne(
            'SELECT id, status_persetujuan FROM penyaluran_dana WHERE id = ? LIMIT 1',
            [$penyaluranId]
        );

        if (! $bkk || $bkk->status_persetujuan !== 'Draft') {
            return back()->withErrors([
                'rdbms' => 'PENOLAKAN SISTEM: Penerima hanya dapat dihapus saat dokumen BKK masih berstatus Draft.',
            ]);
        }

        $countRow = DB::connection('mysql')->selectOne(
            'SELECT COUNT(*) AS total FROM detail_penyaluran_mustahik WHERE penyaluran_id = ?',
            [$penyaluranId]
        );

        if (((int) ($countRow->total ?? 0)) <= 1) {
            return back()->withErrors([
                'rdbms' => 'PENOLAKAN SISTEM: Dokumen BKK wajib memiliki minimal 1 penerima manfaat.',
            ]);
        }

        return RdbmsErrorHandler::run(function () use ($penyaluranId, $detailId) {
            DB::connection('mysql')->statement(
                'DELETE FROM detail_penyaluran_mustahik WHERE id = ? AND penyaluran_id = ?',
                [$detailId, $penyaluranId]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Penerima manfaat dihapus dari draf BKK dan total BKK telah disesuaikan.');
        });
    }

    public function setujui(Request $request, int $penyaluranId): RedirectResponse
    {
        $penyetujuId = (int) $request->user()->id;

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

        return RdbmsErrorHandler::run(function () use ($penyaluranId, $penyetujuId) {
            DB::connection('mysql')->statement(
                'CALL sp_eksekusi_penyaluran(?, ?)',
                [$penyaluranId, $penyetujuId]
            );

            return redirect()->route('penyaluran.show', $penyaluranId)
                ->with('success', 'Penyaluran BKK berhasil dicairkan (Disalurkan). Saldo kantong dana zakat telah diperbarui.');
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
