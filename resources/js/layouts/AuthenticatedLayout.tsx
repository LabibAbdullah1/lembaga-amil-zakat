import * as React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    FolderTree,
    HandCoins,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    Scale,
    ShieldAlert,
    Smartphone,
    UserCog,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { UserGuideDialog } from '@/components/zis/UserGuideDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { formatBerasKg, formatPercentage, formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PeranPengguna, SharedProps } from '@/types';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavItemConfig {
    key: string;
    label: string;
    group: 'Operasional' | 'Master Data' | 'Pengawasan';
    href: string;
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    roles: PeranPengguna[];
    available: boolean;
    sprintNote?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
    {
        key: 'dashboard',
        label: 'Beranda Saldo',
        group: 'Operasional',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['Admin', 'Amil_Penerima', 'Verifikator', 'Staf_Penyaluran', 'Ketua_DKM'],
        available: true,
    },
    {
        key: 'loket',
        label: 'Loket ZIS & Fitrah',
        group: 'Operasional',
        href: '/loket',
        icon: HandCoins,
        roles: ['Admin', 'Amil_Penerima'],
        available: true,
    },
    {
        key: 'muzaki',
        label: 'Data Muzaki & KK',
        group: 'Operasional',
        href: '/muzaki',
        icon: Users,
        roles: ['Admin', 'Amil_Penerima'],
        available: true,
    },
    {
        key: 'mustahik',
        label: 'Mustahik & Survei',
        group: 'Operasional',
        href: '/mustahik',
        icon: CheckCircle2,
        roles: ['Admin', 'Verifikator', 'Staf_Penyaluran', 'Ketua_DKM'],
        available: true,
    },
    {
        key: 'penyaluran',
        label: 'Penyaluran (BKK)',
        group: 'Operasional',
        href: '/penyaluran',
        icon: FileSpreadsheet,
        roles: ['Admin', 'Staf_Penyaluran', 'Ketua_DKM'],
        available: true,
    },
    {
        key: 'master-periode',
        label: 'Periode Ramadhan',
        group: 'Master Data',
        href: '/master/periode',
        icon: CalendarClock,
        roles: ['Admin'],
        available: true,
    },
    {
        key: 'master-dana',
        label: 'Hierarki Jenis Dana',
        group: 'Master Data',
        href: '/master/jenis-dana',
        icon: FolderTree,
        roles: ['Admin'],
        available: true,
    },
    {
        key: 'master-program',
        label: 'Program Penyaluran',
        group: 'Master Data',
        href: '/master/program',
        icon: ShieldAlert,
        roles: ['Admin'],
        available: true,
    },
    {
        key: 'master-pengguna',
        label: 'Pengguna Sistem',
        group: 'Master Data',
        href: '/master/pengguna',
        icon: UserCog,
        roles: ['Admin'],
        available: true,
    },
    {
        key: 'laporan',
        label: 'Laporan Analitik',
        group: 'Pengawasan',
        href: '/laporan',
        icon: BarChart3,
        roles: ['Admin', 'Ketua_DKM'],
        available: true,
    },
    {
        key: 'audit',
        label: 'Riwayat Audit',
        group: 'Pengawasan',
        href: '/audit',
        icon: History,
        roles: ['Admin', 'Ketua_DKM'],
        available: true,
    },
    {
        key: 'dasar-hukum',
        label: 'Dasar Hukum Zakat',
        group: 'Pengawasan',
        href: '/dasar-hukum',
        icon: BookOpen,
        roles: ['Admin', 'Amil_Penerima', 'Verifikator', 'Staf_Penyaluran', 'Ketua_DKM'],
        available: true,
    },
];

interface AuthenticatedLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export default function AuthenticatedLayout({
    title,
    subtitle,
    children,
}: AuthenticatedLayoutProps) {
    const page = usePage<SharedProps>();
    const { auth, periodeAktif, persentaseHakAmil = 0, hakAmilPerKategori = [], flash, errors } = page.props;
    const currentUrl = page.url;
    const user = auth?.user;

    const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(false);
    const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState<boolean>(false);
    const [installPrompt, setInstallPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

    React.useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    React.useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.success, flash?.error]);

    const handleInstallPwa = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
        setInstallPrompt(null);
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const roleItems = React.useMemo(() => {
        if (!user) return [];
        return NAV_ITEMS.filter((item) => item.roles.includes(user.peran));
    }, [user]);

    const mobilePrimaryItems = React.useMemo(() => {
        return roleItems.slice(0, 4);
    }, [roleItems]);

    const amilNumeric = Number(persentaseHakAmil) || 0;
    const isAmilCritical = amilNumeric >= 12.5;
    const isAmilWarning = amilNumeric >= 10.0 && amilNumeric < 12.5;

    const isRouteActive = (href: string): boolean => {
        return currentUrl === href || currentUrl.startsWith(`${href}/`);
    };

    const groups: Array<'Operasional' | 'Master Data' | 'Pengawasan'> = [
        'Operasional',
        'Master Data',
        'Pengawasan',
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <OfflineBanner />

            <div className="flex flex-1 items-start">
                {/* Sidebar Navigasi Desktop (Sticky setinggi layar, desain modern & simetris) */}
                <aside
                    aria-label="Navigasi Utama"
                    className={cn(
                        'hidden md:sticky md:top-0 md:flex md:h-screen md:flex-col border-r bg-card/95 backdrop-blur-xs transition-all duration-200 shrink-0 relative z-40',
                        sidebarCollapsed ? 'md:w-[76px]' : 'md:w-64'
                    )}
                >
                    <button
                        type="button"
                        aria-expanded={!sidebarCollapsed}
                        aria-label={sidebarCollapsed ? 'Perluas sidebar navigasi' : 'Ciutkan sidebar navigasi'}
                        onClick={() => setSidebarCollapsed((prev) => !prev)}
                        className="absolute -right-3.5 top-5 z-50 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {sidebarCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                    </button>

                    <div
                        className={cn(
                            'flex h-16 items-center border-b',
                            sidebarCollapsed ? 'justify-center px-2' : 'justify-start px-4'
                        )}
                    >
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2.5 overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring rounded-lg p-1"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                                <img
                                    src="/icons/icon.svg"
                                    alt="Logo LAZ Masjid Istiqamah"
                                    width={26}
                                    height={26}
                                    className="h-6 w-6 rounded-md"
                                />
                            </div>
                            {!sidebarCollapsed && (
                                <div className="min-w-0">
                                    <p className="text-sm font-bold tracking-tight truncate">
                                        LAZ Istiqamah
                                    </p>
                                    <p className="text-[11px] font-medium text-muted-foreground truncate">
                                        Rumbai • {user?.peran.replace('_', ' ')}
                                    </p>
                                </div>
                            )}
                        </Link>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                        {groups.map((groupName) => {
                            const itemsInGroup = roleItems.filter((item) => item.group === groupName);
                            if (itemsInGroup.length === 0) return null;

                            return (
                                <div key={groupName} className="space-y-1">
                                    {!sidebarCollapsed ? (
                                        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/70">
                                            {groupName}
                                        </p>
                                    ) : (
                                        <Separator className="my-2" />
                                    )}
                                    {itemsInGroup.map((item) => {
                                        const Icon = item.icon;
                                        const active = isRouteActive(item.href);

                                        return (
                                            <Link
                                                key={item.key}
                                                href={item.href}
                                                aria-current={active ? 'page' : undefined}
                                                title={sidebarCollapsed ? item.label : undefined}
                                                className={cn(
                                                    'group relative flex h-10 items-center gap-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring',
                                                    active
                                                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                                        : 'font-medium text-foreground/80 hover:bg-accent/70 hover:text-accent-foreground',
                                                    sidebarCollapsed ? 'mx-auto w-10 justify-center px-0' : 'px-3'
                                                )}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>

                    <div className="border-t p-3">
                        {!sidebarCollapsed ? (
                            <div className="rounded-xl border bg-muted/40 p-3 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold truncate text-foreground">
                                        {user?.nama_lengkap}
                                    </span>
                                    <Badge variant="success" className="text-[10px] shrink-0">
                                        {user?.peran.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {user?.email}
                                </p>
                            </div>
                        ) : (
                            <div
                                title={`${user?.nama_lengkap} (${user?.peran.replace('_', ' ')})`}
                                className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-xs font-bold text-primary"
                            >
                                {(user?.nama_lengkap ?? 'P').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Konten Utama + Header Bar */}
                <div className="flex flex-1 flex-col min-w-0 pb-20 md:pb-0">
                    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xs">
                        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
                            <div className="flex items-center gap-3 min-w-0">
                                <img
                                    src="/icons/icon.svg"
                                    alt="Logo SI-LAZ Masjid"
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-md md:hidden"
                                />
                                <div className="min-w-0">
                                    <h1 className="font-serif text-lg font-medium tracking-tight truncate sm:text-xl">
                                        {title}
                                    </h1>
                                    {subtitle && (
                                        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                                    )}
                                </div>
                            </div>

                            {/* Indikator Periode Ramadhan Aktif & Realisasi Hak Amil */}
                            <div className="flex flex-wrap items-center gap-2">
                                {periodeAktif ? (
                                    <div
                                        title={`Tarif Fitrah: ${formatRupiah(periodeAktif.nominal_fitrah_per_jiwa)} / ${formatBerasKg(periodeAktif.beras_per_jiwa_kg)}`}
                                        className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs"
                                    >
                                        <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                        <span className="font-medium">
                                            Ramadhan {periodeAktif.tahun_hijriah} H ({periodeAktif.tahun_masehi})
                                        </span>
                                    </div>
                                ) : (
                                    <Badge variant="warning">Belum Ada Periode Ramadhan Aktif</Badge>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            title="Klik untuk melihat rincian Hak Amil (Maks 12,50%) per Kategori Zakat"
                                            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                                        >
                                            <Scale className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                            <span className="text-muted-foreground hidden sm:inline">
                                                Hak Amil (Per Kategori):
                                            </span>
                                            <Badge
                                                variant={
                                                    isAmilCritical
                                                        ? 'destructive'
                                                        : isAmilWarning
                                                          ? 'warning'
                                                          : 'success'
                                                }
                                                className="tabular-nums"
                                            >
                                                {formatPercentage(amilNumeric)} / 12,50%
                                            </Badge>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-80 p-3 space-y-2.5">
                                        <div>
                                            <p className="text-xs font-bold text-foreground">
                                                Realisasi Hak Amil (ASN-03) per Kategori Zakat
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Batas maksimal 12,50% dihitung terpisah pada setiap kategori dana zakat.
                                            </p>
                                        </div>
                                        <DropdownMenuSeparator />
                                        {hakAmilPerKategori.length === 0 ? (
                                            <p className="text-xs text-muted-foreground py-1">
                                                Belum ada data kategori zakat pada periode aktif.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {hakAmilPerKategori.map((kat) => {
                                                    const p = Number(kat.persentase_amil) || 0;
                                                    return (
                                                        <div
                                                            key={kat.jenis_dana_id}
                                                            className="rounded-lg border bg-muted/30 p-2 text-xs space-y-1"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold truncate">
                                                                    [{kat.kode_dana}] {kat.nama_dana}
                                                                </span>
                                                                <Badge
                                                                    variant={
                                                                        p >= 12.5
                                                                            ? 'destructive'
                                                                            : p >= 10
                                                                              ? 'warning'
                                                                              : 'success'
                                                                    }
                                                                    className="tabular-nums text-[10px]"
                                                                >
                                                                    {formatPercentage(p)} / 12,50%
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                                                                <span>Terpakai: {formatRupiah(kat.total_amil_rupiah)}</span>
                                                                <span>Sisa Kuota: {formatRupiah(kat.sisa_kuota_rupiah)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {installPrompt && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleInstallPwa}
                                    >
                                        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span className="hidden sm:inline">Install PWA</span>
                                    </Button>
                                )}

                                <ThemeToggle className="h-9 w-9" />

                                <UserGuideDialog
                                    currentRole={user?.peran ?? 'Admin'}
                                    triggerVariant="outline"
                                    triggerLabel="Panduan"
                                />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            aria-label="Menu Akun Pengguna"
                                        >
                                            <span className="max-w-28 truncate font-medium">
                                                {user?.nama_lengkap ?? 'Panitia'}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>
                                            <p className="text-xs font-semibold text-foreground">
                                                {user?.nama_lengkap}
                                            </p>
                                            <p className="font-mono text-[11px] text-muted-foreground">
                                                {user?.username} ({user?.peran})
                                            </p>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={handleLogout}>
                                            <LogOut className="h-4 w-4" aria-hidden="true" />
                                            <span>Keluar Sesi</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6 laz-page-enter">
                        <RdbmsAlert message={errors?.rdbms} />
                        {children}
                    </main>
                </div>
            </div>

            {/* Bottom Navigation Bar Mobile (< 768px) + Sheet Menu Drawer */}
            <nav
                aria-label="Navigasi Bawah Mobile"
                className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t bg-card px-2 md:hidden"
            >
                {mobilePrimaryItems.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.href);

                    if (!item.available) {
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() =>
                                    toast.info(`${item.label} dijadwalkan pada ${item.sprintNote}.`)
                                }
                                className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] text-muted-foreground/70"
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                <span className="truncate max-w-16">{item.label.split(' ')[0]}</span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] transition-colors',
                                active
                                    ? 'font-bold text-primary'
                                    : 'font-medium text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="truncate max-w-16">{item.label.split(' ')[0]}</span>
                        </Link>
                    );
                })}

                <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            aria-label="Buka menu navigasi lengkap"
                            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                            <Menu className="h-4 w-4" aria-hidden="true" />
                            <span>Menu</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="right" className="flex flex-col justify-between overflow-y-auto">
                        <div className="space-y-4">
                            <SheetHeader>
                                <SheetTitle>Menu Panitia SI-LAZ</SheetTitle>
                                <SheetDescription>
                                    Masuk sebagai {user?.nama_lengkap} ({user?.peran})
                                </SheetDescription>
                            </SheetHeader>

                            <Separator />

                            {periodeAktif && (
                                <div className="rounded-lg border bg-accent/40 p-3 space-y-1 text-xs">
                                    <p className="font-semibold text-accent-foreground">
                                        Periode Ramadhan {periodeAktif.tahun_hijriah} H ({periodeAktif.tahun_masehi})
                                    </p>
                                    <p className="text-muted-foreground tabular-nums">
                                        Fitrah: {formatRupiah(periodeAktif.nominal_fitrah_per_jiwa)} /{' '}
                                        {formatBerasKg(periodeAktif.beras_per_jiwa_kg)} per jiwa
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {roleItems.map((item) => {
                                    const Icon = item.icon;
                                    const active = isRouteActive(item.href);

                                    if (!item.available) {
                                        return (
                                            <div
                                                key={item.key}
                                                aria-disabled="true"
                                                className="flex h-11 items-center justify-between rounded-md border border-dashed px-3 text-xs text-muted-foreground"
                                            >
                                                <span className="flex items-center gap-2.5">
                                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                                    <span>{item.label}</span>
                                                </span>
                                                <Badge variant="secondary">{item.sprintNote}</Badge>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={item.key}
                                            href={item.href}
                                            onClick={() => setMobileDrawerOpen(false)}
                                            className={cn(
                                                'flex h-11 items-center gap-2.5 rounded-md px-3 text-sm',
                                                active
                                                    ? 'bg-accent font-semibold text-accent-foreground'
                                                    : 'font-medium text-foreground hover:bg-muted'
                                            )}
                                        >
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <UserGuideDialog
                                currentRole={user?.peran ?? 'Admin'}
                                triggerVariant="secondary"
                                triggerLabel="Buka Panduan Peran Tugas"
                            />
                            {installPrompt && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleInstallPwa}
                                >
                                    <Smartphone className="h-4 w-4" aria-hidden="true" />
                                    <span>Install Aplikasi di HP</span>
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                <span>Keluar Sesi</span>
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </nav>
        </div>
    );
}
