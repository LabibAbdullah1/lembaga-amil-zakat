import * as React from 'react';
import { Head, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, History, Search } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import type { AksiAudit, LogAuditZis } from '@/types';

interface AuditPagination {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

interface AuditIndexProps {
    daftarLog: LogAuditZis[];
    pagination?: AuditPagination;
    filters: {
        tabel: string;
        aksi: string;
        dari: string;
        sampai: string;
        limit?: number;
    };
    rdbmsError?: string | null;
}

function parseAuditJson(raw: Record<string, unknown> | string | null | undefined): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed !== null ? parsed : { nilai: String(raw) };
    } catch {
        return { nilai: String(raw) };
    }
}

export default function AuditIndex({
    daftarLog = [],
    pagination = {
        current_page: 1,
        per_page: 10,
        total: 0,
        last_page: 1,
    },
    filters,
    rdbmsError,
}: AuditIndexProps) {
    const [tabelFilter, setTabelFilter] = React.useState<string>(filters?.tabel ?? 'SEMUA');
    const [aksiFilter, setAksiFilter] = React.useState<string>(filters?.aksi ?? 'SEMUA');
    const [dariTanggal, setDariTanggal] = React.useState<string>(filters?.dari ?? '');
    const [sampaiTanggal, setSampaiTanggal] = React.useState<string>(filters?.sampai ?? '');
    const [limitBaris, setLimitBaris] = React.useState<number>(filters?.limit ?? pagination.per_page ?? 10);
    const [selectedLog, setSelectedLog] = React.useState<LogAuditZis | null>(null);

    const applyFilter = (
        nextPage: number,
        nextLimit: number = limitBaris,
        nextTabel: string = tabelFilter,
        nextAksi: string = aksiFilter
    ) => {
        router.get(
            '/audit',
            {
                tabel: nextTabel,
                aksi: nextAksi,
                dari: dariTanggal,
                sampai: sampaiTanggal,
                limit: nextLimit,
                page: nextPage,
            },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilter(1);
    };

    const handleLimitChange = (val: string) => {
        const parsed = Number.parseInt(val, 10) || 10;
        setLimitBaris(parsed);
        applyFilter(1, parsed);
    };

    const getAksiBadgeVariant = (
        aksi: AksiAudit
    ): 'success' | 'warning' | 'destructive' => {
        if (aksi === 'INSERT') return 'success';
        if (aksi === 'UPDATE') return 'warning';
        return 'destructive';
    };

    const selectedLama = React.useMemo(
        () => (selectedLog ? parseAuditJson(selectedLog.data_lama) : {}),
        [selectedLog]
    );
    const selectedBaru = React.useMemo(
        () => (selectedLog ? parseAuditJson(selectedLog.data_baru) : {}),
        [selectedLog]
    );
    const selectedKeys = React.useMemo(
        () => Array.from(new Set([...Object.keys(selectedLama), ...Object.keys(selectedBaru)])),
        [selectedLama, selectedBaru]
    );

    return (
        <AuthenticatedLayout
            title="Riwayat Audit & Perubahan Data"
            subtitle="Rekam jejak otomatis perubahan data mustahik, persetujuan penyaluran, dan pembatalan kwitansi"
        >
            <Head title="Riwayat Audit Sistem" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Pemantauan Riwayat Audit ({pagination.total} rekaman)
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Menampilkan perbandingan nilai sebelum dan sesudah perubahan dengan batas tampilan halaman yang rapi.
                            </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="limit-baris-audit" className="text-xs whitespace-nowrap">
                                Tampilkan:
                            </Label>
                            <Select value={String(limitBaris)} onValueChange={handleLimitChange}>
                                <SelectTrigger id="limit-baris-audit" className="h-9 w-28 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 baris</SelectItem>
                                    <SelectItem value="25">25 baris</SelectItem>
                                    <SelectItem value="50">50 baris</SelectItem>
                                    <SelectItem value="100">100 baris</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form onSubmit={handleFilterSubmit} className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-3 space-y-1">
                                <Label htmlFor="filter-tabel-audit">Modul Data</Label>
                                <Select
                                    value={tabelFilter}
                                    onValueChange={(val) => {
                                        setTabelFilter(val);
                                        applyFilter(1, limitBaris, val, aksiFilter);
                                    }}
                                >
                                    <SelectTrigger id="filter-tabel-audit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Modul</SelectItem>
                                        <SelectItem value="transaksi_penghimpunan">
                                            Kwitansi Penerimaan
                                        </SelectItem>
                                        <SelectItem value="penyaluran_dana">
                                            Penyaluran (BKK)
                                        </SelectItem>
                                        <SelectItem value="mustahik">Data Mustahik</SelectItem>
                                        <SelectItem value="jenis_dana">Kantong Dana Zakat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                                <Label htmlFor="filter-aksi-audit">Jenis Perubahan</Label>
                                <Select
                                    value={aksiFilter}
                                    onValueChange={(val) => {
                                        setAksiFilter(val);
                                        applyFilter(1, limitBaris, tabelFilter, val);
                                    }}
                                >
                                    <SelectTrigger id="filter-aksi-audit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Perubahan</SelectItem>
                                        <SelectItem value="INSERT">Penambahan (INSERT)</SelectItem>
                                        <SelectItem value="UPDATE">Pembaruan (UPDATE)</SelectItem>
                                        <SelectItem value="DELETE">Penghapusan (DELETE)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-3 space-y-1">
                                <Label htmlFor="dari-tanggal">Dari Tanggal</Label>
                                <Input
                                    id="dari-tanggal"
                                    type="date"
                                    value={dariTanggal}
                                    onChange={(e) => setDariTanggal(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-3 space-y-">
                                <Label htmlFor="sampai-tanggal">Sampai Tanggal</Label>
                                <Input
                                    id="sampai-tanggal"
                                    type="date"
                                    value={sampaiTanggal}
                                    onChange={(e) => setSampaiTanggal(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 flex items-end">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    aria-label="Terapkan filter log audit"
                                >
                                    <Search className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </div>
                        </form>

                        {daftarLog.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
                                <p className="text-sm font-semibold">
                                    Belum ada rekaman audit yang ditampilkan
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Setiap pembatalan kwitansi, verifikasi mustahik, atau perubahan status BKK akan tercatat secara otomatis di halaman ini.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Kontainer Tabel dengan Batas Tinggi & Scroll Internal agar Halaman Tidak Memanjang */}
                                <div className="max-h-[540px] overflow-y-auto rounded-lg border">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                            <TableRow>
                                                <TableHead className="w-48">Waktu & Petugas</TableHead>
                                                <TableHead className="w-44">Modul & ID Data</TableHead>
                                                <TableHead className="w-28">Aksi</TableHead>
                                                <TableHead>
                                                    Ringkasan Perubahan (Sebelum -&gt; Sesudah)
                                                </TableHead>
                                                <TableHead className="w-28 text-right">Rincian</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daftarLog.map((log) => {
                                                const lamaObj = parseAuditJson(log.data_lama);
                                                const baruObj = parseAuditJson(log.data_baru);
                                                const allKeys = Array.from(
                                                    new Set([
                                                        ...Object.keys(lamaObj),
                                                        ...Object.keys(baruObj),
                                                    ])
                                                );
                                                // Prioritaskan field yang berubah untuk ringkasan baris
                                                const changedKeys = allKeys.filter(
                                                    (k) => String(lamaObj[k] ?? '') !== String(baruObj[k] ?? '')
                                                );
                                                const previewKeys = (
                                                    changedKeys.length > 0 ? changedKeys : allKeys
                                                ).slice(0, 3);
                                                const hiddenCount = Math.max(
                                                    0,
                                                    allKeys.length - previewKeys.length
                                                );

                                                return (
                                                    <TableRow key={`${log.id}-${log.waktu_kejadian}`}>
                                                        <TableCell className="align-top">
                                                            <p className="font-mono text-xs font-semibold">
                                                                {log.waktu_kejadian}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-primary font-semibold truncate max-w-44">
                                                                {log.dilakukan_oleh}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <p className="font-mono text-xs font-bold">
                                                                {log.nama_tabel}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                                ID #{log.record_id}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <Badge variant={getAksiBadgeVariant(log.aksi)}>
                                                                {log.aksi}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            {previewKeys.length === 0 ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    -
                                                                </span>
                                                            ) : (
                                                                <div className="max-h-24 overflow-y-auto pr-1 space-y-1 text-xs font-mono">
                                                                    {previewKeys.map((key) => {
                                                                        const valLama =
                                                                            lamaObj[key] !== undefined
                                                                                ? String(lamaObj[key])
                                                                                : null;
                                                                        const valBaru =
                                                                            baruObj[key] !== undefined
                                                                                ? String(baruObj[key])
                                                                                : null;
                                                                        const changed = valLama !== valBaru;

                                                                        return (
                                                                            <div
                                                                                key={key}
                                                                                className="flex flex-wrap items-center gap-1 rounded border bg-muted/30 px-2 py-0.5"
                                                                            >
                                                                                <span className="font-bold text-foreground">
                                                                                    {key}:
                                                                                </span>
                                                                                {valLama !== null && (
                                                                                    <span
                                                                                        className={
                                                                                            changed
                                                                                                ? 'rounded bg-rose-100 px-1 text-rose-900 line-through truncate max-w-40 dark:bg-rose-950 dark:text-rose-200'
                                                                                                : 'text-muted-foreground truncate max-w-40'
                                                                                        }
                                                                                    >
                                                                                        {valLama}
                                                                                    </span>
                                                                                )}
                                                                                {valLama !== null &&
                                                                                    valBaru !== null && (
                                                                                        <span className="text-muted-foreground">
                                                                                            -&gt;
                                                                                        </span>
                                                                                    )}
                                                                                {valBaru !== null && (
                                                                                    <span
                                                                                        className={
                                                                                            changed
                                                                                                ? 'rounded bg-emerald-100 px-1 font-semibold text-emerald-900 truncate max-w-40 dark:bg-emerald-950 dark:text-emerald-200'
                                                                                                : 'text-foreground truncate max-w-40'
                                                                                        }
                                                                                    >
                                                                                        {valBaru}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {hiddenCount > 0 && (
                                                                        <p className="text-[11px] font-sans text-muted-foreground">
                                                                            +{hiddenCount} atribut lainnya...
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-top text-right">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedLog(log)}
                                                            >
                                                                <Eye
                                                                    className="h-3.5 w-3.5"
                                                                    aria-hidden="true"
                                                                />
                                                                <span>Detail</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Baris Kontrol Pagination & Info Jumlah Data */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                                    <span className="text-muted-foreground tabular-nums">
                                        Menampilkan {daftarLog.length} dari total {pagination.total} rekaman (Halaman{' '}
                                        {pagination.current_page} / {pagination.last_page})
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page <= 1}
                                            onClick={() => applyFilter(pagination.current_page - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                            <span>Sebelumnya</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page >= pagination.last_page}
                                            onClick={() => applyFilter(pagination.current_page + 1)}
                                        >
                                            <span>Berikutnya</span>
                                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Rincian Lengkap Perubahan Data (Scroll Internal Tanpa Memanjangkan Halaman) */}
            <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            Rincian Perubahan Data #{selectedLog?.record_id} ({selectedLog?.nama_tabel})
                        </DialogTitle>
                        <DialogDescription>
                            Waktu: {selectedLog?.waktu_kejadian} • Petugas: {selectedLog?.dilakukan_oleh}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 my-2">
                        {selectedKeys.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Tidak ada rincian atribut.</p>
                        ) : (
                            selectedKeys.map((key) => {
                                const valLama =
                                    selectedLama[key] !== undefined ? String(selectedLama[key]) : null;
                                const valBaru =
                                    selectedBaru[key] !== undefined ? String(selectedBaru[key]) : null;
                                const changed = valLama !== valBaru;

                                return (
                                    <div
                                        key={key}
                                        className="rounded-lg border bg-muted/30 p-3 text-xs font-mono space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground">{key}</span>
                                            {changed && <Badge variant="warning">Berubah</Badge>}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2 pt-1">
                                            <div className="rounded border bg-card p-2">
                                                <p className="font-sans text-[10px] text-muted-foreground">
                                                    Nilai Sebelum:
                                                </p>
                                                <p
                                                    className={
                                                        changed
                                                            ? 'text-rose-700 line-through break-all dark:text-rose-300'
                                                            : 'text-muted-foreground break-all'
                                                    }
                                                >
                                                    {valLama ?? '-'}
                                                </p>
                                            </div>
                                            <div className="rounded border bg-card p-2">
                                                <p className="font-sans text-[10px] text-muted-foreground">
                                                    Nilai Sesudah:
                                                </p>
                                                <p
                                                    className={
                                                        changed
                                                            ? 'font-semibold text-emerald-700 break-all dark:text-emerald-300'
                                                            : 'text-foreground break-all'
                                                    }
                                                >
                                                    {valBaru ?? '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <Separator />

                    <DialogFooter>
                        <Button type="button" onClick={() => setSelectedLog(null)}>
                            Tutup Rincian
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
