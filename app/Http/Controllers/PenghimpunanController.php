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

class PenghimpunanController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = trim((string) $request->query('status', 'SEMUA'));
        $search = trim((string) $request->query('q', ''));
        $selectedMuzakiId = max(0, (int) $request->query('muzaki_id', 0));
        $page = max(1, (int) $request->query('page', 1));
        $requestedLimit = (int) $request->query('per_page', 15);
        $perPage = in_array($requestedLimit, [10, 15, 25, 50, 100], true) ? $requestedLimit : 15;
        $offset = ($page - 1) * $perPage;

        $daftarMuzaki = [];
        $daftarDanaOperasional = [];
        $periodeAktif = null;
        $riwayatKwitansi = [];
        $totalKwitansi = 0;
        $rdbmsError = null;

        try {
            $periodeAktif = DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi, beras_per_jiwa_kg, nominal_fitrah_per_jiwa, status_aktif
                 FROM periode_ramadhan
                 WHERE status_aktif = 1
                 LIMIT 1'
            );

            $daftarMuzaki = DB::connection('mysql')->select(
                'SELECT m.id, m.nik, m.nama_lengkap, m.no_hp, m.alamat_rt_rw, m.jenis_muzaki,
                        fn_hitung_jiwa_muzaki(m.id) AS jumlah_jiwa
                 FROM muzaki m
                 ORDER BY m.nama_lengkap ASC
                 LIMIT 2000'
            );

            if ($selectedMuzakiId > 0) {
                $existsInList = false;
                foreach ($daftarMuzaki as $mRow) {
                    if ((int) $mRow->id === $selectedMuzakiId) {
                        $existsInList = true;
                        break;
                    }
                }

                if (! $existsInList) {
                    $targetMuzaki = DB::connection('mysql')->selectOne(
                        'SELECT m.id, m.nik, m.nama_lengkap, m.no_hp, m.alamat_rt_rw, m.jenis_muzaki,
                                fn_hitung_jiwa_muzaki(m.id) AS jumlah_jiwa
                         FROM muzaki m
                         WHERE m.id = ?
                         LIMIT 1',
                        [$selectedMuzakiId]
                    );

                    if ($targetMuzaki) {
                        array_unshift($daftarMuzaki, $targetMuzaki);
                    }
                }
            }

            // Hanya tampilkan sub-dana leaf/operasional khusus Zakat.
            $daftarDanaOperasional = DB::connection('mysql')->select(
                "SELECT jd.id, jd.parent_id, p.nama_dana AS nama_induk, jd.kode_dana, jd.nama_dana,
                        jd.kategori_utama, jd.is_terikat, jd.saldo_tersedia, jd.saldo_beras_kg
                 FROM jenis_dana jd
                 LEFT JOIN jenis_dana p ON p.id = jd.parent_id
                 WHERE jd.kategori_utama = 'Zakat'
                   AND NOT EXISTS (SELECT 1 FROM jenis_dana c WHERE c.parent_id = jd.id)
                 ORDER BY jd.kode_dana ASC"
            );

            $whereClause = ' WHERE 1=1';
            $bindings = [];

            if (in_array($statusFilter, ['Sah', 'Dibatalkan'], true)) {
                $whereClause .= ' AND tp.status_transaksi = ?';
                $bindings[] = $statusFilter;
            }

            if ($search !== '') {
                $whereClause .= ' AND (tp.no_kwitansi LIKE ? OR m.nama_lengkap LIKE ? OR m.nik LIKE ?)';
                $like = '%' . $search . '%';
                $bindings[] = $like;
                $bindings[] = $like;
                $bindings[] = $like;
            }

            $countRow = DB::connection('mysql')->selectOne(
                'SELECT COUNT(tp.id) AS total
                 FROM transaksi_penghimpunan tp
                 INNER JOIN muzaki m ON m.id = tp.muzaki_id' . $whereClause,
                $bindings
            );
            $totalKwitansi = (int) ($countRow->total ?? 0);

            $riwayatKwitansi = DB::connection('mysql')->select(
                'SELECT tp.id, tp.no_kwitansi, tp.muzaki_id, m.nik AS nik_muzaki, m.nama_lengkap AS nama_muzaki,
                        tp.periode_id, pr.tahun_hijriah, pr.tahun_masehi,
                        tp.amil_id, ps.nama_lengkap AS nama_amil,
                        tp.tanggal_transaksi, tp.metode_bayar, tp.total_nominal, tp.total_beras_kg,
                        tp.status_transaksi, tp.alasan_batal,
                        dp.jenis_dana_id, jd.kode_dana, jd.nama_dana, dp.jumlah_jiwa
                 FROM transaksi_penghimpunan tp
                 INNER JOIN muzaki m ON m.id = tp.muzaki_id
                 INNER JOIN periode_ramadhan pr ON pr.id = tp.periode_id
                 INNER JOIN pengguna_sistem ps ON ps.id = tp.amil_id
                 LEFT JOIN detail_penghimpunan dp ON dp.transaksi_id = tp.id
                 LEFT JOIN jenis_dana jd ON jd.id = dp.jenis_dana_id'
                . $whereClause .
                ' ORDER BY tp.tanggal_transaksi DESC, tp.id DESC
                  LIMIT ? OFFSET ?',
                [...$bindings, $perPage, $offset]
            );
        } catch (Throwable) {
            $riwayatKwitansi = [];
        }

        return Inertia::render('Loket/Index', [
            'daftarMuzaki' => $daftarMuzaki,
            'selectedMuzakiId' => $selectedMuzakiId,
            'daftarDanaOperasional' => $daftarDanaOperasional,
            'periodeAktif' => $periodeAktif,
            'riwayatKwitansi' => $riwayatKwitansi,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalKwitansi,
                'last_page' => max(1, (int) ceil($totalKwitansi / $perPage)),
            ],
            'filters' => [
                'status' => $statusFilter,
                'q' => $search,
                'per_page' => $perPage,
            ],
            'saranNoKwitansi' => $this->generateNoKwitansi(),
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'no_kwitansi' => ['nullable', 'string', 'max:40'],
            'muzaki_id' => ['required', 'integer'],
            'periode_id' => ['required', 'integer'],
            'metode_bayar' => ['required', 'in:Tunai,Transfer,QRIS,Beras,Campuran'],
            'jenis_dana_id' => ['required', 'integer'],
            'jumlah_jiwa' => ['required', 'integer', 'min:1'],
            'nominal' => ['required', 'numeric', 'min:0'],
            'berat_beras_kg' => ['required', 'numeric', 'min:0'],
        ]);

        $noKwitansi = ! empty($validated['no_kwitansi'])
            ? strtoupper(trim($validated['no_kwitansi']))
            : $this->generateNoKwitansi();

        $amilId = (int) $request->user()->id;

        // DILARANG menghitung atau menambah saldo jenis_dana di PHP!
        // Seluruh pencatatan header, detail, dan sinkronisasi saldo dilakukan atomik oleh sp_terima_zis_fitrah & trigger RDBMS.
        return RdbmsErrorHandler::run(function () use ($validated, $noKwitansi, $amilId) {
            DB::connection('mysql')->statement(
                'CALL sp_terima_zis_fitrah(?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $noKwitansi,
                    (int) $validated['muzaki_id'],
                    (int) $validated['periode_id'],
                    $amilId,
                    $validated['metode_bayar'],
                    (int) $validated['jenis_dana_id'],
                    (int) $validated['jumlah_jiwa'],
                    (float) $validated['nominal'],
                    (float) $validated['berat_beras_kg'],
                ]
            );

            return redirect()->route('loket.index')
                ->with('success', sprintf('Setoran ZIS/Fitrah berhasil dicatat dengan Nomor Kwitansi %s.', $noKwitansi));
        });
    }

    public function batalkan(Request $request, int $transaksiId): RedirectResponse
    {
        $validated = $request->validate([
            'alasan_batal' => ['required', 'string', 'min:5', 'max:255'],
        ], [
            'alasan_batal.required' => 'Alasan pembatalan (void) kwitansi wajib diisi untuk rekam jejak audit.',
            'alasan_batal.min' => 'Alasan pembatalan minimal 5 karakter.',
        ]);

        // Pembalikan saldo (reversal) dan pencatatan log_audit_zis dilakukan sepenuhnya oleh sp_batalkan_penghimpunan & trigger RDBMS.
        return RdbmsErrorHandler::run(function () use ($transaksiId, $validated) {
            DB::connection('mysql')->statement(
                'CALL sp_batalkan_penghimpunan(?, ?)',
                [$transaksiId, trim($validated['alasan_batal'])]
            );

            return redirect()->route('loket.index')
                ->with('success', 'Kwitansi berhasil dibatalkan (Void). Saldo kantong dana telah dibalikkan oleh RDBMS.');
        });
    }

    public function downloadPdf(int $transaksiId): HttpResponse
    {
        $transaksi = DB::connection('mysql')->selectOne(
            'SELECT tp.id, tp.no_kwitansi, tp.tanggal_transaksi, tp.metode_bayar,
                    tp.total_nominal, tp.total_beras_kg, tp.status_transaksi, tp.alasan_batal,
                    m.nik AS nik_muzaki, m.nama_lengkap AS nama_muzaki, m.no_hp AS hp_muzaki, m.alamat_rt_rw,
                    pr.tahun_hijriah, pr.tahun_masehi,
                    ps.nama_lengkap AS nama_amil, ps.username AS username_amil
             FROM transaksi_penghimpunan tp
             INNER JOIN muzaki m ON m.id = tp.muzaki_id
             INNER JOIN periode_ramadhan pr ON pr.id = tp.periode_id
             INNER JOIN pengguna_sistem ps ON ps.id = tp.amil_id
             WHERE tp.id = ?
             LIMIT 1',
            [$transaksiId]
        );

        if (! $transaksi) {
            abort(404, 'Data kwitansi tidak ditemukan.');
        }

        $detailItems = DB::connection('mysql')->select(
            'SELECT dp.id, dp.jumlah_jiwa, dp.nominal, dp.berat_beras_kg,
                    jd.kode_dana, jd.nama_dana, jd.kategori_utama
             FROM detail_penghimpunan dp
             INNER JOIN jenis_dana jd ON jd.id = dp.jenis_dana_id
             WHERE dp.transaksi_id = ?
             ORDER BY dp.id ASC',
            [$transaksiId]
        );

        $pdf = Pdf::loadView('pdf.kwitansi', [
            'transaksi' => $transaksi,
            'detailItems' => $detailItems,
        ])->setPaper('a5', 'landscape');

        $safeFilename = 'Kwitansi-' . preg_replace('/[^A-Za-z0-9\-]/', '_', (string) $transaksi->no_kwitansi) . '.pdf';

        return $pdf->download($safeFilename);
    }

    private function generateNoKwitansi(): string
    {
        $yearMonth = now()->format('Ym');
        $suffix = strtoupper(Str::random(6));

        return sprintf('KWZ-%s-%s', $yearMonth, $suffix);
    }
}
