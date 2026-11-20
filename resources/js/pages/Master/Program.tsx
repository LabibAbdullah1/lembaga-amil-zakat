import * as React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Edit3, Plus, ShieldAlert } from 'lucide-react';
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
import { formatRupiah } from '@/lib/format';
import type { JenisDana, PeriodeRamadhan, ProgramPenyaluran, StatusProgram } from '@/types';

interface ProgramRow extends ProgramPenyaluran {
    kode_dana: string;
    nama_dana: string;
    kategori_utama: string;
    tahun_hijriah: string;
    tahun_masehi: number;
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
        status_program: StatusProgram;
    }>({
        kode_program: '',
        nama_program: '',
        jenis_dana_id: defaultDanaId,
        periode_id: defaultPeriodeId,
        anggaran_rencana: '0',
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
            status_program: program.status_program,
        });
        setDialogOpen(true);
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
            subtitle="Kunci kesesuaian kantong jenis_dana_id program terhadap Bukti Kas Keluar (BKK) dijaga oleh trg_before_insert_penyaluran_dana"
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
                                Setiap BKK yang diajukan Staf Penyaluran wajib menggunakan <code className="font-mono text-xs">jenis_dana_id</code> yang identik dengan program ini.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Tambah Program</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
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
                                                <TableHead>Kode</TableHead>
                                                <TableHead>Nama Program Penyaluran</TableHead>
                                                <TableHead>Kantong Sumber Dana</TableHead>
                                                <TableHead>Periode</TableHead>
                                                <TableHead className="text-right">Anggaran Rencana</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daftarProgram.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {row.kode_program}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {row.nama_program}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="font-mono font-semibold">{row.kode_dana}</span>{' '}
                                                        - {row.nama_dana}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {row.tahun_hijriah} H ({row.tahun_masehi})
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold tabular-nums">
                                                        {formatRupiah(row.anggaran_rencana)}
                                                    </TableCell>
                                                    <TableCell>
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
                                                    <TableCell className="text-right">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditModal(row)}
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                            <span>Ubah</span>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {daftarProgram.map((row) => (
                                        <div
                                            key={row.id}
                                            className="rounded-lg border bg-card p-4 space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-mono text-xs font-semibold text-muted-foreground">
                                                        {row.kode_program}
                                                    </p>
                                                    <p className="text-sm font-bold">{row.nama_program}</p>
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

                                            <div className="text-xs text-muted-foreground space-y-1">
                                                <p>
                                                    Sumber Dana: <strong className="text-foreground">{row.kode_dana} ({row.nama_dana})</strong>
                                                </p>
                                                <p>
                                                    Periode: Ramadhan {row.tahun_hijriah} H ({row.tahun_masehi})
                                                </p>
                                                <p className="tabular-nums">
                                                    Anggaran Rencana: <strong className="text-foreground">{formatRupiah(row.anggaran_rencana)}</strong>
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => openEditModal(row)}
                                            >
                                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                <span>Ubah Program</span>
                                            </Button>
                                        </div>
                                    ))}
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
                                <Label htmlFor="kode_program">Kode Program</Label>
                                <Input
                                    id="kode_program"
                                    required
                                    placeholder="Contoh: PRG-FTR-26"
                                    value={data.kode_program}
                                    onChange={(e) => setData('kode_program', e.target.value)}
                                />
                                {errors.kode_program && (
                                    <p className="text-xs text-destructive">{errors.kode_program}</p>
                                )}
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
                                <Label htmlFor="anggaran_rencana">Anggaran Rencana (Rp)</Label>
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
