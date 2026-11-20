<?php

namespace App\Http\Requests\Auth;

use App\Models\PenggunaSistem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class LoginRequest extends FormRequest
{
    private const MAX_ATTEMPTS_PER_ACCOUNT = 5;

    private const MAX_ATTEMPTS_PER_IP = 15;

    private const DECAY_SECONDS = 900;

    private const DUMMY_BCRYPT_HASH = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identitas' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'identitas.required' => 'Username atau alamat email wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $identitas = trim((string) $this->input('identitas'));
        $password = (string) $this->input('password');
        $remember = $this->boolean('remember');

        try {
            $user = PenggunaSistem::query()
                ->where('username', $identitas)
                ->orWhere('email', $identitas)
                ->first();
        } catch (Throwable) {
            throw ValidationException::withMessages([
                'identitas' => 'Layanan autentikasi sedang tidak dapat dijangkau. Silakan coba beberapa saat lagi.',
            ]);
        }

        // Cegah timing attack enumerasi akun dengan selalu memanggil Hash::check
        $targetHash = $user ? $user->getAuthPassword() : self::DUMMY_BCRYPT_HASH;
        $passwordValid = Hash::check($password, $targetHash);

        if (! $user || ! $passwordValid) {
            RateLimiter::hit($this->throttleKey(), self::DECAY_SECONDS);
            RateLimiter::hit($this->ipThrottleKey(), self::DECAY_SECONDS);

            $remaining = max(0, self::MAX_ATTEMPTS_PER_ACCOUNT - RateLimiter::attempts($this->throttleKey()));

            throw ValidationException::withMessages([
                'identitas' => $remaining > 0
                    ? sprintf('Username/email atau kata sandi tidak sesuai. Sisa kesempatan percobaan: %d kali.', $remaining)
                    : 'Akses masuk dikunci sementara karena terlalu banyak percobaan gagal.',
            ]);
        }

        if (! $user->isAktif()) {
            RateLimiter::hit($this->throttleKey(), self::DECAY_SECONDS);
            RateLimiter::hit($this->ipThrottleKey(), self::DECAY_SECONDS);

            throw ValidationException::withMessages([
                'identitas' => 'Akun Anda berstatus nonaktif. Silakan hubungi pengurus DKM.',
            ]);
        }

        Auth::guard('web')->login($user, $remember);

        try {
            $actor = sprintf('%s (%s)', $user->username, $user->peran);
            DB::connection('mysql')->statement('SET @app_user = ?', [$actor]);
        } catch (Throwable) {
            // Abaikan bila koneksi belum aktif.
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        $accountLocked = RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS_PER_ACCOUNT);
        $ipLocked = RateLimiter::tooManyAttempts($this->ipThrottleKey(), self::MAX_ATTEMPTS_PER_IP);

        if (! $accountLocked && ! $ipLocked) {
            return;
        }

        $seconds = max(
            RateLimiter::availableIn($this->throttleKey()),
            RateLimiter::availableIn($this->ipThrottleKey())
        );
        $minutes = (int) ceil($seconds / 60);

        throw ValidationException::withMessages([
            'identitas' => sprintf(
                'Terlalu banyak percobaan gagal. Demi keamanan, akses masuk dikunci selama %d menit (%d detik).',
                $minutes,
                $seconds
            ),
            'lockout_seconds' => (string) $seconds,
        ]);
    }

    public function throttleKey(): string
    {
        return 'login:acct:' . Str::transliterate(Str::lower(trim((string) $this->input('identitas'))) . '|' . $this->ip());
    }

    public function ipThrottleKey(): string
    {
        return 'login:ip:' . $this->ip();
    }
}
