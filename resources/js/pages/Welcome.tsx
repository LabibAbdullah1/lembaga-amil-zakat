import * as React from 'react';
import { Head } from '@inertiajs/react';
import { Database, ShieldCheck, Smartphone, Scale, FileSpreadsheet } from 'lucide-react';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBerasKg, formatRupiah } from '@/lib/format';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Welcome() {
    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [jiwaSimulasi, setJiwaSimulasi] = React.useState<number>(4);
    const tarifFitrahPerJiwa = 45000;
    const takaranBerasPerJiwa = 2.5;

    React.useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallPwa = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="Fondasi Monorepo SI-LAZ Masjid" />
            <OfflineBanner />

            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icons/icon.svg"
                            alt="Logo SI-LAZ Masjid"
                            width={40}
                            height={40}
                            fetchPriority="high"
                            className="h-10 w-10 rounded-lg"
                        />
                        <div>
                            <p className="text-base font-bold tracking-tight text-foreground">
                                SI-LAZ & Zakat Fitrah Masjid
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Monorepo RDBMS-First Architecture (MariaDB + Laravel + Inertia React TS)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="success">Sprint 0: Siap</Badge>
                        {installPrompt && (
                            <Button size="sm" onClick={handleInstallPwa}>
                                <Smartphone className="h-4 w-4" aria-hidden="true" />
                                Pasang Aplikasi di HP
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-8 sm:px-6">
                <div className="grid gap-6 lg:grid-cols-12">
                    <section className="lg:col-span-7 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-xl">
                                        Status Inisialisasi Infrastruktur & Kontrak RDBMS
                                    </CardTitle>
                                    <Badge variant="outline">db_laz_zis_masjid</Badge>
                                </div>
                                <CardDescription>
                                    Seluruh aturan bisnis syariat ditegakkan langsung oleh MariaDB melalui 14 tabel, 6 Stored Procedure, 3 Function, 12 Trigger, dan 4 View.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Tabs defaultValue="koneksi">
                                    <TabsList className="w-full sm:w-auto">
                                        <TabsTrigger value="koneksi">Dual DB Connection</TabsTrigger>
                                        <TabsTrigger value="objek">Kontrak Objek RDBMS</TabsTrigger>
                                        <TabsTrigger value="pwa">Keamanan PWA</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="koneksi" className="space-y-3 pt-2">
                                        <div className="hidden md:block rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Koneksi Laravel</TableHead>
                                                        <TableHead>Akun MariaDB</TableHead>
                                                        <TableHead>Lingkup Hak Akses</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            mysql (Default)
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            zis_aplikasi
                                                        </TableCell>
                                                        <TableCell>
                                                            Operasional Panitia, Set @app_user, CRUD Master & Eksekusi 6 Stored Procedure
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            mysql_laporan
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            zis_laporan
                                                        </TableCell>
                                                        <TableCell>
                                                            Eksklusif Read-Only pada 4 VIEW Transparansi Publik (Data NIK/Nama Tersamar)
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            <div className="rounded-lg border p-3.5 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-xs font-bold">mysql (Default)</span>
                                                    <Badge variant="success">zis_aplikasi</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Operasional Panitia, Set @app_user, CRUD Master & Eksekusi 6 Stored Procedure.
                                                </p>
                                            </div>
                                            <div className="rounded-lg border p-3.5 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono text-xs font-bold">mysql_laporan</span>
                                                    <Badge variant="secondary">zis_laporan</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Eksklusif Read-Only pada 4 VIEW Transparansi Publik (Data NIK/Nama Tersamar).
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="objek" className="pt-2">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-lg border p-3.5">
                                                <div className="flex items-center gap-2 font-semibold text-sm">
                                                    <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                                                    <span>6 Stored Procedure & 3 Function</span>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    sp_terima_zis_fitrah, sp_batalkan_penghimpunan, sp_verifikasi_mustahik, sp_buat_pengajuan_penyaluran, sp_tambah_mustahik_bkk, sp_eksekusi_penyaluran.
                                                </p>
                                            </div>
                                            <div className="rounded-lg border p-3.5">
                                                <div className="flex items-center gap-2 font-semibold text-sm">
                                                    <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
                                                    <span>12 Trigger & Kepatuhan Syariat</span>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Proteksi saldo anti-negatif, batas hak amil maks 12,50%, masa berlaku verifikasi mustahik 365 hari, dan jejak audit JSON.
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="pwa" className="pt-2">
                                        <div className="rounded-lg border p-3.5 space-y-2">
                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                                <span>Strategi Service Worker Aman</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Aset statis menggunakan CacheFirst, sedangkan endpoint transaksi keuangan serta halaman saldo menggunakan NetworkOnly / NetworkFirst agar tidak pernah menampilkan saldo basi.
                                            </p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </section>

                    <aside className="lg:col-span-5">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <span>Simulasi Format Angka Loket Zakat Fitrah</span>
                                </CardTitle>
                                <CardDescription>
                                    Verifikasi komponen input shadcn/ui dan helper format tabular-nums Rupiah & beras.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="jiwa-input">Jumlah Jiwa Muzaki (Keluarga)</Label>
                                    <Input
                                        id="jiwa-input"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={30}
                                        value={jiwaSimulasi}
                                        onChange={(e) => {
                                            const val = Number.parseInt(e.target.value, 10);
                                            setJiwaSimulasi(Number.isNaN(val) || val < 1 ? 1 : val);
                                        }}
                                    />
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-accent/50 p-3">
                                        <p className="text-xs text-muted-foreground">Estimasi Fitrah Uang</p>
                                        <p className="mt-1 text-base font-bold tabular-nums text-accent-foreground">
                                            {formatRupiah(jiwaSimulasi * tarifFitrahPerJiwa)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                            @ {formatRupiah(tarifFitrahPerJiwa)} / jiwa
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-accent/50 p-3">
                                        <p className="text-xs text-muted-foreground">Estimasi Fitrah Beras</p>
                                        <p className="mt-1 text-base font-bold tabular-nums text-accent-foreground">
                                            {formatBerasKg(jiwaSimulasi * takaranBerasPerJiwa)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                            @ {formatBerasKg(takaranBerasPerJiwa)} / jiwa
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </main>

            <footer className="border-t bg-card py-4">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
                    <span>SI-LAZ Masjid Monorepo (SESSION_DRIVER=file, CACHE_STORE=file, QUEUE_CONNECTION=sync)</span>
                    <span>Tanpa migrasi tabel inti pada db_laz_zis_masjid</span>
                </div>
            </footer>
        </div>
    );
}
