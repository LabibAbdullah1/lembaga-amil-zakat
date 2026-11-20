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
    }
}
