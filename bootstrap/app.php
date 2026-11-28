<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetRdbmsAppUser;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SecurityHeaders::class,
            SetRdbmsAppUser::class,
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role' => EnsureRole::class,
            'rdbms.user' => SetRdbmsAppUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            // Biarkan response JSON / API menggunakan format standar JSON
            if ($request->is('api/*') || $request->expectsJson()) {
                return $response;
            }

            $statusCode = $response->getStatusCode();

            // Tangani error sesi kedaluwarsa (CSRF token mismatch)
            if ($statusCode === 419) {
                if ($request->header('X-Inertia')) {
                    return back()->with([
                        'error' => 'Sesi formulir Anda telah kedaluwarsa. Silakan muat ulang dan kirim kembali.',
                    ]);
                }

                return Inertia::render('Error', [
                    'status' => 419,
                    'pesan' => 'Sesi keamanan Anda telah berakhir. Silakan muat ulang halaman.',
                ])->toResponse($request)->setStatusCode(419);
            }

            // Tangani 404 & 403 & 401 selalu
            // Dan tangani 500, 502, 503 saat di production atau ketika APP_DEBUG=false
            $handledStatuses = [401, 403, 404];
            if (! config('app.debug')) {
                $handledStatuses = array_merge($handledStatuses, [500, 502, 503]);
            }

            if (in_array($statusCode, $handledStatuses, true)) {
                return Inertia::render('Error', [
                    'status' => $statusCode,
                    'pesan' => $exception->getMessage() ?: null,
                ])->toResponse($request)->setStatusCode($statusCode);
            }

            return $response;
        });
    })->create();
