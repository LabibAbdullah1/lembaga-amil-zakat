<?php

namespace App\Support;

use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;

class RdbmsErrorHandler
{
    public static function extractCleanMessage(QueryException $e): string
    {
        $sqlState = (string) $e->getCode();
        $driverCode = (int) ($e->errorInfo[1] ?? 0);
        $rawDriverMessage = (string) ($e->errorInfo[2] ?? $e->getMessage());

        // Tangkap SIGNAL SQLSTATE '45000' (MariaDB/MySQL error 1644) dari Trigger / Stored Procedure.
        if ($sqlState === '45000' || $driverCode === 1644) {
            if ($rawDriverMessage !== '' && $rawDriverMessage !== $e->getMessage()) {
                return trim($rawDriverMessage);
            }

            if (preg_match('/1644\s+(.+?)(?:\s+\(Connection:|$)/s', $e->getMessage(), $matches)) {
                return trim($matches[1]);
            }

            return trim($rawDriverMessage);
        }

        // Tangkap pelanggaran UNIQUE constraint (SQLSTATE 23000 / error 1062).
        if ($sqlState === '23000' && $driverCode === 1062) {
            if (preg_match("/Duplicate entry '([^']+)'/i", $rawDriverMessage, $matches)) {
                return sprintf(
                    'Data "%s" sudah terdaftar di dalam sistem. Gunakan nilai yang berbeda.',
                    $matches[1]
                );
            }

            return 'Data dengan identitas unik (NIK, Kode, atau Nomor Dokumen) tersebut sudah terdaftar.';
        }

        // Tangkap pelanggaran CHECK constraint di MariaDB (error 4025 / SQLSTATE 23000).
        if ($driverCode === 4025) {
            return 'Nilai yang dimasukkan tidak memenuhi ketentuan (saldo atau nominal tidak boleh bernilai negatif).';
        }

        // Tangkap pelanggaran FOREIGN KEY constraint (error 1451 / 1452).
        if ($driverCode === 1451 || $driverCode === 1452) {
            return 'Data ini tidak dapat diubah atau dihapus karena masih terhubung dengan transaksi aktif.';
        }

        // Tangkap penolakan hak akses akun database (error 1142).
        if ($driverCode === 1142) {
            return 'Akses ditolak: Akun layanan laporan hanya diizinkan membaca data ringkasan publik.';
        }

        return 'Permintaan tidak dapat diproses saat ini. Silakan periksa kembali data yang Anda masukkan.';
    }

    public static function redirectWithError(QueryException $e, string $errorKey = 'rdbms'): RedirectResponse
    {
        $cleanMessage = self::extractCleanMessage($e);

        return back()
            ->withInput()
            ->withErrors([$errorKey => $cleanMessage])
            ->with('error', $cleanMessage);
    }

    public static function run(Closure $callback, string $errorKey = 'rdbms'): mixed
    {
        try {
            return $callback();
        } catch (QueryException $e) {
            return self::redirectWithError($e, $errorKey);
        }
    }
}
