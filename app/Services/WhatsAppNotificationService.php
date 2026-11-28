<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class WhatsAppNotificationService
{
    /**
     * Memformat nomor HP Indonesia menjadi standar internasional E.164 tanpa tanda plus (e.g., 628123456789).
     */
    public static function formatPhoneNumber(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        // Hapus karakter non-digit
        $cleaned = preg_replace('/[^0-9]/', '', trim($phone));

        if (! $cleaned || strlen($cleaned) < 9) {
            return null;
        }

        // Jika diawali '08', ganti '0' dengan '62'
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '62' . substr($cleaned, 1);
        } elseif (str_starts_with($cleaned, '8')) {
            $cleaned = '62' . $cleaned;
        }

        // Validasi panjang nomor Indonesia (biasanya 10-15 digit)
        if (strlen($cleaned) < 10 || strlen($cleaned) > 16) {
            return null;
        }

        return $cleaned;
    }

    /**
     * Membuat naskah pesan tanda terima zakat yang syar'i, rapi, dan informatif.
     */
    public static function buildReceiptMessage(object|array $transaksi, ?string $downloadPdfUrl = null): string
    {
        $data = (object) $transaksi;

        $namaMuzaki = trim((string) ($data->nama_muzaki ?? $data->nama_lengkap ?? 'Bapak/Ibu'));
        $noKwitansi = (string) ($data->no_kwitansi ?? '-');
        $namaDana = (string) ($data->nama_dana ?? 'Zakat Fitrah');
        $metodeBayar = (string) ($data->metode_bayar ?? 'Tunai');
        $namaAmil = (string) ($data->nama_amil ?? 'Petugas Amil');
        $jumlahJiwa = (int) ($data->jumlah_jiwa ?? 1);
        $totalNominal = (float) ($data->total_nominal ?? 0);
        $totalBerasKg = (float) ($data->total_beras_kg ?? 0);

        $tanggal = isset($data->tanggal_transaksi)
            ? date('d/m/Y', strtotime((string) $data->tanggal_transaksi))
            : date('d/m/Y');

        $tahunHijriah = (string) ($data->tahun_hijriah ?? '1447');

        // Format rincian uang / beras
        $rincianBarang = [];
        if ($totalNominal > 0) {
            $rincianBarang[] = 'Rp ' . number_format($totalNominal, 0, ',', '.');
        }
        if ($totalBerasKg > 0) {
            $rincianBarang[] = number_format($totalBerasKg, 2, ',', '.') . ' Kg Beras';
        }
        $nilaiSetoran = count($rincianBarang) > 0 ? implode(' + ', $rincianBarang) : 'Rp 0';

        $urlTautan = $downloadPdfUrl ?: url('/kwitansi/unduh/' . rawurlencode($noKwitansi));

        $lines = [
            "Assalamu'alaikum Warahmatullahi Wabarakatuh,",
            "Yth. Bapak/Ibu *{$namaMuzaki}*,",
            "",
            "Alhamdulillah, setoran zakat/infak Anda telah kami terima dan tercatat resmi di Loket LAZ Masjid Istiqamah, Rumbai:",
            "",
            "📋 *BUKTI PENERIMAAN ZIS*",
            "• No. Kwitansi: *{$noKwitansi}*",
            "• Tanggal: {$tanggal} ({$tahunHijriah} H)",
            "• Jenis Zakat: *{$namaDana}*",
            "• Jumlah Jiwa: {$jumlahJiwa} Jiwa",
            "• Total Nilai: *{$nilaiSetoran}*",
            "• Metode Bayar: {$metodeBayar}",
            "• Amil Penerima: {$namaAmil}",
            "",
            "🤲 *Doa Amil untuk Anda & Keluarga:*",
            "\"Ajarakallahu fiima a'thaita, wa baaraka fiima abqaita, wa ja'alahu laka thahuuraa.\"",
            "_(Semoga Allah SWT melimpahkan pahala atas apa yang Anda tunaikan, memberkahi harta yang Anda sisakan, dan menjadikannya pembersih lahir batin bagi Anda sekeluarga)._",
            "",
            "📄 *Unduh Kwitansi Digital Resmi (PDF):*",
            $urlTautan,
            "",
            "_Jazakumullahu Khairan Katsiran._",
            "*Panitia ZIS LAZ Masjid Istiqamah, Rumbai*",
        ];

        return implode("\n", $lines);
    }

    /**
     * Menghasilkan URL satu-klik WhatsApp (wa.me) untuk langsung membuka aplikasi / WhatsApp Web di komputer amil.
     */
    public static function buildWhatsAppUrl(string $rawPhone, string $message): ?string
    {
        $phone = self::formatPhoneNumber($rawPhone);
        if (! $phone) {
            return null;
        }

        return 'https://wa.me/' . $phone . '?text=' . rawurlencode($message);
    }

    /**
     * Mengirim notifikasi otomatis melalui WhatsApp Gateway API jika dikonfigurasi di file .env.
     *
     * @return array{success: bool, mode: string, message: string, error?: string}
     */
    public static function sendViaGateway(string $rawPhone, string $message): array
    {
        $phone = self::formatPhoneNumber($rawPhone);
        if (! $phone) {
            return [
                'success' => false,
                'mode' => 'invalid_phone',
                'message' => 'Nomor HP tidak valid untuk WhatsApp.',
            ];
        }

        $provider = strtolower((string) config('services.whatsapp.provider', 'log'));
        $apiKey = (string) config('services.whatsapp.api_key', '');
        $apiUrl = (string) config('services.whatsapp.api_url', 'https://api.fonnte.com/send');
        $isEnabled = (bool) config('services.whatsapp.enabled', true);

        if (! $isEnabled || $provider === 'log' || empty($apiKey)) {
            Log::info(sprintf('[WhatsApp Service - Mode Log] Dikirim ke: %s | Pesan: %s', $phone, $message));

            return [
                'success' => true,
                'mode' => 'log',
                'message' => 'Pesan tercatat di log (Gateway API belum dikonfigurasi).',
            ];
        }

        try {
            if ($provider === 'fonnte') {
                $response = Http::timeout(8)
                    ->withHeaders(['Authorization' => $apiKey])
                    ->post($apiUrl, [
                        'target' => $phone,
                        'message' => $message,
                        'countryCode' => '62',
                    ]);

                $isSuccess = $response->successful();

                return [
                    'success' => $isSuccess,
                    'mode' => 'fonnte',
                    'message' => $isSuccess ? 'Pesan WhatsApp berhasil dikirim via Fonnte.' : 'Gagal mengirim via Fonnte.',
                    'response' => $response->json(),
                ];
            }

            if ($provider === 'wablas') {
                $response = Http::timeout(8)
                    ->withHeaders(['Authorization' => $apiKey])
                    ->post($apiUrl, [
                        'phone' => $phone,
                        'message' => $message,
                    ]);

                $isSuccess = $response->successful();

                return [
                    'success' => $isSuccess,
                    'mode' => 'wablas',
                    'message' => $isSuccess ? 'Pesan WhatsApp berhasil dikirim via Wablas.' : 'Gagal mengirim via Wablas.',
                    'response' => $response->json(),
                ];
            }

            // Provider Generik (Webhook HTTP POST)
            $response = Http::timeout(8)
                ->withHeaders(['Authorization' => 'Bearer ' . $apiKey])
                ->post($apiUrl, [
                    'phone' => $phone,
                    'message' => $message,
                ]);

            return [
                'success' => $response->successful(),
                'mode' => 'generic',
                'message' => $response->successful() ? 'Pesan berhasil diteruskan ke Gateway.' : 'Gateway merespons galat.',
            ];
        } catch (Throwable $e) {
            Log::warning(sprintf('[WhatsApp Gateway Error] Ke: %s | Error: %s', $phone, $e->getMessage()));

            return [
                'success' => false,
                'mode' => 'error',
                'message' => 'Terjadi kendala jaringan saat menghubungi gateway WhatsApp.',
                'error' => $e->getMessage(),
            ];
        }
    }
}
