import * as React from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        label: 'Log Audit JSON',
        group: 'Pengawasan',
        href: '/audit',
        icon: History,
        roles: ['Admin', 'Ketua_DKM'],
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
    const { auth, periodeAktif, persentaseHakAmil = 0, flash, errors } = page.props;
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

            <div className="flex flex-1">
                {/* Sidebar Navigasi Desktop */}
                <aside
                    aria-label="Navigasi Utama"
                    className={cn(
                        'hidden md:flex md:flex-col border-r bg-card transition-all duration-150 shrink-0',
                        sidebarCollapsed ? 'md:w-20' : 'md:w-64'
                    )}
                >
                    <div className="flex h-16 items-center justify-between border-b px-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
                        >
                            <img
                                src="/icons/icon.svg"
                                alt="Logo SI-LAZ Masjid"
                                width={34}
                                height={34}
                                className="h-8 w-8 shrink-0 rounded-md"
                            />
                            {!sidebarCollapsed && (
                                <div className="truncate">
                                    <p className="text-sm font-bold tracking-tight">SI-LAZ Masjid</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {user?.peran.replace('_', ' ')}
                                    </p>
                                </div>
                            )}
                        </Link>

                        <button
                            type="button"
                            aria-expanded={!sidebarCollapsed}
                            aria-label={sidebarCollapsed ? 'Perluas sidebar navigasi' : 'Ciutkan sidebar navigasi'}
                            onClick={() => setSidebarCollapsed((prev) => !prev)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {sidebarCollapsed ? (
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                        {groups.map((groupName) => {
                            const itemsInGroup = roleItems.filter((item) => item.group === groupName);
                            if (itemsInGroup.length === 0) return null;

                            return (
                                <div key={groupName} className="space-y-1">
                                    {!sidebarCollapsed && (
                                        <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {groupName}
                                        </p>
                                    )}
                                    {itemsInGroup.map((item) => {
                                        const Icon = item.icon;
                                        const active = isRouteActive(item.href);

                                        if (!item.available) {
                                            return (
                                                <div
                                                    key={item.key}
                                                    aria-disabled="true"
                                                    title={`${item.label} (${item.sprintNote})`}
                                                    className={cn(
                                                        'flex h-11 items-center justify-between rounded-md px-3 text-xs text-muted-foreground/70 select-none',
                                                        sidebarCollapsed && 'justify-center px-0'
                                                    )}
                                                >
                                                    <span className="flex items-center gap-3 truncate">
                                                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                                    </span>
                                                    {!sidebarCollapsed && item.sprintNote && (
                                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                                            {item.sprintNote}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={item.key}
                                                href={item.href}
                                                aria-current={active ? 'page' : undefined}
                                                title={sidebarCollapsed ? item.label : undefined}
                                                className={cn(
                                                    'flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                                                    active
                                                        ? 'bg-accent font-semibold text-accent-foreground border-l-4 border-primary'
                                                        : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                                                    sidebarCollapsed && 'justify-center px-0'
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
                            <div className="rounded-lg bg-muted/60 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold truncate">{user?.nama_lengkap}</span>
                                    <Badge variant="success">{user?.peran}</Badge>
                                </div>
                                <p className="font-mono text-[11px] text-muted-foreground truncate">
                                    @app_user: {user?.username} ({user?.peran})
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="w-full justify-center"
                                >
                                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Keluar Sesi</span>
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Keluar Sesi"
                                onClick={handleLogout}
                                className="w-full"
                            >
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        )}
                    </div>
                </aside>

                {/* Konten Utama + Header Bar */}
                <div className="flex flex-1 flex-col min-w-0 pb-20 md:pb-0">
                    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xs">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-3 min-w-0">
                                <img
                                    src="/icons/icon.svg"
                                    alt="Logo SI-LAZ Masjid"
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-md md:hidden"
                                />
                                <div className="min-w-0">
                                    <h1 className="text-base font-bold tracking-tight truncate sm:text-lg">
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

                                <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs">
                                    <Scale className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                                    <span className="text-muted-foreground hidden sm:inline">Hak Amil:</span>
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
                                </div>

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

                    <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6">
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
