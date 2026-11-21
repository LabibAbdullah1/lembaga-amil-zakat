import * as React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    Calculator,
    CalendarClock,
    CheckCircle2,
    Clock,
    Database,
    Eye,
    HandCoins,
    HeartHandshake,
    KeyRound,
    LayoutDashboard,
    Mail,
    MapPin,
    Megaphone,
    Phone,
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
    'ASN-03': 'Amil: Pengurus & panitia pengelola zakat (dibatasi syariat maksimal 12,50% per kategori).',
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
    const [jiwaKalkulator, setJiwaKalkulator] = React.useState<string>('4');
    const [penghasilanBulanan, setPenghasilanBulanan] = React.useState<string>('10000000');
    const tarifFitrah = Number(periodeAktif?.nominal_fitrah_per_jiwa ?? 45000);
    const takaranBeras = Number(periodeAktif?.beras_per_jiwa_kg ?? 2.5);
    const jiwaNumeric = Math.max(1, Number.parseInt(jiwaKalkulator, 10) || 1);
    const penghasilanNumeric = Math.max(0, Number.parseFloat(penghasilanBulanan) || 0);
    const zakatProfesiBulanan = Math.round(penghasilanNumeric * 0.025);

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

    const headerRef = React.useRef<HTMLElement | null>(null);

    const scrollToSection = React.useCallback(
        (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
            const el = document.getElementById(sectionId);
            if (!el) return;
            e.preventDefault();
            const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 96;
            const targetTop = el.getBoundingClientRect().top + window.scrollY - headerHeight - 24;
            window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            window.history.replaceState(null, '', `#${sectionId}`);
        },
        []
    );

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

    const tahunHijriahLabel = periodeAktif?.tahun_hijriah ?? rekapMuzaki[0]?.tahun_hijriah ?? '1447 H';
    const tahunMasehiLabel = periodeAktif?.tahun_masehi ?? rekapMuzaki[0]?.tahun_masehi ?? 2026;

    const marqueeItems = [
        `LAZ Masjid Istiqamah, Rumbai • Portal Transparansi Zakat Fitrah & Zakat Mal ${tahunHijriahLabel} (${tahunMasehiLabel})`,
        `Ketentuan Zakat Fitrah: ${formatBerasKg(takaranBeras)} beras atau ${formatRupiah(tarifFitrah)} per jiwa`,
        `Total Saldo Zakat Tersedia: ${formatRupiah(agregatPublik.totalSaldoUang)} & ${formatBerasKg(agregatPublik.totalSaldoBeras)}`,
        `Total Dana Tersalurkan ke 8 Asnaf: ${formatRupiah(agregatPublik.totalSalurUang)} (${agregatPublik.totalMustahikTerbantu} mustahik terbantu)`,
        `Komitmen Syariat: Hak Amil dibatasi maksimal 12,50% per kategori zakat dan seluruh Zakat Fitrah wajib tuntas sebelum Idul Fitri`,
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Head title="LAZ Masjid Istiqamah Rumbai — Portal Transparansi Zakat" />
            <OfflineBanner />

            {/* Navigasi Header Publik */}
            <header ref={headerRef} className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xs">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                            <img
                                src="/icons/icon.svg"
                                alt="Logo LAZ Masjid Istiqamah Rumbai"
                                width={28}
                                height={28}
                                fetchPriority="high"
                                className="h-7 w-7 rounded-md"
                            />
                        </div>
                        <div>
                            <p className="text-sm sm:text-base font-bold tracking-tight">
                                LAZ Masjid Istiqamah, Rumbai
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Lembaga Amil Zakat Amanah, Transparan &amp; Sesuai Syariat
                            </p>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-5 text-xs font-semibold text-muted-foreground">
                        <a
                            href="#profil"
                            onClick={(e) => scrollToSection(e, 'profil')}
                            className="hover:text-primary transition-colors"
                        >
                            Profil Lembaga
                        </a>
                        <a
                            href="#kalkulator"
                            onClick={(e) => scrollToSection(e, 'kalkulator')}
                            className="hover:text-primary transition-colors"
                        >
                            Kalkulator Zakat
                        </a>
                        <a
                            href="#transparansi"
                            onClick={(e) => scrollToSection(e, 'transparansi')}
                            className="hover:text-primary transition-colors"
                        >
                            Transparansi Dana
                        </a>
                        <a
                            href="#layanan"
                            onClick={(e) => scrollToSection(e, 'layanan')}
                            className="hover:text-primary transition-colors"
                        >
                            Cara Tunaikan
                        </a>
                        <a
                            href="#kontak"
                            onClick={(e) => scrollToSection(e, 'kontak')}
                            className="hover:text-primary transition-colors"
                        >
                            Kontak Person
                        </a>
                    </div>

                    <nav aria-label="Menu Portal Publik" className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                            <Link href="/dasar-hukum">
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                <span>Dasar Hukum</span>
                            </Link>
                        </Button>

                        <UserGuideDialog
                            currentRole={auth?.user?.peran ?? 'Publik'}
                            triggerVariant="outline"
                            triggerLabel="Panduan"
                        />

                        {installPrompt && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleInstallPwa}
                            >
                                <Smartphone className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Pasang App</span>
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
                                    <span>Login Panitia</span>
                                </Link>
                            </Button>
                        )}
                    </nav>
                </div>

                {/* Teks Berjalan (Running Text / Marquee) Pengumuman & Data Real-Time */}
                <div className="border-t bg-emerald-950 text-emerald-50 py-2 overflow-hidden laz-marquee-wrapper">
                    <div className="laz-marquee-track flex items-center gap-10 text-xs font-medium whitespace-nowrap">
                        {[...marqueeItems, ...marqueeItems].map((text, idx) => (
                            <span key={idx} className="inline-flex items-center gap-2">
                                <Megaphone className="h-3.5 w-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
                                <span>{text}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 space-y-12 laz-page-enter">
                <RdbmsAlert message={rdbmsError} />

                {/* SECTION 1: Hero & Ringkasan Kinerja Real-Time */}
                <section className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
                    <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border bg-gradient-to-br from-card via-card to-emerald-50/60 dark:to-emerald-950/20 p-6 sm:p-8 shadow-2xs space-y-6 laz-stagger-1">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success">
                                    <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                    LAZ Masjid Istiqamah, Rumbai
                                </Badge>
                                <Badge variant="outline">
                                    <CalendarClock className="mr-1 h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                    Periode {tahunHijriahLabel} ({tahunMasehiLabel})
                                </Badge>
                            </div>

                            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl leading-tight">
                                Menjaga Amanah Zakat Umat Secara Terbuka, Adil &amp; Sesuai Syariat
                            </h1>

                            <p className="text-sm text-muted-foreground leading-relaxed sm:text-base">
                                Lembaga Amil Zakat (LAZ) Masjid Istiqamah Rumbai melayani penghimpunan Zakat Fitrah, Zakat Profesi, dan Zakat Perniagaan serta menyalurkannya tepat sasaran kepada 8 golongan Asnaf di lingkungan Rumbai dan sekitarnya dengan pelaporan terbuka secara real-time.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button asChild size="lg">
                                <a href="#kalkulator">
                                    <Calculator className="h-4 w-4" aria-hidden="true" />
                                    <span>Hitung Zakat Anda</span>
                                </a>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <a href="#transparansi">
                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                    <span>Lihat Transparansi Dana</span>
                                </a>
                            </Button>
                            <Button asChild variant="ghost" size="lg">
                                <Link href="/dasar-hukum">
                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                    <span>Pasal &amp; Dasar Syariat</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* 4 Kartu KPI Real-Time */}
                    <div className="lg:col-span-5 grid grid-cols-2 gap-4 laz-stagger-2">
                        <Card className="laz-card-lift">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Saldo Zakat (Uang)</span>
                                </CardDescription>
                                <CardTitle className="text-lg sm:text-xl font-extrabold tabular-nums text-primary">
                                    {formatRupiah(agregatPublik.totalSaldoUang)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-[11px] text-muted-foreground">
                                Siap disalurkan melalui BKK yang disetujui Ketua DKM.
                            </CardContent>
                        </Card>

                        <Card className="laz-card-lift">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <Wheat className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span>Saldo Beras Fitrah</span>
                                </CardDescription>
                                <CardTitle className="text-lg sm:text-xl font-extrabold tabular-nums">
                                    {formatBerasKg(agregatPublik.totalSaldoBeras)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-[11px] text-muted-foreground">
                                Wajib habis tersalurkan sebelum Shalat Idul Fitri.
                            </CardContent>
                        </Card>

                        <Card className="laz-card-lift">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <HandCoins className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Telah Disalurkan</span>
                                </CardDescription>
                                <CardTitle className="text-lg sm:text-xl font-extrabold tabular-nums">
                                    {formatRupiah(agregatPublik.totalSalurUang)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-[11px] text-muted-foreground tabular-nums">
                                Ditambah {formatBerasKg(agregatPublik.totalSalurBeras)} beras zakat.
                            </CardContent>
                        </Card>

                        <Card className="laz-card-lift">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                                    <span>Mustahik Terbantu</span>
                                </CardDescription>
                                <CardTitle className="text-lg sm:text-xl font-extrabold tabular-nums">
                                    {agregatPublik.totalMustahikTerbantu} KK
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-[11px] text-muted-foreground">
                                Terverifikasi survei lapangan dari 8 golongan Asnaf.
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* SECTION 2: Profil Lembaga Amil Zakat Masjid Istiqamah, Rumbai */}
                <section id="profil" className="scroll-mt-36 space-y-6">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="space-y-1.5 max-w-2xl">
                            <Badge variant="outline">Tentang Lembaga</Badge>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                                Profil Lembaga Amil Zakat Masjid Istiqamah, Rumbai
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Berkhidmat untuk umat di Kecamatan Rumbai, Kota Pekanbaru dengan tata kelola zakat modern berbasis syariat Islam.
                            </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/dasar-hukum">
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                <span>Baca Pedoman Syariat &amp; UU Zakat</span>
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="laz-card-lift">
                            <CardHeader>
                                <Building2 className="h-6 w-6 text-primary mb-1" aria-hidden="true" />
                                <CardTitle className="text-base">Visi &amp; Misi Lembaga</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                <p>
                                    Menjadi pusat pengelolaan zakat masjid yang amanah, profesional, dan berdampak nyata dalam mengentaskan kemiskinan warga sekitar Masjid Istiqamah, Rumbai.
                                </p>
                                <p>
                                    Mengedepankan pendataan berbasis wilayah per <strong>Ketua RT / RW</strong> agar bantuan tepat sasaran tanpa ada warga rentan yang terlewat.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="laz-card-lift">
                            <CardHeader>
                                <Scale className="h-6 w-6 text-primary mb-1" aria-hidden="true" />
                                <CardTitle className="text-base">Keadilan 8 Asnaf &amp; Hak Amil ≤ 12,5%</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                <p>
                                    Seluruh dana zakat disalurkan sesuai <strong>QS. At-Taubah Ayat 60</strong>. Bagian Amil (ASN-03) dibatasi ketat maksimal <strong>12,50% (1/8 bagian)</strong> per kategori dana zakat.
                                </p>
                                <p>
                                    Sisa 87,50% (7/8 bagian) dilindungi penuh untuk Fakir, Miskin, Mualaf, Gharimin, Fisabilillah, dan Ibnu Sabil.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="laz-card-lift">
                            <CardHeader>
                                <CheckCircle2 className="h-6 w-6 text-primary mb-1" aria-hidden="true" />
                                <CardTitle className="text-base">Survei 365 Hari &amp; Audit Terbuka</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                                <p>
                                    Setiap calon penerima manfaat wajib melalui survei kelayakan oleh tim Verifikator (berlaku 365 hari) dan pencairan dana wajib disahkan oleh Ketua DKM.
                                </p>
                                <p>
                                    Identitas pribadi mustahik dan muzaki disamarkan (<em>masked</em>) di halaman publik demi menjaga kehormatan penerima dan privasi donatur.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* SECTION 3: Kalkulator Zakat Interaktif */}
                <section id="kalkulator" className="scroll-mt-36">
                    <Card className="overflow-hidden border-primary/20">
                        <CardHeader className="bg-accent/30 border-b">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-lg">
                                        Kalkulator Simulasi Zakat Jamaah
                                    </CardTitle>
                                </div>
                                <Badge variant="success">Interaktif &amp; Real-Time</Badge>
                            </div>
                            <CardDescription>
                                Hitung perkiraan Zakat Fitrah keluarga Anda maupun Zakat Penghasilan (Profesi 2,5%) sebelum menunaikannya di loket Masjid Istiqamah Rumbai.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                            {/* Zakat Fitrah */}
                            <div className="rounded-xl border bg-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold">1. Kalkulator Zakat Fitrah ({tahunHijriahLabel})</h3>
                                    <Badge variant="outline">1 Sha&apos; / Jiwa</Badge>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kalkulator-jiwa">Jumlah Jiwa Anggota Keluarga</Label>
                                    <Input
                                        id="kalkulator-jiwa"
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        placeholder="1"
                                        value={jiwaKalkulator}
                                        onChange={(e) => setJiwaKalkulator(e.target.value)}
                                        className="tabular-nums font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 rounded-lg bg-accent/40 p-3.5 text-xs">
                                    <div>
                                        <p className="text-muted-foreground">Jika Tunaikan Beras:</p>
                                        <p className="mt-1 text-base font-extrabold tabular-nums text-foreground">
                                            {formatBerasKg(jiwaNumeric * takaranBeras)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            ({formatBerasKg(takaranBeras)} / jiwa)
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Jika Tunaikan Uang:</p>
                                        <p className="mt-1 text-base font-extrabold tabular-nums text-primary">
                                            {formatRupiah(jiwaNumeric * tarifFitrah)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            ({formatRupiah(tarifFitrah)} / jiwa)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Zakat Profesi / Penghasilan */}
                            <div className="rounded-xl border bg-card p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold">2. Kalkulator Zakat Profesi / Mal (2,5%)</h3>
                                    <Badge variant="outline">Lintas Periode</Badge>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="kalkulator-penghasilan">
                                        Penghasilan / Harta Bersih per Bulan (Rp)
                                    </Label>
                                    <Input
                                        id="kalkulator-penghasilan"
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        placeholder="0"
                                        value={penghasilanBulanan}
                                        onChange={(e) => setPenghasilanBulanan(e.target.value)}
                                        className="tabular-nums font-bold"
                                    />
                                </div>
                                <div className="rounded-lg bg-accent/40 p-3.5 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Zakat Profesi 2,5% / Bulan:</span>
                                        <span className="text-base font-extrabold tabular-nums text-primary">
                                            {formatRupiah(zakatProfesiBulanan)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Acuan nishab Fatwa MUI No. 3/2003 setara 85 gram emas per tahun. Dana Zakat Profesi dikelola sepanjang tahun.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* SECTION 4: Portal Data Transparansi Real-Time */}
                <section id="transparansi" className="scroll-mt-36 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-lg">
                                        Laporan Transparansi Dana &amp; Penyaluran Publik
                                    </CardTitle>
                                </div>
                                <CardDescription>
                                    Data bersumber langsung dari laporan resmi read-only masjid dengan penyamaran identitas demi menjaga privasi mustahik &amp; muzaki. Data penyaluran ditampilkan berdasarkan tahun berjalan ({tahunMasehiLabel} M / {tahunHijriahLabel}).
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
                                        Saldo Kantong Dana ({saldoDana.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="asnaf">
                                        Distribusi 8 Asnaf ({rekapAsnaf.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="penyaluran">
                                        Riwayat Penyaluran ({laporanPenyaluranPublik.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="muzaki">
                                        Rekap Muzaki ({rekapMuzaki.length})
                                    </TabsTrigger>
                                </TabsList>

                                {/* TAB 1: Saldo Kantong Dana */}
                                <TabsContent value="saldo" className="space-y-4 pt-4">
                                    <div className="grid gap-3 sm:grid-cols-12">
                                        <div className="sm:col-span-7 relative">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                type="search"
                                                placeholder="Cari kode atau nama kantong dana..."
                                                value={cariDana}
                                                onChange={(e) => setCariDana(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <div className="sm:col-span-5">
                                            <Select
                                                value={filterKategoriDana}
                                                onValueChange={setFilterKategoriDana}
                                            >
                                                <SelectTrigger aria-label="Filter Kategori Dana Publik">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SEMUA">Semua Kategori Zakat</SelectItem>
                                                    <SelectItem value="Zakat">Zakat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {filteredSaldo.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                            Belum ada data saldo dana yang sesuai filter.
                                        </div>
                                    ) : (
                                        <div className="max-h-96 overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead>Kode</TableHead>
                                                        <TableHead>Nama Kantong Dana</TableHead>
                                                        <TableHead>Kategori</TableHead>
                                                        <TableHead className="text-right">Saldo Uang</TableHead>
                                                        <TableHead className="text-right">Saldo Beras</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSaldo.map((row) => (
                                                        <TableRow key={row.kode_dana}>
                                                            <TableCell className="font-mono text-xs font-bold">
                                                                {row.kode_dana}
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-sm">{row.nama_dana}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Induk: {row.induk_dana || 'Induk Utama'}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getKategoriVariant(row.kategori_utama)}>
                                                                    {row.kategori_utama.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* TAB 2: Distribusi 8 Asnaf */}
                                <TabsContent value="asnaf" className="space-y-3 pt-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                                        <span className="text-muted-foreground">
                                            Menampilkan realisasi penyaluran 8 golongan Asnaf berdasarkan tahun berjalan.
                                        </span>
                                        <Badge variant="outline">Tahun {tahunMasehiLabel} M ({tahunHijriahLabel})</Badge>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {rekapAsnaf.map((a) => {
                                            const nominal = Number.parseFloat(String(a.total_nominal_disalurkan)) || 0;
                                            const porsi =
                                                agregatPublik.totalSalurUang > 0
                                                    ? (nominal / agregatPublik.totalSalurUang) * 100
                                                    : 0;
                                            return (
                                                <div
                                                    key={a.kode_asnaf}
                                                    className="rounded-xl border bg-card p-4 space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="font-mono">
                                                                {a.kode_asnaf}
                                                            </Badge>
                                                            <span className="font-bold text-sm">{a.nama_asnaf}</span>
                                                        </div>
                                                        <Badge variant="success" className="tabular-nums">
                                                            {formatPercentage(porsi)}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ASNAF_DESCRIPTIONS[a.kode_asnaf] ?? ''}
                                                    </p>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${Math.min(100, porsi)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs tabular-nums pt-0.5">
                                                        <span className="text-muted-foreground">
                                                            {a.jumlah_mustahik_terbantu} mustahik terbantu
                                                        </span>
                                                        <span className="font-bold text-primary">
                                                            {formatRupiah(a.total_nominal_disalurkan)} •{' '}
                                                            {formatBerasKg(a.total_beras_disalurkan_kg)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </TabsContent>

                                {/* TAB 3: Riwayat Penyaluran BKK (Masked) */}
                                <TabsContent value="penyaluran" className="space-y-4 pt-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                                        <span className="text-muted-foreground">
                                            Riwayat penyaluran BKK resmi berdasarkan tahun berjalan (terurut dari yang terbaru).
                                        </span>
                                        <Badge variant="outline">Tahun {tahunMasehiLabel} M</Badge>
                                    </div>
                                    <div className="relative max-w-md">
                                        <Search
                                            className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <Input
                                            type="search"
                                            placeholder="Cari No. BKK, program, atau golongan asnaf..."
                                            value={cariPenyaluran}
                                            onChange={(e) => setCariPenyaluran(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    {filteredPenyaluran.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                            Belum ada riwayat penyaluran BKK yang cocok dengan pencarian Anda.
                                        </div>
                                    ) : (
                                        <div className="max-h-96 overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead>No. BKK &amp; Tanggal</TableHead>
                                                        <TableHead>Program &amp; Asnaf</TableHead>
                                                        <TableHead>Penerima (Tersamar)</TableHead>
                                                        <TableHead className="text-right">Nominal</TableHead>
                                                        <TableHead className="text-right">Beras</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredPenyaluran.map((row, idx) => (
                                                        <TableRow key={`${row.no_bkk}-${idx}`}>
                                                            <TableCell>
                                                                <p className="font-mono text-xs font-bold">{row.no_bkk}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatTanggalIndonesia(row.tanggal_penyaluran)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-xs">{row.nama_program}</p>
                                                                <Badge variant="outline" className="mt-0.5 text-[10px]">
                                                                    {row.nama_asnaf}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-xs">
                                                                    {row.nama_mustahik_masked}
                                                                </p>
                                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                                    {row.nik_mustahik_masked}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary text-xs">
                                                                {formatRupiah(row.nominal_diterima)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums text-xs">
                                                                {formatBerasKg(row.beras_diterima_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* TAB 4: Rekap Kontribusi Muzaki */}
                                <TabsContent value="muzaki" className="pt-4">
                                    {rekapMuzaki.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                            Belum ada rekap penghimpunan muzaki pada periode berjalan.
                                        </div>
                                    ) : (
                                        <div className="max-h-96 overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead>Periode</TableHead>
                                                        <TableHead>Muzaki (NIK Tersamar)</TableHead>
                                                        <TableHead className="text-right">Total Uang</TableHead>
                                                        <TableHead className="text-right">Total Beras</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {rekapMuzaki.map((m, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="text-xs font-medium">
                                                                {m.tahun_hijriah} ({m.tahun_masehi})
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-xs">
                                                                    {String(m.nama_muzaki_masked ?? m.nama_muzaki ?? m.nama_lengkap ?? 'Muzaki')}
                                                                </p>
                                                                <p className="font-mono text-[11px] text-muted-foreground">
                                                                    {m.nik_muzaki_masked ?? m.nik_masked ?? '-'}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary text-xs">
                                                                {formatRupiah(Number(m.total_donasi_uang ?? m.total_nominal ?? 0))}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums text-xs">
                                                                {formatBerasKg(Number(m.total_donasi_beras_kg ?? m.total_beras_kg ?? 0))}
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
                </section>

                {/* SECTION 5: Cara Menunaikan Zakat di Masjid Istiqamah, Rumbai */}
                <section id="layanan" className="scroll-mt-36 space-y-6">
                    <div className="space-y-1.5">
                        <Badge variant="outline">Layanan Jamaah</Badge>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                            Cara Menunaikan Zakat di LAZ Masjid Istiqamah, Rumbai
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Tiga langkah mudah menunaikan Zakat Fitrah, Zakat Profesi, dan Zakat Perniagaan dengan bukti kwitansi resmi.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border bg-card p-5 space-y-2 laz-card-lift">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                1
                            </span>
                            <h3 className="text-sm font-bold">Hitung &amp; Siapkan Niat Zakat</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Gunakan kalkulator di atas untuk menghitung kewajiban Zakat Fitrah sesuai jumlah anggota keluarga atau Zakat Mal 2,5%.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-card p-5 space-y-2 laz-card-lift">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                2
                            </span>
                            <h3 className="text-sm font-bold">Setor via Loket Masjid atau Transfer/QRIS</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Kunjungi Loket Amil di Sekretariat Masjid Istiqamah Rumbai (uang tunai atau beras) atau konfirmasikan transfer ke kontak person resmi di bawah.
                            </p>
                        </div>

                        <div className="rounded-2xl border bg-card p-5 space-y-2 laz-card-lift">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                3
                            </span>
                            <h3 className="text-sm font-bold">Terima Kwitansi &amp; Pantau Penyaluran</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Petugas menerbitkan kwitansi resmi bernomor unik (`KWZ-*`) dan dana langsung terpantau secara real-time di portal transparansi ini.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* FOOTER INFORMATIF & KONTAK PERSON */}
            <footer id="kontak" className="scroll-mt-36 border-t bg-card mt-12">
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                    <div className="grid gap-8 md:grid-cols-12">
                        <div className="md:col-span-5 space-y-3">
                            <div className="flex items-center gap-2.5">
                                <img
                                    src="/icons/icon.svg"
                                    alt="Logo LAZ Masjid Istiqamah"
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-lg"
                                />
                                <div>
                                    <p className="text-sm font-bold">LAZ Masjid Istiqamah, Rumbai</p>
                                    <p className="text-xs text-muted-foreground">
                                        Amanah Mengelola, Tepat Menyalurkan
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Unit Pengumpul &amp; Penyalur Zakat resmi di lingkungan Masjid Istiqamah, Kecamatan Rumbai, Kota Pekanbaru, Provinsi Riau. Dikelola secara terbuka sesuai syariat Islam dan UU No. 23 Tahun 2011.
                            </p>
                            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                                <span>
                                    Komplek Masjid Istiqamah, Kec. Rumbai, Kota Pekanbaru, Riau 28265
                                </span>
                            </div>
                        </div>

                        <div className="md:col-span-4 space-y-3">
                            <p className="text-sm font-bold">Kontak Person &amp; Layanan Loket</p>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex items-start gap-2">
                                    <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            Sekretariat &amp; Koordinator Amil
                                        </p>
                                        <p className="text-muted-foreground">
                                            Ustadz Ahmad Fauzi (Ketua DKM) / Rizky Pratama (Loket)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span className="font-semibold tabular-nums">
                                        0812-7500-0002 / 0812-7500-0003 (WhatsApp)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span>laz@masjidistiqamah-rumbai.id</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                                    <span className="text-muted-foreground">
                                        Jam Loket: Setiap Hari 08.00 – 21.00 WIB (Ramadhan) &amp; Ba&apos;da Maghrib (Reguler)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-3 space-y-3">
                            <p className="text-sm font-bold">Tautan Cepat</p>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li>
                                    <a href="#profil" className="hover:text-primary transition-colors">
                                        Profil LAZ Masjid Istiqamah
                                    </a>
                                </li>
                                <li>
                                    <a href="#kalkulator" className="hover:text-primary transition-colors">
                                        Kalkulator Zakat Fitrah &amp; Mal
                                    </a>
                                </li>
                                <li>
                                    <a href="#transparansi" className="hover:text-primary transition-colors">
                                        Laporan Transparansi Real-Time
                                    </a>
                                </li>
                                <li>
                                    <Link href="/dasar-hukum" className="hover:text-primary transition-colors">
                                        Dasar Hukum Syariat &amp; Pasal Zakat
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/login" className="hover:text-primary transition-colors font-semibold text-primary">
                                        Portal Login Panitia / DKM
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <p>
                            &copy; {tahunMasehiLabel} Lembaga Amil Zakat Masjid Istiqamah, Rumbai. Seluruh hak cipta dilindungi.
                        </p>
                        <p>
                            Transparansi Publik Real-Time • Perlindungan 8 Golongan Asnaf &amp; Hak Amil Maksimal 12,5%
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
