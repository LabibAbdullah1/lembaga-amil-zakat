import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Plus Jakarta Sans', {
                    weights: [400, 500, 600, 700],
                    optimizedFallbacks: false,
                }),
            ],
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            outDir: 'public/build',
            buildBase: '/build/',
            scope: '/',
            includeAssets: [
                'favicon.ico',
                'icons/icon-192x192.png',
                'icons/icon-512x512.png',
                'icons/icon.svg',
            ],
            manifest: {
                name: 'SI-LAZ Masjid: Zakat & Infak',
                short_name: 'LAZ Masjid',
                description: 'Sistem Informasi Lembaga Amil Zakat, Infak, Sedekah & Zakat Fitrah Masjid',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                orientation: 'portrait',
                theme_color: '#059669',
                background_color: '#ffffff',
                icons: [
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icons/icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                navigateFallback: null,
                runtimeCaching: [
                    {
                        urlPattern: ({ request, url }) =>
                            request.destination === 'style' ||
                            request.destination === 'script' ||
                            request.destination === 'font' ||
                            request.destination === 'image' ||
                            url.pathname.startsWith('/build/') ||
                            url.pathname.startsWith('/icons/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'laz-static-assets-v1',
                            expiration: {
                                maxEntries: 120,
                                maxAgeSeconds: 60 * 60 * 24 * 30,
                            },
                        },
                    },
                    {
                        urlPattern: ({ request, url }) =>
                            request.method !== 'GET' ||
                            url.pathname.startsWith('/loket') ||
                            url.pathname.startsWith('/penyaluran') ||
                            url.pathname.startsWith('/dashboard') ||
                            url.pathname.startsWith('/mustahik') ||
                            url.pathname.startsWith('/muzaki') ||
                            url.pathname.startsWith('/master') ||
                            url.pathname.startsWith('/laporan') ||
                            url.pathname.startsWith('/audit'),
                        handler: 'NetworkOnly',
                    },
                    {
                        urlPattern: ({ request }) =>
                            request.method === 'GET' &&
                            (request.mode === 'navigate' || request.headers.get('X-Inertia') === 'true'),
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'laz-pages-network-first',
                            networkTimeoutSeconds: 3,
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 60 * 5,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './resources/js'),
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
