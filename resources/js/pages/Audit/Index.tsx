import * as React from 'react';
import { Head, router } from '@inertiajs/react';
import { History, Search } from 'lucide-react';
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
import type { AksiAudit, LogAuditZis } from '@/types';

interface AuditIndexProps {
    daftarLog: LogAuditZis[];
    filters: {
        tabel: string;
        aksi: string;
        dari: string;
        sampai: string;
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
    filters,
    rdbmsError,
}: AuditIndexProps) {
    const [tabelFilter, setTabelFilter] = React.useState<string>(filters?.tabel ?? 'SEMUA');
    const [aksiFilter, setAksiFilter] = React.useState<string>(filters?.aksi ?? 'SEMUA');
    const [dariTanggal, setDariTanggal] = React.useState<string>(filters?.dari ?? '');
    const [sampaiTanggal, setSampaiTanggal] = React.useState<string>(filters?.sampai ?? '');

    const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/audit',
            {
                tabel: tabelFilter,
                aksi: aksiFilter,
                dari: dariTanggal,
                sampai: sampaiTanggal,
            },
            { preserveState: true, replace: true }
        );
    };

    const getAksiBadgeVariant = (
        aksi: AksiAudit
    ): 'success' | 'warning' | 'destructive' => {
        if (aksi === 'INSERT') return 'success';
        if (aksi === 'UPDATE') return 'warning';
        return 'destructive';
    };

    return (
        <AuthenticatedLayout
            title="Jejak Audit Sistem (log_audit_zis Terpartisi Tahunan)"
            subtitle="Merekam perubahan mustahik, penyaluran_dana, void transaksi_penghimpunan, dan perubahan saldo beserta identitas @app_user"
        >
            <Head title="Jejak Audit JSON RDBMS" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-lg">
                                Pemantauan Log Audit & Diff JSON ({daftarLog.length} rekaman)
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Tabel <code className="font-mono text-xs">log_audit_zis</code> dipartisi berdasarkan <code className="font-mono text-xs">RANGE (YEAR(waktu_kejadian))</code> dan diisi otomatis oleh trigger audit dengan <code className="font-mono text-xs">COALESCE(@app_user, USER())</code>.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form onSubmit={handleFilterSubmit} className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-3 space-y-1">
                                <Label htmlFor="filter-tabel-audit">Nama Tabel</Label>
                                <Select value={tabelFilter} onValueChange={setTabelFilter}>
                                    <SelectTrigger id="filter-tabel-audit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Tabel</SelectItem>
                                        <SelectItem value="transaksi_penghimpunan">transaksi_penghimpunan</SelectItem>
                                        <SelectItem value="penyaluran_dana">penyaluran_dana</SelectItem>
                                        <SelectItem value="mustahik">mustahik</SelectItem>
                                        <SelectItem value="jenis_dana">jenis_dana</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                                <Label htmlFor="filter-aksi-audit">Aksi DML</Label>
                                <Select value={aksiFilter} onValueChange={setAksiFilter}>
                                    <SelectTrigger id="filter-aksi-audit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Aksi</SelectItem>
                                        <SelectItem value="INSERT">INSERT</SelectItem>
                                        <SelectItem value="UPDATE">UPDATE</SelectItem>
                                        <SelectItem value="DELETE">DELETE</SelectItem>
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

                            <div className="sm:col-span-3 space-y-1">
                                <Label htmlFor="sampai-tanggal">Sampai Tanggal</Label>
                                <Input
                                    id="sampai-tanggal"
                                    type="date"
                                    value={sampaiTanggal}
                                    onChange={(e) => setSampaiTanggal(e.target.value)}
                                />
                            </div>

                            <div className="sm:col-span-1 flex items-end">
                                <Button type="submit" className="w-full" aria-label="Terapkan filter log audit">
                                    <Search className="h-4 w-4" aria-hidden="true" />
                                </Button>
                            </div>
                        </form>

                        {daftarLog.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
                                <p className="text-sm font-semibold">Belum ada rekaman log_audit_zis yang cocok</p>
                                <p className="text-xs text-muted-foreground">
                                    Setiap operasi void kwitansi, verifikasi mustahik, atau perubahan status BKK otomatis tercatat di sini oleh trigger database.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu & Pelaku (@app_user)</TableHead>
                                            <TableHead>Tabel & Record ID</TableHead>
                                            <TableHead>Aksi</TableHead>
                                            <TableHead>Perbandingan Diff JSON (data_lama vs data_baru)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {daftarLog.map((log) => {
                                            const lamaObj = parseAuditJson(log.data_lama);
                                            const baruObj = parseAuditJson(log.data_baru);
                                            const allKeys = Array.from(
                                                new Set([...Object.keys(lamaObj), ...Object.keys(baruObj)])
                                            );

                                            return (
                                                <TableRow key={`${log.id}-${log.waktu_kejadian}`}>
                                                    <TableCell className="align-top">
                                                        <p className="font-mono text-xs font-semibold">
                                                            {log.waktu_kejadian}
                                                        </p>
                                                        <p className="mt-1 text-xs text-primary font-semibold">
                                                            {log.dilakukan_oleh}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <p className="font-mono text-xs font-bold">
                                                            {log.nama_tabel}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground tabular-nums">
                                                            Record #{log.record_id}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        <Badge variant={getAksiBadgeVariant(log.aksi)}>
                                                            {log.aksi}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="align-top">
                                                        {allKeys.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        ) : (
                                                            <div className="grid gap-1.5 text-xs font-mono">
                                                                {allKeys.map((key) => {
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
                                                                            className="flex flex-wrap items-center gap-1.5 rounded border bg-muted/30 px-2 py-1"
                                                                        >
                                                                            <span className="font-bold text-foreground">
                                                                                {key}:
                                                                            </span>
                                                                            {valLama !== null && (
                                                                                <span
                                                                                    className={
                                                                                        changed
                                                                                            ? 'rounded bg-rose-100 px-1.5 py-0.5 text-rose-900 line-through dark:bg-rose-950 dark:text-rose-200'
                                                                                            : 'text-muted-foreground'
                                                                                    }
                                                                                >
                                                                                    {valLama}
                                                                                </span>
                                                                            )}
                                                                            {valLama !== null && valBaru !== null && (
                                                                                <span className="text-muted-foreground">
                                                                                    -&gt;
                                                                                </span>
                                                                            )}
                                                                            {valBaru !== null && (
                                                                                <span
                                                                                    className={
                                                                                        changed
                                                                                            ? 'rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                                                                                            : 'text-foreground'
                                                                                    }
                                                                                >
                                                                                    {valBaru}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
