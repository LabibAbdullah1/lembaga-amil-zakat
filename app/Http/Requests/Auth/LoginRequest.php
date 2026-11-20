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
            'password' => ['required', 'string'],
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
        } catch (Throwable $e) {
            throw ValidationException::withMessages([
                'rdbms' => 'Gagal terhubung ke database MariaDB (db_laz_zis_masjid): ' . $e->getMessage(),
            ]);
        }

        if (! $user || ! Hash::check($password, $user->getAuthPassword())) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'identitas' => 'Kredensial username/email atau kata sandi tidak sesuai.',
            ]);
        }

        if (! $user->isAktif()) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'identitas' => 'Akun Anda berstatus nonaktif (status_aktif = 0). Silakan hubungi Admin DKM.',
            ]);
        }

        Auth::guard('web')->login($user, $remember);

        try {
            $actor = sprintf('%s (%s)', $user->username, $user->peran);
            DB::connection('mysql')->statement('SET @app_user = ?', [$actor]);
        } catch (Throwable) {
            // Abaikan bila sesi koneksi terpisah.
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'identitas' => sprintf(
                'Terlalu banyak percobaan login. Silakan coba lagi dalam %d detik.',
                $seconds
            ),
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower((string) $this->input('identitas')).'|'.$this->ip());
    }
}
