import * as React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Database,
    Eye,
    KeyRound,
    LayoutDashboard,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    Wallet,
    Wheat,
} from 'lucide-react';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBerasKg, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type {
    SharedProps,
    ViewLaporanPenyaluranPublik,
    ViewRekapPenghimpunanMuzaki,
    ViewRekapPenyaluranAsnaf,
    ViewSaldoJenisDana,
} from '@/types';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TransparansiProps {
    saldoDana: ViewSaldoJenisDana[];
    rekapAsnaf: ViewRekapPenyaluranAsnaf[];
    laporanPenyaluranPublik: ViewLaporanPenyaluranPublik[];
    rekapMuzaki?: ViewRekapPenghimpunanMuzaki[];
    rdbmsError?: string | null;
}

export default function TransparansiPublik({
    saldoDana = [],
    rekapAsnaf = [],
    laporanPenyaluranPublik = [],
    rekapMuzaki = [],
    rdbmsError,
}: TransparansiProps) {
    const { auth } = usePage<SharedProps>().props;
    const isAuthenticated = Boolean(auth?.user);

    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

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

    const handleRefreshData = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['saldoDana', 'rekapAsnaf', 'laporanPenyaluranPublik', 'rekapMuzaki', 'rdbmsError'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const totalSaldoPublik = React.useMemo(() => {
        let uang = 0;
        let beras = 0;
        for (const row of saldoDana) {
            uang += Number.parseFloat(String(row.saldo_tersedia)) || 0;
            beras += Number.parseFloat(String(row.saldo_beras_kg)) || 0;
        }
        return { uang, beras };
    }, [saldoDana]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="Portal Transparansi Publik ZIS & Zakat Fitrah Masjid" />
            <OfflineBanner />

            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
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
                            <h1 className="text-base font-bold tracking-tight sm:text-lg">
                                Portal Transparansi Publik LAZ & Zakat Fitrah Masjid
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Koneksi Read-Only Terisolasi: <code className="font-mono">zis_laporan</code> (Data NIK & Nama Mustahik Tersamar Otomatis)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {installPrompt && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleInstallPwa}
                            >
                                <Smartphone className="h-4 w-4" aria-hidden="true" />
                                <span>Install Aplikasi di HP</span>
                            </Button>
                        )}

                        {isAuthenticated ? (
                            <Button asChild size="sm">
                                <Link href="/dashboard">
                                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                                    <span>Beranda Panitia</span>
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild size="sm">
                                <Link href="/login">
                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                    <span>Login Panitia / DKM</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
                <RdbmsAlert
                    message={rdbmsError}
                    title="Informasi Koneksi Read-Only zis_laporan"
                />

                {/* Ringkasan Saldo & Jaminan Privasi VIEW RDBMS */}
                <section className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Saldo Dana Umat Tersedia</CardDescription>
                                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums text-primary">
                                {formatRupiah(totalSaldoPublik.uang)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Akumulasi dari {saldoDana.length} kantong dana pada <code className="font-mono">v_saldo_jenis_dana</code>.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Saldo Beras Zakat Fitrah</CardDescription>
                                <Wheat className="h-4 w-4 text-amber-600" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums">
                                {formatBerasKg(totalSaldoPublik.beras)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Dipisahkan dari saldo uang dan dijaga anti-negatif oleh RDBMS.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Perlindungan Privasi Mustahik</CardDescription>
                                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-base font-bold">
                                Data Masking Level RDBMS
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Akun <code className="font-mono">zis_laporan</code> diblokir dari 14 tabel asli (<code className="font-mono">ERROR 1142</code>) dan hanya dapat membaca 4 VIEW publik.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Laporan Transparansi Dana Zakat, Infak, Sedekah & Wakaf
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Hanya menampilkan penyaluran yang telah berstatus final (<code className="font-mono text-xs">Disalurkan</code>) dengan identitas mustahik tersamar.
                            </CardDescription>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRefreshing}
                            onClick={handleRefreshData}
                        >
                            <RefreshCw
                                className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                                aria-hidden="true"
                            />
                            <span>{isRefreshing ? 'Memuat...' : 'Segarkan Data'}</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="saldo">
                            <TabsList className="flex flex-wrap h-auto gap-1">
                                <TabsTrigger value="saldo">
                                    1. Saldo Kantong Dana (v_saldo_jenis_dana)
                                </TabsTrigger>
                                <TabsTrigger value="asnaf">
                                    2. Rekap 8 Asnaf (v_rekap_penyaluran_asnaf)
                                </TabsTrigger>
                                <TabsTrigger value="penyaluran">
                                    3. Realisasi Penyaluran (v_laporan_penyaluran_publik)
                                </TabsTrigger>
                                <TabsTrigger value="muzaki">
                                    4. Rekap Muzaki (v_rekap_penghimpunan_muzaki)
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: v_saldo_jenis_dana */}
                            <TabsContent value="saldo" className="pt-4">
                                {saldoDana.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        VIEW v_saldo_jenis_dana belum mengembalikan baris data.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Kode Dana</TableHead>
                                                        <TableHead>Nama Kantong Dana</TableHead>
                                                        <TableHead>Induk Dana</TableHead>
                                                        <TableHead>Kategori</TableHead>
                                                        <TableHead className="text-right">Saldo Uang Tersedia</TableHead>
                                                        <TableHead className="text-right">Saldo Beras Fitrah</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {saldoDana.map((row) => (
                                                        <TableRow key={row.kode_dana}>
                                                            <TableCell className="font-mono text-xs font-semibold">
                                                                {row.kode_dana}
                                                            </TableCell>
                                                            <TableCell className="font-semibold">
                                                                {row.nama_dana}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {row.induk_dana || 'Induk Utama'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {row.kategori_utama.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {saldoDana.map((row) => (
                                                <div
                                                    key={row.kode_dana}
                                                    className="rounded-lg border bg-card p-4 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-bold">
                                                            {row.kode_dana}
                                                        </span>
                                                        <Badge variant="outline">
                                                            {row.kategori_utama.replace('_', ' ')}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-bold">{row.nama_dana}</p>
                                                    <div className="grid grid-cols-2 gap-2 rounded bg-muted/40 p-2 text-xs">
                                                        <div>
                                                            <p className="text-muted-foreground">Saldo Uang</p>
                                                            <p className="font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Saldo Beras</p>
                                                            <p className="font-bold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 2: v_rekap_penyaluran_asnaf */}
                            <TabsContent value="asnaf" className="pt-4">
                                {rekapAsnaf.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        VIEW v_rekap_penyaluran_asnaf belum mengembalikan baris data.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Kode Asnaf</TableHead>
                                                    <TableHead>Golongan Mustahik (8 Asnaf)</TableHead>
                                                    <TableHead className="text-right">Mustahik Terbantu</TableHead>
                                                    <TableHead className="text-right">Total Uang Disalurkan</TableHead>
                                                    <TableHead className="text-right">Total Beras Disalurkan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rekapAsnaf.map((row) => (
                                                    <TableRow key={row.kode_asnaf}>
                                                        <TableCell className="font-mono text-xs font-bold">
                                                            {row.kode_asnaf}
                                                        </TableCell>
                                                        <TableCell className="font-semibold">
                                                            {row.nama_asnaf}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            {row.jumlah_mustahik_terbantu} jiwa
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(row.total_nominal_disalurkan)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums">
                                                            {formatBerasKg(row.total_beras_disalurkan_kg)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 3: v_laporan_penyaluran_publik */}
                            <TabsContent value="penyaluran" className="pt-4">
                                {laporanPenyaluranPublik.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        VIEW v_laporan_penyaluran_publik belum memiliki rincian BKK berstatus Disalurkan.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>No. BKK & Tanggal</TableHead>
                                                        <TableHead>Program & Sumber Dana</TableHead>
                                                        <TableHead>Golongan Asnaf</TableHead>
                                                        <TableHead>
                                                            <span className="inline-flex items-center gap-1">
                                                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                                                Mustahik & NIK (Masked)
                                                            </span>
                                                        </TableHead>
                                                        <TableHead className="text-right">Uang Diterima</TableHead>
                                                        <TableHead className="text-right">Beras (Kg)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {laporanPenyaluranPublik.map((row, idx) => (
                                                        <TableRow key={`${row.no_bkk}-${idx}`}>
                                                            <TableCell>
                                                                <p className="font-mono text-xs font-bold">
                                                                    {row.no_bkk}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatTanggalIndonesia(row.tanggal_penyaluran)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-sm">
                                                                    {row.nama_program}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {row.nama_dana}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {row.kode_asnaf} - {row.nama_asnaf}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-sm">
                                                                    {row.nama_mustahik_masked}
                                                                </p>
                                                                <p className="font-mono text-xs text-muted-foreground">
                                                                    NIK: {row.nik_mustahik_masked}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.nominal_diterima)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">
                                                                {formatBerasKg(row.beras_diterima_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {laporanPenyaluranPublik.map((row, idx) => (
                                                <div
                                                    key={`${row.no_bkk}-${idx}`}
                                                    className="rounded-lg border bg-card p-4 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-bold">
                                                            {row.no_bkk}
                                                        </span>
                                                        <Badge variant="outline">{row.kode_asnaf}</Badge>
                                                    </div>
                                                    <p className="text-sm font-bold">{row.nama_program}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Penerima (Masked): {row.nama_mustahik_masked} ({row.nik_mustahik_masked})
                                                    </p>
                                                    <Separator />
                                                    <div className="flex items-center justify-between text-xs pt-1">
                                                        <span className="text-muted-foreground">
                                                            {formatTanggalIndonesia(row.tanggal_penyaluran)}
                                                        </span>
                                                        <span className="font-bold tabular-nums text-primary">
                                                            {formatRupiah(row.nominal_diterima)} /{' '}
                                                            {formatBerasKg(row.beras_diterima_kg)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 4: v_rekap_penghimpunan_muzaki */}
                            <TabsContent value="muzaki" className="pt-4">
                                {rekapMuzaki.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        VIEW v_rekap_penghimpunan_muzaki belum mengembalikan baris data.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Muzaki & NIK Tersamar</TableHead>
                                                    <TableHead>Periode</TableHead>
                                                    <TableHead className="text-right">Frekuensi</TableHead>
                                                    <TableHead className="text-right">Total Donasi Uang</TableHead>
                                                    <TableHead className="text-right">Total Beras Fitrah</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rekapMuzaki.map((row, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <p className="font-semibold text-sm">
                                                                {String(
                                                                    row.nama_muzaki_masked ??
                                                                        row.nama_lengkap ??
                                                                        'Muzaki'
                                                                )}
                                                            </p>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                NIK:{' '}
                                                                {String(
                                                                    row.nik_muzaki_masked ??
                                                                        row.nik_masked ??
                                                                        '****************'
                                                                )}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {row.tahun_hijriah
                                                                ? `Ramadhan ${row.tahun_hijriah} H (${row.tahun_masehi ?? ''})`
                                                                : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            {Number(
                                                                row.frekuensi_transaksi ??
                                                                    row.frekuensi_setoran ??
                                                                    0
                                                            )}
                                                            x
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(
                                                                Number(row.total_nominal ?? 0)
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums">
                                                            {formatBerasKg(
                                                                Number(row.total_beras_kg ?? 0)
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </main>

            <footer className="border-t bg-card py-4">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
                    <span>Portal Transparansi Publik SI-LAZ & Zakat Fitrah Masjid</span>
                    <span>Diakses secara eksklusif melalui koneksi mysql_laporan (zis_laporan)</span>
                </div>
            </footer>
        </div>
    );
}
