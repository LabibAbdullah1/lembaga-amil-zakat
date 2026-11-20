<?php

namespace App\Http\Middleware;

use App\Models\PenggunaSistem;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user instanceof PenggunaSistem || ! $user->isAktif()) {
            return redirect()->route('login');
        }

        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            foreach (explode(',', $roleGroup) as $role) {
                $trimmed = trim($role);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        if ($allowedRoles !== [] && ! in_array($user->peran, $allowedRoles, true)) {
            abort(403, sprintf(
                'Akses Ditolak: Peran Anda (%s) tidak memiliki otorisasi untuk halaman ini.',
                $user->peran
            ));
        }

        return $next($request);
    }
}
