<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MustahikController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $asnafFilter = trim((string) $request->query('asnaf', 'SEMUA'));
        $statusFilter = trim((string) $request->query('status', 'SEMUA'));
        $rtRwFilter = trim((string) $request->query('rt_rw', 'SEMUA'));
        $penerimaanFilter = trim((string) $request->query('penerimaan', 'SEMUA'));

        $daftarMustahik = [];
        $daftarAsnaf = [];
        $indeksRtRw = [];
        $riwayatVerifikasi = [];
        $periodeAktif = null;
        $rdbmsError = null;

        try {
            $periodeAktif = DB::connection('mysql')->selectOne(
                'SELECT id, tahun_hijriah, tahun_masehi FROM periode_ramadhan WHERE status_aktif = 1 LIMIT 1'
            );

            $daftarAsnaf = DB::connection('mysql')->select(
                'SELECT id, kode_asnaf, nama_asnaf, deskripsi
                 FROM kategori_asnaf
                 ORDER BY kode_asnaf ASC'
            );

            $indeksRtRw = DB::connection('mysql')->select(
                "SELECT COALESCE(NULLIF(TRIM(alamat_rt_rw), ''), 'Belum Diisi') AS wilayah_rt_rw,
                        COUNT(id) AS jumlah_kk,
                        SUM(CASE WHEN fn_cek_kelayakan_mustahik(id) = 1 THEN 1 ELSE 0 END) AS jumlah_layak
                 FROM mustahik
                 GROUP BY COALESCE(NULLIF(TRIM(alamat_rt_rw), ''), 'Belum Diisi')
                 ORDER BY wilayah_rt_rw ASC"
            );

            $sql = 'SELECT m.id, m.nik, m.nama_lengkap, m.kategori_asnaf_id,
                           ka.kode_asnaf, ka.nama_asnaf,
                           m.alamat_rt_rw, m.status_verifikasi, m.tanggal_verifikasi_terakhir,
                           fn_cek_kelayakan_mustahik(m.id) AS is_layak_syariat,
                           CASE
                               WHEN m.tanggal_verifikasi_terakhir IS NULL THEN NULL
                               ELSE DATEDIFF(CURDATE(), m.tanggal_verifikasi_terakhir)
                           END AS usia_verifikasi_hari,
                           m.created_at, m.updated_at
                    FROM mustahik m
                    INNER JOIN kategori_asnaf ka ON ka.id = m.kategori_asnaf_id
                    WHERE 1=1';
            $bindings = [];

            if ($search !== '') {
                $sql .= ' AND (m.nik LIKE ? OR m.nama_lengkap LIKE ? OR COALESCE(m.alamat_rt_rw, \'\') LIKE ?)';
                $like = '%' . $search . '%';
                $bindings[] = $like;
                $bindings[] = $like;
                $bindings[] = $like;
            }

            if ($asnafFilter !== '' && $asnafFilter !== 'SEMUA') {
                $sql .= ' AND ka.kode_asnaf = ?';
                $bindings[] = $asnafFilter;
            }

            if (in_array($statusFilter, ['Menunggu', 'Layak', 'Tidak_Layak', 'Kedaluwarsa'], true)) {
                $sql .= ' AND m.status_verifikasi = ?';
                $bindings[] = $statusFilter;
            }

            if ($rtRwFilter !== '' && $rtRwFilter !== 'SEMUA') {
                if ($rtRwFilter === 'Belum Diisi') {
                    $sql .= " AND (m.alamat_rt_rw IS NULL OR TRIM(m.alamat_rt_rw) = '')";
                } else {
                    $sql .= ' AND TRIM(m.alamat_rt_rw) = ?';
                    $bindings[] = $rtRwFilter;
                }
            }

            $sql .= ' ORDER BY COALESCE(m.alamat_rt_rw, \'ZZZZ\') ASC, m.status_verifikasi = \'Menunggu\' DESC, m.nama_lengkap ASC LIMIT 500';

            $daftarMustahik = DB::connection('mysql')->select($sql, $bindings);

            // Ambil catatan penerimaan zakat per mustahik & jenis zakat pada periode/tahun aktif
            $catatanMap = [];
            if ($periodeAktif && isset($periodeAktif->id)) {
                $catatanRows = DB::connection('mysql')->select(
                    'SELECT cpm.mustahik_id, cpm.jenis_dana_id, jd.kode_dana, jd.nama_dana,
                            SUM(cpm.jumlah_diterima_kali) AS jumlah_diterima_kali,
                            SUM(cpm.total_nominal_diterima) AS total_nominal_diterima,
                            SUM(cpm.total_beras_diterima_kg) AS total_beras_diterima_kg,
                            MAX(cpm.terakhir_diterima_pada) AS terakhir_diterima_pada
                     FROM catatan_penerimaan_mustahik cpm
                     INNER JOIN jenis_dana jd ON jd.id = cpm.jenis_dana_id
                     WHERE cpm.periode_id = ? OR cpm.tahun_masehi = ?
                     GROUP BY cpm.mustahik_id, cpm.jenis_dana_id, jd.kode_dana, jd.nama_dana
                     ORDER BY jd.kode_dana ASC',
                    [(int) $periodeAktif->id, (int) $periodeAktif->tahun_masehi]
                );

                foreach ($catatanRows as $cRow) {
                    $mId = (int) $cRow->mustahik_id;
                    $catatanMap[$mId][] = [
                        'jenis_dana_id' => (int) $cRow->jenis_dana_id,
                        'kode_dana' => (string) $cRow->kode_dana,
                        'nama_dana' => (string) $cRow->nama_dana,
                        'jumlah_diterima_kali' => (int) $cRow->jumlah_diterima_kali,
                        'total_nominal_diterima' => (float) $cRow->total_nominal_diterima,
                        'total_beras_diterima_kg' => (float) $cRow->total_beras_diterima_kg,
                        'terakhir_diterima_pada' => $cRow->terakhir_diterima_pada,
                    ];
                }
            }

            $filteredMustahik = [];
            foreach ($daftarMustahik as $row) {
                $mId = (int) $row->id;
                $items = $catatanMap[$mId] ?? [];
                $totalKali = 0;
                foreach ($items as $it) {
                    $totalKali += $it['jumlah_diterima_kali'];
                }
                $row->penerimaan_periode_ini = $items;
                $row->total_kali_terima = $totalKali;

                if ($penerimaanFilter === 'SUDAH_TERIMA' && $totalKali === 0) {
                    continue;
                }
                if ($penerimaanFilter === 'BELUM_TERIMA' && $totalKali > 0) {
                    continue;
                }

                $filteredMustahik[] = $row;
            }
            $daftarMustahik = $filteredMustahik;

            $riwayatVerifikasi = DB::connection('mysql')->select(
                'SELECT vm.id, vm.mustahik_id, m.nik AS nik_mustahik, m.nama_lengkap AS nama_mustahik,
                        vm.verifikator_id, ps.nama_lengkap AS nama_verifikator,
                        vm.tanggal_verifikasi, vm.hasil, vm.catatan_survei
                 FROM verifikasi_mustahik vm
                 INNER JOIN mustahik m ON m.id = vm.mustahik_id
                 INNER JOIN pengguna_sistem ps ON ps.id = vm.verifikator_id
                 ORDER BY vm.tanggal_verifikasi DESC, vm.id DESC
                 LIMIT 100'
            );
        } catch (Throwable) {
            $daftarMustahik = [];
            $riwayatVerifikasi = [];
        }

        return Inertia::render('Mustahik/Index', [
            'daftarMustahik' => $daftarMustahik,
            'daftarAsnaf' => $daftarAsnaf,
            'indeksRtRw' => $indeksRtRw,
            'riwayatVerifikasi' => $riwayatVerifikasi,
            'filters' => [
                'q' => $search,
                'asnaf' => $asnafFilter,
                'status' => $statusFilter,
                'rt_rw' => $rtRwFilter,
                'penerimaan' => $penerimaanFilter,
            ],
            'rdbmsError' => $rdbmsError,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/'],
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'kategori_asnaf_id' => ['required', 'integer'],
            'alamat_rt_rw' => ['nullable', 'string', 'max:200'],
        ], [
            'nik.size' => 'NIK Mustahik wajib terdiri dari tepat 16 digit angka.',
            'nik.regex' => 'NIK Mustahik hanya boleh berisi 16 digit angka.',
        ]);

        // Mustahik baru otomatis berstatus 'Menunggu' sesuai aturan syariat sebelum disurvei Verifikator.
        return RdbmsErrorHandler::run(function () use ($validated) {
            DB::connection('mysql')->statement(
                'INSERT INTO mustahik (nik, nama_lengkap, kategori_asnaf_id, alamat_rt_rw, status_verifikasi, created_at, updated_at)
                 VALUES (?, ?, ?, ?, \'Menunggu\', NOW(), NOW())',
                [
                    $validated['nik'],
                    trim($validated['nama_lengkap']),
                    (int) $validated['kategori_asnaf_id'],
                    $validated['alamat_rt_rw'] ? trim($validated['alamat_rt_rw']) : null,
                ]
            );

            return redirect()->route('mustahik.index')
                ->with('success', sprintf('Calon Mustahik %s (NIK: %s) berhasil didaftarkan dengan status Menunggu Survei.', $validated['nama_lengkap'], $validated['nik']));
        });
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/'],
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'kategori_asnaf_id' => ['required', 'integer'],
            'alamat_rt_rw' => ['nullable', 'string', 'max:200'],
        ]);

        return RdbmsErrorHandler::run(function () use ($validated, $id) {
            DB::connection('mysql')->statement(
                'UPDATE mustahik
                 SET nik = ?, nama_lengkap = ?, kategori_asnaf_id = ?, alamat_rt_rw = ?, updated_at = NOW()
                 WHERE id = ?',
                [
                    $validated['nik'],
                    trim($validated['nama_lengkap']),
                    (int) $validated['kategori_asnaf_id'],
                    $validated['alamat_rt_rw'] ? trim($validated['alamat_rt_rw']) : null,
                    $id,
                ]
            );

            return redirect()->route('mustahik.index')
                ->with('success', sprintf('Profil Mustahik %s berhasil diperbarui.', $validated['nama_lengkap']));
        });
    }

    public function verifikasi(Request $request, int $mustahikId): RedirectResponse
    {
        $validated = $request->validate([
            'hasil' => ['required', 'in:Layak,Tidak_Layak'],
            'catatan_survei' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'catatan_survei.required' => 'Catatan hasil survei lapangan wajib diisi oleh Verifikator.',
            'catatan_survei.min' => 'Catatan survei minimal 5 karakter.',
        ]);

        $verifikatorId = (int) $request->user()->id;

        // Seluruh penyimpanan riwayat verifikasi_mustahik, update status_verifikasi & tanggal_verifikasi_terakhir,
        // serta audit log dilakukan oleh CALL sp_verifikasi_mustahik(?, ?, ?, ?).
        return RdbmsErrorHandler::run(function () use ($mustahikId, $verifikatorId, $validated) {
            DB::connection('mysql')->statement(
                'CALL sp_verifikasi_mustahik(?, ?, ?, ?)',
                [
                    $mustahikId,
                    $verifikatorId,
                    $validated['hasil'],
                    trim($validated['catatan_survei']),
                ]
            );

            return redirect()->route('mustahik.index')
                ->with('success', sprintf('Hasil survei lapangan (%s) berhasil disimpan melalui sp_verifikasi_mustahik.', $validated['hasil']));
        });
    }
}
