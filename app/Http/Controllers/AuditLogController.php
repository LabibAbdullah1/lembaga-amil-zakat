<?php

namespace App\Http\Controllers;

use App\Support\RdbmsErrorHandler;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $tabelFilter = trim((string) $request->query('tabel', 'SEMUA'));
        $aksiFilter = trim((string) $request->query('aksi', 'SEMUA'));
        $tanggalMulai = trim((string) $request->query('dari', ''));
        $tanggalAkhir = trim((string) $request->query('sampai', ''));

        $daftarLog = [];
        $rdbmsError = null;

        try {
            $sql = 'SELECT id, nama_tabel, record_id, aksi, data_lama, data_baru, dilakukan_oleh, waktu_kejadian
                    FROM log_audit_zis
                    WHERE 1=1';
            $bindings = [];

            if ($tabelFilter !== '' && $tabelFilter !== 'SEMUA') {
                $sql .= ' AND nama_tabel = ?';
                $bindings[] = $tabelFilter;
            }

            if (in_array($aksiFilter, ['INSERT', 'UPDATE', 'DELETE'], true)) {
                $sql .= ' AND aksi = ?';
                $bindings[] = $aksiFilter;
            }

            if ($tanggalMulai !== '') {
                $sql .= ' AND DATE(waktu_kejadian) >= ?';
                $bindings[] = $tanggalMulai;
            }

            if ($tanggalAkhir !== '') {
                $sql .= ' AND DATE(waktu_kejadian) <= ?';
                $bindings[] = $tanggalAkhir;
            }

            $sql .= ' ORDER BY waktu_kejadian DESC, id DESC LIMIT 150';

            $daftarLog = DB::connection('mysql')->select($sql, $bindings);
        } catch (QueryException $e) {
            $rdbmsError = RdbmsErrorHandler::extractCleanMessage($e);
        } catch (Throwable $e) {
            $rdbmsError = 'Gagal membaca tabel terpartisi log_audit_zis: ' . $e->getMessage();
        }

        return Inertia::render('Audit/Index', [
            'daftarLog' => $daftarLog,
            'filters' => [
                'tabel' => $tabelFilter,
                'aksi' => $aksiFilter,
                'dari' => $tanggalMulai,
                'sampai' => $tanggalAkhir,
            ],
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
