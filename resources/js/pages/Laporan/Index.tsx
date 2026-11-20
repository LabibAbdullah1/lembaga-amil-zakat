import * as React from 'react';
import { Head } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { BarChart3, FolderTree, Medal, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { RdbmsAlert } from '@/components/zis/RdbmsAlert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBerasKg, formatPercentage, formatRupiah } from '@/lib/format';
import type { KategoriUtamaDana, PeriodeRamadhan } from '@/types';

interface HierarkiDanaRow {
    id: number;
    kode_dana: string;
    nama_dana: string;
    kategori_utama: KategoriUtamaDana;
    induk_utama: string;
    jalur_hierarki: string;
    level_kedalaman: number;
    total_penghimpunan_uang: number | string;
    total_penghimpunan_beras_kg: number | string;
    total_penyaluran_uang: number | string;
    total_penyaluran_beras_kg: number | string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
}

interface PertumbuhanYoyRow {
    tahun: number;
    bulan: number;
    jumlah_transaksi: number;
    total_nominal_bulan: number | string;
    total_beras_bulan_kg: number | string;
    nominal_tahun_lalu: number | string | null;
    pertumbuhan_yoy_persen: number | string | null;
}

interface DistribusiAsnafRow {
    kode_asnaf: string;
    nama_asnaf: string;
    jumlah_mustahik: number;
    total_nominal: number | string;
    total_beras_kg: number | string;
    grand_total_nominal: number | string;
    porsi_nominal_persen: number | string;
}

interface PeringkatMuzakiRow {
    peringkat: number;
    muzaki_id: number;
    nik_masked: string;
    nama_lengkap: string;
    jenis_muzaki: string;
    frekuensi_setoran: number;
    total_donasi_uang: number | string;
    total_donasi_beras_kg: number | string;
    running_total_uang: number | string;
}

interface LaporanIndexProps {
    hierarkiDana: HierarkiDanaRow[];
    pertumbuhanYoy: PertumbuhanYoyRow[];
    distribusiAsnaf: DistribusiAsnafRow[];
    peringkatMuzaki: PeringkatMuzakiRow[];
    periodeAktif: PeriodeRamadhan | null;
    rdbmsError?: string | null;
}

const NAMA_BULAN = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];

const WARNA_ASNAF = [
    '#059669',
    '#0d9488',
    '#d97706',
    '#2563eb',
    '#7c3aed',
    '#e11d48',
    '#475569',
    '#16a34a',
];

export default function LaporanIndex({
    hierarkiDana = [],
    pertumbuhanYoy = [],
    distribusiAsnaf = [],
    peringkatMuzaki = [],
    periodeAktif,
    rdbmsError,
}: LaporanIndexProps) {
    const yoyChartData = React.useMemo(() => {
        return [...pertumbuhanYoy]
            .reverse()
            .map((row) => ({
                periode: `${NAMA_BULAN[row.bulan] ?? row.bulan} ${row.tahun}`,
                tahunBerjalan: Number(row.total_nominal_bulan) || 0,
                tahunLalu: Number(row.nominal_tahun_lalu) || 0,
            }));
    }, [pertumbuhanYoy]);

    const asnafChartData = React.useMemo(() => {
        return distribusiAsnaf.map((row) => ({
            name: `${row.kode_asnaf} (${row.nama_asnaf})`,
            kode: row.kode_asnaf,
            nominal: Number(row.total_nominal) || 0,
            porsi: Number(row.porsi_nominal_persen) || 0,
        }));
    }, [distribusiAsnaf]);

    return (
        <AuthenticatedLayout
            title="4 Laporan Analitik Wajib RDBMS"
            subtitle="Dieksekusi langsung di MariaDB menggunakan Recursive CTE dan Window Functions (LAG, SUM() OVER(), DENSE_RANK)"
        >
            <Head title="4 Laporan Analitik Wajib" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-lg">
                                Pusat Analitik Keuangan Syariat & Kontribusi ZIS
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Seluruh agregasi hierarki, pertumbuhan YoY, proporsi 8 Asnaf, dan running total peringkat donatur dihitung di engine RDBMS.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Tabs defaultValue="hierarki">
                            <TabsList className="flex flex-wrap h-auto gap-1">
                                <TabsTrigger value="hierarki">
                                    1. Hierarki Dana (Recursive CTE)
                                </TabsTrigger>
                                <TabsTrigger value="yoy">
                                    2. Pertumbuhan YoY (LAG)
                                </TabsTrigger>
                                <TabsTrigger value="asnaf">
                                    3. Porsi 8 Asnaf (SUM OVER)
                                </TabsTrigger>
                                <TabsTrigger value="muzaki">
                                    4. Peringkat Muzaki (DENSE_RANK)
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: HIERARKI DANA (RECURSIVE CTE) */}
                            <TabsContent value="hierarki" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FolderTree className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <h2 className="text-sm font-bold">
                                            Penghimpunan, Penyaluran, dan Sisa Saldo Berjenjang (WITH RECURSIVE)
                                        </h2>
                                    </div>
                                    <Badge variant="outline">Recursive CTE 3 Level</Badge>
                                </div>

                                {hierarkiDana.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data hierarki kantong dana dari query Recursive CTE.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden md:block rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Induk Utama & Jalur Hierarki</TableHead>
                                                        <TableHead>Kode</TableHead>
                                                        <TableHead className="text-right">Penghimpunan Sah</TableHead>
                                                        <TableHead className="text-right">Penyaluran Final</TableHead>
                                                        <TableHead className="text-right">Sisa Saldo Uang</TableHead>
                                                        <TableHead className="text-right">Sisa Saldo Beras</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {hierarkiDana.map((row) => (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Induk: {row.induk_utama} (Level {row.level_kedalaman})
                                                                </p>
                                                                <p className="font-semibold text-sm">
                                                                    {row.jalur_hierarki}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs font-semibold">
                                                                {row.kode_dana}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums text-xs">
                                                                <p className="font-semibold">
                                                                    {formatRupiah(row.total_penghimpunan_uang)}
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                    {formatBerasKg(row.total_penghimpunan_beras_kg)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums text-xs">
                                                                <p className="font-semibold">
                                                                    {formatRupiah(row.total_penyaluran_uang)}
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                    {formatBerasKg(row.total_penyaluran_beras_kg)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {hierarkiDana.map((row) => (
                                                <div
                                                    key={row.id}
                                                    className="rounded-lg border bg-card p-4 space-y-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs font-bold">
                                                            {row.kode_dana} (L{row.level_kedalaman})
                                                        </span>
                                                        <Badge variant="outline">{row.induk_utama}</Badge>
                                                    </div>
                                                    <p className="text-sm font-semibold">{row.jalur_hierarki}</p>
                                                    <div className="grid grid-cols-2 gap-2 rounded bg-muted/40 p-2 text-xs">
                                                        <div>
                                                            <p className="text-muted-foreground">Sisa Saldo Uang</p>
                                                            <p className="font-bold tabular-nums text-primary">
                                                                {formatRupiah(row.saldo_tersedia)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Sisa Saldo Beras</p>
                                                            <p className="font-bold tabular-nums">
                                                                {formatBerasKg(row.saldo_beras_kg)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 2: PERTUMBUHAN YOY (LAG WINDOW FUNCTION) */}
                            <TabsContent value="yoy" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <h2 className="text-sm font-bold">
                                            Perbandingan Penghimpunan Bulanan Terhadap Bulan yang Sama Tahun Lalu
                                        </h2>
                                    </div>
                                    <Badge variant="outline">LAG() OVER (PARTITION BY bulan)</Badge>
                                </div>

                                {pertumbuhanYoy.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data transaksi penghimpunan bulanan untuk analisis YoY.
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-lg border p-4">
                                            <p className="mb-3 text-xs font-semibold text-muted-foreground">
                                                Bagaimana perbandingan nominal penghimpunan bulan berjalan terhadap bulan yang sama tahun sebelumnya?
                                            </p>
                                            <div className="h-72 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={yoyChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                                                        <YAxis tick={{ fontSize: 11 }} />
                                                        <Tooltip
                                                            formatter={(val: unknown) => formatRupiah(Number(val) || 0)}
                                                        />
                                                        <Legend />
                                                        <Bar
                                                            dataKey="tahunBerjalan"
                                                            name="Nominal Bulan Ini"
                                                            fill="#059669"
                                                            radius={[4, 4, 0, 0]}
                                                        />
                                                        <Bar
                                                            dataKey="tahunLalu"
                                                            name="Bulan Sama Tahun Lalu (LAG)"
                                                            fill="#94a3b8"
                                                            radius={[4, 4, 0, 0]}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Periode Bulan & Tahun</TableHead>
                                                        <TableHead className="text-right">Kwitansi Sah</TableHead>
                                                        <TableHead className="text-right">Nominal Bulan Ini</TableHead>
                                                        <TableHead className="text-right">
                                                            Bulan Sama Tahun Lalu (LAG)
                                                        </TableHead>
                                                        <TableHead className="text-right">% Pertumbuhan YoY</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pertumbuhanYoy.map((row) => {
                                                        const yoyNum =
                                                            row.pertumbuhan_yoy_persen !== null
                                                                ? Number(row.pertumbuhan_yoy_persen)
                                                                : null;

                                                        return (
                                                            <TableRow key={`${row.tahun}-${row.bulan}`}>
                                                                <TableCell className="font-semibold">
                                                                    {NAMA_BULAN[row.bulan] ?? row.bulan} {row.tahun}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums">
                                                                    {row.jumlah_transaksi}
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold tabular-nums">
                                                                    {formatRupiah(row.total_nominal_bulan)}
                                                                </TableCell>
                                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                                    {row.nominal_tahun_lalu !== null
                                                                        ? formatRupiah(row.nominal_tahun_lalu)
                                                                        : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {yoyNum === null ? (
                                                                        <Badge variant="secondary">Baseline</Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant={
                                                                                yoyNum >= 0 ? 'success' : 'destructive'
                                                                            }
                                                                            className="tabular-nums"
                                                                        >
                                                                            {yoyNum >= 0 ? '+' : ''}
                                                                            {formatPercentage(yoyNum)}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 3: DISTRIBUSI 8 ASNAF (SUM() OVER()) */}
                            <TabsContent value="asnaf" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <PieChartIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <h2 className="text-sm font-bold">
                                            Proporsi Penyaluran Dana per Golongan 8 Asnaf
                                        </h2>
                                    </div>
                                    <Badge variant="outline">SUM(total_nominal) OVER ()</Badge>
                                </div>

                                {distribusiAsnaf.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data distribusi 8 Asnaf.
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-4 lg:grid-cols-12">
                                            <div className="lg:col-span-6 rounded-lg border p-4">
                                                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                                    Bagaimana porsi nominal penyaluran di antara 8 golongan Asnaf?
                                                </p>
                                                <div className="h-64 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={asnafChartData}
                                                                dataKey="nominal"
                                                                nameKey="name"
                                                                innerRadius={50}
                                                                outerRadius={85}
                                                                paddingAngle={2}
                                                            >
                                                                {asnafChartData.map((entry, idx) => (
                                                                    <Cell
                                                                        key={entry.kode}
                                                                        fill={WARNA_ASNAF[idx % WARNA_ASNAF.length]}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                formatter={(val: unknown) =>
                                                                    formatRupiah(Number(val) || 0)
                                                                }
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-6 rounded-lg border p-4">
                                                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                                    Perbandingan Persentase Porsi Penyaluran per Kode Asnaf (%)
                                                </p>
                                                <div className="h-64 w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={asnafChartData}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="kode" tick={{ fontSize: 11 }} />
                                                            <YAxis unit="%" tick={{ fontSize: 11 }} />
                                                            <Tooltip
                                                                formatter={(val: unknown) =>
                                                                    `${Number(val) || 0}%`
                                                                }
                                                            />
                                                            <Bar
                                                                dataKey="porsi"
                                                                name="Porsi Penyaluran (%)"
                                                                fill="#059669"
                                                                radius={[4, 4, 0, 0]}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Kode Asnaf</TableHead>
                                                        <TableHead>Golongan Mustahik</TableHead>
                                                        <TableHead className="text-right">Mustahik Terbantu</TableHead>
                                                        <TableHead className="text-right">Total Uang</TableHead>
                                                        <TableHead className="text-right">Total Beras</TableHead>
                                                        <TableHead className="text-right">Porsi (%)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {distribusiAsnaf.map((row) => (
                                                        <TableRow key={row.kode_asnaf}>
                                                            <TableCell className="font-mono text-xs font-bold">
                                                                {row.kode_asnaf}
                                                            </TableCell>
                                                            <TableCell className="font-semibold">
                                                                {row.nama_asnaf}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {row.jumlah_mustahik} jiwa
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold tabular-nums">
                                                                {formatRupiah(row.total_nominal)}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {formatBerasKg(row.total_beras_kg)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="success" className="tabular-nums">
                                                                    {formatPercentage(row.porsi_nominal_persen)}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* TAB 4: PERINGKAT MUZAKI (DENSE_RANK & RUNNING TOTAL) */}
                            <TabsContent value="muzaki" className="space-y-4 pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Medal className="h-4 w-4 text-primary" aria-hidden="true" />
                                        <h2 className="text-sm font-bold">
                                            Leaderboard Kontribusi Muzaki{' '}
                                            {periodeAktif
                                                ? `(Periode Ramadhan ${periodeAktif.tahun_hijriah} H)`
                                                : '(Semua Periode)'}
                                        </h2>
                                    </div>
                                    <Badge variant="outline">DENSE_RANK() & Running Total OVER()</Badge>
                                </div>

                                {peringkatMuzaki.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada data kontribusi muzaki pada periode aktif.
                                    </div>
                                ) : (
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Peringkat</TableHead>
                                                    <TableHead>Nama Muzaki & NIK Tersamar</TableHead>
                                                    <TableHead>Jenis</TableHead>
                                                    <TableHead className="text-right">Frekuensi</TableHead>
                                                    <TableHead className="text-right">Total Donasi Uang</TableHead>
                                                    <TableHead className="text-right">Total Beras</TableHead>
                                                    <TableHead className="text-right">
                                                        Running Total Akumulasi
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {peringkatMuzaki.map((row) => (
                                                    <TableRow key={row.muzaki_id}>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    Number(row.peringkat) <= 3
                                                                        ? 'success'
                                                                        : 'outline'
                                                                }
                                                                className="tabular-nums"
                                                            >
                                                                #{row.peringkat}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="font-semibold text-sm">
                                                                {row.nama_lengkap}
                                                            </p>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                NIK: {row.nik_masked}
                                                            </p>
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {row.jenis_muzaki.replace('_', ' ')}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            {row.frekuensi_setoran}x
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(row.total_donasi_uang)}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            {formatBerasKg(row.total_donasi_beras_kg)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatRupiah(row.running_total_uang)}
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
        </AuthenticatedLayout>
    );
}
