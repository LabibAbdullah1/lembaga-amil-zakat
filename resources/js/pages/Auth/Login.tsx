import * as React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { UserGuideDialog } from '@/components/zis/UserGuideDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ROLE_LABELS: Record<string, string> = {
    Admin: 'Administrator DKM',
    Amil_Penerima: 'Kasir Loket ZIS',
    Verifikator: 'Tim Survei Mustahik',
    Staf_Penyaluran: 'Staf Program & BKK',
    Ketua_DKM: 'Ketua DKM / Penyetuju',
};

export default function Login() {
    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [showPassword, setShowPassword] = React.useState<boolean>(false);
    const [lockoutRemaining, setLockoutRemaining] = React.useState<number>(0);

    const { data, setData, post, processing, errors, reset } = useForm<{
        identitas: string;
        password: string;
        remember: boolean;
        rdbms?: string;
        lockout_seconds?: string;
    }>({
        identitas: '',
        password: '',
        remember: false,
    });

    React.useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            reset('password');
        };
    }, []);

    React.useEffect(() => {
        const rawSec = Number.parseInt(String(errors.lockout_seconds ?? '0'), 10);
        if (!Number.isNaN(rawSec) && rawSec > 0) {
            setLockoutRemaining(rawSec);
        }
    }, [errors.lockout_seconds]);

    React.useEffect(() => {
        if (lockoutRemaining <= 0) return;
        const timer = window.setInterval(() => {
            setLockoutRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [lockoutRemaining]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (lockoutRemaining > 0) return;
        post('/login');
    };

    const handleInstallPwa = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    const formatLockoutTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="Masuk Portal Panitia ZIS & Zakat Fitrah" />
            <OfflineBanner />

            <header className="border-b border-border bg-card/95 backdrop-blur-xs">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link
                        href="/transparansi"
                        className="flex items-center gap-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-w-0"
                    >
                        <img
                            src="/icons/icon-192x192.png"
                            alt="Logo Yayasan Istiqamah Rumbai Pesisir"
                            width={32}
                            height={32}
                            fetchPriority="high"
                            className="h-8 w-8 object-contain shrink-0"
                        />
                        <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight text-foreground truncate">
                                LAZ Masjid Istiqamah
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                                Rumbai • Portal Panitia
                            </p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ThemeToggle className="h-9 w-9" />
                        <div className="hidden sm:block">
                            <UserGuideDialog
                                currentRole="Amil_Penerima"
                                triggerVariant="outline"
                                triggerLabel="Panduan Panitia"
                            />
                        </div>
                        {installPrompt && (
                            <Button type="button" variant="outline" size="sm" onClick={handleInstallPwa} className="hidden md:inline-flex h-9">
                                <Smartphone className="h-4 w-4 sm:mr-1" aria-hidden="true" />
                                <span className="hidden sm:inline">Pasang di HP</span>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm" className="h-9 px-2.5 sm:px-3">
                            <Link href="/transparansi">
                                <ArrowLeft className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="hidden sm:inline">Transparansi Publik</span>
                                <span className="sm:hidden text-xs">Beranda</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex flex-1 w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 laz-page-enter">
                <div className="grid w-full gap-10 lg:grid-cols-12 lg:items-center">
                    <section className="lg:col-span-6 space-y-6">
                        <div className="space-y-3">
                            <Badge variant="success">Portal Operasional Resmi</Badge>
                            <h1 className="font-serif text-3xl font-medium leading-[1.15] tracking-[-0.015em] sm:text-4xl">
                                Pengelolaan Zakat Fitrah, Zakat Mal, Infak, dan Wakaf Masjid
                            </h1>
                            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
                                Sistem pelayanan terpadu untuk pencatatan penerimaan loket zakat, verifikasi kelayakan mustahik 8 asnaf, serta persetujuan penyaluran dana secara amanah dan akuntabel.
                            </p>
                        </div>

                        <div className="rounded-xl border bg-card p-5 shadow-2xs space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span>Akses Terotorisasi Pengurus & Panitia</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(ROLE_LABELS).map((label) => (
                                    <Badge key={label} variant="secondary">
                                        {label}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Dilengkapi perlindungan anti-brute-force otomatis. Akun akan dikunci sementara selama 15 menit setelah 5 kali percobaan kata sandi gagal berturut-turut.
                            </p>
                        </div>
                    </section>

                    <section className="lg:col-span-6">
                        <Card className="mx-auto w-full max-w-lg shadow-sm">
                            <CardHeader className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">Masuk Akun Panitia</CardTitle>
                                    <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                                </div>
                                <CardDescription>
                                    Gunakan username atau email resmi yang terdaftar di sekretariat DKM.
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={handleSubmit} noValidate>
                                <CardContent className="space-y-4">
                                    <RdbmsAlert message={errors.rdbms} />

                                    {lockoutRemaining > 0 && (
                                        <Alert variant="destructive">
                                            <Lock className="h-4 w-4" aria-hidden="true" />
                                            <AlertTitle>Akses Masuk Dikunci Sementara</AlertTitle>
                                            <AlertDescription className="mt-1 text-xs">
                                                Terlalu banyak percobaan gagal. Silakan tunggu{' '}
                                                <strong className="font-mono tabular-nums">
                                                    {formatLockoutTime(lockoutRemaining)}
                                                </strong>{' '}
                                                sebelum mencoba kembali.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="identitas">Username atau Email</Label>
                                        <Input
                                            id="identitas"
                                            name="identitas"
                                            type="text"
                                            autoComplete="username"
                                            autoFocus
                                            required
                                            disabled={lockoutRemaining > 0 || processing}
                                            placeholder="Masukkan username atau email"
                                            value={data.identitas}
                                            onChange={(e) => setData('identitas', e.target.value)}
                                            aria-invalid={Boolean(errors.identitas)}
                                        />
                                        {errors.identitas && (
                                            <p role="alert" className="text-xs font-medium text-destructive">
                                                {errors.identitas}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Kata Sandi</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                required
                                                disabled={lockoutRemaining > 0 || processing}
                                                placeholder="Masukkan kata sandi"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                aria-invalid={Boolean(errors.password)}
                                                className="pr-11"
                                            />
                                            <button
                                                type="button"
                                                aria-label={
                                                    showPassword
                                                        ? 'Sembunyikan kata sandi'
                                                        : 'Tampilkan kata sandi'
                                                }
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                                                ) : (
                                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p role="alert" className="text-xs font-medium text-destructive">
                                                {errors.password}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <label
                                            htmlFor="remember"
                                            className="flex items-center gap-2 text-xs font-medium text-foreground select-none"
                                        >
                                            <input
                                                id="remember"
                                                name="remember"
                                                type="checkbox"
                                                disabled={lockoutRemaining > 0 || processing}
                                                checked={data.remember}
                                                onChange={(e) => setData('remember', e.target.checked)}
                                                className="h-4 w-4 rounded border-input accent-primary focus:ring-2 focus:ring-ring"
                                            />
                                            <span>Ingat sesi perangkat ini</span>
                                        </label>
                                    </div>
                                </CardContent>

                                <Separator />

                                <CardFooter className="pt-5">
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={processing || lockoutRemaining > 0}
                                    >
                                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                                        <span>
                                            {lockoutRemaining > 0
                                                ? `Terkunci (${formatLockoutTime(lockoutRemaining)})`
                                                : processing
                                                  ? 'Memverifikasi Akun...'
                                                  : 'Masuk ke Portal Panitia'}
                                        </span>
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </section>
                </div>
            </main>

            <footer className="border-t bg-card py-4">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
                    <span>Lembaga Amil Zakat (LAZ) & Panitia Zakat Fitrah Masjid</span>
                    <span>Akses Terlindungi Enkripsi & Pembatasan Percobaan Login</span>
                </div>
            </footer>
        </div>
    );
}
