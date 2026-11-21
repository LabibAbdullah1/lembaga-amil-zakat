import * as React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, FileDown, FileSpreadsheet, Plus, Search } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBerasKg, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type { PenyaluranDana, StatusPersetujuanBkk } from '@/types';

interface BkkRow extends PenyaluranDana {
    kode_program: string;
    nama_program: string;
    kode_dana: string;
    nama_dana: string;
    kategori_utama: string;
    nama_pembuat: string;
    nama_penyetuju: string | null;
    jumlah_penerima: number;
}

interface PenyaluranIndexProps {
    daftarBkk: BkkRow[];
    filters: {
        status: string;
        q: string;
    };
    rdbmsError?: string | null;
}

export default function PenyaluranIndex({
    daftarBkk = [],
    filters,
    rdbmsError,
}: PenyaluranIndexProps) {
    const [searchQuery, setSearchQuery] = React.useState<string>(filters?.q ?? '');
    const [statusFilter, setStatusFilter] = React.useState<string>(filters?.status ?? 'SEMUA');
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [perPage, setPerPage] = React.useState<number>(15);
    const [isSearching, setIsSearching] = React.useState<boolean>(false);
    const isFirstRenderRef = React.useRef<boolean>(true);

    const applyFilter = React.useCallback((qVal: string, statusVal: string) => {
        setCurrentPage(1);
        setIsSearching(true);
        router.get(
            '/penyaluran',
            { q: qVal, status: statusVal },
            {
                only: ['daftarBkk', 'filters'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsSearching(false),
            }
        );
    }, []);

    React.useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }
        const timer = window.setTimeout(() => {
            applyFilter(searchQuery, statusFilter);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(daftarBkk.length / perPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedBkk = React.useMemo(() => {
        const start = (safePage - 1) * perPage;
        return daftarBkk.slice(start, start + perPage);
    }, [daftarBkk, safePage, perPage]);

    const getStatusBadgeVariant = (
        status: StatusPersetujuanBkk
    ): 'warning' | 'default' | 'success' | 'destructive' => {
        if (status === 'Draft') return 'warning';
        if (status === 'Disetujui') return 'default';
        if (status === 'Disalurkan') return 'success';
        return 'destructive';
    };

    return (
        <AuthenticatedLayout
            title="Daftar Bukti Kas Keluar (BKK) Penyaluran Dana"
            subtitle="Pengelolaan draf pengajuan, persetujuan Ketua DKM, dan pencairan dana penyaluran kepada mustahik"
        >
            <Head title="Daftar BKK Penyaluran" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Dokumen Pengajuan & Pencairan BKK ({daftarBkk.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Saldo kantong dana akan terpotong secara otomatis setelah BKK disetujui dan dieksekusi pencairannya oleh Ketua DKM.
                            </CardDescription>
                        </div>

                        <Button asChild>
                            <Link href="/penyaluran/buat">
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                <span>Buat Pengajuan BKK Baru</span>
                            </Link>
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-6">
                                <Label htmlFor="cari-bkk" className="sr-only">
                                    Cari Nomor BKK atau Program
                                </Label>
                                <div className="relative">
                                    <Search
                                        className={
                                            isSearching
                                                ? 'absolute left-3 top-3.5 h-4 w-4 text-primary animate-pulse'
                                                : 'absolute left-3 top-3.5 h-4 w-4 text-muted-foreground'
                                        }
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="cari-bkk"
                                        type="search"
                                        placeholder="Ketik No. BKK, nama program, atau kantong dana..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-4">
                                <Select
                                    value={statusFilter}
                                    onValueChange={(val) => {
                                        setStatusFilter(val);
                                        applyFilter(searchQuery, val);
                                    }}
                                >
                                    <SelectTrigger aria-label="Filter Status BKK">
                                        <SelectValue placeholder="Filter Status Persetujuan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Status BKK</SelectItem>
                                        <SelectItem value="Draft">Draft (Menunggu Ketua DKM)</SelectItem>
                                        <SelectItem value="Disetujui">Disetujui (Siap Cair)</SelectItem>
                                        <SelectItem value="Disalurkan">Disalurkan (Final)</SelectItem>
                                        <SelectItem value="Ditolak">Ditolak (Final)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2">
                                <Select
                                    value={String(perPage)}
                                    onValueChange={(val) => {
                                        setPerPage(Number.parseInt(val, 10) || 15);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger aria-label="Batas tampilan baris BKK">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 baris</SelectItem>
                                        <SelectItem value="15">15 baris</SelectItem>
                                        <SelectItem value="25">25 baris</SelectItem>
                                        <SelectItem value="50">50 baris</SelectItem>
                                        <SelectItem value="100">100 baris</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {daftarBkk.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Belum ada dokumen BKK penyaluran</p>
                                <p className="text-xs text-muted-foreground">
                                    Klik tombol Buat Pengajuan BKK Baru untuk menyusun draf penyaluran multi-mustahik.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block max-h-[540px] overflow-y-auto rounded-lg border">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                            <TableRow>
                                                <TableHead>No. BKK & Tanggal</TableHead>
                                                <TableHead>Program & Kantong Dana</TableHead>
                                                <TableHead className="text-right">Penerima</TableHead>
                                                <TableHead className="text-right">Total Uang & Beras</TableHead>
                                                <TableHead>Status Persetujuan</TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedBkk.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell>
                                                        <p className="font-mono text-xs font-bold">
                                                            {row.no_bkk}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatTanggalIndonesia(row.tanggal_penyaluran)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-semibold text-sm">{row.nama_program}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            [{row.kode_dana}] {row.nama_dana} ({row.kategori_utama.replace('_', ' ')})
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {row.jumlah_penerima} mustahik
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        <p className="font-bold text-sm">
                                                            {formatRupiah(row.total_disalurkan)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatBerasKg(row.total_beras_kg)}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusBadgeVariant(row.status_persetujuan)}>
                                                            {row.status_persetujuan}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <Button asChild variant="default" size="sm">
                                                                <Link href={`/penyaluran/${row.id}`}>
                                                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>Detail</span>
                                                                </Link>
                                                            </Button>
                                                            <Button asChild variant="outline" size="sm">
                                                                <a
                                                                    href={`/penyaluran/${row.id}/pdf`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>PDF</span>
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {paginatedBkk.map((row) => (
                                        <div
                                            key={row.id}
                                            className="rounded-lg border bg-card p-4 space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-mono text-xs font-bold">{row.no_bkk}</p>
                                                    <p className="text-sm font-bold">{row.nama_program}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        [{row.kode_dana}] {row.nama_dana} • {row.jumlah_penerima} mustahik
                                                    </p>
                                                </div>
                                                <Badge variant={getStatusBadgeVariant(row.status_persetujuan)}>
                                                    {row.status_persetujuan}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                                                <span>Total Alokasi:</span>
                                                <span className="font-bold tabular-nums">
                                                    {formatRupiah(row.total_disalurkan)} / {formatBerasKg(row.total_beras_kg)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <Button asChild variant="default" size="sm" className="flex-1">
                                                    <Link href={`/penyaluran/${row.id}`}>
                                                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>Kelola & Persetujuan</span>
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm">
                                                    <a
                                                        href={`/penyaluran/${row.id}/pdf`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>PDF</span>
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                                        <span className="text-muted-foreground tabular-nums">
                                            Halaman {safePage} dari {totalPages} (Total {daftarBkk.length} BKK)
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={safePage <= 1}
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            >
                                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                <span>Sebelumnya</span>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={safePage >= totalPages}
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            >
                                                <span>Berikutnya</span>
                                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
