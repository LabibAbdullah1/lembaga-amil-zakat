import * as React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, Edit3, Lock, Plus, Power, ShieldCheck } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBerasKg, formatRupiah } from '@/lib/format';
import type { PeriodeRamadhan } from '@/types';

interface StatusDanaFitrahInfo {
    id: number;
    kode_dana: string;
    nama_dana: string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
    bkk_pending: number;
}

interface DanaLintasPeriodeInfo {
    id: number;
    kode_dana: string;
    nama_dana: string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
}

interface MasterPeriodeProps {
    daftarPeriode: PeriodeRamadhan[];
    statusDanaFitrah?: StatusDanaFitrahInfo | null;
    danaLintasPeriode?: DanaLintasPeriodeInfo[];
    rdbmsError?: string | null;
}

export default function MasterPeriode({
    daftarPeriode = [],
    statusDanaFitrah = null,
    danaLintasPeriode = [],
    rdbmsError,
}: MasterPeriodeProps) {
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [editingPeriode, setEditingPeriode] = React.useState<PeriodeRamadhan | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        tahun_hijriah: string;
        tahun_masehi: string;
        beras_per_jiwa_kg: string;
        nominal_fitrah_per_jiwa: string;
        status_aktif: boolean;
    }>({
        tahun_hijriah: '',
        tahun_masehi: '',
        beras_per_jiwa_kg: '',
        nominal_fitrah_per_jiwa: '',
        status_aktif: false,
    });

    const openCreateModal = () => {
        setEditingPeriode(null);
        reset();
        setDialogOpen(true);
    };

    const openEditModal = (periode: PeriodeRamadhan) => {
        setEditingPeriode(periode);
        setData({
            tahun_hijriah: periode.tahun_hijriah,
            tahun_masehi: String(periode.tahun_masehi),
            beras_per_jiwa_kg: String(periode.beras_per_jiwa_kg),
            nominal_fitrah_per_jiwa: String(periode.nominal_fitrah_per_jiwa),
            status_aktif: Number(periode.status_aktif) === 1 || periode.status_aktif === true,
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (editingPeriode) {
            put(`/master/periode/${editingPeriode.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            post('/master/periode', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const handleToggleStatus = (periode: PeriodeRamadhan) => {
        const isCurrentlyActive = Number(periode.status_aktif) === 1 || periode.status_aktif === true;
        router.patch(`/master/periode/${periode.id}/toggle`, {
            status_aktif: !isCurrentlyActive,
        });
    };

    const fitrahSaldoUang = Number(statusDanaFitrah?.saldo_tersedia ?? 0);
    const fitrahSaldoBeras = Number(statusDanaFitrah?.saldo_beras_kg ?? 0);
    const fitrahBkkPending = Number(statusDanaFitrah?.bkk_pending ?? 0);
    const isFitrahBelumHabis = fitrahSaldoUang > 0 || fitrahSaldoBeras > 0 || fitrahBkkPending > 0;

    return (
        <AuthenticatedLayout
            title="Master Periode Ramadhan"
            subtitle="Pengaturan takaran beras & tarif zakat fitrah per jiwa untuk periode operasional Ramadhan"
        >
            <Head title="Master Periode Ramadhan" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="text-base">
                                    Syarat Penutupan Periode Ramadhan (Zakat Fitrah)
                                </CardTitle>
                                {isFitrahBelumHabis ? (
                                    <Badge variant="warning">
                                        <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                        Periode Aktif Terkunci
                                    </Badge>
                                ) : (
                                    <Badge variant="success">
                                        <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                                        Zakat Fitrah Tersalurkan 100%
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Sesuai syariat Islam (HR. Abu Dawud &amp; Ibnu Majah), Periode Ramadhan aktif <strong>tidak boleh dinonaktifkan</strong> sebelum seluruh Dana Zakat Fitrah Ramadhan (<code>ZKT-FTR</code>) habis disalurkan sebelum Hari Raya Idul Fitri.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                                <div>
                                    <p className="text-muted-foreground">Sisa Saldo Uang ZKT-FTR</p>
                                    <p className="mt-0.5 text-sm font-bold tabular-nums text-primary">
                                        {formatRupiah(fitrahSaldoUang)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Sisa Saldo Beras ZKT-FTR</p>
                                    <p className="mt-0.5 text-sm font-bold tabular-nums">
                                        {formatBerasKg(fitrahSaldoBeras)}
                                    </p>
                                </div>
                            </div>
                            {isFitrahBelumHabis && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                    <span>
                                        Salurkan seluruh sisa Zakat Fitrah ({formatRupiah(fitrahSaldoUang)} &amp; {formatBerasKg(fitrahSaldoBeras)}) terlebih dahulu melalui menu BKK.
                                    </span>
                                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                        <Link href="/penyaluran/buat">Salurkan Zakat Fitrah</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="text-base">
                                    Dana Zakat Mal (Tidak Terikat Periode Ramadhan)
                                </CardTitle>
                                <Badge variant="outline">
                                    <ShieldCheck className="mr-1 h-3 w-3 text-primary" aria-hidden="true" />
                                    Berlaku Sepanjang Tahun
                                </Badge>
                            </div>
                            <CardDescription>
                                Dana <strong>Zakat Profesi (<code>ZKT-PRF</code>)</strong> dan <strong>Zakat Perniagaan (<code>ZKT-PRN</code>)</strong> tidak terikat oleh pergantian Periode Ramadhan dan saldonya tidak akan hilang saat periode Ramadhan diganti.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            {danaLintasPeriode.map((d) => (
                                <div
                                    key={d.id}
                                    className="flex items-center justify-between rounded-lg border bg-accent/30 px-3 py-2.5"
                                >
                                    <div>
                                        <p className="font-semibold text-foreground">
                                            [{d.kode_dana}] {d.nama_dana}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Akumulasi Berkelanjutan Lintas Periode
                                        </p>
                                    </div>
                                    <span className="font-bold tabular-nums text-primary">
                                        {formatRupiah(d.saldo_tersedia)}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Daftar Periode Operasional Ramadhan ({daftarPeriode.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Hanya satu periode Ramadhan yang dapat berstatus aktif pada satu waktu operasional.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Tambah Periode Baru</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {daftarPeriode.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Belum ada data periode_ramadhan</p>
                                <p className="text-xs text-muted-foreground">
                                    Klik tombol Tambah Periode Baru untuk mendaftarkan parameter Zakat Fitrah Ramadhan.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tahun Hijriah</TableHead>
                                                <TableHead>Tahun Masehi</TableHead>
                                                <TableHead className="text-right">Takaran Beras / Jiwa</TableHead>
                                                <TableHead className="text-right">Tarif Fitrah / Jiwa</TableHead>
                                                <TableHead>Status Periode</TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daftarPeriode.map((row) => {
                                                const aktif = Number(row.status_aktif) === 1 || row.status_aktif === true;

                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="font-semibold">
                                                            Ramadhan {row.tahun_hijriah} H
                                                        </TableCell>
                                                        <TableCell className="tabular-nums">
                                                            {row.tahun_masehi} M
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatBerasKg(row.beras_per_jiwa_kg)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatRupiah(row.nominal_fitrah_per_jiwa)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {aktif ? (
                                                                <Badge variant="success">
                                                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                                                    Aktif
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary">Nonaktif</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant={aktif ? 'outline' : 'default'}
                                                                    size="sm"
                                                                    onClick={() => handleToggleStatus(row)}
                                                                >
                                                                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>{aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openEditModal(row)}
                                                                >
                                                                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>Ubah</span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {daftarPeriode.map((row) => {
                                        const aktif = Number(row.status_aktif) === 1 || row.status_aktif === true;

                                        return (
                                            <div
                                                key={row.id}
                                                className="rounded-lg border bg-card p-4 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-bold">
                                                            Ramadhan {row.tahun_hijriah} H
                                                        </p>
                                                        <p className="text-xs text-muted-foreground tabular-nums">
                                                            Tahun Masehi: {row.tahun_masehi}
                                                        </p>
                                                    </div>
                                                    {aktif ? (
                                                        <Badge variant="success">Aktif</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Nonaktif</Badge>
                                                    )}
                                                </div>

                                                <Separator />

                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <p className="text-muted-foreground">Beras / Jiwa</p>
                                                        <p className="font-bold tabular-nums">
                                                            {formatBerasKg(row.beras_per_jiwa_kg)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Tarif Fitrah / Jiwa</p>
                                                        <p className="font-bold tabular-nums">
                                                            {formatRupiah(row.nominal_fitrah_per_jiwa)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 pt-1">
                                                    <Button
                                                        type="button"
                                                        variant={aktif ? 'outline' : 'default'}
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleToggleStatus(row)}
                                                    >
                                                        <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>{aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>Ubah</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingPeriode
                                ? `Ubah Periode Ramadhan ${editingPeriode.tahun_hijriah} H`
                                : 'Tambah Periode Ramadhan Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Pastikan hanya satu periode yang diaktifkan pada satu waktu.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="tahun_hijriah">Tahun Hijriah</Label>
                                <Input
                                    id="tahun_hijriah"
                                    required
                                    placeholder="Contoh: 1447"
                                    value={data.tahun_hijriah}
                                    onChange={(e) => setData('tahun_hijriah', e.target.value)}
                                />
                                {errors.tahun_hijriah && (
                                    <p className="text-xs text-destructive">{errors.tahun_hijriah}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tahun_masehi">Tahun Masehi</Label>
                                <Input
                                    id="tahun_masehi"
                                    type="number"
                                    inputMode="numeric"
                                    required
                                    placeholder="Contoh: 2026"
                                    value={data.tahun_masehi}
                                    onChange={(e) => setData('tahun_masehi', e.target.value)}
                                />
                                {errors.tahun_masehi && (
                                    <p className="text-xs text-destructive">{errors.tahun_masehi}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="beras_per_jiwa_kg">Beras per Jiwa (Kg)</Label>
                                <Input
                                    id="beras_per_jiwa_kg"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0.1"
                                    required
                                    placeholder="Contoh: 2.50"
                                    value={data.beras_per_jiwa_kg}
                                    onChange={(e) => setData('beras_per_jiwa_kg', e.target.value)}
                                />
                                {errors.beras_per_jiwa_kg && (
                                    <p className="text-xs text-destructive">{errors.beras_per_jiwa_kg}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="nominal_fitrah_per_jiwa">Nominal Fitrah / Jiwa (Rp)</Label>
                                <Input
                                    id="nominal_fitrah_per_jiwa"
                                    type="number"
                                    inputMode="numeric"
                                    min="1000"
                                    required
                                    placeholder="Contoh: 45000"
                                    value={data.nominal_fitrah_per_jiwa}
                                    onChange={(e) => setData('nominal_fitrah_per_jiwa', e.target.value)}
                                />
                                {errors.nominal_fitrah_per_jiwa && (
                                    <p className="text-xs text-destructive">{errors.nominal_fitrah_per_jiwa}</p>
                                )}
                            </div>
                        </div>

                        <label
                            htmlFor="status_aktif_periode"
                            className="flex items-center gap-2 rounded-md border p-3 text-xs font-medium"
                        >
                            <input
                                id="status_aktif_periode"
                                type="checkbox"
                                checked={data.status_aktif}
                                onChange={(e) => setData('status_aktif', e.target.checked)}
                                className="h-4 w-4 rounded accent-primary"
                            />
                            <span>Jadikan sebagai Periode Ramadhan Aktif (status_aktif = 1)</span>
                        </label>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Periode'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
