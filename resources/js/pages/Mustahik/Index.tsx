import * as React from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardCheck,
    Edit3,
    Plus,
    Search,
    ShieldAlert,
    XCircle,
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTanggalIndonesia } from '@/lib/format';
import type {
    HasilVerifikasi,
    KategoriAsnaf,
    Mustahik,
    SharedProps,
    StatusVerifikasiMustahik,
} from '@/types';

interface MustahikRow extends Mustahik {
    kode_asnaf: string;
    nama_asnaf: string;
    is_layak_syariat: number | boolean;
    usia_verifikasi_hari?: number | null;
}

interface RiwayatVerifikasiRow {
    id: number;
    mustahik_id: number;
    nik_mustahik: string;
    nama_mustahik: string;
    verifikator_id: number;
    nama_verifikator: string;
    tanggal_verifikasi: string;
    hasil: HasilVerifikasi;
    catatan_survei: string | null;
}

interface MustahikIndexProps {
    daftarMustahik: MustahikRow[];
    daftarAsnaf: KategoriAsnaf[];
    riwayatVerifikasi: RiwayatVerifikasiRow[];
    filters: {
        q: string;
        asnaf: string;
        status: string;
    };
    rdbmsError?: string | null;
}

export default function MustahikIndex({
    daftarMustahik = [],
    daftarAsnaf = [],
    riwayatVerifikasi = [],
    filters,
    rdbmsError,
}: MustahikIndexProps) {
    const { auth } = usePage<SharedProps>().props;
    const userRole = auth?.user?.peran;
    const canVerify =
        userRole === 'Verifikator' || userRole === 'Admin' || userRole === 'Ketua_DKM';

    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [searchQuery, setSearchQuery] = React.useState<string>(filters?.q ?? '');
    const [asnafFilter, setAsnafFilter] = React.useState<string>(filters?.asnaf ?? 'SEMUA');
    const [statusFilter, setStatusFilter] = React.useState<string>(filters?.status ?? 'SEMUA');

    const [formDialogOpen, setFormDialogOpen] = React.useState<boolean>(false);
    const [editingMustahik, setEditingMustahik] = React.useState<MustahikRow | null>(null);
    const [surveiTarget, setSurveiTarget] = React.useState<MustahikRow | null>(null);

    React.useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const defaultAsnafId = daftarAsnaf[0]?.id ?? 1;

    const { data, setData, post, put, processing, errors } = useForm<{
        nik: string;
        nama_lengkap: string;
        kategori_asnaf_id: number;
        alamat_rt_rw: string;
    }>({
        nik: '',
        nama_lengkap: '',
        kategori_asnaf_id: defaultAsnafId,
        alamat_rt_rw: '',
    });

    const surveiForm = useForm<{
        hasil: HasilVerifikasi;
        catatan_survei: string;
    }>({
        hasil: 'Layak',
        catatan_survei: '',
    });

    const applyFilters = (qVal: string, asnafVal: string, statusVal: string) => {
        router.get(
            '/mustahik',
            { q: qVal, asnaf: asnafVal, status: statusVal },
            { preserveState: true, replace: true }
        );
    };

    const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters(searchQuery, asnafFilter, statusFilter);
    };

    const openCreateModal = () => {
        setEditingMustahik(null);
        setData({
            nik: '',
            nama_lengkap: '',
            kategori_asnaf_id: defaultAsnafId,
            alamat_rt_rw: '',
        });
        setFormDialogOpen(true);
    };

    const openEditModal = (mustahik: MustahikRow) => {
        setEditingMustahik(mustahik);
        setData({
            nik: mustahik.nik,
            nama_lengkap: mustahik.nama_lengkap,
            kategori_asnaf_id: Number(mustahik.kategori_asnaf_id),
            alamat_rt_rw: mustahik.alamat_rt_rw ?? '',
        });
        setFormDialogOpen(true);
    };

    const openSurveiModal = (mustahik: MustahikRow) => {
        setSurveiTarget(mustahik);
        surveiForm.setData({
            hasil: 'Layak',
            catatan_survei: '',
        });
    };

    const handleSubmitMustahik = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline) return;

        if (editingMustahik) {
            put(`/mustahik/${editingMustahik.id}`, {
                onSuccess: () => setFormDialogOpen(false),
            });
        } else {
            post('/mustahik', {
                onSuccess: () => setFormDialogOpen(false),
            });
        }
    };

    const handleSubmitSurvei = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!surveiTarget || !isOnline) return;

        surveiForm.post(`/mustahik/${surveiTarget.id}/verifikasi`, {
            onSuccess: () => {
                setSurveiTarget(null);
                surveiForm.reset();
            },
        });
    };

    const getStatusBadgeVariant = (
        status: StatusVerifikasiMustahik
    ): 'success' | 'warning' | 'destructive' | 'secondary' => {
        if (status === 'Layak') return 'success';
        if (status === 'Menunggu') return 'warning';
        return 'destructive';
    };

    return (
        <AuthenticatedLayout
            title="Manajemen Mustahik (8 Asnaf) & Survei Kelayakan Lapangan"
            subtitle="Kelayakan penerima dana Zakat divalidasi oleh fn_cek_kelayakan_mustahik(id) = 1 (Status Layak & <= 365 hari)"
        >
            <Head title="Mustahik & Survei Verifikator" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Basis Data Mustahik & Riwayat Survei ({daftarMustahik.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Event <code className="font-mono text-xs">evt_kedaluwarsa_verifikasi_mustahik</code> otomatis mengubah status <code className="font-mono text-xs">Layak</code> menjadi <code className="font-mono text-xs">Kedaluwarsa</code> setelah melewati 365 hari.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal} disabled={!isOnline}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Daftarkan Calon Mustahik</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="mustahik">
                            <TabsList>
                                <TabsTrigger value="mustahik">
                                    Daftar Mustahik ({daftarMustahik.length})
                                </TabsTrigger>
                                <TabsTrigger value="riwayat">
                                    Riwayat Survei Lapangan ({riwayatVerifikasi.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="mustahik" className="space-y-4 pt-3">
                                <form onSubmit={handleFilterSubmit} className="grid gap-3 sm:grid-cols-12">
                                    <div className="sm:col-span-5">
                                        <Label htmlFor="cari-mustahik" className="sr-only">
                                            Cari NIK, Nama, atau Alamat
                                        </Label>
                                        <div className="relative">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="cari-mustahik"
                                                type="search"
                                                placeholder="Cari NIK 16 digit, nama, atau RT/RW..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <Select
                                            value={asnafFilter}
                                            onValueChange={(val) => {
                                                setAsnafFilter(val);
                                                applyFilters(searchQuery, val, statusFilter);
                                            }}
                                        >
                                            <SelectTrigger aria-label="Filter Golongan 8 Asnaf">
                                                <SelectValue placeholder="Filter 8 Asnaf" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SEMUA">Semua 8 Asnaf</SelectItem>
                                                {daftarAsnaf.map((a) => (
                                                    <SelectItem key={a.id} value={a.kode_asnaf}>
                                                        {a.kode_asnaf} - {a.nama_asnaf}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <Select
                                            value={statusFilter}
                                            onValueChange={(val) => {
                                                setStatusFilter(val);
                                                applyFilters(searchQuery, asnafFilter, val);
                                            }}
                                        >
                                            <SelectTrigger aria-label="Filter Status Verifikasi">
                                                <SelectValue placeholder="Filter Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SEMUA">Semua Status</SelectItem>
                                                <SelectItem value="Menunggu">Menunggu Survei</SelectItem>
                                                <SelectItem value="Layak">Layak</SelectItem>
                                                <SelectItem value="Tidak_Layak">Tidak Layak</SelectItem>
                                                <SelectItem value="Kedaluwarsa">Kedaluwarsa (&gt;365h)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-1">
                                        <Button type="submit" variant="secondary" className="w-full">
                                            Cari
                                        </Button>
                                    </div>
                                </form>

                                {daftarMustahik.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
                                        <p className="text-sm font-semibold">Tidak ada data mustahik yang ditemukan</p>
                                        <p className="text-xs text-muted-foreground">
                                            Daftarkan calon mustahik baru atau sesuaikan filter pencarian.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>NIK & Nama Mustahik</TableHead>
                                                        <TableHead>Golongan Asnaf</TableHead>
                                                        <TableHead>Status Verifikasi</TableHead>
                                                        <TableHead>
                                                            Badge Kelayakan RDBMS (fn_cek_kelayakan_mustahik)
                                                        </TableHead>
                                                        <TableHead className="text-right">Tindakan</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {daftarMustahik.map((row) => {
                                                        const layakSyariat =
                                                            Number(row.is_layak_syariat) === 1 ||
                                                            row.is_layak_syariat === true;

                                                        return (
                                                            <TableRow key={row.id}>
                                                                <TableCell>
                                                                    <p className="font-semibold text-sm">
                                                                        {row.nama_lengkap}
                                                                    </p>
                                                                    <p className="font-mono text-xs text-muted-foreground">
                                                                        NIK: {row.nik} • {row.alamat_rt_rw || '-'}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {row.kode_asnaf} - {row.nama_asnaf}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={getStatusBadgeVariant(
                                                                            row.status_verifikasi
                                                                        )}
                                                                    >
                                                                        {row.status_verifikasi.replace('_', ' ')}
                                                                    </Badge>
                                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                                        Survei:{' '}
                                                                        {formatTanggalIndonesia(
                                                                            row.tanggal_verifikasi_terakhir
                                                                        )}
                                                                    </p>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {layakSyariat ? (
                                                                        <Badge variant="success">
                                                                            <CheckCircle2
                                                                                className="mr-1 h-3.5 w-3.5"
                                                                                aria-hidden="true"
                                                                            />
                                                                            Sah Terima Zakat (1) •{' '}
                                                                            {row.usia_verifikasi_hari ?? 0}h
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="destructive">
                                                                            <XCircle
                                                                                className="mr-1 h-3.5 w-3.5"
                                                                                aria-hidden="true"
                                                                            />
                                                                            Ditolak RDBMS untuk Zakat (0)
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="inline-flex items-center gap-2">
                                                                        {canVerify && (
                                                                            <Button
                                                                                type="button"
                                                                                size="sm"
                                                                                disabled={!isOnline}
                                                                                onClick={() => openSurveiModal(row)}
                                                                            >
                                                                                <ClipboardCheck
                                                                                    className="h-3.5 w-3.5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span>Input Survei</span>
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openEditModal(row)}
                                                                        >
                                                                            <Edit3
                                                                                className="h-3.5 w-3.5"
                                                                                aria-hidden="true"
                                                                            />
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
                                            {daftarMustahik.map((row) => {
                                                const layakSyariat =
                                                    Number(row.is_layak_syariat) === 1 ||
                                                    row.is_layak_syariat === true;

                                                return (
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
                                                                    {row.kode_asnaf} ({row.nama_asnaf}) •{' '}
                                                                    {row.alamat_rt_rw || '-'}
                                                                </p>
                                                            </div>
                                                            <Badge
                                                                variant={getStatusBadgeVariant(row.status_verifikasi)}
                                                            >
                                                                {row.status_verifikasi.replace('_', ' ')}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                                                            <span>fn_cek_kelayakan_mustahik:</span>
                                                            {layakSyariat ? (
                                                                <Badge variant="success">
                                                                    Layak Zakat (1) • {row.usia_verifikasi_hari ?? 0}h
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive">
                                                                    Tidak Memenuhi Syarat Zakat (0)
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 pt-1">
                                                            {canVerify && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    className="flex-1"
                                                                    disabled={!isOnline}
                                                                    onClick={() => openSurveiModal(row)}
                                                                >
                                                                    <ClipboardCheck
                                                                        className="h-3.5 w-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span>Input Survei</span>
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
                                                                <span>Ubah Profil</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="riwayat" className="pt-3">
                                {riwayatVerifikasi.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada riwayat survei pada tabel verifikasi_mustahik.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tanggal Survei</TableHead>
                                                    <TableHead>Mustahik (NIK)</TableHead>
                                                    <TableHead>Verifikator Lapangan</TableHead>
                                                    <TableHead>Hasil Survei</TableHead>
                                                    <TableHead>Catatan Survei</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {riwayatVerifikasi.map((rv) => (
                                                    <TableRow key={rv.id}>
                                                        <TableCell className="text-xs">
                                                            {formatTanggalIndonesia(rv.tanggal_verifikasi)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="font-semibold text-sm">{rv.nama_mustahik}</p>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                {rv.nik_mustahik}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-medium">
                                                            {rv.nama_verifikator}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    rv.hasil === 'Layak' ? 'success' : 'destructive'
                                                                }
                                                            >
                                                                {rv.hasil.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground max-w-md">
                                                            {rv.catatan_survei || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Tambah / Ubah Profil Mustahik */}
            <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingMustahik
                                ? `Ubah Profil Mustahik ${editingMustahik.nama_lengkap}`
                                : 'Pendaftaran Calon Mustahik Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Calon mustahik baru didaftarkan dengan status awal <code className="font-mono text-xs">Menunggu</code> sebelum disurvei oleh Verifikator.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitMustahik} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="nik_mustahik">NIK Mustahik (16 Digit Angka)</Label>
                            <Input
                                id="nik_mustahik"
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
                            <Label htmlFor="nama_mustahik">Nama Lengkap Mustahik</Label>
                            <Input
                                id="nama_mustahik"
                                required
                                placeholder="Masukkan nama lengkap sesuai KTP/KK"
                                value={data.nama_lengkap}
                                onChange={(e) => setData('nama_lengkap', e.target.value)}
                            />
                            {errors.nama_lengkap && (
                                <p className="text-xs text-destructive">{errors.nama_lengkap}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="asnaf_select">Golongan 8 Asnaf (kategori_asnaf)</Label>
                            <Select
                                value={String(data.kategori_asnaf_id)}
                                onValueChange={(val) => setData('kategori_asnaf_id', Number.parseInt(val, 10))}
                            >
                                <SelectTrigger id="asnaf_select">
                                    <SelectValue placeholder="Pilih golongan asnaf" />
                                </SelectTrigger>
                                <SelectContent>
                                    {daftarAsnaf.map((a) => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                            {a.kode_asnaf} - {a.nama_asnaf}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="alamat_mustahik">Alamat RT / RW</Label>
                            <Input
                                id="alamat_mustahik"
                                placeholder="RT 002 / RW 004, Kelurahan..."
                                value={data.alamat_rt_rw}
                                onChange={(e) => setData('alamat_rt_rw', e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFormDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing || !isOnline}>
                                {processing ? 'Menyimpan...' : 'Simpan Data Mustahik'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Input Survei Lapangan via CALL sp_verifikasi_mustahik */}
            <Dialog open={Boolean(surveiTarget)} onOpenChange={(open) => !open && setSurveiTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Input Hasil Survei Lapangan: {surveiTarget?.nama_lengkap}
                        </DialogTitle>
                        <DialogDescription>
                            Mengeksekusi <code className="font-mono text-xs">CALL sp_verifikasi_mustahik(?, ?, ?, ?)</code> untuk menyimpan riwayat survei, memperbarui <code className="font-mono text-xs">tanggal_verifikasi_terakhir</code>, dan mencatat audit JSON.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmitSurvei} className="space-y-4">
                        {surveiTarget && (
                            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                                <p>
                                    NIK: <strong className="font-mono">{surveiTarget.nik}</strong>
                                </p>
                                <p>
                                    Golongan Asnaf:{' '}
                                    <strong>
                                        {surveiTarget.kode_asnaf} ({surveiTarget.nama_asnaf})
                                    </strong>
                                </p>
                                <p>
                                    Status Saat Ini: <strong>{surveiTarget.status_verifikasi}</strong>
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="hasil_survei_select">Keputusan Hasil Survei Kelayakan</Label>
                            <Select
                                value={surveiForm.data.hasil}
                                onValueChange={(val) => surveiForm.setData('hasil', val as HasilVerifikasi)}
                            >
                                <SelectTrigger id="hasil_survei_select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Layak">Layak (Berhak Menerima Dana Zakat 365 Hari)</SelectItem>
                                    <SelectItem value="Tidak_Layak">Tidak Layak (Tidak Memenuhi Kriteria Asnaf)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="catatan_survei_input">Catatan Temuan Survei Lapangan (Wajib)</Label>
                            <Input
                                id="catatan_survei_input"
                                required
                                minLength={5}
                                placeholder="Contoh: Rumah kontrakan petak, penghasilan harian tidak menentu, tanggungan 4 anak"
                                value={surveiForm.data.catatan_survei}
                                onChange={(e) => surveiForm.setData('catatan_survei', e.target.value)}
                            />
                            {surveiForm.errors.catatan_survei && (
                                <p className="text-xs text-destructive">{surveiForm.errors.catatan_survei}</p>
                            )}
                        </div>

                        <Separator />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSurveiTarget(null)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={surveiForm.processing || !isOnline}>
                                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                                <span>
                                    {surveiForm.processing
                                        ? 'Menjalankan sp_verifikasi_mustahik...'
                                        : 'Simpan Hasil Survei'}
                                </span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
