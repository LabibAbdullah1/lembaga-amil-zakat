import * as React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { KeyRound, ShieldCheck, Smartphone, UserCheck } from 'lucide-react';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Login() {
    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm<{
        identitas: string;
        password: string;
        remember: boolean;
        rdbms?: string;
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

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/login');
    };

    const handleInstallPwa = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="Masuk Sistem Panitia ZIS & Zakat Fitrah" />
            <OfflineBanner />

            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icons/icon.svg"
                            alt="Logo SI-LAZ Masjid"
                            width={36}
                            height={36}
                            fetchPriority="high"
                            className="h-9 w-9 rounded-lg"
                        />
                        <div>
                            <p className="text-sm font-bold tracking-tight">SI-LAZ & Zakat Fitrah Masjid</p>
                            <p className="text-xs text-muted-foreground">Portal Internal Panitia & DKM</p>
                        </div>
                    </div>

                    {installPrompt && (
                        <Button type="button" variant="outline" size="sm" onClick={handleInstallPwa}>
                            <Smartphone className="h-4 w-4" aria-hidden="true" />
                            <span>Install di HP</span>
                        </Button>
                    )}
                </div>
            </header>

            <main className="mx-auto flex flex-1 w-full max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
                <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-center">
                    <section className="lg:col-span-6 space-y-4">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                Autentikasi Panitia Amil Zakat & DKM
                            </h1>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Masuk menggunakan akun resmi pada tabel <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">pengguna_sistem</code>. Setiap tindakan operasional akan menyuntikkan identitas <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">@app_user</code> ke dalam <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">log_audit_zis</code>.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border bg-card p-3.5 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Otorisasi 5 Peran (RBAC)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Admin, Amil_Penerima, Verifikator, Staf_Penyaluran, dan Ketua_DKM.
                                </p>
                            </div>

                            <div className="rounded-lg border bg-card p-3.5 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Kepatuhan Syariat RDBMS</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Hanya akun dengan status_aktif = 1 dan hash Bcrypt valid yang diizinkan mengakses loket.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="lg:col-span-6">
                        <Card className="mx-auto w-full max-w-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Masuk ke Akun Panitia</CardTitle>
                                    <Badge variant="outline">zis_aplikasi</Badge>
                                </div>
                                <CardDescription>
                                    Masukkan username atau alamat email beserta kata sandi Anda.
                                </CardDescription>
                            </CardHeader>

                            <form onSubmit={handleSubmit} noValidate>
                                <CardContent className="space-y-4">
                                    <RdbmsAlert message={errors.rdbms} />

                                    <div className="space-y-2">
                                        <Label htmlFor="identitas">Username atau Email</Label>
                                        <Input
                                            id="identitas"
                                            name="identitas"
                                            type="text"
                                            autoComplete="username"
                                            autoFocus
                                            required
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
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            placeholder="Masukkan kata sandi"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            aria-invalid={Boolean(errors.password)}
                                        />
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
                                    <Button type="submit" className="w-full" disabled={processing}>
                                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                                        <span>{processing ? 'Memverifikasi Kredensial...' : 'Masuk Sistem'}</span>
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </section>
                </div>
            </main>

            <footer className="border-t bg-card py-4">
                <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
                    <span>Sistem Informasi Lembaga Amil Zakat (LAZ / ZIS) & Zakat Fitrah Masjid</span>
                    <span>Tabel Autentikasi: pengguna_sistem (password_hash)</span>
                </div>
            </footer>
        </div>
    );
}
