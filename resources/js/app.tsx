import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';

const appName = import.meta.env.VITE_APP_NAME || 'SI-LAZ Masjid';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/build/sw.js', { scope: '/' }).catch(() => {
            // Abaikan kegagalan registrasi SW di lingkungan non-HTTPS lokal
        });
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} | ${appName}` : appName),
    resolve: async (name) => {
        const pages = import.meta.glob('./pages/**/*.tsx');
        const loader = pages[`./pages/${name}.tsx`];
        if (!loader) {
            throw new Error(`Halaman Inertia ./pages/${name}.tsx tidak ditemukan.`);
        }
        return await loader();
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <App {...props} />
                <Toaster position="top-right" richColors closeButton />
            </>
        );
    },
    progress: {
        color: '#D4A574',
    },
});
