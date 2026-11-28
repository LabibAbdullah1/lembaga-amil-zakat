<?php

namespace Tests\Feature;

use App\Models\PenggunaSistem;
use App\Support\RdbmsErrorHandler;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\RateLimiter;
use PDOException;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_portal_transparansi_publik_renders_successfully(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_login_page_renders_successfully(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_access_protected_routes(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/loket')->assertRedirect('/login');
        $this->get('/penyaluran')->assertRedirect('/login');
        $this->get('/laporan')->assertRedirect('/login');
        $this->get('/audit')->assertRedirect('/login');
    }

    public function test_rbac_middleware_blocks_unauthorized_role(): void
    {
        $amil = new PenggunaSistem([
            'nama_lengkap' => 'Amil Loket 1',
            'username' => 'amil1',
            'email' => 'amil1@masjid.local',
            'peran' => PenggunaSistem::PERAN_AMIL_PENERIMA,
            'status_aktif' => 1,
        ]);
        $amil->id = 10;

        // Amil_Penerima tidak boleh mengakses halaman Master Data (khusus Admin) atau Laporan Analitik (Admin/Ketua_DKM)
        $this->actingAs($amil)
            ->get('/master/periode')
            ->assertStatus(403);

        $this->actingAs($amil)
            ->get('/laporan')
            ->assertStatus(403);

        // Amil_Penerima diizinkan mengakses Loket Penghimpunan
        $this->actingAs($amil)
            ->get('/loket')
            ->assertStatus(200);
    }

    public function test_rdbms_error_handler_extracts_sqlstate_45000_clean_message(): void
    {
        $pdoException = new PDOException(
            "SQLSTATE[45000]: <<Unknown error>>: 1644 PENOLAKAN SISTEM: Akumulasi hak amil melebihi batas maksimal syariat 12,5%",
            45000
        );
        $pdoException->errorInfo = [
            '45000',
            1644,
            'PENOLAKAN SISTEM: Akumulasi hak amil melebihi batas maksimal syariat 12,5%',
        ];

        $queryException = new QueryException(
            'mysql',
            'CALL sp_buat_pengajuan_penyaluran(?, ?, ?, ?, ?, ?, ?)',
            [],
            $pdoException
        );

        $clean = RdbmsErrorHandler::extractCleanMessage($queryException);

        $this->assertSame(
            'PENOLAKAN SISTEM: Akumulasi hak amil melebihi batas maksimal syariat 12,5%',
            $clean
        );
    }

    public function test_login_rate_limiter_blocks_brute_force_after_five_attempts(): void
    {
        RateLimiter::clear('login:acct:admin_test|127.0.0.1');
        RateLimiter::clear('login:ip:127.0.0.1');

        for ($i = 0; $i < 5; $i++) {
            RateLimiter::hit('login:acct:admin_test|127.0.0.1', 900);
        }

        $response = $this->from('/login')->post('/login', [
            'identitas' => 'admin_test',
            'password' => 'wrong_password',
        ]);

        $response->assertRedirect('/login');
        $response->assertSessionHasErrors(['identitas', 'lockout_seconds']);
    }

    public function test_security_headers_are_attached_to_responses(): void
    {
        $response = $this->get('/login');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('X-Permitted-Cross-Domain-Policies', 'none');
        $response->assertHeader('X-XSS-Protection', '0');
        $response->assertHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }

    public function test_galeri_upload_rejects_svg_format(): void
    {
        $admin = new PenggunaSistem([
            'nama_lengkap' => 'Admin Sistem',
            'username' => 'admin_test',
            'email' => 'admin@masjid.local',
            'peran' => PenggunaSistem::PERAN_ADMIN,
            'status_aktif' => 1,
        ]);
        $admin->id = 1;

        $file = \Illuminate\Http\UploadedFile::fake()->create('malicious.svg', 100, 'image/svg+xml');

        $response = $this->actingAs($admin)
            ->post('/master/galeri', [
                'judul' => 'Kegiatan Uji Coba',
                'kategori' => 'Zakat_Fitrah',
                'tanggal_kegiatan' => '2026-03-20',
                'gambar' => $file,
            ]);

        $response->assertSessionHasErrors('gambar');
    }

    public function test_whatsapp_notification_service_formats_phone_and_message(): void
    {
        $formatted = \App\Services\WhatsAppNotificationService::formatPhoneNumber('0812-3456-7890');
        $this->assertSame('6281234567890', $formatted);

        $msg = \App\Services\WhatsAppNotificationService::buildReceiptMessage((object) [
            'nama_muzaki' => 'Ahmad Dahlan',
            'no_kwitansi' => 'KWZ-202603-TEST01',
            'nama_dana' => 'Zakat Fitrah Beras',
            'metode_bayar' => 'Beras',
            'nama_amil' => 'Salman Al-Farisi',
            'jumlah_jiwa' => 4,
            'total_nominal' => 0,
            'total_beras_kg' => 10.0,
            'tahun_hijriah' => '1447',
        ]);

        $this->assertStringContainsString('KWZ-202603-TEST01', $msg);
        $this->assertStringContainsString('Ahmad Dahlan', $msg);
        $this->assertStringContainsString('Ajarakallahu fiima a\'thaita', $msg);

        $waUrl = \App\Services\WhatsAppNotificationService::buildWhatsAppUrl('081234567890', $msg);
        $this->assertNotNull($waUrl);
        $this->assertStringStartsWith('https://wa.me/6281234567890?text=', $waUrl);
    }

    public function test_non_existent_url_returns_custom_404_error_page(): void
    {
        $response = $this->get('/halaman-yang-pasti-tidak-ada-999');

        $response->assertStatus(404);
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Error')
            ->where('status', 404)
        );
    }
}
