import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LazySection } from '@/components/zis/LazySection';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { UserGuideDialog } from '@/components/zis/UserGuideDialog';
import { formatBerasKg, formatPercentage, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type {
    GaleriKegiatanItem,
    KategoriGaleri,
    KategoriUtamaDana,
    SharedProps,
    ViewLaporanPenyaluranPublik,
    ViewRekapPenghimpunanMuzaki,
    ViewRekapPenyaluranAsnaf,
    ViewSaldoJenisDana,
} from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowUp,
    BookOpen,
    Building2,
    Calculator,
    CalendarClock,
    Camera,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Database,
    Expand,
    Eye,
    HandCoins,
    Images,
    KeyRound,
    LayoutDashboard,
    Mail,
    MapPin,
    Megaphone,
    Menu,
    Minus,
    Phone,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Smartphone,
    Users,
    Wallet,
    Wheat,
    X,
} from 'lucide-react';
import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TransparansiProps {
    saldoDana: ViewSaldoJenisDana[];
    rekapAsnaf: ViewRekapPenyaluranAsnaf[];
    laporanPenyaluranPublik: ViewLaporanPenyaluranPublik[];
    rekapMuzaki?: ViewRekapPenghimpunanMuzaki[];
    galeriKegiatan?: GaleriKegiatanItem[];
    rdbmsError?: string | null;
}

const KATEGORI_LABEL_MAP: Record<string, string> = {
    Zakat_Fitrah: 'Zakat Fitrah',
    Zakat_Mal: 'Zakat Mal & Profesi',
    Santunan_Dhuafa: 'Santunan Yatim & Dhuafa',
    Pemberdayaan: 'Pemberdayaan Usaha',
    Tanggap_Bencana: 'Tanggap Bencana',
    Kegiatan_Amil: 'Layanan Amil',
};

const GALERI_KATEGORI_FILTERS = [
    { key: 'SEMUA', label: 'Semua Bukti' },
    { key: 'Zakat_Fitrah', label: 'Zakat Fitrah' },
    { key: 'Zakat_Mal', label: 'Zakat Mal' },
    { key: 'Santunan_Dhuafa', label: 'Santunan Yatim' },
    { key: 'Pemberdayaan', label: 'Pemberdayaan' },
    { key: 'Kegiatan_Amil', label: 'Layanan Amil' },
] as const;

const ASNAF_DESCRIPTIONS: Record<string, string> = {
    'ASN-01': 'Fakir: Warga yang tidak memiliki harta maupun tenaga untuk memenuhi kebutuhan pokok.',
    'ASN-02': 'Miskin: Warga yang memiliki penghasilan namun belum mencukupi kebutuhan dasar keluarga.',
    'ASN-03': 'Amil: Pengurus dan panitia pengelola zakat, dibatasi syariat maksimal 12,50% per kategori.',
    'ASN-04': 'Mualaf: Saudara baru yang membutuhkan penguatan iman dan dukungan sosial.',
    'ASN-05': 'Riqab: Pembebasan dari belenggu penindasan atau perbudakan.',
    'ASN-06': 'Gharimin: Warga yang terlilit utang demi memenuhi kebutuhan hidup yang halal.',
    'ASN-07': 'Fisabilillah: Pejuang dakwah, pendidikan keislaman, dan kemaslahatan umat.',
    'ASN-08': 'Ibnu Sabil: Musafir yang kehabisan bekal dalam perjalanan ketaatan.',
};

const PROFIL_PILLARS = [
    {
        id: 'audit',
        title: 'Pencatatan Terjaga & Dapat Diaudit',
        subtitle: 'Akuntabilitas Keuangan Zakat',
        summary:
            'Setiap penerimaan zakat (kwitansi resmi) dan penyaluran dana (Bukti Kas Keluar) dicatat secara otomatis oleh sistem sehingga saldo uang dan beras tidak dapat diubah sembarangan.',
        points: [
            'Saldo uang dan takaran beras tersinkronisasi otomatis tanpa hitung manual.',
            'Setiap persetujuan dan pencairan dana tercatat lengkap beserta identitas pengurus.',
            'Pembatalan kwitansi hanya dapat dilakukan melalui mekanisme koreksi resmi yang tercatat.',
        ],
    },
    {
        id: 'syariat',
        title: 'Tepat Sasaran 8 Asnaf & Batas Amil',
        subtitle: 'Sesuai QS. At-Taubah: 60 & Fatwa MUI',
        summary:
            'Penyaluran hanya diberikan kepada delapan golongan yang berhak menerima zakat. Dana operasional Amil (ASN-03) dijaga ketat agar tidak melampaui batas syariat 12,50%.',
        points: [
            'Kelayakan penerima manfaat diverifikasi melalui survei lapangan yang diperbarui tiap tahun.',
            'Riwayat penerimaan per kepala keluarga dipantau agar bantuan terbagi merata.',
            'Beras Zakat Fitrah dipastikan habis tersalurkan sebelum Shalat Idul Fitri.',
        ],
    },
    {
        id: 'privasi',
        title: 'Terbuka untuk Publik, Menjaga Privasi',
        subtitle: 'Transparansi yang Bermartabat',
        summary:
            'Jamaah dapat memantau arus dana masuk, saldo tersedia, dan penyaluran secara langsung tanpa membuka identitas pribadi penerima maupun donatur.',
        points: [
            'Nomor induk kependudukan dan nama lengkap penerima disamarkan secara otomatis.',
            'Rekap penyaluran per golongan Asnaf dan riwayat BKK diperbarui secara langsung.',
            'Daftar setoran muzaki terbaru ditampilkan dengan tetap melindungi data pribadi.',
        ],
    },
] as const;

const NAV_ITEMS = [
    { id: 'profil', label: 'Profil Lembaga' },
    { id: 'galeri', label: 'Galeri Kegiatan' },
    { id: 'kalkulator', label: 'Kalkulator Zakat' },
    { id: 'transparansi', label: 'Transparansi Dana' },
    { id: 'layanan', label: 'Cara Tunaikan' },
    { id: 'kontak', label: 'Kontak' },
] as const;

export default function TransparansiPublik({
    saldoDana = [],
    rekapAsnaf = [],
    laporanPenyaluranPublik = [],
    rekapMuzaki = [],
    galeriKegiatan = [],
    rdbmsError,
}: TransparansiProps) {
    const { auth, periodeAktif } = usePage<SharedProps>().props;
    const isAuthenticated = Boolean(auth?.user);
    const isAdmin = auth?.user?.peran === 'Admin';

    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState<boolean>(false);
    const [activeSection, setActiveSection] = React.useState<string>('profil');
    const [showBackToTop, setShowBackToTop] = React.useState<boolean>(false);
    const [activePillarId, setActivePillarId] = React.useState<string>('audit');

    // Filter & Lightbox Galeri Dokumentasi Kegiatan
    const [galeriKategori, setGaleriKategori] = React.useState<string>('SEMUA');
    const [activeFotoModal, setActiveFotoModal] = React.useState<GaleriKegiatanItem | null>(null);
    const [activeFotoIndex, setActiveFotoIndex] = React.useState<number>(0);

    const filteredGaleri = React.useMemo(() => {
        if (galeriKategori === 'SEMUA') return galeriKegiatan;
        return galeriKegiatan.filter((item) => item.kategori === galeriKategori);
    }, [galeriKegiatan, galeriKategori]);

    const openLightbox = (item: GaleriKegiatanItem) => {
        const idx = filteredGaleri.findIndex((g) => g.id === item.id);
        setActiveFotoIndex(idx >= 0 ? idx : 0);
        setActiveFotoModal(item);
    };

    const nextFoto = () => {
        if (filteredGaleri.length === 0) return;
        const nextIdx = (activeFotoIndex + 1) % filteredGaleri.length;
        setActiveFotoIndex(nextIdx);
        setActiveFotoModal(filteredGaleri[nextIdx]);
    };

    const prevFoto = () => {
        if (filteredGaleri.length === 0) return;
        const prevIdx = (activeFotoIndex - 1 + filteredGaleri.length) % filteredGaleri.length;
        setActiveFotoIndex(prevIdx);
        setActiveFotoModal(filteredGaleri[prevIdx]);
    };

    // Filter Tabel Publik
    const [cariDana, setCariDana] = React.useState<string>('');
    const [filterKategoriDana, setFilterKategoriDana] = React.useState<string>('SEMUA');
    const [cariPenyaluran, setCariPenyaluran] = React.useState<string>('');

    // Simulasi Kalkulator Zakat Jamaah Interaktif
    const [modeFitrah, setModeFitrah] = React.useState<'uang' | 'beras'>('uang');
    const [jiwaKalkulator, setJiwaKalkulator] = React.useState<number>(4);
    const [penghasilanBulanan, setPenghasilanBulanan] = React.useState<string>('10000000');
    const tarifFitrah = Number(periodeAktif?.nominal_fitrah_per_jiwa ?? 45000);
    const takaranBeras = Number(periodeAktif?.beras_per_jiwa_kg ?? 2.5);
    const penghasilanNumeric = Math.max(0, Number.parseFloat(penghasilanBulanan) || 0);
    const nishabTahunanReferensi = 91681728; // SK Ketua BAZNAS RI Nomor 15 Tahun 2026 setara 85 gram emas
    const nishabBulananReferensi = 7640144; // Rp91.681.728 / 12 bulan = Rp7.640.144 per bulan
    const wajibZakatProfesi = penghasilanNumeric >= nishabBulananReferensi;
    const zakatProfesiBulanan = wajibZakatProfesi ? Math.round(penghasilanNumeric * 0.025) : 0;

    React.useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    React.useEffect(() => {
        const onScroll = () => {
            setShowBackToTop(window.scrollY > 420);
            if (window.scrollY < 260) {
                setActiveSection('');
                return;
            }
            const offset = 180;
            for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
                const el = document.getElementById(NAV_ITEMS[i].id);
                if (el && el.getBoundingClientRect().top <= offset) {
                    setActiveSection(NAV_ITEMS[i].id);
                    break;
                }
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
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
            setMobileMenuOpen(false);
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

        for (const item of saldoDana) {
            totalSaldoUang += Number(item.saldo_tersedia) || 0;
            totalSaldoBeras += Number(item.saldo_beras_kg) || 0;
        }

        const totalMustahikTerbantu = rekapAsnaf.reduce(
            (acc, row) => acc + (Number(row.jumlah_mustahik_terbantu) || 0),
            0
        );

        const totalAsnafUang = rekapAsnaf.reduce(
            (acc, row) => acc + (Number(row.total_nominal_disalurkan) || 0),
            0
        );

        return {
            totalSaldoUang,
            totalSaldoBeras,
            totalSalurUang: totalAsnafUang,
            totalMustahikTerbantu,
            totalAsnafUang,
        };
    }, [saldoDana, rekapAsnaf]);

    const filteredSaldoDana = React.useMemo(() => {
        const q = cariDana.trim().toLowerCase();
        return saldoDana.filter((row) => {
            const cocokKategori =
                filterKategoriDana === 'SEMUA' || row.kategori_utama === filterKategoriDana;
            if (!cocokKategori) return false;
            if (q === '') return true;
            return (
                row.kode_dana.toLowerCase().includes(q) ||
                row.nama_dana.toLowerCase().includes(q)
            );
        });
    }, [saldoDana, cariDana, filterKategoriDana]);

    const filteredPenyaluran = React.useMemo(() => {
        const q = cariPenyaluran.trim().toLowerCase();
        if (q === '') return laporanPenyaluranPublik;
        return laporanPenyaluranPublik.filter(
            (row) =>
                row.no_bkk.toLowerCase().includes(q) ||
                row.nama_program.toLowerCase().includes(q) ||
                (row.golongan_asnaf ?? row.nama_asnaf ?? '').toLowerCase().includes(q) ||
                (row.sumber_dana ?? row.nama_dana ?? '').toLowerCase().includes(q)
        );
    }, [laporanPenyaluranPublik, cariPenyaluran]);

    const tahunHijriahLabel = periodeAktif?.tahun_hijriah ?? rekapMuzaki[0]?.tahun_hijriah ?? '1447 H';
    const tahunMasehiLabel = periodeAktif?.tahun_masehi ?? rekapMuzaki[0]?.tahun_masehi ?? 2026;
    const selectedPillar = PROFIL_PILLARS.find((p) => p.id === activePillarId) ?? PROFIL_PILLARS[0];

    const marqueeItems = [
        `LAZ Masjid Istiqamah Rumbai, Periode ${tahunHijriahLabel} (${tahunMasehiLabel} M)`,
        `Ketetapan Zakat Fitrah: ${formatRupiah(tarifFitrah)} atau ${formatBerasKg(takaranBeras)} per jiwa`,
        `Saldo Zakat Tersedia: ${formatRupiah(agregatPublik.totalSaldoUang)} & ${formatBerasKg(agregatPublik.totalSaldoBeras)}`,
        `Total Dana Tersalurkan Tahun Berjalan: ${formatRupiah(agregatPublik.totalSalurUang)} kepada ${agregatPublik.totalMustahikTerbantu} mustahik`,
        'Audit Syariat Terjaga: Hak Amil dibatasi paling tinggi 12,50% per kategori zakat',
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/25 selection:text-foreground">
            <Head title="LAZ Masjid Istiqamah Rumbai | Portal Transparansi Zakat" />
            <OfflineBanner />

            {/* Navigasi Minimalis 64px Editorial Anthropic dengan Link Terfokus & Dropdown */}
            <header
                ref={headerRef}
                className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xs"
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                    {/* Brand / Logo */}
                    <Link
                        href="/"
                        onClick={(e) => {
                            if (window.location.pathname === '/' || window.location.pathname === '/transparansi') {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                        }}
                        className="flex items-center gap-2.5 min-h-[44px] shrink-0 focus:outline-none focus:ring-2 focus:ring-ring rounded-lg p-1"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-card shadow-2xs">
                            <img
                                src="/icons/icon-192x192.png"
                                alt="Logo Yayasan Istiqamah Rumbai Pesisir"
                                width={28}
                                height={28}
                                fetchPriority="high"
                                className="h-7 w-7 object-contain"
                            />
                        </div>
                        <div className="leading-tight min-w-0">
                            <p className="font-serif text-base font-medium tracking-tight text-foreground truncate">
                                LAZ Masjid Istiqamah
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                                Rumbai • Transparansi ZIS
                            </p>
                        </div>
                    </Link>

                    {/* Navigasi Desktop: Ramping, Berurutan & Ringkas dengan Pengelompokan Dropdown */}
                    <nav aria-label="Navigasi Ruang Publik" className="hidden lg:flex items-center gap-1 xl:gap-2">
                        {/* 1. Dropdown: Profil & Galeri (Section 01 & 02) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 xl:px-3 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                                        ['profil', 'galeri'].includes(activeSection)
                                            ? 'bg-accent/70 text-primary font-semibold'
                                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                    }`}
                                >
                                    <Building2 className="h-4 w-4" aria-hidden="true" />
                                    <span>Profil<span className="hidden xl:inline"> &amp; Galeri</span></span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-60 p-1.5 space-y-0.5">
                                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Profil &amp; Dokumentasi
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <a
                                        href="#profil"
                                        onClick={(e) => scrollToSection(e, 'profil')}
                                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <Building2 className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">01 · Profil &amp; Tata Kelola</span>
                                            <span className="text-[10px] text-muted-foreground">Struktur panitia &amp; legalitas</span>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href="#galeri"
                                        onClick={(e) => scrollToSection(e, 'galeri')}
                                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <Images className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">02 · Galeri Bukti Penyaluran</span>
                                            <span className="text-[10px] text-muted-foreground">Dokumentasi kegiatan nyata</span>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* 2. Tombol Langsung: Kalkulator Zakat (Section 03) */}
                        <a
                            href="#kalkulator"
                            onClick={(e) => scrollToSection(e, 'kalkulator')}
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 xl:px-3 text-[13px] font-medium transition-colors ${
                                activeSection === 'kalkulator'
                                    ? 'bg-accent/70 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                        >
                            <Calculator className="h-4 w-4" aria-hidden="true" />
                            <span>Kalkulator</span>
                        </a>

                        {/* 3. Tombol Langsung: Transparansi Dana (Section 04) */}
                        <a
                            href="#transparansi"
                            onClick={(e) => scrollToSection(e, 'transparansi')}
                            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 xl:px-3 text-[13px] font-medium transition-colors ${
                                activeSection === 'transparansi'
                                    ? 'bg-accent/70 text-primary font-semibold'
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            }`}
                        >
                            <Database className="h-4 w-4" aria-hidden="true" />
                            <span>Transparansi<span className="hidden xl:inline"> Dana</span></span>
                        </a>

                        {/* 4. Dropdown: Layanan, Syariat & Kontak (Section 05 & 06) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-2.5 xl:px-3 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                                        ['layanan', 'kontak'].includes(activeSection)
                                            ? 'bg-accent/70 text-primary font-semibold'
                                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                    }`}
                                >
                                    <HandCoins className="h-4 w-4" aria-hidden="true" />
                                    <span>Layanan<span className="hidden xl:inline"> &amp; Kontak</span></span>
                                    <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 p-1.5 space-y-0.5">
                                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Informasi &amp; Syariat
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <a
                                        href="#layanan"
                                        onClick={(e) => scrollToSection(e, 'layanan')}
                                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <HandCoins className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">05 · Cara Tunaikan ZIS</span>
                                            <span className="text-[10px] text-muted-foreground">Rekening BSI, QRIS &amp; loket</span>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href="/dasar-hukum"
                                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">Dasar Hukum Syariat</span>
                                            <span className="text-[10px] text-muted-foreground">QS. At-Taubah &amp; Fatwa MUI</span>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href="#kontak"
                                        onClick={(e) => scrollToSection(e, 'kontak')}
                                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                    >
                                        <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground">06 · Kontak &amp; Lokasi</span>
                                            <span className="text-[10px] text-muted-foreground">Sekretariat &amp; Lokasi Masjid</span>
                                        </div>
                                    </a>
                                </DropdownMenuItem>
                                {installPrompt && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleInstallPwa}
                                            className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                                        >
                                            <Smartphone className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">Pasang Aplikasi</span>
                                                <span className="text-[10px] text-muted-foreground">Akses cepat di layar HP</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </nav>

                    {/* Utilitas & Tombol Masuk Desktop (Hanya 3 elemen bersih) */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                        <UserGuideDialog
                            currentRole={auth?.user?.peran ?? 'Publik'}
                            triggerVariant="outline"
                            triggerLabel="Panduan"
                        />
                        <ThemeToggle className="h-9 w-9" />
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
                                    <span>Masuk Panitia</span>
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Tampilan Mobile & Tablet (< lg): ThemeToggle + Hamburger Drawer */}
                    <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
                        <ThemeToggle className="h-9 w-9" />

                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label="Buka Menu Navigasi"
                                    className="h-10 w-10 border-border"
                                >
                                    <Menu className="h-5 w-5" aria-hidden="true" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="flex w-80 max-w-[85vw] flex-col justify-between overflow-y-auto border-l border-border bg-background p-5 text-foreground"
                            >
                                <div className="space-y-5">
                                    <SheetHeader className="border-b border-border pb-4 text-left">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-card">
                                                <img
                                                    src="/icons/icon-192x192.png"
                                                    alt="Logo Yayasan Istiqamah Rumbai Pesisir"
                                                    width={28}
                                                    height={28}
                                                    className="h-7 w-7 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <SheetTitle className="font-serif text-base font-medium text-foreground">
                                                    LAZ Masjid Istiqamah
                                                </SheetTitle>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Portal Transparansi &amp; ZIS Rumbai
                                                </p>
                                            </div>
                                        </div>
                                    </SheetHeader>

                                    <div className="space-y-1">
                                        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Navigasi Berurutan
                                        </p>
                                        <a
                                            href="#profil"
                                            onClick={(e) => scrollToSection(e, 'profil')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'profil'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>01 · Profil &amp; Tata Kelola</span>
                                        </a>
                                        <a
                                            href="#galeri"
                                            onClick={(e) => scrollToSection(e, 'galeri')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'galeri'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Images className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>02 · Galeri Bukti Penyaluran</span>
                                        </a>
                                        <a
                                            href="#kalkulator"
                                            onClick={(e) => scrollToSection(e, 'kalkulator')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'kalkulator'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>03 · Kalkulator Zakat</span>
                                        </a>
                                        <a
                                            href="#transparansi"
                                            onClick={(e) => scrollToSection(e, 'transparansi')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'transparansi'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>04 · Transparansi Dana</span>
                                        </a>
                                        <a
                                            href="#layanan"
                                            onClick={(e) => scrollToSection(e, 'layanan')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'layanan'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <HandCoins className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>05 · Cara Tunaikan ZIS</span>
                                        </a>
                                        <a
                                            href="#kontak"
                                            onClick={(e) => scrollToSection(e, 'kontak')}
                                            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                                                activeSection === 'kontak'
                                                    ? 'bg-primary text-primary-foreground font-semibold'
                                                    : 'text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                                            <span>06 · Kontak &amp; Lokasi</span>
                                        </a>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-border">
                                        <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Syariat &amp; Panduan
                                        </p>
                                        <Link
                                            href="/dasar-hukum"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
                                        >
                                            <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                            <span>Dasar Hukum Syariat</span>
                                        </Link>
                                        <div className="px-1 py-1">
                                            <UserGuideDialog
                                                currentRole={auth?.user?.peran ?? 'Publik'}
                                                triggerVariant="outline"
                                                triggerLabel="Buka Panduan Jamaah"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border">
                                    {installPrompt && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-center min-h-[44px]"
                                            onClick={handleInstallPwa}
                                        >
                                            <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                                            <span>Pasang Aplikasi di HP</span>
                                        </Button>
                                    )}

                                    <Link
                                        href={isAuthenticated ? '/dashboard' : '/login'}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                        {isAuthenticated ? (
                                            <>
                                                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                                                <span>Buka Beranda Panitia</span>
                                            </>
                                        ) : (
                                            <>
                                                <KeyRound className="h-4 w-4" aria-hidden="true" />
                                                <span>Masuk Akun Panitia</span>
                                            </>
                                        )}
                                    </Link>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                {/* Strip Pengumuman Berjalan Editorial */}
                <div className="border-t border-border bg-secondary py-2 overflow-hidden laz-marquee-wrapper">
                    <div className="laz-marquee-track flex items-center gap-12 text-xs text-muted-foreground whitespace-nowrap">
                        {[...marqueeItems, ...marqueeItems].map((text, idx) => (
                            <span key={idx} className="inline-flex items-center gap-2">
                                <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                <span>{text}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 space-y-20 laz-page-enter">
                <RdbmsAlert message={rdbmsError} />

                {/* SECTION 1: Hero Editorial & 4 Kartu KPI Datar */}
                <section className="grid gap-10 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-7 space-y-6 laz-stagger-1">
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-primary">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>LAZ Masjid Istiqamah, Rumbai</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                <span>
                                    Periode {tahunHijriahLabel} ({tahunMasehiLabel} M)
                                </span>
                            </span>
                        </div>

                        <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-foreground max-w-3xl">
                            Menjaga <span className="text-primary">Amanah Zakat</span> Secara Terbuka dan Tepat Sasaran.
                        </h1>

                        <p className="max-w-3xl text-[17px] leading-[1.75] text-muted-foreground">
                            Setiap rupiah dan kilogram beras yang Anda tunaikan melalui Masjid Istiqamah Rumbai dicatat secara transparan, diaudit di tingkat basis data, dan disalurkan kepada delapan golongan Asnaf sesuai tuntunan syariat.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <a
                                href="#kalkulator"
                                onClick={(e) => scrollToSection(e, 'kalkulator')}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                <Calculator className="h-4 w-4" aria-hidden="true" />
                                <span>Hitung Zakat Anda</span>
                            </a>
                            <a
                                href="#transparansi"
                                onClick={(e) => scrollToSection(e, 'transparansi')}
                                className="inline-flex min-h-[44px] items-center gap-2 rounded border border-primary bg-transparent px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                                <span>Lihat Data Transparansi</span>
                            </a>
                            <Link
                                href="/dasar-hukum"
                                className="inline-flex min-h-[44px] items-center gap-2 rounded px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                            >
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                <span>Dasar Syariat</span>
                            </Link>
                        </div>
                    </div>

                    {/* 4 Kartu KPI Datar & Tegas */}
                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 laz-stagger-2">
                        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Saldo Zakat (Uang)</span>
                                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <p className="font-mono text-xl font-medium tabular-nums text-primary">
                                {formatRupiah(agregatPublik.totalSaldoUang)}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Siap disalurkan melalui BKK yang disetujui Ketua DKM.
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Saldo Beras Fitrah</span>
                                <Wheat className="h-4 w-4 text-[#9E5634] dark:text-[#C17A56]" aria-hidden="true" />
                            </div>
                            <p className="font-mono text-xl font-medium tabular-nums text-foreground">
                                {formatBerasKg(agregatPublik.totalSaldoBeras)}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Wajib habis tersalurkan sebelum Shalat Idul Fitri.
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Tersalurkan ({tahunMasehiLabel})</span>
                                <HandCoins className="h-4 w-4 text-emerald-700 dark:text-[#4ADE80]" aria-hidden="true" />
                            </div>
                            <p className="font-mono text-xl font-medium tabular-nums text-foreground">
                                {formatRupiah(agregatPublik.totalSalurUang)}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Akumulasi BKK berstatus Disalurkan pada tahun berjalan.
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Mustahik Terbantu</span>
                                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                            </div>
                            <p className="font-mono text-xl font-medium tabular-nums text-foreground">
                                {agregatPublik.totalMustahikTerbantu} KK
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Penerima manfaat terverifikasi di Rumbai dan sekitarnya.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: Profil & Pilar Pengelolaan Interaktif */}
                <LazySection id="profil" className="scroll-mt-32 space-y-8">
                    <div className="space-y-3 max-w-3xl">
                        <p className="font-mono text-xs uppercase tracking-wider text-primary">
                            01 · Profil &amp; Tata Kelola
                        </p>
                        <h2 className="font-serif text-3xl sm:text-[32px] font-medium leading-[1.2] text-foreground">
                            Prinsip Pengelolaan Zakat Masjid Istiqamah, Rumbai
                        </h2>
                        <p className="text-[17px] leading-[1.75] text-muted-foreground">
                            Kami menggabungkan ketelitian pencatatan akuntansi syariat dengan keterbukaan laporan agar setiap muzaki memperoleh kepastian bahwa amanahnya sampai kepada yang berhak.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-5 flex flex-col gap-3">
                            {PROFIL_PILLARS.map((pillar) => {
                                const isSelected = pillar.id === activePillarId;
                                return (
                                    <button
                                        key={pillar.id}
                                        type="button"
                                        onClick={() => setActivePillarId(pillar.id)}
                                        className={`w-full rounded-lg border p-5 text-left transition-colors ${isSelected
                                            ? 'border-primary bg-card'
                                            : 'border-border bg-background hover:border-muted-foreground hover:bg-card/60'
                                            }`}
                                    >
                                        <p className="font-mono text-[11px] text-primary">
                                            {pillar.subtitle}
                                        </p>
                                        <p className="mt-1 font-serif text-lg font-medium text-foreground">
                                            {pillar.title}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="lg:col-span-7 rounded-lg border border-border bg-card p-6 sm:p-8 flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-mono text-primary">
                                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>{selectedPillar.subtitle}</span>
                                </div>
                                <h3 className="font-serif text-2xl font-medium text-foreground">
                                    {selectedPillar.title}
                                </h3>
                                <p className="max-w-3xl text-[16px] leading-[1.75] text-foreground/90">
                                    {selectedPillar.summary}
                                </p>
                            </div>

                            <ul className="space-y-2.5 border-t border-border pt-5">
                                {selectedPillar.points.map((pt, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                        <CheckCircle2
                                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-[#4ADE80]"
                                            aria-hidden="true"
                                        />
                                        <span>{pt}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </LazySection>

                {/* SECTION: Galeri Dokumentasi Penyaluran & Bukti Kegiatan Nyata */}
                <LazySection id="galeri" className="scroll-mt-32 space-y-8" minHeightClass="min-h-[400px]">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div className="space-y-3 max-w-3xl">
                            <p className="font-mono text-xs uppercase tracking-wider text-primary">
                                02 · Bukti Kegiatan &amp; Penyaluran Nyata
                            </p>
                            <h2 className="font-serif text-3xl sm:text-[32px] font-medium leading-[1.2] text-foreground">
                                Dokumentasi Penyaluran ZIS &amp; Layanan Amil
                            </h2>
                            <p className="text-[17px] leading-[1.75] text-muted-foreground">
                                Bukti visual amanah zakat, infak, dan sedekah jamaah yang telah disalurkan langsung kepada mustahik yang berhak serta aktivitas operasional amil di Masjid Istiqamah Rumbai.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Badge variant="outline" className="px-3 py-1.5 text-xs font-mono">
                                {filteredGaleri.length} Dokumentasi Tampil
                            </Badge>
                            {isAdmin && (
                                <Button asChild size="sm" variant="secondary" className="h-8 gap-1.5 text-xs">
                                    <Link href="/master/galeri">
                                        <Camera className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                        <span>Kelola Galeri (Admin)</span>
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Filter Kategori Galeri Interaktif */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                        {GALERI_KATEGORI_FILTERS.map((kat) => (
                            <button
                                key={kat.key}
                                type="button"
                                onClick={() => setGaleriKategori(kat.key)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                                    galeriKategori === kat.key
                                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                        : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <span>{kat.label}</span>
                                <span className="text-[10px] opacity-80">
                                    (
                                    {kat.key === 'SEMUA'
                                        ? galeriKegiatan.length
                                        : galeriKegiatan.filter((g) => g.kategori === kat.key).length}
                                    )
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Grid Kartu Dokumentasi Visual */}
                    {filteredGaleri.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Images className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <p className="font-serif text-base font-medium text-foreground">
                                Belum ada dokumentasi untuk kategori ini
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Pilih kategori lain di atas untuk melihat bukti penyaluran lainnya.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {filteredGaleri.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => openLightbox(item)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openLightbox(item);
                                        }
                                    }}
                                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:border-primary/60 hover:shadow-md flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <div>
                                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                            <img
                                                src={item.gambar_url}
                                                alt={item.judul}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end justify-between p-3 text-white">
                                                <span className="text-xs font-medium flex items-center gap-1">
                                                    <Expand className="h-3.5 w-3.5" aria-hidden="true" />
                                                    Lihat Foto
                                                </span>
                                                <span className="text-[11px] font-mono bg-black/40 px-2 py-0.5 rounded">
                                                    {formatTanggalIndonesia(item.tanggal_kegiatan)}
                                                </span>
                                            </div>
                                            <div className="absolute top-2.5 left-2.5">
                                                <Badge variant="secondary" className="shadow-xs backdrop-blur-xs bg-background/90 text-foreground font-medium text-[10px]">
                                                    {KATEGORI_LABEL_MAP[item.kategori] ?? item.kategori}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="p-4 space-y-2">
                                            <h3 className="font-serif text-base font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                {item.judul}
                                            </h3>
                                            {item.deskripsi && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {item.deskripsi}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 pt-0 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1 truncate">
                                            <MapPin className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                                            <span className="truncate">{item.lokasi ?? 'Masjid Istiqamah'}</span>
                                        </span>
                                        {Number(item.jumlah_penerima) > 0 && (
                                            <span className="font-medium text-foreground font-mono shrink-0">
                                                {item.jumlah_penerima} Jiwa
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </LazySection>

                {/* SECTION 3: Kalkulator Zakat Interaktif */}
                <LazySection id="kalkulator" className="scroll-mt-32 space-y-8">
                    <div className="space-y-3 max-w-3xl">
                        <p className="font-mono text-xs uppercase tracking-wider text-primary">
                            03 · Simulasi Mandiri
                        </p>
                        <h2 className="font-serif text-3xl sm:text-[32px] font-medium leading-[1.2] text-foreground">
                            Kalkulator Zakat Fitrah &amp; Zakat Profesi
                        </h2>
                        <p className="text-[17px] leading-[1.75] text-muted-foreground">
                            Hitung estimasi kewajiban zakat keluarga Anda sebelum menunaikannya di loket resmi Masjid Istiqamah Rumbai.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Kalkulator Zakat Fitrah */}
                        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Zakat Fitrah Ramadhan
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Ketetapan {tahunHijriahLabel}: {formatRupiah(tarifFitrah)} atau {formatBerasKg(takaranBeras)} per jiwa.
                                    </p>
                                </div>
                                <div className="inline-flex rounded border border-border bg-background p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setModeFitrah('uang')}
                                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${modeFitrah === 'uang'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Tunai / QRIS
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModeFitrah('beras')}
                                        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${modeFitrah === 'beras'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        Beras
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="kalk_jiwa" className="text-sm text-foreground">
                                        Jumlah Jiwa dalam Keluarga
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            aria-label="Kurangi jumlah jiwa"
                                            onClick={() => setJiwaKalkulator((v) => Math.max(1, v - 1))}
                                            className="flex h-9 w-9 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary"
                                        >
                                            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                        <Input
                                            id="kalk_jiwa"
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={jiwaKalkulator}
                                            onChange={(e) =>
                                                setJiwaKalkulator(
                                                    Math.max(1, Math.min(30, Number.parseInt(e.target.value, 10) || 1))
                                                )
                                            }
                                            className="h-9 w-16 border-border bg-background text-center font-mono text-sm text-foreground"
                                        />
                                        <button
                                            type="button"
                                            aria-label="Tambah jumlah jiwa"
                                            onClick={() => setJiwaKalkulator((v) => Math.min(30, v + 1))}
                                            className="flex h-9 w-9 items-center justify-center rounded border border-border bg-background text-foreground hover:border-primary"
                                        >
                                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min={1}
                                    max={15}
                                    value={Math.min(15, jiwaKalkulator)}
                                    onChange={(e) => setJiwaKalkulator(Number.parseInt(e.target.value, 10) || 1)}
                                    aria-label="Geser jumlah jiwa"
                                    className="w-full accent-primary cursor-pointer"
                                />
                            </div>

                            <div className="rounded border border-border bg-background p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Estimasi Zakat Fitrah ({jiwaKalkulator} jiwa)</span>
                                    <span className="font-mono text-primary">
                                        {modeFitrah === 'uang' ? 'Konversi Rupiah' : 'Takaran Beras'}
                                    </span>
                                </div>
                                <p className="font-mono text-2xl font-medium tabular-nums text-foreground">
                                    {modeFitrah === 'uang'
                                        ? formatRupiah(jiwaKalkulator * tarifFitrah)
                                        : formatBerasKg(jiwaKalkulator * takaranBeras)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Alternatif setara:{' '}
                                    {modeFitrah === 'uang'
                                        ? formatBerasKg(jiwaKalkulator * takaranBeras)
                                        : formatRupiah(jiwaKalkulator * tarifFitrah)}
                                </p>
                            </div>
                        </div>

                        {/* Kalkulator Zakat Profesi */}
                        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    Zakat Profesi &amp; Penghasilan (2,5%)
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Acuan nisab resmi berdasarkan{' '}
                                    <strong className="text-foreground font-medium">SK Ketua BAZNAS RI Nomor 15 Tahun 2026</strong>{' '}
                                    dan Fatwa MUI No. 3/2003: setara 85 gram emas atau sebesar{' '}
                                    <strong className="text-foreground font-medium">Rp91.681.728 per tahun</strong>{' '}
                                    (<strong>{formatRupiah(nishabBulananReferensi)} per bulan</strong>).
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="kalk_penghasilan" className="text-sm text-foreground">
                                        Total Penghasilan Bersih per Bulan (Rp)
                                    </Label>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        Nisab: {formatRupiah(nishabBulananReferensi)}/bln
                                    </span>
                                </div>
                                <Input
                                    id="kalk_penghasilan"
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={500000}
                                    value={penghasilanBulanan}
                                    onChange={(e) => setPenghasilanBulanan(e.target.value)}
                                    className="border-border bg-background font-mono text-base text-foreground focus-visible:border-primary"
                                />
                            </div>

                            <div className="rounded border border-border bg-background p-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Status Kewajiban Zakat</span>
                                    <span
                                        className={`font-mono font-bold ${wajibZakatProfesi ? 'text-emerald-800 dark:text-[#4ADE80]' : 'text-amber-950 dark:text-[#FBBF24]'
                                            }`}
                                    >
                                        {wajibZakatProfesi ? 'Mencapai Nisab (Wajib Zakat 2,5%)' : 'Belum Mencapai Nisab (Disarankan Infak)'}
                                    </span>
                                </div>
                                <p className="font-mono text-2xl font-medium tabular-nums text-primary">
                                    {formatRupiah(zakatProfesiBulanan)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {wajibZakatProfesi
                                        ? 'Dikelola sepanjang tahun sebagai dana Zakat Profesi (ZKT-PRF).'
                                        : `Penghasilan di bawah nisab bulanan (${formatRupiah(nishabBulananReferensi)}) belum terkena kewajiban zakat mal, namun tetap dianjurkan bersedekah/infak sukarela.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </LazySection>

                {/* SECTION 4: Portal Data Transparansi Real-Time (Lazy Mounted on Scroll) */}
                <LazySection id="transparansi" className="scroll-mt-32 space-y-6" minHeightClass="min-h-[360px]">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div className="space-y-2 max-w-3xl">
                            <p className="font-mono text-xs uppercase tracking-wider text-primary">
                                03 · Data Publik Terverifikasi
                            </p>
                            <h2 className="font-serif text-3xl sm:text-[32px] font-medium leading-[1.2] text-foreground">
                                Laporan Transparansi Dana &amp; Penyaluran
                            </h2>
                            <p className="text-sm leading-[1.7] text-muted-foreground">
                                Data bersumber langsung dari laporan resmi read-only masjid dengan penyamaran identitas mustahik dan muzaki. Data penyaluran ditampilkan berdasarkan tahun berjalan ({tahunMasehiLabel} M / {tahunHijriahLabel}).
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRefreshing}
                            onClick={handleRefreshData}
                            className="min-h-[40px] shrink-0 rounded border-primary bg-transparent text-primary hover:bg-primary/10"
                        >
                            <RefreshCw
                                className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                                aria-hidden="true"
                            />
                            <span>{isRefreshing ? 'Memuat...' : 'Segarkan Data'}</span>
                        </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
                        <Tabs defaultValue="saldo">
                            <TabsList className="flex flex-wrap h-auto gap-1 bg-background p-1 border border-border">
                                <TabsTrigger
                                    value="saldo"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                                >
                                    Saldo Kantong Dana ({saldoDana.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="asnaf"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                                >
                                    Distribusi 8 Asnaf ({rekapAsnaf.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="penyaluran"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                                >
                                    Riwayat Penyaluran ({laporanPenyaluranPublik.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="muzaki"
                                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                                >
                                    Rekap Muzaki ({rekapMuzaki.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: Saldo Kantong Dana */}
                            <TabsContent value="saldo" className="space-y-4 pt-5">
                                <div className="grid gap-3 sm:grid-cols-12">
                                    <div className="sm:col-span-8">
                                        <Label htmlFor="cari_dana_publik" className="sr-only">
                                            Cari kantong dana
                                        </Label>
                                        <div className="relative">
                                            <Search
                                                className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="cari_dana_publik"
                                                type="search"
                                                placeholder="Cari kode atau nama kantong dana..."
                                                value={cariDana}
                                                onChange={(e) => setCariDana(e.target.value)}
                                                className="border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-4">
                                        <Select
                                            value={filterKategoriDana}
                                            onValueChange={setFilterKategoriDana}
                                        >
                                            <SelectTrigger
                                                aria-label="Filter Kategori Utama"
                                                className="border-border bg-background text-foreground"
                                            >
                                                <SelectValue placeholder="Semua Kategori" />
                                            </SelectTrigger>
                                            <SelectContent className="border-border bg-card text-foreground">
                                                <SelectItem value="SEMUA">Semua Kategori Dana</SelectItem>
                                                <SelectItem value="Zakat">Dana Zakat</SelectItem>
                                                <SelectItem value="Infak_Sedekah">Infak &amp; Sedekah</SelectItem>
                                                <SelectItem value="Wakaf">Dana Wakaf</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {filteredSaldoDana.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                                        Tidak ada kantong dana yang cocok dengan filter pencarian.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-border overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-background">
                                                <TableRow className="border-border hover:bg-transparent">
                                                    <TableHead className="text-muted-foreground">Kode &amp; Kantong Dana</TableHead>
                                                    <TableHead className="text-muted-foreground">Induk &amp; Sifat</TableHead>
                                                    <TableHead className="text-muted-foreground">Kategori</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Saldo Uang</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Saldo Beras</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSaldoDana.map((row, idx) => (
                                                    <TableRow key={row.id ?? `${row.kode_dana}-${idx}`} className="border-border hover:bg-muted/50">
                                                        <TableCell>
                                                            <span className="font-mono text-xs text-primary">
                                                                {row.kode_dana}
                                                            </span>
                                                            <p className="text-sm font-medium text-foreground">
                                                                {row.nama_dana}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            <p>{row.induk_dana ?? 'INDUK UTAMA'}</p>
                                                            {row.sifat_dana && (
                                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                                    {row.sifat_dana}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="inline-block rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground">
                                                                {(row.kategori_utama as KategoriUtamaDana).replace('_', ' ')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-medium tabular-nums text-primary">
                                                            {formatRupiah(row.saldo_tersedia)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
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
                            <TabsContent value="asnaf" className="space-y-4 pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-3.5 py-2.5 text-xs">
                                    <span className="text-muted-foreground">
                                        Realisasi penyaluran 8 golongan Asnaf berdasarkan tahun berjalan.
                                    </span>
                                    <span className="font-mono text-primary">
                                        Tahun {tahunMasehiLabel} M ({tahunHijriahLabel})
                                    </span>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {rekapAsnaf.map((asnaf) => {
                                        const nominal = Number(asnaf.total_nominal_disalurkan) || 0;
                                        const porsi =
                                            agregatPublik.totalAsnafUang > 0
                                                ? (nominal / agregatPublik.totalAsnafUang) * 100
                                                : 0;
                                        return (
                                            <div
                                                key={asnaf.kode_asnaf}
                                                className="rounded-lg border border-border bg-background p-4 space-y-3"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-mono text-xs text-primary">
                                                            {asnaf.kode_asnaf}
                                                        </p>
                                                        <h3 className="font-serif text-lg font-medium text-foreground">
                                                            {asnaf.nama_asnaf}
                                                        </h3>
                                                    </div>
                                                    <span className="rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-xs text-foreground">
                                                        {asnaf.jumlah_mustahik_terbantu} KK
                                                    </span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                    {ASNAF_DESCRIPTIONS[asnaf.kode_asnaf] ?? ''}
                                                </p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                                                        <span>Porsi Nominal</span>
                                                        <span className="text-primary">{formatPercentage(porsi)}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
                                                        <div
                                                            className="h-full bg-primary transition-all duration-500"
                                                            style={{ width: `${Math.min(100, porsi)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs">
                                                    <span className="font-mono font-medium tabular-nums text-primary">
                                                        {formatRupiah(asnaf.total_nominal_disalurkan)}
                                                    </span>
                                                    <span className="font-mono tabular-nums text-foreground">
                                                        {formatBerasKg(asnaf.total_beras_disalurkan_kg)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* TAB 3: Riwayat Penyaluran BKK (Masked) */}
                            <TabsContent value="penyaluran" className="space-y-4 pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background px-3.5 py-2.5 text-xs">
                                    <span className="text-muted-foreground">
                                        Riwayat penyaluran BKK resmi tahun berjalan (terurut dari yang terbaru).
                                    </span>
                                    <span className="font-mono text-primary">Tahun {tahunMasehiLabel} M</span>
                                </div>

                                <div className="relative max-w-md">
                                    <Search
                                        className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        type="search"
                                        aria-label="Cari Riwayat Penyaluran BKK"
                                        placeholder="Cari No. BKK, program, atau golongan asnaf..."
                                        value={cariPenyaluran}
                                        onChange={(e) => setCariPenyaluran(e.target.value)}
                                        className="border-border bg-background pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary"
                                    />
                                </div>

                                {filteredPenyaluran.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                                        Belum ada riwayat penyaluran BKK yang cocok dengan pencarian Anda.
                                    </div>
                                ) : (
                                    <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10 bg-background">
                                                <TableRow className="border-border hover:bg-transparent">
                                                    <TableHead className="text-muted-foreground">No. BKK &amp; Tanggal</TableHead>
                                                    <TableHead className="text-muted-foreground">Program &amp; Sumber Dana</TableHead>
                                                    <TableHead className="text-muted-foreground">Mustahik (Tersamar)</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Uang</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Beras</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredPenyaluran.map((row, idx) => (
                                                    <TableRow key={`${row.no_bkk}-${idx}`} className="border-border hover:bg-muted/50">
                                                        <TableCell>
                                                            <p className="font-mono text-xs text-primary">
                                                                {row.no_bkk}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatTanggalIndonesia(row.tanggal_penyaluran)}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs font-medium text-foreground">
                                                                {row.nama_program}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {row.sumber_dana ?? row.nama_dana ?? '-'} · {row.golongan_asnaf ?? row.nama_asnaf ?? '-'}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs font-medium text-foreground">
                                                                {row.nama_mustahik_masked}
                                                            </p>
                                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                                {row.nik_mustahik_masked} · {row.alamat_rt_rw || '-'}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs tabular-nums text-primary">
                                                            {formatRupiah(row.nominal_diterima)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                                                            {formatBerasKg(row.beras_diterima_kg)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>

                            {/* TAB 4: Rekap Kontribusi Muzaki (Terbaru, Tanpa Setoran) */}
                            <TabsContent value="muzaki" className="pt-5">
                                {rekapMuzaki.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                                        Belum ada rekap penghimpunan muzaki pada periode berjalan.
                                    </div>
                                ) : (
                                    <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10 bg-background">
                                                <TableRow className="border-border hover:bg-transparent">
                                                    <TableHead className="text-muted-foreground">Periode</TableHead>
                                                    <TableHead className="text-muted-foreground">Muzaki (NIK Tersamar)</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Total Uang</TableHead>
                                                    <TableHead className="text-right text-muted-foreground">Total Beras</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rekapMuzaki.map((m, idx) => (
                                                    <TableRow key={idx} className="border-border hover:bg-muted/50">
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {m.tahun_hijriah} ({m.tahun_masehi})
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs font-medium text-foreground">
                                                                {String(m.nama_muzaki_masked ?? m.nama_muzaki ?? m.nama_lengkap ?? 'Muzaki')}
                                                            </p>
                                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                                {m.nik_muzaki_masked ?? m.nik_masked ?? '-'}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs tabular-nums text-primary">
                                                            {formatRupiah(Number(m.total_donasi_uang ?? m.total_nominal ?? 0))}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
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
                    </div>
                </LazySection>

                {/* SECTION 5: Light Editorial Section (#FAF8F5) - Cara Menunaikan Zakat */}
                <LazySection id="layanan" className="scroll-mt-32">
                    <div className="rounded-lg bg-secondary/80 border border-border p-6 sm:p-10 text-foreground space-y-8">
                        <div className="space-y-3 max-w-3xl">
                            <p className="font-mono text-xs uppercase tracking-wider text-primary">
                                04 · Layanan Jamaah
                            </p>
                            <h2 className="font-serif text-3xl sm:text-[32px] font-medium leading-[1.2] text-foreground">
                                Tiga Langkah Menunaikan Zakat di Masjid Istiqamah, Rumbai
                            </h2>
                            <p className="text-[16px] leading-[1.7] text-muted-foreground">
                                Proses penerimaan dirancang ringkas, didampingi amil resmi, dan langsung menghasilkan bukti kwitansi digital maupun cetak.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-medium text-primary">
                                    01
                                </span>
                                <h3 className="font-serif text-xl font-medium text-foreground">
                                    Datang ke Loket atau Konsultasi
                                </h3>
                                <p className="text-sm leading-[1.7] text-muted-foreground">
                                    Kunjungi loket LAZ di teras utama Masjid Istiqamah Rumbai atau hubungi amil penerima untuk konsultasi nishab zakat mal dan fitrah keluarga.
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-medium text-primary">
                                    02
                                </span>
                                <h3 className="font-serif text-xl font-medium text-foreground">
                                    Verifikasi Data &amp; Ijab Kabul
                                </h3>
                                <p className="text-sm leading-[1.7] text-muted-foreground">
                                    Amil mencatat jumlah jiwa atau besaran zakat mal Anda melalui metode tunai, transfer, QRIS, maupun beras, dilanjutkan dengan niat dan doa bersama.
                                </p>
                            </div>

                            <div className="rounded-lg border border-border bg-card p-6 space-y-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-medium text-primary">
                                    03
                                </span>
                                <h3 className="font-serif text-xl font-medium text-foreground">
                                    Terima Kwitansi &amp; Pantau Penyaluran
                                </h3>
                                <p className="text-sm leading-[1.7] text-muted-foreground">
                                    Anda menerima kwitansi resmi bernomor unik (KWZ-*) dan seluruh setoran otomatis terpantau pada portal transparansi ini.
                                </p>
                            </div>
                        </div>
                    </div>
                </LazySection>

                {/* Lightbox Modal Dialog: Penampil Foto Resolusi Penuh & Detail Interaktif */}
                <Dialog open={Boolean(activeFotoModal)} onOpenChange={(open) => !open && setActiveFotoModal(null)}>
                    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-card border-border">
                        {activeFotoModal && (
                            <div className="space-y-4">
                                <div className="space-y-1.5 border-b border-border pb-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="default" className="text-xs">
                                            {KATEGORI_LABEL_MAP[activeFotoModal.kategori] ?? activeFotoModal.kategori}
                                        </Badge>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            Foto {activeFotoIndex + 1} dari {filteredGaleri.length}
                                        </span>
                                    </div>
                                    <DialogTitle className="font-serif text-xl sm:text-2xl font-medium text-foreground leading-snug">
                                        {activeFotoModal.judul}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Dokumentasi resmi kegiatan penyaluran dan transparansi LAZ Masjid Istiqamah
                                    </DialogDescription>
                                </div>

                                {/* Frame Gambar dengan Navigasi Next/Prev */}
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/90 flex items-center justify-center border border-border">
                                    <img
                                        src={activeFotoModal.gambar_url}
                                        alt={activeFotoModal.judul}
                                        className="max-h-full max-w-full object-contain"
                                    />

                                    {/* Tombol Foto Sebelumnya */}
                                    {filteredGaleri.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={prevFoto}
                                            aria-label="Lihat Foto Sebelumnya"
                                            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-md"
                                        >
                                            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    )}

                                    {/* Tombol Foto Berikutnya */}
                                    {filteredGaleri.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={nextFoto}
                                            aria-label="Lihat Foto Berikutnya"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-md"
                                        >
                                            <ChevronRight className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>

                                {/* Informasi Rincian */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-background text-xs">
                                    <div className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground text-[10px]">Tanggal Pelaksanaan</p>
                                            <p className="font-medium text-foreground truncate">
                                                {formatTanggalIndonesia(activeFotoModal.tanggal_kegiatan)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground text-[10px]">Lokasi Kegiatan</p>
                                            <p className="font-medium text-foreground truncate">
                                                {activeFotoModal.lokasi ?? 'Masjid Istiqamah, Rumbai'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground text-[10px]">Penerima Manfaat</p>
                                            <p className="font-medium text-foreground font-mono truncate">
                                                {Number(activeFotoModal.jumlah_penerima) > 0
                                                    ? `${activeFotoModal.jumlah_penerima} Jiwa Mustahik`
                                                    : 'Terdata di BKK'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {activeFotoModal.deskripsi && (
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Catatan Penyaluran &amp; Manfaat
                                        </p>
                                        <p className="text-xs leading-relaxed text-foreground/90 bg-muted/30 p-3 rounded-md border border-border">
                                            {activeFotoModal.deskripsi}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>

            {/* Footer Informatif & Kontak Person */}
            <footer id="kontak" className="scroll-mt-32 border-t border-border bg-secondary">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                    <div className="grid gap-10 md:grid-cols-12">
                        <div className="md:col-span-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <img
                                    src="/icons/icon-192x192.png"
                                    alt="Logo Yayasan Istiqamah Rumbai Pesisir"
                                    width={36}
                                    height={36}
                                    loading="lazy"
                                    className="h-9 w-9 object-contain rounded border border-border bg-card p-0.5"
                                />
                                <div>
                                    <p className="font-serif text-lg font-medium text-foreground">
                                        LAZ Masjid Istiqamah, Rumbai
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Unit Pengumpul Zakat &amp; Zakat Fitrah Resmi
                                    </p>
                                </div>
                            </div>
                            <p className="max-w-[420px] text-xs leading-[1.75] text-muted-foreground">
                                Mengelola amanah Zakat Fitrah, Zakat Profesi, dan Zakat Perniagaan jamaah secara transparan, akuntabel, dan berlandaskan syariat Islam serta UU No. 23 Tahun 2011.
                            </p>
                        </div>

                        <div className="md:col-span-4 space-y-3 text-xs">
                            <p className="font-mono uppercase tracking-wider text-primary">
                                Kontak Person &amp; Sekretariat
                            </p>
                            <div className="space-y-2.5 text-muted-foreground">
                                <p className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span>Kompleks Masjid Istiqamah, Kec. Rumbai, Kota Pekanbaru, Riau 28265</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span>+62 812-7500-0001 (Sekretariat LAZ / WhatsApp)</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span>laz.istiqamah.rumbai@masjid.id</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                    <span>Layanan Loket: Setiap Hari 08.00 – 21.00 WIB</span>
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-3 space-y-3 text-xs">
                            <p className="font-mono uppercase tracking-wider text-primary">
                                Tautan Cepat
                            </p>
                            <ul className="space-y-2 text-muted-foreground">
                                {NAV_ITEMS.map((item) => (
                                    <li key={item.id}>
                                        <a
                                            href={`#${item.id}`}
                                            onClick={(e) => scrollToSection(e, item.id)}
                                            className="hover:text-primary transition-colors"
                                        >
                                            {item.label}
                                        </a>
                                    </li>
                                ))}
                                <li>
                                    <Link href="/dasar-hukum" className="hover:text-primary transition-colors">
                                        Dasar Hukum &amp; Dalil Syariat
                                    </Link>
                                </li>
                                <li>
                                    <Link href={isAuthenticated ? '/dashboard' : '/login'} className="hover:text-primary transition-colors">
                                        {isAuthenticated ? 'Masuk ke Beranda Panitia' : 'Portal Login Pengurus'}
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-[11px] text-muted-foreground sm:flex-row">
                        <p>
                            © {tahunMasehiLabel} LAZ Masjid Istiqamah, Rumbai. Seluruh hak cipta dilindungi.
                        </p>
                        <p className="inline-flex items-center gap-1.5 font-mono">
                            <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                            <span>Data terproteksi</span>
                        </p>
                    </div>
                </div>
            </footer>

            {/* Tombol Kembali ke Atas (Smooth Scroll) */}
            {showBackToTop && (
                <button
                    type="button"
                    aria-label="Kembali ke atas halaman"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-primary bg-background/95 text-primary backdrop-blur-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
