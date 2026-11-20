import * as React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Ban,
    Calculator,
    ChevronLeft,
    ChevronRight,
    FileDown,
    HandCoins,
    Search,
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
import { formatBerasKg, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
import type { JenisDana, MetodeBayar, Muzaki, PeriodeRamadhan } from '@/types';

interface MuzakiWithJiwa extends Muzaki {
    jumlah_jiwa: number;
}

interface DanaOperasionalRow extends JenisDana {
    nama_induk?: string | null;
}

interface KwitansiRow {
    id: number;
    no_kwitansi: string;
    muzaki_id: number;
    nik_muzaki: string;
    nama_muzaki: string;
    periode_id: number;
    tahun_hijriah: string;
    tahun_masehi: number;
    amil_id: number;
    nama_amil: string;
    tanggal_transaksi: string;
    metode_bayar: MetodeBayar;
    total_nominal: number | string;
    total_beras_kg: number | string;
    status_transaksi: 'Sah' | 'Dibatalkan';
    alasan_batal: string | null;
    jenis_dana_id?: number;
    kode_dana?: string;
    nama_dana?: string;
    jumlah_jiwa?: number;
}

interface LoketIndexProps {
    daftarMuzaki: MuzakiWithJiwa[];
    daftarDanaOperasional: DanaOperasionalRow[];
    periodeAktif: PeriodeRamadhan | null;
    riwayatKwitansi: KwitansiRow[];
    pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
    };
    filters: {
        status: string;
        q: string;
    };
    saranNoKwitansi: string;
    rdbmsError?: string | null;
}

const METODE_BAYAR_LIST: MetodeBayar[] = ['Tunai', 'Transfer', 'QRIS', 'Beras', 'Campuran'];

export default function LoketIndex({
    daftarMuzaki = [],
    daftarDanaOperasional = [],
    periodeAktif,
    riwayatKwitansi = [],
    pagination,
    filters,
    saranNoKwitansi,
    rdbmsError,
}: LoketIndexProps) {
    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [searchQuery, setSearchQuery] = React.useState<string>(filters?.q ?? '');
    const [statusFilter, setStatusFilter] = React.useState<string>(filters?.status ?? 'SEMUA');
    const [voidTarget, setVoidTarget] = React.useState<KwitansiRow | null>(null);

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

    const defaultMuzaki = daftarMuzaki[0] ?? null;
    const defaultDana = daftarDanaOperasional[0] ?? null;
    const tarifFitrah = Number(periodeAktif?.nominal_fitrah_per_jiwa ?? 45000);
    const takaranBeras = Number(periodeAktif?.beras_per_jiwa_kg ?? 2.5);

    const { data, setData, post, processing, errors } = useForm<{
        no_kwitansi: string;
        muzaki_id: number;
        periode_id: number;
        metode_bayar: MetodeBayar;
        jenis_dana_id: number;
        jumlah_jiwa: number;
        nominal: string;
        berat_beras_kg: string;
    }>({
        no_kwitansi: saranNoKwitansi,
        muzaki_id: defaultMuzaki?.id ?? 0,
        periode_id: periodeAktif?.id ?? 0,
        metode_bayar: 'Tunai',
        jenis_dana_id: defaultDana?.id ?? 0,
        jumlah_jiwa: defaultMuzaki?.jumlah_jiwa ?? 1,
        nominal: String((defaultMuzaki?.jumlah_jiwa ?? 1) * tarifFitrah),
        berat_beras_kg: '0',
    });

    const voidForm = useForm<{ alasan_batal: string }>({
        alasan_batal: '',
    });

    const selectedDana = React.useMemo(
        () => daftarDanaOperasional.find((d) => d.id === data.jenis_dana_id) ?? null,
        [daftarDanaOperasional, data.jenis_dana_id]
    );

    const isFitrahDana = React.useMemo(() => {
        if (!selectedDana) return false;
        const namaLower = selectedDana.nama_dana.toLowerCase();
        const kodeLower = selectedDana.kode_dana.toLowerCase();
        return namaLower.includes('fitrah') || kodeLower.includes('ftr');
    }, [selectedDana]);

    const applySaranKalkulasi = (
        jiwa: number,
        metode: MetodeBayar,
        fitrahMode: boolean
    ) => {
        if (!fitrahMode) return;

        if (metode === 'Beras') {
            setData((prev) => ({
                ...prev,
                jumlah_jiwa: jiwa,
                metode_bayar: metode,
                nominal: '0',
                berat_beras_kg: (jiwa * takaranBeras).toFixed(2),
            }));
        } else if (metode === 'Campuran') {
            const separuhJiwa = Math.max(1, Math.floor(jiwa / 2));
            const sisaJiwa = Math.max(0, jiwa - separuhJiwa);
            setData((prev) => ({
                ...prev,
                jumlah_jiwa: jiwa,
                metode_bayar: metode,
                nominal: String(separuhJiwa * tarifFitrah),
                berat_beras_kg: (sisaJiwa * takaranBeras).toFixed(2),
            }));
        } else {
            setData((prev) => ({
                ...prev,
                jumlah_jiwa: jiwa,
                metode_bayar: metode,
                nominal: String(jiwa * tarifFitrah),
                berat_beras_kg: '0',
            }));
        }
    };

    const handleSelectMuzaki = (muzakiIdStr: string) => {
        const idNum = Number.parseInt(muzakiIdStr, 10);
        const found = daftarMuzaki.find((m) => m.id === idNum);
        const jiwa = found ? Math.max(1, Number(found.jumlah_jiwa)) : 1;

        setData('muzaki_id', idNum);
        setData('jumlah_jiwa', jiwa);
        applySaranKalkulasi(jiwa, data.metode_bayar, isFitrahDana);
    };

    const handleSelectMetode = (metode: MetodeBayar) => {
        setData('metode_bayar', metode);
        applySaranKalkulasi(data.jumlah_jiwa, metode, isFitrahDana);
    };

    const handleSubmitSetoran = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline) return;
        post('/loket', {
            preserveScroll: true,
        });
    };

    const handleFilterRiwayat = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/loket',
            { q: searchQuery, status: statusFilter, page: 1 },
            { preserveState: true, replace: true }
        );
    };

    const handlePageChange = (newPage: number) => {
        router.get(
            '/loket',
            { q: searchQuery, status: statusFilter, page: newPage },
            { preserveState: true }
        );
    };

    const handleConfirmVoid = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!voidTarget || !isOnline) return;
        voidForm.post(`/loket/${voidTarget.id}/batalkan`, {
            preserveScroll: true,
            onSuccess: () => {
                setVoidTarget(null);
                voidForm.reset();
            },
        });
    };

    return (
        <AuthenticatedLayout
            title="Loket Penghimpunan Cepat (POS ZIS & Zakat Fitrah)"
            subtitle="Setoran dicatat atomik melalui CALL sp_terima_zis_fitrah(...) dan pembatalan (void) melalui CALL sp_batalkan_penghimpunan(...)"
        >
            <Head title="Loket Penghimpunan ZIS & Fitrah" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Form Entri Cepat Loket POS Masjid */}
                    <section className="lg:col-span-5">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <HandCoins className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            Form Setoran ZIS / Fitrah Cepat
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline">sp_terima_zis_fitrah</Badge>
                                </div>
                                <CardDescription>
                                    Pilih Muzaki untuk menarik otomatis <code className="font-mono text-xs">fn_hitung_jiwa_muzaki</code> dan saran kalkulasi zakat fitrah.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {!periodeAktif ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
                                        <p className="text-sm font-semibold text-destructive">
                                            Tidak Ada Periode Ramadhan Aktif
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Hubungi Admin untuk mengaktifkan 1 baris periode_ramadhan sebelum menerima transaksi loket.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitSetoran} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="no_kwitansi">Nomor Kwitansi</Label>
                                                <Input
                                                    id="no_kwitansi"
                                                    required
                                                    value={data.no_kwitansi}
                                                    onChange={(e) => setData('no_kwitansi', e.target.value)}
                                                    className="font-mono text-xs"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label>Periode Aktif</Label>
                                                <div className="flex h-11 items-center rounded-md border bg-muted/50 px-3 text-xs font-semibold">
                                                    {periodeAktif.tahun_hijriah} H ({periodeAktif.tahun_masehi})
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="muzaki_select">Pilih Muzaki / Kepala Keluarga</Label>
                                            <Select
                                                value={data.muzaki_id ? String(data.muzaki_id) : ''}
                                                onValueChange={handleSelectMuzaki}
                                            >
                                                <SelectTrigger id="muzaki_select">
                                                    <SelectValue placeholder="Pilih Muzaki terdaftar" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {daftarMuzaki.map((m) => (
                                                        <SelectItem key={m.id} value={String(m.id)}>
                                                            {m.nama_lengkap} ({m.nik}) • {m.jumlah_jiwa} jiwa
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.muzaki_id && (
                                                <p className="text-xs text-destructive">{errors.muzaki_id}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="dana_loket_select">
                                                Kantong Jenis Dana (Sub-Dana Operasional / Leaf)
                                            </Label>
                                            <Select
                                                value={data.jenis_dana_id ? String(data.jenis_dana_id) : ''}
                                                onValueChange={(val) => {
                                                    const idNum = Number.parseInt(val, 10);
                                                    setData('jenis_dana_id', idNum);
                                                    const target = daftarDanaOperasional.find((d) => d.id === idNum);
                                                    const fitrah = Boolean(
                                                        target &&
                                                            (target.nama_dana.toLowerCase().includes('fitrah') ||
                                                                target.kode_dana.toLowerCase().includes('ftr'))
                                                    );
                                                    applySaranKalkulasi(data.jumlah_jiwa, data.metode_bayar, fitrah);
                                                }}
                                            >
                                                <SelectTrigger id="dana_loket_select">
                                                    <SelectValue placeholder="Pilih kantong dana" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {daftarDanaOperasional.map((dana) => (
                                                        <SelectItem key={dana.id} value={String(dana.id)}>
                                                            [{dana.kode_dana}] {dana.nama_dana} ({dana.kategori_utama.replace('_', ' ')})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="metode_bayar_select">Metode Pembayaran</Label>
                                                <Select
                                                    value={data.metode_bayar}
                                                    onValueChange={(val) => handleSelectMetode(val as MetodeBayar)}
                                                >
                                                    <SelectTrigger id="metode_bayar_select">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {METODE_BAYAR_LIST.map((m) => (
                                                            <SelectItem key={m} value={m}>
                                                                {m}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="jumlah_jiwa_loket">Jumlah Jiwa</Label>
                                                <div className="flex gap-1.5">
                                                    <Input
                                                        id="jumlah_jiwa_loket"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={1}
                                                        required
                                                        value={data.jumlah_jiwa}
                                                        onChange={(e) => {
                                                            const val = Math.max(
                                                                1,
                                                                Number.parseInt(e.target.value, 10) || 1
                                                            );
                                                            setData('jumlah_jiwa', val);
                                                        }}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        title="Hitung saran nominal/beras otomatis sesuai tarif periode aktif"
                                                        aria-label="Hitung saran nominal atau beras"
                                                        onClick={() =>
                                                            applySaranKalkulasi(
                                                                data.jumlah_jiwa,
                                                                data.metode_bayar,
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <Calculator className="h-4 w-4" aria-hidden="true" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="nominal_loket">Nominal Uang (Rp)</Label>
                                                <Input
                                                    id="nominal_loket"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    required
                                                    value={data.nominal}
                                                    onChange={(e) => setData('nominal', e.target.value)}
                                                    className="tabular-nums font-semibold"
                                                />
                                                {errors.nominal && (
                                                    <p className="text-xs text-destructive">{errors.nominal}</p>
                                                )}
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="beras_loket">Berat Beras (Kg)</Label>
                                                <Input
                                                    id="beras_loket"
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                    value={data.berat_beras_kg}
                                                    onChange={(e) => setData('berat_beras_kg', e.target.value)}
                                                    className="tabular-nums font-semibold"
                                                />
                                                {errors.berat_beras_kg && (
                                                    <p className="text-xs text-destructive">{errors.berat_beras_kg}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border bg-accent/50 p-3 text-xs space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Ringkasan Setoran:</span>
                                                <span className="font-semibold">{data.jumlah_jiwa} jiwa</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Total Uang & Beras:</span>
                                                <span className="font-bold tabular-nums text-accent-foreground">
                                                    {formatRupiah(data.nominal)} + {formatBerasKg(data.berat_beras_kg)}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={processing || !isOnline || daftarMuzaki.length === 0}
                                        >
                                            <HandCoins className="h-4 w-4" aria-hidden="true" />
                                            <span>
                                                {!isOnline
                                                    ? 'Perangkat Offline (Transaksi Dikunci)'
                                                    : processing
                                                      ? 'Memproses sp_terima_zis_fitrah...'
                                                      : 'Simpan Kwitansi Setoran'}
                                            </span>
                                        </Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    {/* Riwayat Kwitansi Penghimpunan + Cetak PDF + Void */}
                    <section className="lg:col-span-7">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base">
                                            Riwayat Kwitansi Penghimpunan ({pagination?.total ?? 0})
                                        </CardTitle>
                                        <CardDescription>
                                            Kwitansi tidak pernah dihapus fisik; gunakan tombol Void untuk memanggil <code className="font-mono text-xs">sp_batalkan_penghimpunan</code>.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <form onSubmit={handleFilterRiwayat} className="grid gap-2.5 sm:grid-cols-12">
                                    <div className="sm:col-span-6">
                                        <Label htmlFor="cari-kwitansi" className="sr-only">
                                            Cari No. Kwitansi atau Nama Muzaki
                                        </Label>
                                        <div className="relative">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="cari-kwitansi"
                                                type="search"
                                                placeholder="Cari No. Kwitansi, NIK, atau Nama Muzaki..."
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
                                                router.get(
                                                    '/loket',
                                                    { q: searchQuery, status: val, page: 1 },
                                                    { preserveState: true, replace: true }
                                                );
                                            }}
                                        >
                                            <SelectTrigger aria-label="Filter Status Kwitansi">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SEMUA">Semua Status</SelectItem>
                                                <SelectItem value="Sah">Sah</SelectItem>
                                                <SelectItem value="Dibatalkan">Dibatalkan (Void)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <Button type="submit" variant="secondary" className="w-full">
                                            Filter
                                        </Button>
                                    </div>
                                </form>

                                {riwayatKwitansi.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
                                        <p className="text-sm font-semibold">Belum ada data kwitansi penghimpunan</p>
                                        <p className="text-xs text-muted-foreground">
                                            Kwitansi yang baru disimpan melalui sp_terima_zis_fitrah akan langsung tampil di sini.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>No. Kwitansi & Tanggal</TableHead>
                                                        <TableHead>Muzaki & Kantong Dana</TableHead>
                                                        <TableHead className="text-right">Nominal & Beras</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Tindakan</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {riwayatKwitansi.map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <p className="font-mono text-xs font-bold">
                                                                    {row.no_kwitansi}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatTanggalIndonesia(row.tanggal_transaksi)} • {row.metode_bayar}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-sm">{row.nama_muzaki}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {row.kode_dana ? `[${row.kode_dana}] ${row.nama_dana}` : '-'} ({row.jumlah_jiwa ?? 1} jiwa)
                                                                </p>
                                                                {row.status_transaksi === 'Dibatalkan' && row.alasan_batal && (
                                                                    <p className="mt-1 text-xs font-medium text-destructive">
                                                                        Alasan Void: {row.alasan_batal}
                                                                    </p>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                <p className="font-bold text-sm">
                                                                    {formatRupiah(row.total_nominal)}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatBerasKg(row.total_beras_kg)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={
                                                                        row.status_transaksi === 'Sah'
                                                                            ? 'success'
                                                                            : 'destructive'
                                                                    }
                                                                >
                                                                    {row.status_transaksi}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <a
                                                                            href={`/loket/${row.id}/pdf`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                        >
                                                                            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                                            <span>PDF</span>
                                                                        </a>
                                                                    </Button>
                                                                    {row.status_transaksi === 'Sah' && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            disabled={!isOnline}
                                                                            onClick={() => {
                                                                                voidForm.reset();
                                                                                setVoidTarget(row);
                                                                            }}
                                                                        >
                                                                            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                                                            <span>Void</span>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {riwayatKwitansi.map((row) => (
                                                <div
                                                    key={row.id}
                                                    className="rounded-lg border bg-card p-4 space-y-2.5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-mono text-xs font-bold">
                                                                {row.no_kwitansi}
                                                            </p>
                                                            <p className="text-sm font-bold">{row.nama_muzaki}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatTanggalIndonesia(row.tanggal_transaksi)} • {row.metode_bayar}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                row.status_transaksi === 'Sah'
                                                                    ? 'success'
                                                                    : 'destructive'
                                                            }
                                                        >
                                                            {row.status_transaksi}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                                                        <span>{row.nama_dana ?? 'Setoran ZIS'}</span>
                                                        <span className="font-bold tabular-nums">
                                                            {formatRupiah(row.total_nominal)} / {formatBerasKg(row.total_beras_kg)}
                                                        </span>
                                                    </div>

                                                    {row.status_transaksi === 'Dibatalkan' && row.alasan_batal && (
                                                        <p className="text-xs text-destructive font-medium">
                                                            Alasan Void: {row.alasan_batal}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Button asChild variant="outline" size="sm" className="flex-1">
                                                            <a
                                                                href={`/loket/${row.id}/pdf`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                                <span>Unduh PDF</span>
                                                            </a>
                                                        </Button>
                                                        {row.status_transaksi === 'Sah' && (
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                className="flex-1"
                                                                disabled={!isOnline}
                                                                onClick={() => {
                                                                    voidForm.reset();
                                                                    setVoidTarget(row);
                                                                }}
                                                            >
                                                                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                                                                <span>Batalkan (Void)</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {pagination && pagination.last_page > 1 && (
                                            <div className="flex items-center justify-between pt-2 text-xs">
                                                <span className="text-muted-foreground tabular-nums">
                                                    Halaman {pagination.current_page} dari {pagination.last_page}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={pagination.current_page <= 1}
                                                        onClick={() =>
                                                            handlePageChange(pagination.current_page - 1)
                                                        }
                                                    >
                                                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                        <span>Sebelumnya</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={pagination.current_page >= pagination.last_page}
                                                        onClick={() =>
                                                            handlePageChange(pagination.current_page + 1)
                                                        }
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
                    </section>
                </div>
            </div>

            {/* Dialog Konfirmasi Pembatalan (Void) Kwitansi via sp_batalkan_penghimpunan */}
            <Dialog open={Boolean(voidTarget)} onOpenChange={(open) => !open && setVoidTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Batalkan (Void) Kwitansi {voidTarget?.no_kwitansi}
                        </DialogTitle>
                        <DialogDescription>
                            Prosedur <code className="font-mono text-xs">CALL sp_batalkan_penghimpunan(?, ?)</code> akan mengubah status menjadi <code className="font-mono text-xs">Dibatalkan</code>, membalikkan saldo uang/beras pada <code className="font-mono text-xs">jenis_dana</code>, dan merekam audit ke <code className="font-mono text-xs">log_audit_zis</code>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleConfirmVoid} className="space-y-4">
                        {voidTarget && (
                            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                                <p>
                                    Muzaki: <strong>{voidTarget.nama_muzaki}</strong>
                                </p>
                                <p className="tabular-nums">
                                    Nominal Dibayar: <strong>{formatRupiah(voidTarget.total_nominal)}</strong> /{' '}
                                    <strong>{formatBerasKg(voidTarget.total_beras_kg)}</strong>
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="alasan_batal_input">Alasan Pembatalan / Void (Wajib)</Label>
                            <Input
                                id="alasan_batal_input"
                                required
                                minLength={5}
                                placeholder="Contoh: Salah input nominal atau jenis dana oleh kasir"
                                value={voidForm.data.alasan_batal}
                                onChange={(e) => voidForm.setData('alasan_batal', e.target.value)}
                            />
                            {voidForm.errors.alasan_batal && (
                                <p className="text-xs text-destructive">{voidForm.errors.alasan_batal}</p>
                            )}
                        </div>

                        <Separator />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setVoidTarget(null)}
                            >
                                Tutup
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={voidForm.processing || !isOnline}
                            >
                                {voidForm.processing ? 'Memproses Void...' : 'Konfirmasi Void Kwitansi'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
