import * as React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Edit3, Eye, Plus, Search, Users } from 'lucide-react';
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
import type { JenisMuzaki, Muzaki } from '@/types';

interface MuzakiRow extends Muzaki {
    jumlah_jiwa: number;
    jumlah_anggota_terdaftar?: number;
}

interface MuzakiIndexProps {
    daftarMuzaki: MuzakiRow[];
    filters: {
        q: string;
        jenis: string;
    };
    rdbmsError?: string | null;
}

export default function MuzakiIndex({
    daftarMuzaki = [],
    filters,
    rdbmsError,
}: MuzakiIndexProps) {
    const [searchQuery, setSearchQuery] = React.useState<string>(filters?.q ?? '');
    const [jenisFilter, setJenisFilter] = React.useState<string>(filters?.jenis ?? 'SEMUA');
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [editingMuzaki, setEditingMuzaki] = React.useState<MuzakiRow | null>(null);
    const [limitMuzaki, setLimitMuzaki] = React.useState<number>(10);
    const [pageMuzaki, setPageMuzaki] = React.useState<number>(1);

    const totalPagesMuzaki = Math.max(1, Math.ceil(daftarMuzaki.length / limitMuzaki));
    const currentPageMuzaki = Math.min(pageMuzaki, totalPagesMuzaki);
    const paginatedMuzaki = React.useMemo(() => {
        const start = (currentPageMuzaki - 1) * limitMuzaki;
        return daftarMuzaki.slice(start, start + limitMuzaki);
    }, [daftarMuzaki, currentPageMuzaki, limitMuzaki]);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        nik: string;
        nama_lengkap: string;
        no_hp: string;
        alamat_rt_rw: string;
        jenis_muzaki: JenisMuzaki;
    }>({
        nik: '',
        nama_lengkap: '',
        no_hp: '',
        alamat_rt_rw: '',
        jenis_muzaki: 'KK_Keluarga',
    });

    const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/muzaki',
            { q: searchQuery, jenis: jenisFilter },
            { preserveState: true, replace: true }
        );
    };

    const openCreateModal = () => {
        setEditingMuzaki(null);
        reset();
        setDialogOpen(true);
    };

    const openEditModal = (muzaki: MuzakiRow) => {
        setEditingMuzaki(muzaki);
        setData({
            nik: muzaki.nik,
            nama_lengkap: muzaki.nama_lengkap,
            no_hp: muzaki.no_hp ?? '',
            alamat_rt_rw: muzaki.alamat_rt_rw ?? '',
            jenis_muzaki: muzaki.jenis_muzaki,
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (editingMuzaki) {
            put(`/muzaki/${editingMuzaki.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            post('/muzaki', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    return (
        <AuthenticatedLayout
            title="Manajemen Muzaki & Kepala Keluarga (KK)"
            subtitle="Pendaftaran donatur dan pengelolaan jumlah jiwa tanggungan zakat fitrah keluarga"
        >
            <Head title="Data Muzaki & Keluarga" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Direktori Muzaki & Donatur ({daftarMuzaki.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Cari berdasarkan NIK 16 digit, nama lengkap, nomor HP, atau alamat RT/RW.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Daftarkan Muzaki Baru</span>
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form onSubmit={handleSearchSubmit} className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-6">
                                <Label htmlFor="cari-muzaki" className="sr-only">
                                    Cari NIK, Nama, atau No. HP
                                </Label>
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="cari-muzaki"
                                        type="search"
                                        placeholder="Cari NIK 16 digit, nama lengkap, atau no HP..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-4">
                                <Label htmlFor="filter-jenis-muzaki" className="sr-only">
                                    Filter Jenis Muzaki
                                </Label>
                                <Select
                                    value={jenisFilter}
                                    onValueChange={(val) => {
                                        setJenisFilter(val);
                                        router.get(
                                            '/muzaki',
                                            { q: searchQuery, jenis: val },
                                            { preserveState: true, replace: true }
                                        );
                                    }}
                                >
                                    <SelectTrigger id="filter-jenis-muzaki">
                                        <SelectValue placeholder="Filter Jenis Muzaki" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SEMUA">Semua Jenis Muzaki</SelectItem>
                                        <SelectItem value="KK_Keluarga">KK Keluarga</SelectItem>
                                        <SelectItem value="Individu">Individu</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2">
                                <Select
                                    value={String(limitMuzaki)}
                                    onValueChange={(val) => {
                                        setLimitMuzaki(Number.parseInt(val, 10) || 10);
                                        setPageMuzaki(1);
                                    }}
                                >
                                    <SelectTrigger aria-label="Limit Baris Muzaki">
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
                        </form>

                        {daftarMuzaki.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Tidak ada data muzaki yang ditemukan</p>
                                <p className="text-xs text-muted-foreground">
                                    Daftarkan muzaki baru atau ubah kata kunci pencarian Anda.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block max-h-[540px] overflow-y-auto rounded-lg border">
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                            <TableRow>
                                                <TableHead>NIK (16 Digit)</TableHead>
                                                <TableHead>Nama Lengkap Muzaki</TableHead>
                                                <TableHead>No. HP & Alamat RT/RW</TableHead>
                                                <TableHead>Jenis</TableHead>
                                                <TableHead className="text-right">
                                                    Jumlah Jiwa Keluarga
                                                </TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedMuzaki.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {row.nik}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        {row.nama_lengkap}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <p>{row.no_hp || '-'}</p>
                                                        <p className="text-muted-foreground">
                                                            {row.alamat_rt_rw || '-'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {row.jenis_muzaki.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="success" className="tabular-nums">
                                                            {row.jumlah_jiwa} jiwa
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href={`/muzaki/${row.id}`}>
                                                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>
                                                                        {row.jenis_muzaki === 'Individu'
                                                                            ? 'Detail'
                                                                            : 'Anggota KK'}
                                                                    </span>
                                                                </Link>
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
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {paginatedMuzaki.map((row) => (
                                        <div
                                            key={row.id}
                                            className="rounded-lg border bg-card p-4 space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-mono text-xs text-muted-foreground">
                                                        NIK: {row.nik}
                                                    </p>
                                                    <p className="text-sm font-bold">{row.nama_lengkap}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {row.alamat_rt_rw || '-'} • {row.no_hp || '-'}
                                                    </p>
                                                </div>
                                                <Badge variant="success" className="tabular-nums">
                                                    {row.jumlah_jiwa} jiwa
                                                </Badge>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <Button asChild variant="default" size="sm" className="flex-1">
                                                    <Link href={`/muzaki/${row.id}`}>
                                                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>
                                                            {row.jenis_muzaki === 'Individu'
                                                                ? 'Detail Muzaki'
                                                                : 'Kelola Anggota KK'}
                                                        </span>
                                                    </Link>
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
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                                    <span className="text-muted-foreground tabular-nums">
                                        Menampilkan {paginatedMuzaki.length} dari {daftarMuzaki.length} muzaki (Halaman{' '}
                                        {currentPageMuzaki} / {totalPagesMuzaki})
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPageMuzaki <= 1}
                                            onClick={() => setPageMuzaki((p) => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                            <span>Sebelumnya</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPageMuzaki >= totalPagesMuzaki}
                                            onClick={() =>
                                                setPageMuzaki((p) => Math.min(totalPagesMuzaki, p + 1))
                                            }
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingMuzaki
                                ? `Ubah Data Muzaki ${editingMuzaki.nama_lengkap}`
                                : 'Pendaftaran Muzaki Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Pastikan NIK terdiri dari tepat 16 digit angka sesuai KTP/KK.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="nik_muzaki">NIK (16 Digit Angka)</Label>
                            <Input
                                id="nik_muzaki"
                                inputMode="numeric"
                                maxLength={16}
                                required
                                placeholder="320101..."
                                value={data.nik}
                                onChange={(e) =>
                                    setData('nik', e.target.value.replace(/[^0-9]/g, '').slice(0, 16))
                                }
                            />
                            {errors.nik && <p className="text-xs text-destructive">{errors.nik}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="nama_muzaki">Nama Lengkap Muzaki / Kepala Keluarga</Label>
                            <Input
                                id="nama_muzaki"
                                required
                                placeholder="Masukkan nama lengkap sesuai KTP"
                                value={data.nama_lengkap}
                                onChange={(e) => setData('nama_lengkap', e.target.value)}
                            />
                            {errors.nama_lengkap && (
                                <p className="text-xs text-destructive">{errors.nama_lengkap}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="jenis_muzaki_select">Jenis Muzaki</Label>
                                <Select
                                    value={data.jenis_muzaki}
                                    onValueChange={(val) => setData('jenis_muzaki', val as JenisMuzaki)}
                                >
                                    <SelectTrigger id="jenis_muzaki_select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="KK_Keluarga">KK Keluarga</SelectItem>
                                        <SelectItem value="Individu">Individu</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="no_hp_muzaki">Nomor HP / WhatsApp</Label>
                                <Input
                                    id="no_hp_muzaki"
                                    type="tel"
                                    placeholder="0812..."
                                    value={data.no_hp}
                                    onChange={(e) => setData('no_hp', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="alamat_muzaki">Alamat Lengkap / RT / RW</Label>
                            <Input
                                id="alamat_muzaki"
                                placeholder="RT 003 / RW 005, Komplek Masjid"
                                value={data.alamat_rt_rw}
                                onChange={(e) => setData('alamat_rt_rw', e.target.value)}
                            />
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
                                {processing ? 'Menyimpan...' : 'Simpan Data Muzaki'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
