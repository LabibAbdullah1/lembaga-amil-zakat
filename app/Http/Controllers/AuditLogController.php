<?php

namespace App\Http\Controllers;

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

        $allowedLimits = [10, 25, 50, 100];
        $requestedLimit = (int) $request->query('limit', 15);
        $perPage = in_array($requestedLimit, $allowedLimits, true) ? $requestedLimit : 10;
        $page = max(1, (int) $request->query('page', 1));
        $offset = ($page - 1) * $perPage;

        $daftarLog = [];
        $totalLog = 0;
        $rdbmsError = null;

        try {
            $whereClause = ' WHERE 1=1';
            $bindings = [];

            if ($tabelFilter !== '' && $tabelFilter !== 'SEMUA') {
                $whereClause .= ' AND nama_tabel = ?';
                $bindings[] = $tabelFilter;
            }

            if (in_array($aksiFilter, ['INSERT', 'UPDATE', 'DELETE'], true)) {
                $whereClause .= ' AND aksi = ?';
                $bindings[] = $aksiFilter;
            }

            if ($tanggalMulai !== '') {
                $whereClause .= ' AND DATE(waktu_kejadian) >= ?';
                $bindings[] = $tanggalMulai;
            }

            if ($tanggalAkhir !== '') {
                $whereClause .= ' AND DATE(waktu_kejadian) <= ?';
                $bindings[] = $tanggalAkhir;
            }

            $countRow = DB::connection('mysql')->selectOne(
                'SELECT COUNT(id) AS total FROM log_audit_zis' . $whereClause,
                $bindings
            );
            $totalLog = (int) ($countRow->total ?? 0);

            $daftarLog = DB::connection('mysql')->select(
                'SELECT id, nama_tabel, record_id, aksi, data_lama, data_baru, dilakukan_oleh, waktu_kejadian
                 FROM log_audit_zis'
                . $whereClause .
                ' ORDER BY waktu_kejadian DESC, id DESC
                  LIMIT ? OFFSET ?',
                [...$bindings, $perPage, $offset]
            );
        } catch (Throwable) {
            $daftarLog = [];
            $totalLog = 0;
        }

        return Inertia::render('Audit/Index', [
            'daftarLog' => $daftarLog,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalLog,
                'last_page' => max(1, (int) ceil($totalLog / $perPage)),
            ],
            'filters' => [
                'tabel' => $tabelFilter,
                'aksi' => $aksiFilter,
                'dari' => $tanggalMulai,
                'sampai' => $tanggalAkhir,
                'limit' => $perPage,
            ],
            'rdbmsError' => $rdbmsError,
        ]);
    }
}
