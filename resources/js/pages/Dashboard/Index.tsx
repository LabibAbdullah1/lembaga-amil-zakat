import * as React from 'react';
import { Head, router } from '@inertiajs/react';
import {
    CalendarClock,
    Database,
    RefreshCw,
    Scale,
    Search,
    ShieldCheck,
    Users,
    Wallet,
    Wheat,
} from 'lucide-react';
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
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBerasKg, formatPercentage, formatRupiah } from '@/lib/format';
import type {
    KategoriUtamaDana,
    PeriodeRamadhan,
    ViewRekapPenyaluranAsnaf,
    ViewSaldoJenisDana,
} from '@/types';

interface RingkasanPeriode {
    jumlah_kwitansi_sah: number;
    total_penghimpunan_uang: number;
    total_penghimpunan_beras_kg: number;
    jumlah_bkk_disalurkan: number;
    total_penyaluran_uang: number;
    total_penyaluran_beras_kg: number;
    jumlah_mustahik_layak: number;
    jumlah_mustahik_menunggu: number;
}

interface DashboardProps {
    saldoDana: ViewSaldoJenisDana[];
    rekapAsnaf: ViewRekapPenyaluranAsnaf[];
    periodeAktif: PeriodeRamadhan | null;
    persentaseHakAmil: number;
    ringkasanPeriode: RingkasanPeriode;
    rdbmsError?: string | null;
}

export default function DashboardIndex({
    saldoDana = [],
    rekapAsnaf = [],
    periodeAktif,
    persentaseHakAmil = 0,
    ringkasanPeriode,
    rdbmsError,
}: DashboardProps) {
    const [kategoriFilter, setKategoriFilter] = React.useState<string>('SEMUA');
    const [pencarianDana, setPencarianDana] = React.useState<string>('');
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const handleRefreshSaldo = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['saldoDana', 'rekapAsnaf', 'periodeAktif', 'persentaseHakAmil', 'ringkasanPeriode', 'rdbmsError'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const filteredSaldo = React.useMemo(() => {
        return saldoDana.filter((item) => {
            const cocokKategori =
                kategoriFilter === 'SEMUA' || item.kategori_utama === kategoriFilter;
            const query = pencarianDana.trim().toLowerCase();
            const cocokCari =
                query === '' ||
                item.kode_dana.toLowerCase().includes(query) ||
                item.nama_dana.toLowerCase().includes(query) ||
                (item.induk_dana ?? '').toLowerCase().includes(query);

            return cocokKategori && cocokCari;
        });
    }, [saldoDana, kategoriFilter, pencarianDana]);

    const agregatSaldo = React.useMemo(() => {
        let totalUang = 0;
        let totalBeras = 0;
        let zakatUang = 0;
        let zakatBeras = 0;

        for (const item of filteredSaldo) {
            const uang = Number.parseFloat(String(item.saldo_tersedia)) || 0;
            const beras = Number.parseFloat(String(item.saldo_beras_kg)) || 0;
            totalUang += uang;
            totalBeras += beras;

            if (item.kategori_utama === 'Zakat') {
                zakatUang += uang;
                zakatBeras += beras;
            }
        }

        return { totalUang, totalBeras, zakatUang, zakatBeras };
    }, [filteredSaldo]);

    const getKategoriBadgeVariant = (
        kategori: KategoriUtamaDana
    ): 'success' | 'warning' | 'secondary' => {
        if (kategori === 'Zakat') return 'success';
        if (kategori === 'Infak_Sedekah') return 'warning';
        return 'secondary';
    };

    const amilNumeric = Number(persentaseHakAmil) || 0;

    return (
        <AuthenticatedLayout
            title="Beranda Saldo & Ringkasan Operasional ZIS"
            subtitle="Data saldo dibaca real-time dari v_saldo_jenis_dana (koneksi mysql_laporan)"
        >
            <Head title="Beranda Saldo & Periode Aktif" />

            <div className="space-y-6">
                <RdbmsAlert
                    message={rdbmsError}
                    title="Peringatan Pembacaan View RDBMS"
                />

                {/* Panel Ringkasan Periode Ramadhan Aktif & Batas Hak Amil */}
                <section className="grid gap-4 lg:grid-cols-12">
                    <Card className="lg:col-span-7">
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-base">
                                        Status Periode Ramadhan Aktif
                                    </CardTitle>
                                </div>
                                {periodeAktif ? (
                                    <Badge variant="success">
                                        {periodeAktif.tahun_hijriah} H / {periodeAktif.tahun_masehi} M
                                    </Badge>
                                ) : (
                                    <Badge variant="warning">Tidak Ada Periode Aktif</Badge>
                                )}
                            </div>
                            <CardDescription>
                                Parameter konversi Zakat Fitrah dan akumulasi transaksi sah pada periode berjalan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {periodeAktif ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <p className="text-xs text-muted-foreground">Takaran Beras / Jiwa</p>
                                            <p className="mt-1 text-sm font-bold tabular-nums">
                                                {formatBerasKg(periodeAktif.beras_per_jiwa_kg)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <p className="text-xs text-muted-foreground">Tarif Fitrah / Jiwa</p>
                                            <p className="mt-1 text-sm font-bold tabular-nums">
                                                {formatRupiah(periodeAktif.nominal_fitrah_per_jiwa)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <p className="text-xs text-muted-foreground">Kwitansi Sah</p>
                                            <p className="mt-1 text-sm font-bold tabular-nums">
                                                {ringkasanPeriode.jumlah_kwitansi_sah} transaksi
                                            </p>
                                        </div>
                                        <div className="rounded-lg border bg-muted/30 p-3">
                                            <p className="text-xs text-muted-foreground">BKK Disalurkan</p>
                                            <p className="mt-1 text-sm font-bold tabular-nums">
                                                {ringkasanPeriode.jumlah_bkk_disalurkan} dokumen
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border p-3.5 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Total Penghimpunan Sah (Periode Ini)
                                            </p>
                                            <p className="text-base font-bold tabular-nums text-primary">
                                                {formatRupiah(ringkasanPeriode.total_penghimpunan_uang)}
                                            </p>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                Beras Fitrah: {formatBerasKg(ringkasanPeriode.total_penghimpunan_beras_kg)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border p-3.5 space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Total Penyaluran Final (Disalurkan)
                                            </p>
                                            <p className="text-base font-bold tabular-nums text-foreground">
                                                {formatRupiah(ringkasanPeriode.total_penyaluran_uang)}
                                            </p>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                Beras Disalurkan: {formatBerasKg(ringkasanPeriode.total_penyaluran_beras_kg)}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
                                    <p className="text-sm font-semibold">
                                        Belum ada baris periode_ramadhan dengan status_aktif = 1
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Aktifkan satu periode Ramadhan pada modul Master Data (Admin) agar perhitungan zakat fitrah dan persentase hak amil berjalan.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-5">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-base">
                                        Pengawasan Kepatuhan Syariat RDBMS
                                    </CardTitle>
                                </div>
                                <Badge variant="outline">fn_persentase_hak_amil</Badge>
                            </div>
                            <CardDescription>
                                Pemantauan batas maksimal alokasi Asnaf Amil (ASN-03) & kelayakan verifikasi mustahik 365 hari.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-lg border p-4 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold">Realisasi Hak Amil (Uang + Konversi Beras)</span>
                                    <span className="font-bold tabular-nums">
                                        {formatPercentage(amilNumeric)} / Maks 12,50%
                                    </span>
                                </div>
                                <div
                                    role="progressbar"
                                    aria-valuenow={Math.min(100, Math.round((amilNumeric / 12.5) * 100))}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Persentase penggunaan batas hak amil"
                                    className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                                >
                                    <div
                                        className={
                                            amilNumeric >= 12.5
                                                ? 'h-full bg-destructive transition-all'
                                                : amilNumeric >= 10
                                                  ? 'h-full bg-amber-500 transition-all'
                                                  : 'h-full bg-primary transition-all'
                                        }
                                        style={{
                                            width: `${Math.min(100, (amilNumeric / 12.5) * 100)}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Trigger <code className="font-mono">trg_before_insert_detail_penyaluran</code> otomatis menolak BKK dengan <code className="font-mono">SQLSTATE 45000</code> bila alokasi ASN-03 melampaui 12,50%.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                        <span>Mustahik Layak (&le;365h)</span>
                                    </div>
                                    <p className="text-lg font-bold tabular-nums">
                                        {ringkasanPeriode.jumlah_mustahik_layak} jiwa
                                    </p>
                                </div>
                                <div className="rounded-lg border p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Users className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                                        <span>Menunggu Survei</span>
                                    </div>
                                    <p className="text-lg font-bold tabular-nums">
                                        {ringkasanPeriode.jumlah_mustahik_menunggu} jiwa
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Tabs: Daftar Saldo Kantong Dana (v_saldo_jenis_dana) & Rekap 8 Asnaf (v_rekap_penyaluran_asnaf) */}
                <Card>
                    <CardHeader className="space-y-3">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-lg">
                                        Posisi Saldo Kantong Dana & Rekap Penyaluran Asnaf
                                    </CardTitle>
                                </div>
                                <CardDescription>
                                    Dieksekusi secara read-only melalui akun <code className="font-mono text-xs">zis_laporan</code> pada VIEW database.
                                </CardDescription>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isRefreshing}
                                onClick={handleRefreshSaldo}
                            >
                                <RefreshCw
                                    className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                                    aria-hidden="true"
                                />
                                <span>{isRefreshing ? 'Memuat Ulang...' : 'Segarkan Saldo'}</span>
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="saldo">
                            <TabsList>
                                <TabsTrigger value="saldo">
                                    Saldo Jenis Dana ({saldoDana.length})
                                </TabsTrigger>
                                <TabsTrigger value="asnaf">
                                    Rekap 8 Asnaf ({rekapAsnaf.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="saldo" className="space-y-4 pt-3">
                                <div className="grid gap-3 sm:grid-cols-12">
                                    <div className="sm:col-span-7 space-y-1.5">
                                        <Label htmlFor="cari-dana">Cari Kode atau Nama Kantong Dana</Label>
                                        <div className="relative">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="cari-dana"
                                                type="search"
                                                placeholder="Ketik kode dana atau nama kantong dana..."
                                                value={pencarianDana}
                                                onChange={(e) => setPencarianDana(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-5 space-y-1.5">
                                        <Label htmlFor="filter-kategori">Filter Kategori Utama</Label>
                                        <Select
                                            value={kategoriFilter}
                                            onValueChange={(value) => setKategoriFilter(value)}
                                        >
                                            <SelectTrigger id="filter-kategori">
                                                <SelectValue placeholder="Pilih kategori dana" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SEMUA">Semua Kategori Dana</SelectItem>
                                                <SelectItem value="Zakat">Zakat (Fitrah & Mal)</SelectItem>
                                                <SelectItem value="Infak_Sedekah">Infak & Sedekah</SelectItem>
                                                <SelectItem value="Wakaf">Wakaf</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {filteredSaldo.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                        <p className="text-sm font-semibold">
                                            Tidak ada data kantong dana yang ditampilkan
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {saldoDana.length === 0
                                                ? 'VIEW v_saldo_jenis_dana belum mengembalikan baris atau koneksi database db_laz_zis_masjid belum terisi data master jenis_dana.'
                                                : 'Tidak ada kantong dana yang cocok dengan kata kunci pencarian atau filter kategori Anda.'}
                                        </p>
                                        {kategoriFilter !== 'SEMUA' || pencarianDana !== '' ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setKategoriFilter('SEMUA');
                                                    setPencarianDana('');
                                                }}
                                            >
                                                Reset Filter Pencarian
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : (
                                    <>
                                        {/* Tabel Desktop (>= 768px) */}
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Kode</TableHead>
                                                        <TableHead>Nama Kantong Dana</TableHead>
                                                        <TableHead>Induk Dana</TableHead>
                                                        <TableHead>Kategori Utama</TableHead>
                                                        <TableHead className="text-right">Saldo Uang Tersedia</TableHead>
                                                        <TableHead className="text-right">Saldo Beras Fitrah</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredSaldo.map((row) => (
                                                        <TableRow key={row.kode_dana}>
                                                            <TableCell className="font-mono text-xs font-semibold">
                                                                {row.kode_dana}
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {row.nama_dana}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground">
                                                                {row.induk_dana || 'Induk Utama'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getKategoriBadgeVariant(row.kategori_utama)}>
                                                                    {row.kategori_utama.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="font-bold">
                                                            Total Saldo Terfilter ({filteredSaldo.length} kantong)
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(agregatSaldo.totalUang)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatBerasKg(agregatSaldo.totalBeras)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>

                                        {/* Card List Mobile (< 768px) */}
                                        <div className="grid gap-3 md:hidden">
                                            {filteredSaldo.map((row) => (
                                                <div
                                                    key={row.kode_dana}
                                                    className="rounded-lg border bg-card p-4 space-y-2.5"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-mono text-xs font-bold text-muted-foreground">
                                                                {row.kode_dana}
                                                            </p>
                                                            <p className="text-sm font-semibold">{row.nama_dana}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Induk: {row.induk_dana || 'Induk Utama'}
                                                            </p>
                                                        </div>
                                                        <Badge variant={getKategoriBadgeVariant(row.kategori_utama)}>
                                                            {row.kategori_utama.replace('_', ' ')}
                                                        </Badge>
                                                    </div>

                                                    <Separator />

                                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                                        <div className="flex items-center gap-2">
                                                            <Wallet className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                                                            <div>
                                                                <p className="text-[11px] text-muted-foreground">Saldo Uang</p>
                                                                <p className="text-xs font-bold tabular-nums">
                                                                    {formatRupiah(row.saldo_tersedia)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Wheat className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
                                                            <div>
                                                                <p className="text-[11px] text-muted-foreground">Saldo Beras</p>
                                                                <p className="text-xs font-bold tabular-nums">
                                                                    {formatBerasKg(row.saldo_beras_kg)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="asnaf" className="pt-3">
                                {rekapAsnaf.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                        <p className="text-sm font-semibold">
                                            Belum ada data rekap penyaluran 8 Asnaf dari v_rekap_penyaluran_asnaf
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Data akan muncul secara otomatis setelah database terhubung dan BKK berstatus Disalurkan.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Kode Asnaf</TableHead>
                                                        <TableHead>Golongan Mustahik (8 Asnaf)</TableHead>
                                                        <TableHead className="text-right">Mustahik Terbantu</TableHead>
                                                        <TableHead className="text-right">Total Uang Disalurkan</TableHead>
                                                        <TableHead className="text-right">Total Beras Disalurkan</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {rekapAsnaf.map((asnaf) => (
                                                        <TableRow key={asnaf.kode_asnaf}>
                                                            <TableCell className="font-mono text-xs font-semibold">
                                                                {asnaf.kode_asnaf}
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {asnaf.nama_asnaf}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {asnaf.jumlah_mustahik_terbantu} jiwa
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatRupiah(asnaf.total_nominal_disalurkan)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatBerasKg(asnaf.total_beras_disalurkan_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {rekapAsnaf.map((asnaf) => (
                                                <div
                                                    key={asnaf.kode_asnaf}
                                                    className="rounded-lg border bg-card p-4 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-sm">
                                                            {asnaf.nama_asnaf}
                                                        </span>
                                                        <Badge variant="outline">{asnaf.kode_asnaf}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                        Mustahik Terbantu: {asnaf.jumlah_mustahik_terbantu} jiwa
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground">Uang: </span>
                                                            <span className="font-bold tabular-nums">
                                                                {formatRupiah(asnaf.total_nominal_disalurkan)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Beras: </span>
                                                            <span className="font-bold tabular-nums">
                                                                {formatBerasKg(asnaf.total_beras_disalurkan_kg)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
