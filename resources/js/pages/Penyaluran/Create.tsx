import * as React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    FileSpreadsheet,
    Plus,
    Scale,
    Search,
    ShieldAlert,
    Trash2,
    Users,
    XCircle,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { MustahikSearchPicker } from '@/components/zis/MustahikSearchPicker';
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
import type { JenisDana, KategoriAsnaf, Mustahik, ProgramPenyaluran, SharedProps } from '@/types';

interface ProgramWithDana extends ProgramPenyaluran {
    kode_dana: string;
    nama_dana: string;
    kategori_utama: string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
    tahun_hijriah: string;
    tahun_masehi: number;
}

interface MustahikOption extends Mustahik {
    kode_asnaf: string;
    nama_asnaf: string;
    is_layak_syariat: number | boolean;
}

interface PenerimaDraftRow {
    mustahik_id: number;
    nominal: string;
    beras_kg: string;
}

interface PenyaluranCreateProps {
    daftarProgram: ProgramWithDana[];
    daftarDanaOperasional: JenisDana[];
    daftarMustahik: MustahikOption[];
    daftarAsnaf?: KategoriAsnaf[];
    saranNoBkk: string;
    rdbmsError?: string | null;
}

export default function PenyaluranCreate({
    daftarProgram = [],
    daftarDanaOperasional = [],
    daftarMustahik = [],
    daftarAsnaf = [],
    saranNoBkk,
    rdbmsError,
}: PenyaluranCreateProps) {
    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [modePenyaluran, setModePenyaluran] = React.useState<'kelompok' | 'perorangan'>('kelompok');
    const [asnafGenerator, setAsnafGenerator] = React.useState<string>('ASN-01');
    const [nominalPerOrang, setNominalPerOrang] = React.useState<string>('300000');
    const [berasPerOrang, setBerasPerOrang] = React.useState<string>('5.00');
    const [singleCandidateId, setSingleCandidateId] = React.useState<number>(
        daftarMustahik[0]?.id ?? 0
    );
    const [cariPenerimaTabel, setCariPenerimaTabel] = React.useState<string>('');

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

    // Hanya tampilkan mustahik yang Layak (<= 365 hari) untuk saran kelompok Zakat
    const mustahikLayakList = React.useMemo(() => {
        return daftarMustahik.filter(
            (m) => Number(m.is_layak_syariat) === 1 || m.is_layak_syariat === true
        );
    }, [daftarMustahik]);

    const defaultProgram = daftarProgram[0] ?? null;
    const initialMustahik = mustahikLayakList[0] ?? daftarMustahik[0] ?? null;

    const { data, setData, post, processing, errors } = useForm<{
        no_bkk: string;
        program_id: number;
        jenis_dana_id: number;
        penerima: PenerimaDraftRow[];
    }>({
        no_bkk: saranNoBkk,
        program_id: defaultProgram?.id ?? 0,
        jenis_dana_id: defaultProgram
            ? Number(defaultProgram.jenis_dana_id)
            : (daftarDanaOperasional[0]?.id ?? 0),
        penerima: initialMustahik
            ? [
                  {
                      mustahik_id: initialMustahik.id,
                      nominal: '300000',
                      beras_kg: '0',
                  },
              ]
            : [],
    });

    const { hakAmilPerKategori = [] } = usePage<SharedProps>().props;

    const selectedProgram = React.useMemo(
        () => daftarProgram.find((p) => p.id === data.program_id) ?? null,
        [daftarProgram, data.program_id]
    );

    const selectedDana = React.useMemo(
        () => daftarDanaOperasional.find((d) => d.id === data.jenis_dana_id) ?? null,
        [daftarDanaOperasional, data.jenis_dana_id]
    );

    const hakAmilSelectedDana = React.useMemo(
        () => hakAmilPerKategori.find((h) => Number(h.jenis_dana_id) === Number(data.jenis_dana_id)) ?? null,
        [hakAmilPerKategori, data.jenis_dana_id]
    );

    const mustahikMap = React.useMemo(() => {
        const map = new Map<number, MustahikOption>();
        for (const m of daftarMustahik) {
            map.set(m.id, m);
        }
        return map;
    }, [daftarMustahik]);

    const handleProgramChange = (programIdStr: string) => {
        const idNum = Number.parseInt(programIdStr, 10);
        const prog = daftarProgram.find((p) => p.id === idNum);
        setData((prev) => ({
            ...prev,
            program_id: idNum,
            jenis_dana_id: prog ? Number(prog.jenis_dana_id) : prev.jenis_dana_id,
        }));
    };

    // Muat seluruh mustahik layak pada golongan Asnaf terpilih sekaligus (Sekali Jalan)
    const handleMuatKelompokAsnaf = () => {
        const kandidatAsnaf = mustahikLayakList.filter((m) =>
            asnafGenerator === 'SEMUA_LAYAK' ? true : m.kode_asnaf === asnafGenerator
        );

        if (kandidatAsnaf.length === 0) return;

        const existingIds = new Set(data.penerima.map((p) => p.mustahik_id));
        const barisBaru: PenerimaDraftRow[] = [...data.penerima];

        for (const m of kandidatAsnaf) {
            if (!existingIds.has(m.id)) {
                barisBaru.push({
                    mustahik_id: m.id,
                    nominal: nominalPerOrang,
                    beras_kg: berasPerOrang,
                });
                existingIds.add(m.id);
            }
        }

        setData('penerima', barisBaru);
    };

    // Samakan nominal & beras untuk seluruh baris yang sudah ada di tabel
    const handleSamakanNominalSemua = () => {
        setData(
            'penerima',
            data.penerima.map((row) => ({
                ...row,
                nominal: nominalPerOrang,
                beras_kg: berasPerOrang,
            }))
        );
    };

    const handleTambahSatuPenerima = () => {
        if (!singleCandidateId) return;
        const alreadyExists = data.penerima.some((p) => p.mustahik_id === singleCandidateId);
        if (alreadyExists) return;

        setData('penerima', [
            ...data.penerima,
            {
                mustahik_id: singleCandidateId,
                nominal: nominalPerOrang,
                beras_kg: berasPerOrang,
            },
        ]);
    };

    const handleUbahBaris = (
        index: number,
        field: 'nominal' | 'beras_kg',
        value: string
    ) => {
        const next = [...data.penerima];
        next[index] = {
            ...next[index],
            [field]: value,
        };
        setData('penerima', next);
    };

    const handleHapusBaris = (index: number) => {
        setData(
            'penerima',
            data.penerima.filter((_, idx) => idx !== index)
        );
    };

    const totalPengajuan = React.useMemo(() => {
        let uang = 0;
        let beras = 0;
        for (const item of data.penerima) {
            uang += Number.parseFloat(item.nominal) || 0;
            beras += Number.parseFloat(item.beras_kg) || 0;
        }
        return { uang, beras };
    }, [data.penerima]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline || data.penerima.length === 0) return;
        post('/penyaluran');
    };

    return (
        <AuthenticatedLayout
            title="Buat Pengajuan Bukti Kas Keluar (BKK) Penyaluran Zakat"
            subtitle="Mendukung penyaluran kolektif per kelompok Asnaf (sekali jalan) maupun penyaluran perorangan"
        >
            <Head title="Buat Pengajuan BKK Zakat" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <div className="flex items-center justify-between">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/penyaluran">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span>Kembali ke Daftar BKK</span>
                        </Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
                    <section className="lg:col-span-8 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            1. Pilih Program & Kantong Dana Zakat
                                        </CardTitle>
                                    </div>
                                    <Badge variant="success">Khusus Dana Zakat</Badge>
                                </div>
                                <CardDescription>
                                    Kantong sumber dana otomatis mengikuti program penyaluran zakat yang dipilih.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="no_bkk_input">Nomor Dokumen BKK</Label>
                                        <Input
                                            id="no_bkk_input"
                                            required
                                            value={data.no_bkk}
                                            onChange={(e) => setData('no_bkk', e.target.value)}
                                            className="font-mono text-xs"
                                        />
                                        {errors.no_bkk && (
                                            <p className="text-xs text-destructive">{errors.no_bkk}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="program_bkk_select">Program Penyaluran Zakat</Label>
                                        <Select
                                            value={data.program_id ? String(data.program_id) : ''}
                                            onValueChange={handleProgramChange}
                                        >
                                            <SelectTrigger id="program_bkk_select">
                                                <SelectValue placeholder="Pilih program penyaluran zakat" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {daftarProgram.map((prog) => (
                                                    <SelectItem key={prog.id} value={String(prog.id)}>
                                                        [{prog.kode_program}] {prog.nama_program}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="dana_bkk_select">Kantong Sumber Dana Zakat</Label>
                                    <Select
                                        value={data.jenis_dana_id ? String(data.jenis_dana_id) : ''}
                                        onValueChange={(val) =>
                                            setData('jenis_dana_id', Number.parseInt(val, 10))
                                        }
                                    >
                                        <SelectTrigger id="dana_bkk_select">
                                            <SelectValue placeholder="Pilih kantong dana zakat" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {daftarDanaOperasional.map((dana) => (
                                                <SelectItem key={dana.id} value={String(dana.id)}>
                                                    [{dana.kode_dana}] {dana.nama_dana}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            2. Susun Daftar Mustahik Penerima (Kolektif Sekali Jalan / Perorangan)
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline">
                                        {data.penerima.length} Mustahik Terpilih
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Gunakan mode <strong>Kolektif per Kelompok Asnaf</strong> agar petugas tidak perlu menginput penerima satu per satu.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <Tabs
                                    value={modePenyaluran}
                                    onValueChange={(val) =>
                                        setModePenyaluran(val as 'kelompok' | 'perorangan')
                                    }
                                >
                                    <TabsList className="w-full sm:w-auto">
                                        <TabsTrigger value="kelompok">
                                            Kolektif per Kelompok Asnaf (Sekali Jalan)
                                        </TabsTrigger>
                                        <TabsTrigger value="perorangan">
                                            Pilih Perorangan
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="kelompok" className="space-y-3 pt-3">
                                        <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="asnaf_kelompok_select">
                                                        Kelompok Golongan Asnaf (Layak)
                                                    </Label>
                                                    <Select
                                                        value={asnafGenerator}
                                                        onValueChange={setAsnafGenerator}
                                                    >
                                                        <SelectTrigger id="asnaf_kelompok_select">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="SEMUA_LAYAK">
                                                                Semua Mustahik Layak ({mustahikLayakList.length} jiwa)
                                                            </SelectItem>
                                                            {daftarAsnaf.map((a) => {
                                                                const count = mustahikLayakList.filter(
                                                                    (m) => m.kode_asnaf === a.kode_asnaf
                                                                ).length;
                                                                return (
                                                                    <SelectItem key={a.id} value={a.kode_asnaf}>
                                                                        {a.kode_asnaf} - {a.nama_asnaf} ({count} layak)
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="nominal_per_orang">
                                                        Nominal per Mustahik (Rp)
                                                    </Label>
                                                    <Input
                                                        id="nominal_per_orang"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        value={nominalPerOrang}
                                                        onChange={(e) => setNominalPerOrang(e.target.value)}
                                                        className="tabular-nums font-semibold"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="beras_per_orang">
                                                        Beras per Mustahik (Kg)
                                                    </Label>
                                                    <Input
                                                        id="beras_per_orang"
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        min="0"
                                                        value={berasPerOrang}
                                                        onChange={(e) => setBerasPerOrang(e.target.value)}
                                                        className="tabular-nums font-semibold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    onClick={handleMuatKelompokAsnaf}
                                                >
                                                    <Users className="h-4 w-4" aria-hidden="true" />
                                                    <span>
                                                        Masukkan Seluruh Mustahik Kelompok Ini Sekaligus
                                                    </span>
                                                </Button>

                                                {data.penerima.length > 0 && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleSamakanNominalSemua}
                                                        >
                                                            Samakan Nominal ke Semua Baris
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={() => setData('penerima', [])}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            Kosongkan Daftar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="perorangan" className="space-y-3 pt-3">
                                        <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                                            <MustahikSearchPicker
                                                id="cari_nama_kk_create_bkk"
                                                label="Cari & Ketik Nama Kepala Keluarga (KK), NIK, atau RT/RW"
                                                daftarMustahik={daftarMustahik}
                                                selectedId={singleCandidateId}
                                                onSelect={(idNum) => setSingleCandidateId(idNum)}
                                                excludeIds={data.penerima.map((p) => p.mustahik_id)}
                                            />

                                            <div className="grid gap-3 sm:grid-cols-12">
                                                <div className="sm:col-span-4 space-y-1.5">
                                                    <Label htmlFor="single_nominal">Nominal Uang (Rp)</Label>
                                                    <Input
                                                        id="single_nominal"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        value={nominalPerOrang}
                                                        onChange={(e) => setNominalPerOrang(e.target.value)}
                                                        className="tabular-nums font-semibold"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4 space-y-1.5">
                                                    <Label htmlFor="single_beras">Beras (Kg)</Label>
                                                    <Input
                                                        id="single_beras"
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        min="0"
                                                        value={berasPerOrang}
                                                        onChange={(e) => setBerasPerOrang(e.target.value)}
                                                        className="tabular-nums font-semibold"
                                                    />
                                                </div>

                                                <div className="sm:col-span-4 flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="default"
                                                        onClick={handleTambahSatuPenerima}
                                                        className="w-full"
                                                    >
                                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                                        <span>Tambahkan KK Terpilih</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {/* Tabel Daftar Mustahik yang Akan Disimpan Sekali Jalan */}
                                {data.penerima.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center space-y-1">
                                        <p className="text-sm font-semibold">
                                            Daftar penerima BKK masih kosong
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Klik tombol Masukkan Seluruh Mustahik Kelompok Ini Sekaligus di atas untuk memuat daftar mustahik layak secara otomatis.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="relative flex-1 min-w-60 max-w-md">
                                                <Search
                                                    className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                                <Input
                                                    type="search"
                                                    placeholder="Filter nama kepala keluarga atau NIK di dalam daftar BKK ini..."
                                                    value={cariPenerimaTabel}
                                                    onChange={(e) => setCariPenerimaTabel(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                Total terdaftar di BKK: <strong>{data.penerima.length} KK</strong>
                                            </span>
                                        </div>

                                        <div className="max-h-[480px] overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead>No</TableHead>
                                                        <TableHead>Nama Kepala Keluarga (Mustahik) & Asnaf</TableHead>
                                                        <TableHead>Kelayakan</TableHead>
                                                        <TableHead className="w-40">Nominal Uang (Rp)</TableHead>
                                                        <TableHead className="w-32">Beras (Kg)</TableHead>
                                                        <TableHead className="text-right">Hapus</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.penerima.map((row, idx) => {
                                                        const info = mustahikMap.get(row.mustahik_id);
                                                        const qTabel = cariPenerimaTabel.trim().toLowerCase();
                                                        if (
                                                            qTabel !== '' &&
                                                            info &&
                                                            !info.nama_lengkap.toLowerCase().includes(qTabel) &&
                                                            !info.nik.toLowerCase().includes(qTabel) &&
                                                            !(info.alamat_rt_rw ?? '').toLowerCase().includes(qTabel)
                                                        ) {
                                                            return null;
                                                        }

                                                        const layak =
                                                            info &&
                                                            (Number(info.is_layak_syariat) === 1 ||
                                                                info.is_layak_syariat === true);

                                                    return (
                                                        <TableRow key={row.mustahik_id}>
                                                            <TableCell className="tabular-nums">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <p className="font-semibold text-sm">
                                                                    {info?.nama_lengkap ?? `Mustahik #${row.mustahik_id}`}
                                                                </p>
                                                                <p className="font-mono text-xs text-muted-foreground">
                                                                    {info?.kode_asnaf} ({info?.nama_asnaf}) • NIK: {info?.nik}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                {layak ? (
                                                                    <Badge variant="success">
                                                                        <CheckCircle2
                                                                            className="mr-1 h-3 w-3"
                                                                            aria-hidden="true"
                                                                        />
                                                                        Layak
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive">
                                                                        <XCircle
                                                                            className="mr-1 h-3 w-3"
                                                                            aria-hidden="true"
                                                                        />
                                                                        Belum Layak
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    required
                                                                    aria-label={`Nominal uang untuk ${info?.nama_lengkap ?? row.mustahik_id}`}
                                                                    value={row.nominal}
                                                                    onChange={(e) =>
                                                                        handleUbahBaris(idx, 'nominal', e.target.value)
                                                                    }
                                                                    className="h-9 tabular-nums font-semibold"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.01"
                                                                    min="0"
                                                                    required
                                                                    aria-label={`Beras kg untuk ${info?.nama_lengkap ?? row.mustahik_id}`}
                                                                    value={row.beras_kg}
                                                                    onChange={(e) =>
                                                                        handleUbahBaris(idx, 'beras_kg', e.target.value)
                                                                    }
                                                                    className="h-9 tabular-nums font-semibold"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    aria-label={`Hapus ${info?.nama_lengkap ?? row.mustahik_id} dari daftar`}
                                                                    onClick={() => handleHapusBaris(idx)}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={3} className="font-bold">
                                                        Total Rencana Penyaluran ({data.penerima.length} mustahik)
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-primary">
                                                        {formatRupiah(totalPengajuan.uang)}
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-primary">
                                                        {formatBerasKg(totalPengajuan.beras)}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <aside className="lg:col-span-4 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Ringkasan Pengajuan & Ketersediaan Saldo Zakat
                                </CardTitle>
                                <CardDescription>
                                    Seluruh penerima yang terdaftar di samping akan disimpan sekaligus dalam satu dokumen BKK.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                {selectedProgram && (
                                    <div className="rounded-lg border p-3.5 space-y-1.5">
                                        <p className="font-semibold text-sm">{selectedProgram.nama_program}</p>
                                        <p className="text-muted-foreground">
                                            Kantong Dana Program:{' '}
                                            <strong className="text-foreground">
                                                [{selectedProgram.kode_dana}] {selectedProgram.nama_dana}
                                            </strong>
                                        </p>
                                        <p className="tabular-nums text-muted-foreground">
                                            Anggaran Rencana:{' '}
                                            <strong className="text-foreground">
                                                {formatRupiah(selectedProgram.anggaran_rencana)}
                                            </strong>
                                        </p>
                                    </div>
                                )}

                                {selectedDana && (
                                    <div className="rounded-lg border bg-accent/40 p-3.5 space-y-1.5">
                                        <p className="font-semibold text-accent-foreground">
                                            Saldo Tersedia [{selectedDana.kode_dana}] {selectedDana.nama_dana}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <p className="text-muted-foreground">Saldo Uang</p>
                                                <p className="text-sm font-bold tabular-nums text-primary">
                                                    {formatRupiah(selectedDana.saldo_tersedia)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Saldo Beras</p>
                                                <p className="text-sm font-bold tabular-nums">
                                                    {formatBerasKg(selectedDana.saldo_beras_kg)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {hakAmilSelectedDana && (
                                    <div className="rounded-lg border p-3.5 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                                <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                                <span>Hak Amil [{hakAmilSelectedDana.kode_dana}]</span>
                                            </span>
                                            <Badge
                                                variant={
                                                    hakAmilSelectedDana.persentase_amil >= 12.5
                                                        ? 'destructive'
                                                        : hakAmilSelectedDana.persentase_amil >= 10
                                                          ? 'warning'
                                                          : 'success'
                                                }
                                                className="tabular-nums text-[10px]"
                                            >
                                                {formatPercentage(hakAmilSelectedDana.persentase_amil)} / 12,50%
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-[11px] tabular-nums">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Kuota Maks 12,5% Kategori Ini:</span>
                                                <span className="font-semibold">
                                                    {formatRupiah(hakAmilSelectedDana.kuota_maksimal_rupiah)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Sudah Dialokasikan (ASN-03):</span>
                                                <span className="font-semibold">
                                                    {formatRupiah(hakAmilSelectedDana.total_amil_rupiah)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Sisa Kuota Amil Kategori Ini:</span>
                                                <span className="font-bold text-primary">
                                                    {formatRupiah(hakAmilSelectedDana.sisa_kuota_rupiah)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Separator />

                                <div className="rounded-lg border p-3.5 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Jumlah Penerima:</span>
                                        <span className="font-bold tabular-nums">
                                            {data.penerima.length} mustahik
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Total Pengajuan Uang:</span>
                                        <span className="font-bold tabular-nums text-primary">
                                            {formatRupiah(totalPengajuan.uang)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Total Pengajuan Beras:</span>
                                        <span className="font-bold tabular-nums">
                                            {formatBerasKg(totalPengajuan.beras)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={
                                        processing ||
                                        !isOnline ||
                                        daftarProgram.length === 0 ||
                                        data.penerima.length === 0
                                    }
                                >
                                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                                    <span>
                                        {!isOnline
                                            ? 'Perangkat Offline (Pengajuan Dikunci)'
                                            : processing
                                              ? 'Menyimpan BKK Kolektif...'
                                              : `Simpan Pengajuan BKK (${data.penerima.length} Mustahik)`}
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
