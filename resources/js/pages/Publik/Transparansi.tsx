import * as React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Calculator,
    CheckCircle2,
    Database,
    Eye,
    HandCoins,
    HeartHandshake,
    KeyRound,
    LayoutDashboard,
    RefreshCw,
    Scale,
    Search,
    ShieldCheck,
    Smartphone,
    Users,
    Wallet,
    Wheat,
} from 'lucide-react';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { UserGuideDialog } from '@/components/zis/UserGuideDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import { formatBerasKg, formatPercentage, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type {
    KategoriUtamaDana,
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

const ASNAF_DESCRIPTIONS: Record<string, string> = {
    'ASN-01': 'Fakir: Warga yang tidak memiliki harta dan tenaga untuk memenuhi kebutuhan pokok.',
    'ASN-02': 'Miskin: Warga yang memiliki penghasilan namun belum mencukupi kebutuhan dasar keluarga.',
    'ASN-03': 'Amil: Pengurus & panitia pengelola zakat (dibatasi syariat maksimal 12,50%).',
    'ASN-04': 'Mualaf: Saudara baru yang membutuhkan penguatan iman dan dukungan sosial.',
    'ASN-05': 'Riqab: Pembebasan dari belenggu perbudakan atau penindasan.',
    'ASN-06': 'Gharimin: Warga yang terlilit utang demi memenuhi kebutuhan hidup yang halal.',
    'ASN-07': 'Fisabilillah: Pejuang dakwah, pendidikan keislaman, dan kemaslahatan umat.',
    'ASN-08': 'Ibnu Sabil: Musafir yang kehabisan bekal dalam perjalanan yang bukan maksiat.',
};

export default function TransparansiPublik({
    saldoDana = [],
    rekapAsnaf = [],
    laporanPenyaluranPublik = [],
    rekapMuzaki = [],
    rdbmsError,
}: TransparansiProps) {
    const { auth, periodeAktif } = usePage<SharedProps>().props;
    const isAuthenticated = Boolean(auth?.user);

    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    // Filter Tabel Publik
    const [cariDana, setCariDana] = React.useState<string>('');
    const [filterKategoriDana, setFilterKategoriDana] = React.useState<string>('SEMUA');
    const [cariPenyaluran, setCariPenyaluran] = React.useState<string>('');

    // Simulasi Kalkulator Zakat Jamaah
    const [jiwaKalkulator, setJiwaKalkulator] = React.useState<number>(4);
    const [penghasilanBulanan, setPenghasilanBulanan] = React.useState<number>(10000000);
    const tarifFitrah = Number(periodeAktif?.nominal_fitrah_per_jiwa ?? 45000);
    const takaranBeras = Number(periodeAktif?.beras_per_jiwa_kg ?? 2.5);

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

    const agregatPublik = React.useMemo(() => {
        let totalSaldoUang = 0;
        let totalSaldoBeras = 0;
        for (const row of saldoDana) {
            totalSaldoUang += Number.parseFloat(String(row.saldo_tersedia)) || 0;
            totalSaldoBeras += Number.parseFloat(String(row.saldo_beras_kg)) || 0;
        }

        let totalSalurUang = 0;
        let totalSalurBeras = 0;
        let totalMustahikTerbantu = 0;
        for (const asnaf of rekapAsnaf) {
            totalSalurUang += Number.parseFloat(String(asnaf.total_nominal_disalurkan)) || 0;
            totalSalurBeras += Number.parseFloat(String(asnaf.total_beras_disalurkan_kg)) || 0;
            totalMustahikTerbantu += Number(asnaf.jumlah_mustahik_terbantu) || 0;
        }

        return {
            totalSaldoUang,
            totalSaldoBeras,
            totalSalurUang,
            totalSalurBeras,
            totalMustahikTerbantu,
        };
    }, [saldoDana, rekapAsnaf]);

    const filteredSaldo = React.useMemo(() => {
        return saldoDana.filter((item) => {
            const matchKategori =
                filterKategoriDana === 'SEMUA' || item.kategori_utama === filterKategoriDana;
            const q = cariDana.trim().toLowerCase();
            const matchCari =
                q === '' ||
                item.kode_dana.toLowerCase().includes(q) ||
                item.nama_dana.toLowerCase().includes(q) ||
                (item.induk_dana ?? '').toLowerCase().includes(q);
            return matchKategori && matchCari;
        });
    }, [saldoDana, filterKategoriDana, cariDana]);

    const filteredPenyaluran = React.useMemo(() => {
        const q = cariPenyaluran.trim().toLowerCase();
        if (q === '') return laporanPenyaluranPublik;
        return laporanPenyaluranPublik.filter(
            (row) =>
                row.no_bkk.toLowerCase().includes(q) ||
                row.nama_program.toLowerCase().includes(q) ||
                row.nama_asnaf.toLowerCase().includes(q) ||
                row.nama_mustahik_masked.toLowerCase().includes(q)
        );
    }, [laporanPenyaluranPublik, cariPenyaluran]);

    const getKategoriVariant = (
        kategori: KategoriUtamaDana
    ): 'success' | 'warning' | 'secondary' => {
        if (kategori === 'Zakat') return 'success';
        if (kategori === 'Infak_Sedekah') return 'warning';
        return 'secondary';
    };

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="Portal Transparansi & Akuntabilitas LAZ Masjid" />
            <OfflineBanner />

            {/* Navigasi Header Publik */}
            <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xs">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icons/icon.svg"
                            alt="Logo LAZ Masjid"
                            width={40}
                            height={40}
                            fetchPriority="high"
                            className="h-10 w-10 rounded-lg shadow-2xs"
                        />
                        <div>
                            <p className="text-base font-bold tracking-tight">
                                LAZ & Zakat Fitrah Masjid
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Portal Transparansi Dana Zakat Fitrah & Zakat Mal (8 Golongan Asnaf)
                            </p>
                        </div>
                    </div>

                    <nav aria-label="Menu Portal Publik" className="flex flex-wrap items-center gap-2">
                        <UserGuideDialog
                            currentRole={auth?.user?.peran ?? 'Publik'}
                            triggerVariant="outline"
                            triggerLabel="Panduan Pengguna"
                        />

                        {installPrompt && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleInstallPwa}
                            >
                                <Smartphone className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Pasang di HP</span>
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
                    </nav>
                </div>
            </header>

            <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 space-y-10 laz-page-enter">
                <RdbmsAlert message={rdbmsError} />

                {/* Hero & Kalkulator Simulasi Zakat Jamaah */}
                <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
                    <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border bg-card p-6 sm:p-8 shadow-2xs space-y-6 laz-stagger-1">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success">Amanah & Terbuka untuk Jamaah</Badge>
                                {periodeAktif && (
                                    <Badge variant="outline">
                                        Ramadhan {periodeAktif.tahun_hijriah} H / {periodeAktif.tahun_masehi} M
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl leading-tight">
                                Laporan Terbuka Pengelolaan Zakat Fitrah & Zakat Mal Masjid (8 Golongan Asnaf)
                            </h1>

                            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
                                Setiap rupiah dan butir beras zakat yang ditunaikan muzaki dikelola secara murni sesuai ketentuan syariat, diverifikasi melalui survei kelayakan mustahik 8 asnaf, dan dilaporkan secara transparan dengan tetap melindungi kehormatan identitas penerima manfaat.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 pt-2">
                            <div className="rounded-xl border bg-accent/40 p-3.5 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                                    <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Murni Dana Zakat Wajib</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Dikhususkan untuk pengelolaan Zakat Fitrah (Uang & Beras) serta Zakat Mal tanpa dicampur dana non-zakat.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-accent/40 p-3.5 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Verifikasi 8 Asnaf</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Penerima zakat wajib melalui survei kelayakan lapangan dan batas hak amil maksimal 12,50%.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-accent/40 p-3.5 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Privasi Mustahik Terjaga</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    NIK dan nama penerima manfaat disamarkan pada laporan publik.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Kalkulator Simulasi Zakat Fitrah & Zakat Profesi/Mal */}
                    <Card className="lg:col-span-5 flex flex-col justify-between shadow-2xs laz-stagger-2">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-base">
                                        Kalkulator Simulasi Zakat Jamaah
                                    </CardTitle>
                                </div>
                                <Badge variant="secondary">Hitung Cepat</Badge>
                            </div>
                            <CardDescription>
                                Hitung estimasi Zakat Fitrah keluarga atau Zakat Penghasilan (2,5%) sebelum menyetorkan di loket masjid.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Tabs defaultValue="fitrah">
                                <TabsList className="w-full">
                                    <TabsTrigger value="fitrah" className="flex-1">
                                        Zakat Fitrah Keluarga
                                    </TabsTrigger>
                                    <TabsTrigger value="mal" className="flex-1">
                                        Zakat Mal / Profesi (2,5%)
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="fitrah" className="space-y-3 pt-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="simulasi-jiwa">
                                            Jumlah Anggota Keluarga Wajib Fitrah (Jiwa)
                                        </Label>
                                        <Input
                                            id="simulasi-jiwa"
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            max={30}
                                            value={jiwaKalkulator}
                                            onChange={(e) => {
                                                const v = Number.parseInt(e.target.value, 10);
                                                setJiwaKalkulator(Number.isNaN(v) || v < 1 ? 1 : v);
                                            }}
                                            className="tabular-nums font-semibold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="rounded-lg border bg-accent/50 p-3">
                                            <p className="text-xs text-muted-foreground">Setoran Tunai / QRIS</p>
                                            <p className="mt-1 text-base font-bold tabular-nums text-primary">
                                                {formatRupiah(jiwaKalkulator * tarifFitrah)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground tabular-nums">
                                                @ {formatRupiah(tarifFitrah)} / jiwa
                                            </p>
                                        </div>
                                        <div className="rounded-lg border bg-accent/50 p-3">
                                            <p className="text-xs text-muted-foreground">Setoran Beras Fitrah</p>
                                            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
                                                {formatBerasKg(jiwaKalkulator * takaranBeras)}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground tabular-nums">
                                                @ {formatBerasKg(takaranBeras)} / jiwa
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="mal" className="space-y-3 pt-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="simulasi-penghasilan">
                                            Penghasilan / Harta Bersih (Rp)
                                        </Label>
                                        <Input
                                            id="simulasi-penghasilan"
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            step={100000}
                                            value={penghasilanBulanan}
                                            onChange={(e) => {
                                                const v = Number.parseFloat(e.target.value);
                                                setPenghasilanBulanan(Number.isNaN(v) || v < 0 ? 0 : v);
                                            }}
                                            className="tabular-nums font-semibold"
                                        />
                                    </div>

                                    <div className="rounded-lg border bg-accent/50 p-3.5 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Kewajiban Zakat (Tarif Syariat 2,5%)
                                            </p>
                                            <p className="mt-0.5 text-lg font-bold tabular-nums text-primary">
                                                {formatRupiah(Math.round(penghasilanBulanan * 0.025))}
                                            </p>
                                        </div>
                                        <Badge variant="success" className="tabular-nums">
                                            2,50%
                                        </Badge>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </section>

                {/* 4 Kartu Ringkasan Utama Posisi Saldo & Realisasi Penyaluran */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 laz-stagger-2">
                    <Card className="laz-card-lift">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Saldo Dana Umat Tersedia</CardDescription>
                                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums text-primary">
                                {formatRupiah(agregatPublik.totalSaldoUang)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Saldo kas aktif dari {saldoDana.length} kantong dana ZIS & Wakaf.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="laz-card-lift">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Persediaan Beras Fitrah</CardDescription>
                                <Wheat className="h-4 w-4 text-amber-600" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums">
                                {formatBerasKg(agregatPublik.totalSaldoBeras)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Saldo beras zakat fitrah siap salur di gudang panitia masjid.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="laz-card-lift">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Dana Tersalurkan</CardDescription>
                                <HandCoins className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums">
                                {formatRupiah(agregatPublik.totalSalurUang)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground tabular-nums">
                                Ditambah beras tersalurkan: {formatBerasKg(agregatPublik.totalSalurBeras)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="laz-card-lift">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardDescription>Total Mustahik Terbantu</CardDescription>
                                <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-xl font-bold tabular-nums">
                                {agregatPublik.totalMustahikTerbantu} Jiwa
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                Penerima manfaat terverifikasi di seluruh golongan 8 asnaf.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* Laporan Utama 4 Tab Transparansi Publik */}
                <Card className="shadow-2xs laz-stagger-3">
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Rincian Posisi Saldo & Realisasi Penyaluran Dana Umat
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Menampilkan posisi saldo kantong dana terkini serta rincian penyaluran dana yang telah diserahterimakan kepada mustahik.
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
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
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="saldo">
                            <TabsList className="flex flex-wrap h-auto gap-1">
                                <TabsTrigger value="saldo">
                                    Posisi Saldo Dana ({saldoDana.length})
                                </TabsTrigger>
                                <TabsTrigger value="asnaf">
                                    Penyaluran per 8 Asnaf ({rekapAsnaf.length})
                                </TabsTrigger>
                                <TabsTrigger value="penyaluran">
                                    Rincian Penyaluran ({laporanPenyaluranPublik.length})
                                </TabsTrigger>
                                <TabsTrigger value="muzaki">
                                    Partisipasi Muzaki ({rekapMuzaki.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: POSISI SALDO KANTONG DANA ZAKAT */}
                            <TabsContent value="saldo" className="space-y-4 pt-4">
                                <div className="max-w-lg">
                                    <Label htmlFor="cari-dana-publik" className="sr-only">
                                        Cari Kantong Dana Zakat
                                    </Label>
                                    <div className="relative">
                                        <Search
                                            className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="cari-dana-publik"
                                            type="search"
                                            placeholder="Cari nama atau kode kantong dana zakat..."
                                            value={cariDana}
                                            onChange={(e) => setCariDana(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {filteredSaldo.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data saldo kantong dana yang tercatat untuk filter ini.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Kode Dana</TableHead>
                                                        <TableHead>Nama Kantong Dana</TableHead>
                                                        <TableHead>Kelompok Induk</TableHead>
                                                        <TableHead>Kategori Syariat</TableHead>
                                                        <TableHead className="text-right">Saldo Uang Tersedia</TableHead>
                                                        <TableHead className="text-right">Saldo Beras Fitrah</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSaldo.map((row) => (
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
                                                                <Badge variant={getKategoriVariant(row.kategori_utama)}>
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
                                            {filteredSaldo.map((row) => (
                                                <div
                                                    key={row.kode_dana}
                                                    className="rounded-lg border bg-card p-4 space-y-2 laz-card-lift"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-bold">
                                                            {row.kode_dana}
                                                        </span>
                                                        <Badge variant={getKategoriVariant(row.kategori_utama)}>
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

                            {/* TAB 2: DISTRIBUSI 8 GOLONGAN ASNAF */}
                            <TabsContent value="asnaf" className="space-y-4 pt-4">
                                {rekapAsnaf.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data rekapitulasi penyaluran per golongan asnaf pada periode ini.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {rekapAsnaf.map((row) => {
                                            const nominal =
                                                Number.parseFloat(String(row.total_nominal_disalurkan)) || 0;
                                            const porsi =
                                                agregatPublik.totalSalurUang > 0
                                                    ? (nominal / agregatPublik.totalSalurUang) * 100
                                                    : 0;

                                            return (
                                                <div
                                                    key={row.kode_asnaf}
                                                    className="rounded-xl border bg-card p-4 space-y-3 laz-card-lift"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Badge variant="outline" className="font-mono">
                                                            {row.kode_asnaf}
                                                        </Badge>
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
                                                            <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                                            {row.jumlah_mustahik_terbantu} jiwa
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <p className="text-base font-bold">{row.nama_asnaf}</p>
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                                                            {ASNAF_DESCRIPTIONS[row.kode_asnaf] ??
                                                                'Golongan penerima manfaat zakat sesuai ketentuan syariat.'}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1.5 pt-1">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground">Uang Tersalurkan</span>
                                                            <span className="font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.total_nominal_disalurkan)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground">Beras Fitrah</span>
                                                            <span className="font-semibold tabular-nums">
                                                                {formatBerasKg(row.total_beras_disalurkan_kg)}
                                                            </span>
                                                        </div>
                                                        <div
                                                            role="progressbar"
                                                            aria-valuenow={Math.round(porsi)}
                                                            aria-valuemin={0}
                                                            aria-valuemax={100}
                                                            aria-label={`Proporsi penyaluran ${row.nama_asnaf}`}
                                                            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                                                        >
                                                            <div
                                                                className="h-full bg-primary transition-all"
                                                                style={{ width: `${Math.min(100, porsi)}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                                                            Porsi: {formatPercentage(porsi)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 3: RINCIAN PENYALURAN PUBLIK (MASKED) */}
                            <TabsContent value="penyaluran" className="space-y-4 pt-4">
                                <div className="max-w-md">
                                    <Label htmlFor="cari-penyaluran-publik" className="sr-only">
                                        Cari No. BKK, Program, atau Asnaf
                                    </Label>
                                    <div className="relative">
                                        <Search
                                            className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            id="cari-penyaluran-publik"
                                            type="search"
                                            placeholder="Cari No. BKK, nama program, atau golongan asnaf..."
                                            value={cariPenyaluran}
                                            onChange={(e) => setCariPenyaluran(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {filteredPenyaluran.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada rincian penyaluran dana yang dipublikasikan untuk pencarian ini.
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
                                                                Mustahik & NIK (Tersamar)
                                                            </span>
                                                        </TableHead>
                                                        <TableHead className="text-right">Uang Diterima</TableHead>
                                                        <TableHead className="text-right">Beras (Kg)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredPenyaluran.map((row, idx) => (
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
                                            {filteredPenyaluran.map((row, idx) => (
                                                <div
                                                    key={`${row.no_bkk}-${idx}`}
                                                    className="rounded-lg border bg-card p-4 space-y-2 laz-card-lift"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-bold">
                                                            {row.no_bkk}
                                                        </span>
                                                        <Badge variant="outline">{row.kode_asnaf}</Badge>
                                                    </div>
                                                    <p className="text-sm font-bold">{row.nama_program}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Penerima: {row.nama_mustahik_masked} ({row.nik_mustahik_masked})
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

                            {/* TAB 4: REKAP PARTISIPASI MUZAKI */}
                            <TabsContent value="muzaki" className="pt-4">
                                {rekapMuzaki.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data rekapitulasi partisipasi muzaki pada periode ini.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Muzaki & NIK Tersamar</TableHead>
                                                    <TableHead>Periode Ramadhan</TableHead>
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
                                                                        'Hamba Allah'
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
                                                            {formatRupiah(Number(row.total_nominal ?? 0))}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums">
                                                            {formatBerasKg(Number(row.total_beras_kg ?? 0))}
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

                {/* Bagian Edukasi & Panduan Singkat 8 Golongan Asnaf */}
                <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-2xs space-y-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                                <h2 className="text-lg font-bold">
                                    Mengenal 8 Golongan Penerima Zakat (Asnaf) & Tata Kelola Amanah
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Berdasarkan QS. At-Taubah ayat 60, penyaluran dana zakat di masjid ini dikawal ketat untuk 8 golongan mustahik berikut:
                            </p>
                        </div>

                        <UserGuideDialog
                            currentRole={auth?.user?.peran ?? 'Publik'}
                            triggerVariant="default"
                            triggerLabel="Baca Panduan Lengkap"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(ASNAF_DESCRIPTIONS).map(([kode, desc]) => {
                            const [nama, penjelasan] = desc.split(': ');
                            return (
                                <div
                                    key={kode}
                                    className="rounded-xl border bg-muted/20 p-3.5 space-y-1.5 laz-card-lift"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-foreground">{nama}</span>
                                        <Badge variant="outline" className="font-mono text-[11px]">
                                            {kode}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {penjelasan}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            <footer className="border-t bg-card py-5">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
                    <span>Portal Transparansi Publik LAZ & Zakat Fitrah Masjid</span>
                    <span>Laporan Akuntabilitas Dana Zakat, Infak, Sedekah & Wakaf</span>
                </div>
            </footer>
        </div>
    );
}
