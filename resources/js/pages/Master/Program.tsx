import * as React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Copy, Edit3, Lock, Plus, ShieldAlert } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBerasKg, formatRupiah } from '@/lib/format';
import type { JenisDana, PeriodeRamadhan, ProgramPenyaluran, StatusProgram } from '@/types';

interface ProgramRow extends ProgramPenyaluran {
    kode_dana: string;
    nama_dana: string;
    kategori_utama: string;
    tahun_hijriah: string;
    tahun_masehi: number;
    jumlah_bkk_disalurkan?: number;
    realisasi_uang?: number | string;
    realisasi_beras_kg?: number | string;
    realisasi_penerima_kk?: number;
}

interface MasterProgramProps {
    daftarProgram: ProgramRow[];
    daftarDanaOperasional: JenisDana[];
    daftarPeriode: PeriodeRamadhan[];
    rdbmsError?: string | null;
}

export default function MasterProgram({
    daftarProgram = [],
    daftarDanaOperasional = [],
    daftarPeriode = [],
    rdbmsError,
}: MasterProgramProps) {
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [editingProgram, setEditingProgram] = React.useState<ProgramRow | null>(null);

    const defaultPeriodeId = React.useMemo(() => {
        const aktif = daftarPeriode.find((p) => Number(p.status_aktif) === 1 || p.status_aktif === true);
        return aktif ? aktif.id : (daftarPeriode[0]?.id ?? 1);
    }, [daftarPeriode]);

    const defaultDanaId = daftarDanaOperasional[0]?.id ?? 1;

    const { data, setData, post, put, processing, errors } = useForm<{
        kode_program: string;
        nama_program: string;
        jenis_dana_id: number;
        periode_id: number;
        anggaran_rencana: string;
        target_beras_kg: string;
        target_penerima_kk: string;
        khusus_amil: boolean;
        status_program: StatusProgram;
    }>({
        kode_program: '',
        nama_program: '',
        jenis_dana_id: defaultDanaId,
        periode_id: defaultPeriodeId,
        anggaran_rencana: '0',
        target_beras_kg: '0',
        target_penerima_kk: '0',
        khusus_amil: false,
        status_program: 'Berjalan',
    });

    const openCreateModal = () => {
        setEditingProgram(null);
        setData({
            kode_program: '',
            nama_program: '',
            jenis_dana_id: defaultDanaId,
            periode_id: defaultPeriodeId,
            anggaran_rencana: '10000000',
            target_beras_kg: '0',
            target_penerima_kk: '0',
            khusus_amil: false,
            status_program: 'Berjalan',
        });
        setDialogOpen(true);
    };

    const openEditModal = (program: ProgramRow) => {
        setEditingProgram(program);
        setData({
            kode_program: program.kode_program,
            nama_program: program.nama_program,
            jenis_dana_id: Number(program.jenis_dana_id),
            periode_id: Number(program.periode_id),
            anggaran_rencana: String(program.anggaran_rencana),
            target_beras_kg: String(program.target_beras_kg ?? 0),
            target_penerima_kk: String(program.target_penerima_kk ?? 0),
            khusus_amil: Number(program.khusus_amil) === 1 || program.khusus_amil === true,
            status_program: program.status_program,
        });
        setDialogOpen(true);
    };

    const openDuplicateModal = (program: ProgramRow) => {
        setEditingProgram(null);
        const newerPeriode =
            daftarPeriode.find((p) => Number(p.tahun_masehi) > Number(program.tahun_masehi)) ??
            daftarPeriode.find((p) => p.id === defaultPeriodeId) ??
            daftarPeriode[0];
        const targetTahun = newerPeriode ? Number(newerPeriode.tahun_masehi) : new Date().getFullYear();
        const nextSuffix = String(targetTahun).slice(-2);
        setData({
            kode_program: `${program.kode_program.replace(/-\d{2,4}$/, '')}-${nextSuffix}`,
            nama_program: program.nama_program,
            jenis_dana_id: Number(program.jenis_dana_id),
            periode_id: newerPeriode ? newerPeriode.id : defaultPeriodeId,
            anggaran_rencana: String(program.anggaran_rencana),
            target_beras_kg: String(program.target_beras_kg ?? 0),
            target_penerima_kk: String(program.target_penerima_kk ?? 0),
            khusus_amil: Number(program.khusus_amil) === 1 || program.khusus_amil === true,
            status_program: 'Berjalan',
        });
        setDialogOpen(true);
    };

    const handleSelesaikanProgram = (program: ProgramRow) => {
        router.patch(`/master/program/${program.id}/selesai`, {}, { preserveScroll: true });
    };

    const computeProgramProgress = (row: ProgramRow): number => {
        const targetUang = Number(row.anggaran_rencana) || 0;
        const realUang = Number(row.realisasi_uang) || 0;
        if (targetUang > 0) {
            return Math.min(100, Math.round((realUang / targetUang) * 100));
        }
        const targetKk = Number(row.target_penerima_kk) || 0;
        const realKk = Number(row.realisasi_penerima_kk) || 0;
        if (targetKk > 0) {
            return Math.min(100, Math.round((realKk / targetKk) * 100));
        }
        return 0;
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (editingProgram) {
            put(`/master/program/${editingProgram.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            post('/master/program', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    return (
        <AuthenticatedLayout
            title="Master Program Penyaluran"
            subtitle="Pengelolaan program distribusi zakat, infak, sedekah, dan wakaf beserta anggaran rencana"
        >
            <Head title="Master Program Penyaluran" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Daftar Program Penyaluran ({daftarProgram.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Setiap program terhubung ke satu kantong sumber dana operasional dan periode Ramadhan.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Tambah Program</span>
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {daftarProgram.length > 0 &&
                            daftarProgram.every((p) => p.status_program === 'Selesai') && (
                                <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                    <div>
                                        <p className="font-bold">Seluruh Program Penyaluran Telah Selesai</p>
                                        <p>
                                            Semua program pada periode saat ini sudah berstatus Selesai. Untuk melakukan penyaluran berikutnya, silakan klik <strong>Tambah Program</strong> atau tombol <strong>Tahun Baru</strong> pada program yang sudah selesai.
                                        </p>
                                    </div>
                                    <Button type="button" size="sm" onClick={openCreateModal} className="shrink-0">
                                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Buat Program Baru</span>
                                    </Button>
                                </div>
                            )}
                        {daftarProgram.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Belum ada data program_penyaluran</p>
                                <p className="text-xs text-muted-foreground">
                                    Tambahkan program penyaluran baru untuk memulai alokasi BKK.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kode &amp; Tahun</TableHead>
                                                <TableHead>Nama Program Penyaluran</TableHead>
                                                <TableHead>Sumber Dana</TableHead>
                                                <TableHead>Target vs Realisasi</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daftarProgram.map((row) => {
                                                const persen = computeProgramProgress(row);
                                                const isAmil =
                                                    Number(row.khusus_amil) === 1 || row.khusus_amil === true;

                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="align-top">
                                                            <p className="font-mono text-xs font-semibold">
                                                                {row.kode_program}
                                                            </p>
                                                            <Badge variant="outline" className="mt-1 text-[10px]">
                                                                Tahun {row.tahun_masehi} ({row.tahun_hijriah} H)
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <p className="font-medium">{row.nama_program}</p>
                                                            {isAmil && (
                                                                <Badge variant="warning" className="mt-1 text-[10px]">
                                                                    <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                                                    Khusus Amil (ASN-03)
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs align-top">
                                                            <span className="font-mono font-semibold">{row.kode_dana}</span>{' '}
                                                            - {row.nama_dana}
                                                        </TableCell>
                                                        <TableCell className="align-top min-w-[210px]">
                                                            <div className="space-y-1 text-xs">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-muted-foreground">
                                                                        {formatRupiah(row.realisasi_uang ?? 0)} /{' '}
                                                                        {formatRupiah(row.anggaran_rencana)}
                                                                    </span>
                                                                    <span className="font-bold tabular-nums text-primary">
                                                                        {persen}%
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className="h-full bg-primary transition-all"
                                                                        style={{ width: `${persen}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground tabular-nums">
                                                                    KK: {row.realisasi_penerima_kk ?? 0}
                                                                    {Number(row.target_penerima_kk ?? 0) > 0
                                                                        ? ` / ${row.target_penerima_kk}`
                                                                        : ''}{' '}
                                                                    • Beras: {formatBerasKg(row.realisasi_beras_kg ?? 0)}
                                                                    {Number(row.target_beras_kg ?? 0) > 0
                                                                        ? ` / ${formatBerasKg(row.target_beras_kg ?? 0)}`
                                                                        : ''}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-top">
                                                            <Badge
                                                                variant={
                                                                    row.status_program === 'Berjalan'
                                                                        ? 'success'
                                                                        : row.status_program === 'Draft'
                                                                          ? 'warning'
                                                                          : 'secondary'
                                                                }
                                                            >
                                                                {row.status_program}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right align-top">
                                                            <div className="inline-flex flex-wrap justify-end gap-1.5">
                                                                {row.status_program === 'Berjalan' && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleSelesaikanProgram(row)}
                                                                        title="Tandai program selesai dan kunci untuk BKK baru"
                                                                    >
                                                                        <CheckCircle2
                                                                            className="h-3.5 w-3.5 text-emerald-600"
                                                                            aria-hidden="true"
                                                                        />
                                                                        <span>Selesaikan</span>
                                                                    </Button>
                                                                )}
                                                                {row.status_program === 'Selesai' && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => openDuplicateModal(row)}
                                                                        title="Buat program baru untuk tahun/periode berikutnya dengan metode sama"
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                                                        <span>Tahun Baru</span>
                                                                    </Button>
                                                                )}
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
                                    {daftarProgram.map((row) => {
                                        const persen = computeProgramProgress(row);
                                        const isAmil =
                                            Number(row.khusus_amil) === 1 || row.khusus_amil === true;

                                        return (
                                            <div
                                                key={row.id}
                                                className="rounded-lg border bg-card p-4 space-y-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-mono text-xs font-semibold text-muted-foreground">
                                                            {row.kode_program} • Tahun {row.tahun_masehi} ({row.tahun_hijriah} H)
                                                        </p>
                                                        <p className="text-sm font-bold">{row.nama_program}</p>
                                                        {isAmil && (
                                                            <Badge variant="warning" className="mt-1 text-[10px]">
                                                                <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                                                Khusus Amil (ASN-03)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Badge
                                                        variant={
                                                            row.status_program === 'Berjalan'
                                                                ? 'success'
                                                                : row.status_program === 'Draft'
                                                                  ? 'warning'
                                                                  : 'secondary'
                                                        }
                                                    >
                                                        {row.status_program}
                                                    </Badge>
                                                </div>

                                                <div className="text-xs text-muted-foreground space-y-1.5">
                                                    <p>
                                                        Sumber Dana: <strong className="text-foreground">{row.kode_dana} ({row.nama_dana})</strong>
                                                    </p>
                                                    <div className="space-y-1 rounded bg-muted/40 p-2">
                                                        <div className="flex items-center justify-between">
                                                            <span>Progres Penyaluran:</span>
                                                            <strong className="text-primary tabular-nums">{persen}%</strong>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full bg-primary"
                                                                style={{ width: `${persen}%` }}
                                                            />
                                                        </div>
                                                        <p className="tabular-nums text-[11px]">
                                                            Uang: {formatRupiah(row.realisasi_uang ?? 0)} / {formatRupiah(row.anggaran_rencana)}
                                                        </p>
                                                        <p className="tabular-nums text-[11px]">
                                                            Penerima: {row.realisasi_penerima_kk ?? 0}
                                                            {Number(row.target_penerima_kk ?? 0) > 0
                                                                ? ` / ${row.target_penerima_kk} KK`
                                                                : ' KK'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {row.status_program === 'Berjalan' && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => handleSelesaikanProgram(row)}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                                                            <span>Selesaikan</span>
                                                        </Button>
                                                    )}
                                                    {row.status_program === 'Selesai' && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => openDuplicateModal(row)}
                                                        >
                                                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                                            <span>Tahun Baru</span>
                                                        </Button>
                                                    )}
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
                            {editingProgram
                                ? `Ubah Program ${editingProgram.kode_program}`
                                : 'Tambah Program Penyaluran Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Pilih kantong jenis dana dan periode Ramadhan yang sesuai untuk program ini.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="kode_program">Kode Program (Otomatis)</Label>
                                <Input
                                    id="kode_program"
                                    readOnly
                                    disabled
                                    value={editingProgram ? editingProgram.kode_program : 'Otomatis oleh sistem'}
                                    className="font-mono text-xs bg-muted/60 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="status_program_select">Status Program</Label>
                                <Select
                                    value={data.status_program}
                                    onValueChange={(val) => setData('status_program', val as StatusProgram)}
                                >
                                    <SelectTrigger id="status_program_select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Berjalan">Berjalan</SelectItem>
                                        <SelectItem value="Selesai">Selesai</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="nama_program">Nama Program Penyaluran</Label>
                            <Input
                                id="nama_program"
                                required
                                placeholder="Masukkan nama program penyaluran"
                                value={data.nama_program}
                                onChange={(e) => setData('nama_program', e.target.value)}
                            />
                            {errors.nama_program && (
                                <p className="text-xs text-destructive">{errors.nama_program}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="jenis_dana_program_select">Kantong Sumber Dana (Operasional)</Label>
                            <Select
                                value={String(data.jenis_dana_id)}
                                onValueChange={(val) => setData('jenis_dana_id', Number.parseInt(val, 10))}
                            >
                                <SelectTrigger id="jenis_dana_program_select">
                                    <SelectValue placeholder="Pilih kantong dana" />
                                </SelectTrigger>
                                <SelectContent>
                                    {daftarDanaOperasional.map((dana) => (
                                        <SelectItem key={dana.id} value={String(dana.id)}>
                                            {dana.kode_dana} - {dana.nama_dana} ({dana.kategori_utama})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="periode_program_select">Periode Ramadhan</Label>
                                <Select
                                    value={String(data.periode_id)}
                                    onValueChange={(val) => setData('periode_id', Number.parseInt(val, 10))}
                                >
                                    <SelectTrigger id="periode_program_select">
                                        <SelectValue placeholder="Pilih periode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {daftarPeriode.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.tahun_hijriah} H ({p.tahun_masehi})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="anggaran_rencana">Target Dana Uang (Rp)</Label>
                                <Input
                                    id="anggaran_rencana"
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    required
                                    value={data.anggaran_rencana}
                                    onChange={(e) => setData('anggaran_rencana', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="target_beras_kg">Target Beras (kg)</Label>
                                <Input
                                    id="target_beras_kg"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={data.target_beras_kg}
                                    onChange={(e) => setData('target_beras_kg', e.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="target_penerima_kk">Target Penerima (KK)</Label>
                                <Input
                                    id="target_penerima_kk"
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={data.target_penerima_kk}
                                    onChange={(e) => setData('target_penerima_kk', e.target.value)}
                                />
                            </div>
                        </div>

                        <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-xs cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.khusus_amil}
                                onChange={(e) => setData('khusus_amil', e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                            />
                            <div>
                                <p className="font-semibold text-foreground">
                                    Kunci Program Khusus Amil Zakat (ASN-03)
                                </p>
                                <p className="text-muted-foreground">
                                    Jika diaktifkan, pengajuan pencairan BKK untuk program ini hanya dapat memilih penerima dari golongan Amil Zakat (ASN-03) yang terdaftar.
                                </p>
                            </div>
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
                                {processing ? 'Menyimpan...' : 'Simpan Program'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
