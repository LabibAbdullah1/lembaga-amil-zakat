<?php

namespace App\Http\Middleware;

use App\Models\PenggunaSistem;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class SetRdbmsAppUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof PenggunaSistem) {
            if (! $user->isAktif()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->withErrors([
                    'identitas' => 'Akun Anda telah dinonaktifkan oleh Administrator.',
                ]);
            }

            $actor = sprintf('%s (%s)', $user->username, $user->peran);

            try {
                DB::connection('mysql')->statement('SET @app_user = ?', [$actor]);
            } catch (Throwable) {
                // Jangan hentikan request jika koneksi DB sedang diuji secara luring.
            }
        }

        return $next($request);
    }
}
