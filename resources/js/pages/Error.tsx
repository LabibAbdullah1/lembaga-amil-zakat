import * as React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    Calculator,
    Compass,
    Database,
    HandCoins,
    Home,
    KeyRound,
    Lock,
    Phone,
    RefreshCw,
    RotateCcw,
    ServerCrash,
    ShieldAlert,
    Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface ErrorProps {
    status?: number;
    pesan?: string | null;
}

interface ErrorDetail {
    kode: string;
    labelBadge: string;
    judul: string;
    deskripsi: string;
    ikon: React.ReactNode;
}

export default function ErrorPage({ status = 404, pesan }: ErrorProps) {
    const errorDetails: Record<number, ErrorDetail> = {
        404: {
            kode: '404',
            labelBadge: 'Halaman Tidak Ditemukan',
            judul: 'Tautan yang Anda Tuju Tidak Tersedia',
            deskripsi:
                pesan ||
                'Halaman yang Anda cari mungkin telah dipindahkan, tautan yang diketik keliru, atau alamat web tersebut belum pernah didaftarkan pada portal SI-LAZ Masjid Istiqamah.',
            ikon: <Compass className="h-10 w-10 text-primary" aria-hidden="true" />,
        },
        403: {
            kode: '403',
            labelBadge: 'Akses Ditolak',
            judul: 'Hak Akses Anda Dibatasi',
            deskripsi:
                pesan ||
                'Akun Anda saat ini tidak memiliki izin otorisasi untuk membuka halaman operasional atau modul data ini. Silakan hubungi Administrator DKM bila Anda memerlukan akses.',
            ikon: <Lock className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden="true" />,
        },
        401: {
            kode: '401',
            labelBadge: 'Perlu Otentikasi',
            judul: 'Silakan Masuk Terlebih Dahulu',
            deskripsi:
                pesan ||
                'Halaman ini dikhususkan bagi panitia dan pengurus amil zakat terdaftar. Silakan masuk menggunakan akun resmi Anda.',
            ikon: <KeyRound className="h-10 w-10 text-primary" aria-hidden="true" />,
        },
        419: {
            kode: '419',
            labelBadge: 'Sesi Kedaluwarsa',
            judul: 'Sesi Keamanan Formulir Berakhir',
            deskripsi:
                pesan ||
                'Demi melindungi transaksi dan integritas kas dari penyalahgunaan, sesi formulir otomatis ditutup karena tidak ada aktivitas dalam waktu tertentu. Muat ulang halaman untuk melanjutkan.',
            ikon: <RotateCcw className="h-10 w-10 text-primary" aria-hidden="true" />,
        },
        500: {
            kode: '500',
            labelBadge: 'Kendala Server',
            judul: 'Terjadi Kendala Teknis Sementara',
            deskripsi:
                pesan ||
                'Sistem sedang mengalami kendala internal saat memproses permintaan Anda. Seluruh saldo kas dan transaksi tetap aman di tingkat basis data. Tim teknis telah mencatat kejadian ini.',
            ikon: <ServerCrash className="h-10 w-10 text-destructive" aria-hidden="true" />,
        },
        503: {
            kode: '503',
            labelBadge: 'Pemeliharaan Sistem',
            judul: 'Layanan Sedang Dalam Pemeliharaan',
            deskripsi:
                pesan ||
                'Sistem Informasi LAZ sedang menjalani proses sinkronisasi dan peningkatan keandalan rutin. Mohon tunggu sejenak dan coba akses kembali.',
            ikon: <Wrench className="h-10 w-10 text-primary" aria-hidden="true" />,
        },
    };

    const currentError = errorDetails[status] || {
        kode: String(status),
        labelBadge: 'Terjadi Kesalahan',
        judul: 'Permintaan Tidak Dapat Diproses',
        deskripsi:
            pesan ||
            'Terjadi kendala saat membuka halaman yang Anda tuju. Silakan kembali ke beranda transparansi.',
        ikon: <ShieldAlert className="h-10 w-10 text-destructive" aria-hidden="true" />,
    };

    const handleGoBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    const handleReload = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/25 selection:text-foreground">
            <Head title={`${currentError.kode} - ${currentError.labelBadge} | LAZ Masjid Istiqamah`} />

            {/* Header Ringkas Bertema Editorial */}
            <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xs">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-card shadow-2xs">
                            <img
                                src="/icons/icon-192x192.png"
                                alt="Logo Yayasan Istiqamah Rumbai Pesisir"
                                width={28}
                                height={28}
                                className="h-7 w-7 object-contain"
                            />
                        </div>
                        <div className="leading-tight min-w-0">
                            <p className="font-serif text-base font-medium tracking-tight text-foreground truncate">
                                LAZ Masjid Istiqamah
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                                Rumbai • Portal Transparansi ZIS
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle className="h-9 w-9" />
                        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex h-9">
                            <Link href="/">
                                <Home className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                <span>Beranda Publik</span>
                            </Link>
                        </Button>
                        <Button asChild size="sm" className="h-9">
                            <Link href="/login">
                                <KeyRound className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                <span>Masuk Panitia</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Konten Utama Pesan Error User-Friendly */}
            <main className="mx-auto flex-1 w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 flex flex-col justify-center laz-page-enter space-y-12">
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xs space-y-8">
                    {/* Badge Kode Status & Ikon */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-background shadow-2xs shrink-0">
                                {currentError.ikon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-primary tracking-wider">
                                        KODE HTTP {currentError.kode}
                                    </span>
                                    <Badge
                                        variant={
                                            status === 404
                                                ? 'outline'
                                                : status === 403 || status === 401
                                                  ? 'warning'
                                                  : 'destructive'
                                        }
                                    >
                                        {currentError.labelBadge}
                                    </Badge>
                                </div>
                                <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground mt-1">
                                    {currentError.judul}
                                </h1>
                            </div>
                        </div>

                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground font-mono">
                                Sistem Informasi ZIS
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Masjid Istiqamah Rumbai
                            </p>
                        </div>
                    </div>

                    {/* Penjelasan User-Friendly */}
                    <div className="space-y-4 max-w-3xl">
                        <p className="text-base sm:text-[17px] leading-relaxed text-muted-foreground">
                            {currentError.deskripsi}
                        </p>

                        <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
                            <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                            <span>
                                <strong>Panduan Akses:</strong> Jika Anda adalah muzaki atau masyarakat umum yang ingin melihat laporan kas atau menghitung zakat, silakan pilih menu di bawah. Jika Anda adalah panitia amil zakat, pastikan Anda telah masuk dengan peran yang sesuai.
                            </span>
                        </div>
                    </div>

                    {/* Tombol Aksi Utama */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button asChild size="lg" className="h-11 px-5 gap-2">
                            <Link href="/">
                                <Home className="h-4 w-4" aria-hidden="true" />
                                <span>Kembali ke Beranda Transparansi</span>
                            </Link>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={handleGoBack}
                            className="h-11 px-5 gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span>Halaman Sebelumnya</span>
                        </Button>

                        {(status === 419 || status === 500 || status === 503) && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="lg"
                                onClick={handleReload}
                                className="h-11 px-5 gap-2"
                            >
                                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                <span>Muat Ulang Halaman</span>
                            </Button>
                        )}

                        {(status === 403 || status === 401) && (
                            <Button asChild variant="secondary" size="lg" className="h-11 px-5 gap-2">
                                <Link href="/login">
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                    <span>Ganti Akun Masuk</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Alternatif Jalur Navigasi Bantuan (Pintu Masuk Terpopuler) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
                        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider font-mono">
                            Jelajahi Menu Utama yang Tersedia
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href="/#transparansi"
                            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80 shadow-2xs space-y-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
                                    04 · Terbuka
                                </span>
                            </div>
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                Transparansi Dana
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                                Laporan saldo kas 3 level, 8 asnaf, dan rekapitulasi penyaluran.
                            </p>
                        </Link>

                        <Link
                            href="/#kalkulator"
                            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80 shadow-2xs space-y-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
                                    03 · Mandiri
                                </span>
                            </div>
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                Kalkulator Zakat
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                                Simulasi zakat fitrah & mal nisab BAZNAS 2026.
                            </p>
                        </Link>

                        <Link
                            href="/dasar-hukum"
                            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80 shadow-2xs space-y-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
                                    Fiqih & UU
                                </span>
                            </div>
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                Dasar Hukum Syariat
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                                Landasan QS. At-Taubah, Fatwa MUI, & UU No. 23/2011.
                            </p>
                        </Link>

                        <Link
                            href="/#layanan"
                            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:bg-card/80 shadow-2xs space-y-1.5"
                        >
                            <div className="flex items-center justify-between">
                                <HandCoins className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
                                    05 · Loket
                                </span>
                            </div>
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                Cara Tunaikan ZIS
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                                Rekening resmi BSI, loket sekretariat, & kontak panitia.
                            </p>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer Minimalis */}
            <footer className="border-t border-border bg-card/60 py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <p>
                        &copy; {new Date().getFullYear()} LAZ Masjid Istiqamah, Rumbai. Sistem Informasi ZIS & Zakat Fitrah Terpadu.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/#kontak" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                            <span>Kontak Sekretariat</span>
                        </Link>
                        <span>•</span>
                        <Link href="/dasar-hukum" className="hover:text-foreground transition-colors">
                            Pedoman Fiqih
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
