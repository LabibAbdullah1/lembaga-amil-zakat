import * as React from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, HandCoins, Lock, Plus, RefreshCw, Trash2, UserCheck, Users } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBerasKg, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type { AnggotaKeluargaMuzaki, Muzaki, StatusHubunganKeluarga } from '@/types';

interface RiwayatSetoranRow {
    id: number;
    no_kwitansi: string;
    tanggal_transaksi: string;
    metode_bayar: string;
    total_nominal: number | string;
    total_beras_kg: number | string;
    status_transaksi: 'Sah' | 'Dibatalkan';
    alasan_batal: string | null;
    tahun_hijriah: string;
    tahun_masehi: number;
    nama_amil: string;
}

interface MuzakiShowProps {
    muzaki: Muzaki & { jumlah_jiwa: number };
    anggotaKeluarga: AnggotaKeluargaMuzaki[];
    riwayatSetoran: RiwayatSetoranRow[];
    rdbmsError?: string | null;
}

const HUBUNGAN_LIST: StatusHubunganKeluarga[] = [
    'Kepala_Keluarga',
    'Istri',
    'Anak',
    'Tanggungan_Lain',
];

export default function MuzakiShow({
    muzaki,
    anggotaKeluarga = [],
    riwayatSetoran = [],
    rdbmsError,
}: MuzakiShowProps) {
    const isIndividu = muzaki.jenis_muzaki === 'Individu';
    const [convertingJenis, setConvertingJenis] = React.useState<boolean>(false);

    const { data, setData, post, processing, errors, reset } = useForm<{
        nama_anggota: string;
        status_hubungan: StatusHubunganKeluarga;
    }>({
        nama_anggota: '',
        status_hubungan: 'Anak',
    });

    const handleAddAnggota = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isIndividu) return;
        post(`/muzaki/${muzaki.id}/anggota`, {
            onSuccess: () => reset('nama_anggota'),
        });
    };

    const handleDeleteAnggota = (anggota: AnggotaKeluargaMuzaki) => {
        router.delete(`/muzaki/${muzaki.id}/anggota/${anggota.id}`);
    };

    const handleUbahKeKeluarga = () => {
        setConvertingJenis(true);
        router.put(
            `/muzaki/${muzaki.id}`,
            {
                nik: muzaki.nik,
                nama_lengkap: muzaki.nama_lengkap,
                no_hp: muzaki.no_hp ?? '',
                alamat_rt_rw: muzaki.alamat_rt_rw ?? '',
                jenis_muzaki: 'KK_Keluarga',
            },
            {
                preserveScroll: true,
                onFinish: () => setConvertingJenis(false),
            }
        );
    };

    return (
        <AuthenticatedLayout
            title={`Detail Muzaki: ${muzaki.nama_lengkap}`}
            subtitle={`NIK: ${muzaki.nik} • Jenis: ${muzaki.jenis_muzaki.replace('_', ' ')} • Total Tanggungan: ${muzaki.jumlah_jiwa} jiwa`}
        >
            <Head title={`Detail Muzaki ${muzaki.nama_lengkap}`} />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/muzaki">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span>Kembali ke Daftar Muzaki</span>
                        </Link>
                    </Button>

                    <Button asChild size="sm">
                        <Link href={`/loket?muzaki_id=${muzaki.id}`}>
                            <HandCoins className="h-4 w-4" aria-hidden="true" />
                            <span>Catat Setoran di Loket Zakat</span>
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                    <section className="lg:col-span-5 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">Profil Muzaki & KK</CardTitle>
                                    <Badge variant="success" className="tabular-nums">
                                        Total: {muzaki.jumlah_jiwa} jiwa
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Jumlah jiwa dihitung otomatis dari daftar anggota keluarga yang terdaftar (minimal 1 jiwa).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">NIK</span>
                                    <span className="col-span-2 font-mono font-semibold">{muzaki.nik}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Nama Lengkap</span>
                                    <span className="col-span-2 font-semibold">{muzaki.nama_lengkap}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <span className="text-muted-foreground">Jenis Muzaki</span>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <Badge variant={isIndividu ? 'secondary' : 'success'}>
                                            {muzaki.jenis_muzaki.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">No. HP</span>
                                    <span className="col-span-2">{muzaki.no_hp || '-'}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Alamat RT/RW</span>
                                    <span className="col-span-2">{muzaki.alamat_rt_rw || '-'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Kunci Penambahan Anggota Keluarga jika Jenis Muzaki = Individu */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-base">Tambah Anggota Keluarga (KK)</CardTitle>
                                    {isIndividu ? (
                                        <Badge variant="warning">Terkunci (Individu)</Badge>
                                    ) : (
                                        <Badge variant="outline">KK Keluarga</Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    {isIndividu
                                        ? 'Muzaki berjenis Individu hanya dihitung 1 jiwa dan tidak dapat memiliki daftar tanggungan keluarga.'
                                        : 'Tambahkan kepala keluarga, istri, anak, atau tanggungan lain untuk kalkulasi otomatis zakat fitrah.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isIndividu ? (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3 text-xs dark:border-amber-800 dark:bg-amber-950/40">
                                        <div className="flex items-start gap-2.5">
                                            <Lock
                                                className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 dark:text-amber-300"
                                                aria-hidden="true"
                                            />
                                            <div className="space-y-1">
                                                <p className="font-semibold text-amber-900 dark:text-amber-200">
                                                    Penambahan Tanggungan Dinonaktifkan untuk Jenis Individu
                                                </p>
                                                <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                                                    Jika <strong>{muzaki.nama_lengkap}</strong> ingin menambahkan istri, anak, atau tanggungan lain ke dalam perhitungan zakat fitrah, ubah jenis Muzaki menjadi <strong>KK Keluarga</strong> terlebih dahulu.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={handleUbahKeKeluarga}
                                            disabled={convertingJenis}
                                            className="w-full"
                                        >
                                            <RefreshCw
                                                className={
                                                    convertingJenis ? 'h-4 w-4 animate-spin' : 'h-4 w-4'
                                                }
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {convertingJenis
                                                    ? 'Mengubah Jenis Muzaki...'
                                                    : 'Ubah Jenis Menjadi KK Keluarga Sekarang'}
                                            </span>
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleAddAnggota} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="nama_anggota">Nama Anggota Keluarga</Label>
                                            <Input
                                                id="nama_anggota"
                                                required
                                                placeholder="Masukkan nama anggota keluarga"
                                                value={data.nama_anggota}
                                                onChange={(e) => setData('nama_anggota', e.target.value)}
                                            />
                                            {errors.nama_anggota && (
                                                <p className="text-xs text-destructive">
                                                    {errors.nama_anggota}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="status_hubungan_select">
                                                Status Hubungan dalam KK
                                            </Label>
                                            <Select
                                                value={data.status_hubungan}
                                                onValueChange={(val) =>
                                                    setData(
                                                        'status_hubungan',
                                                        val as StatusHubunganKeluarga
                                                    )
                                                }
                                            >
                                                <SelectTrigger id="status_hubungan_select">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HUBUNGAN_LIST.map((hub) => (
                                                        <SelectItem key={hub} value={hub}>
                                                            {hub.replace('_', ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Button type="submit" className="w-full" disabled={processing}>
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                            <span>
                                                {processing ? 'Menambahkan...' : 'Tambah ke Daftar KK'}
                                            </span>
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <section className="lg:col-span-7 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            Daftar Anggota Keluarga Terdaftar ({anggotaKeluarga.length} baris)
                                        </CardTitle>
                                    </div>
                                    {isIndividu && (
                                        <Badge variant="secondary">
                                            <UserCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                                            Muzaki Individu (1 Jiwa)
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {anggotaKeluarga.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center space-y-1">
                                        <p className="text-sm font-semibold">
                                            {isIndividu
                                                ? 'Muzaki Individu tidak memiliki tanggungan keluarga tambahan'
                                                : 'Belum ada rincian anggota keluarga terdaftar'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {isIndividu
                                                ? 'Zakat fitrah otomatis dihitung untuk 1 jiwa (diri sendiri). Ubah jenis menjadi KK Keluarga di panel kiri jika ingin menambahkan tanggungan.'
                                                : 'Tambahkan anggota keluarga melalui formulir di sebelah kiri.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto rounded-lg border">
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                <TableRow>
                                                    <TableHead>No</TableHead>
                                                    <TableHead>Nama Anggota Keluarga</TableHead>
                                                    <TableHead>Status Hubungan</TableHead>
                                                    <TableHead className="text-right">Tindakan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {anggotaKeluarga.map((item, idx) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="tabular-nums">{idx + 1}</TableCell>
                                                        <TableCell className="font-semibold">
                                                            {item.nama_anggota}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {item.status_hubungan.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`Hapus ${item.nama_anggota}`}
                                                                onClick={() => handleDeleteAnggota(item)}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Riwayat Kwitansi Setoran Muzaki ({riwayatSetoran.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {riwayatSetoran.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                                        Belum ada riwayat setoran zakat untuk Muzaki ini.
                                    </div>
                                ) : (
                                    <div className="max-h-96 overflow-y-auto rounded-lg border">
                                        <Table>
                                            <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                <TableRow>
                                                    <TableHead>No. Kwitansi</TableHead>
                                                    <TableHead>Tanggal</TableHead>
                                                    <TableHead>Metode</TableHead>
                                                    <TableHead className="text-right">Uang</TableHead>
                                                    <TableHead className="text-right">Beras</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {riwayatSetoran.map((tr) => (
                                                    <TableRow key={tr.id}>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            {tr.no_kwitansi}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {formatTanggalIndonesia(tr.tanggal_transaksi)}
                                                        </TableCell>
                                                        <TableCell className="text-xs">{tr.metode_bayar}</TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatRupiah(tr.total_nominal)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatBerasKg(tr.total_beras_kg)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    tr.status_transaksi === 'Sah'
                                                                        ? 'success'
                                                                        : 'destructive'
                                                                }
                                                            >
                                                                {tr.status_transaksi}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
