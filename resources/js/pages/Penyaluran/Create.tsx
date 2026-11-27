import * as React from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    Calculator,
    CheckCircle2,
    FileSpreadsheet,
    MapPin,
    Plus,
    Scale,
    Search,
    ShieldAlert,
    ShieldCheck,
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
    const [asnafGenerator, setAsnafGenerator] = React.useState<string>('SEMUA_NON_AMIL');
    const [rtRwGenerator, setRtRwGenerator] = React.useState<string>('SEMUA_RT_RW');
    const [nominalPerOrang, setNominalPerOrang] = React.useState<string>('300000');
    const [berasPerOrang, setBerasPerOrang] = React.useState<string>('');
    const [singleCandidateId, setSingleCandidateId] = React.useState<number>(
        daftarMustahik[0]?.id ?? 0
    );
    const [cariPenerimaTabel, setCariPenerimaTabel] = React.useState<string>('');
    const [confirmDialogOpen, setConfirmDialogOpen] = React.useState<boolean>(false);

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

    // Indeks Wilayah RT/RW dari Mustahik Layak untuk memudahkan pembagian per Ketua RT
    const daftarRtRwLayak = React.useMemo(() => {
        const map = new Map<string, number>();
        for (const m of mustahikLayakList) {
            const rt = (m.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
            map.set(rt, (map.get(rt) ?? 0) + 1);
        }
        return Array.from(map.entries())
            .map(([wilayah, jumlah]) => ({ wilayah, jumlah }))
            .sort((a, b) => a.wilayah.localeCompare(b.wilayah));
    }, [mustahikLayakList]);

    const defaultProgram = daftarProgram[0] ?? null;
    const initialMustahik =
        mustahikLayakList.find((m) => m.kode_asnaf !== 'ASN-03') ??
        mustahikLayakList[0] ??
        daftarMustahik[0] ??
        null;

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
                      beras_kg: '',
                  },
              ]
            : [],
    });

    const { auth, hakAmilPerKategori = [] } = usePage<SharedProps>().props;
    const isAdmin = auth?.user?.peran === 'Admin';

    const selectedProgram = React.useMemo(
        () => daftarProgram.find((p) => p.id === data.program_id) ?? null,
        [daftarProgram, data.program_id]
    );

    const isProgramAmil = Boolean(
        selectedProgram && (Number(selectedProgram.khusus_amil) === 1 || selectedProgram.khusus_amil === true)
    );

    const selectedDana = React.useMemo(
        () => daftarDanaOperasional.find((d) => d.id === data.jenis_dana_id) ?? null,
        [daftarDanaOperasional, data.jenis_dana_id]
    );

    const hakAmilSelectedDana = React.useMemo(
        () =>
            hakAmilPerKategori.find((h) => Number(h.jenis_dana_id) === Number(data.jenis_dana_id)) ??
            null,
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
        const progIsAmil = Boolean(
            prog && (Number(prog.khusus_amil) === 1 || prog.khusus_amil === true)
        );
        if (progIsAmil) {
            setAsnafGenerator('ASN-03');
            if (singleCandidateId && mustahikMap.get(singleCandidateId)?.kode_asnaf !== 'ASN-03') {
                setSingleCandidateId(0);
            }
        }
        setData((prev) => ({
            ...prev,
            program_id: idNum,
            jenis_dana_id: prog ? Number(prog.jenis_dana_id) : prev.jenis_dana_id,
            penerima: progIsAmil
                ? prev.penerima.filter((row) => mustahikMap.get(row.mustahik_id)?.kode_asnaf === 'ASN-03')
                : prev.penerima,
        }));
    };

    // Sinkronisasi Langsung (Live Synchronous): ketika input Nominal per Mustahik diubah,
    // seluruh baris di tabel penerima dan ringkasan BKK langsung ikut berubah secara real-time!
    const handleNominalPerOrangChange = (val: string) => {
        setNominalPerOrang(val);
        if (data.penerima.length > 0) {
            setData(
                'penerima',
                data.penerima.map((row) => ({
                    ...row,
                    nominal: val,
                }))
            );
        }
    };

    const handleBerasPerOrangChange = (val: string) => {
        setBerasPerOrang(val);
        if (data.penerima.length > 0) {
            setData(
                'penerima',
                data.penerima.map((row) => ({
                    ...row,
                    beras_kg: val,
                }))
            );
        }
    };

    // Filter kandidat mustahik berdasarkan Golongan Asnaf DAN Indeks Wilayah RT/RW
    const getFilteredKandidatKelompok = () => {
        return mustahikLayakList.filter((m) => {
            if (isProgramAmil && m.kode_asnaf !== 'ASN-03') {
                return false;
            }
            const cocokAsnaf =
                asnafGenerator === 'SEMUA_LAYAK'
                    ? true
                    : asnafGenerator === 'SEMUA_NON_AMIL'
                      ? m.kode_asnaf !== 'ASN-03'
                      : m.kode_asnaf === asnafGenerator;
            const rt = (m.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
            const cocokRt = rtRwGenerator === 'SEMUA_RT_RW' ? true : rt === rtRwGenerator;
            return cocokAsnaf && cocokRt;
        });
    };

    // Muat seluruh mustahik layak pada golongan Asnaf & RT/RW terpilih sekaligus (Sekali Jalan)
    const handleMuatKelompokAsnaf = () => {
        const kandidat = getFilteredKandidatKelompok();
        if (kandidat.length === 0) return;

        const barisBaru: PenerimaDraftRow[] = kandidat.map((m) => ({
            mustahik_id: m.id,
            nominal: nominalPerOrang,
            beras_kg: berasPerOrang,
        }));

        setData('penerima', barisBaru);
    };

    // Bagi Rata Otomatis Sesuai Perlindungan Porsi 8 Asnaf (Tanpa Memakan Cadangan Wajib 12,5% Hak Amil)
    const handleBagiRataTerlindungi = () => {
        const targetList =
            data.penerima.length > 0
                ? data.penerima
                : getFilteredKandidatKelompok().map((m) => ({
                      mustahik_id: m.id,
                      nominal: '0',
                      beras_kg: '0',
                  }));

        if (targetList.length === 0 || !hakAmilSelectedDana) return;

        const count = targetList.length;
        const isAllAmil = targetList.every(
            (row) => mustahikMap.get(row.mustahik_id)?.kode_asnaf === 'ASN-03'
        );

        const kuotaAmanUang = isAllAmil
            ? Number(hakAmilSelectedDana.sisa_kuota_amil_uang ?? 0)
            : Number(hakAmilSelectedDana.sisa_kuota_non_amil_uang ?? 0);

        const kuotaAmanBeras = isAllAmil
            ? Number(hakAmilSelectedDana.sisa_kuota_amil_beras ?? 0)
            : Number(hakAmilSelectedDana.sisa_kuota_non_amil_beras ?? 0);

        const uangPerKk = Math.floor(kuotaAmanUang / count);
        const berasPerKk = Math.floor((kuotaAmanBeras / count) * 100) / 100;

        const strUang = uangPerKk > 0 ? String(uangPerKk) : '';
        const strBeras = berasPerKk > 0 ? berasPerKk.toFixed(2) : '';

        setNominalPerOrang(strUang);
        setBerasPerOrang(strBeras);
        setData(
            'penerima',
            targetList.map((row) => ({
                ...row,
                nominal: strUang,
                beras_kg: strBeras,
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

    // Perhitungan Live Synchronous: uang, beras, rincian per Asnaf, dan indeks per RT/RW
    const totalPengajuan = React.useMemo(() => {
        let uang = 0;
        let beras = 0;
        let amilUang = 0;
        let amilBeras = 0;
        let nonAmilUang = 0;
        let nonAmilBeras = 0;
        const perRtRw = new Map<string, { kk: number; uang: number; beras: number }>();
        const perAsnaf = new Map<string, { nama: string; kk: number; uang: number; beras: number }>();

        for (const item of data.penerima) {
            const nom = Number.parseFloat(item.nominal) || 0;
            const brs = Number.parseFloat(item.beras_kg) || 0;
            uang += nom;
            beras += brs;

            const info = mustahikMap.get(item.mustahik_id);
            const kodeAsnaf = info?.kode_asnaf ?? 'ASN-01';
            const namaAsnaf = info?.nama_asnaf ?? 'Mustahik';
            const rtRw = (info?.alamat_rt_rw ?? '').trim() || 'Belum Diisi';

            if (kodeAsnaf === 'ASN-03') {
                amilUang += nom;
                amilBeras += brs;
            } else {
                nonAmilUang += nom;
                nonAmilBeras += brs;
            }

            const prevRt = perRtRw.get(rtRw) ?? { kk: 0, uang: 0, beras: 0 };
            perRtRw.set(rtRw, {
                kk: prevRt.kk + 1,
                uang: prevRt.uang + nom,
                beras: prevRt.beras + brs,
            });

            const prevAsnaf = perAsnaf.get(kodeAsnaf) ?? {
                nama: `${kodeAsnaf} - ${namaAsnaf}`,
                kk: 0,
                uang: 0,
                beras: 0,
            };
            perAsnaf.set(kodeAsnaf, {
                nama: prevAsnaf.nama,
                kk: prevAsnaf.kk + 1,
                uang: prevAsnaf.uang + nom,
                beras: prevAsnaf.beras + brs,
            });
        }

        return {
            uang,
            beras,
            amilUang,
            amilBeras,
            nonAmilUang,
            nonAmilBeras,
            rekapRtRw: Array.from(perRtRw.entries())
                .map(([wilayah, val]) => ({ wilayah, ...val }))
                .sort((a, b) => a.wilayah.localeCompare(b.wilayah)),
            rekapAsnaf: Array.from(perAsnaf.values()),
        };
    }, [data.penerima, mustahikMap]);

    // Pengecekan Live apakah draf BKK ini melanggar perlindungan cadangan 12,5% Hak Amil
    const peringatanPorsi = React.useMemo(() => {
        if (!hakAmilSelectedDana) return null;
        const sisaAmilUang = Number(hakAmilSelectedDana.sisa_kuota_amil_uang ?? 0);
        const sisaAmilBeras = Number(hakAmilSelectedDana.sisa_kuota_amil_beras ?? 0);
        const sisaNonAmilUang = Number(hakAmilSelectedDana.sisa_kuota_non_amil_uang ?? 0);
        const sisaNonAmilBeras = Number(hakAmilSelectedDana.sisa_kuota_non_amil_beras ?? 0);

        if (totalPengajuan.amilUang > sisaAmilUang || totalPengajuan.amilBeras > sisaAmilBeras) {
            return `Alokasi untuk Amil (ASN-03) melebihi sisa kuota 12,50% kategori ${hakAmilSelectedDana.nama_dana} (Maks Tersisa: ${formatRupiah(sisaAmilUang)} & ${formatBerasKg(sisaAmilBeras)}).`;
        }

        if (
            totalPengajuan.nonAmilUang > sisaNonAmilUang ||
            totalPengajuan.nonAmilBeras > sisaNonAmilBeras
        ) {
            return `Alokasi Non-Amil memakan cadangan wajib 12,50% milik Hak Amil pada ${hakAmilSelectedDana.nama_dana}. Maksimal dana Non-Amil yang aman dibagikan adalah ${formatRupiah(sisaNonAmilUang)} dan ${formatBerasKg(sisaNonAmilBeras)}. Klik tombol "Bagi Rata Sesuai Kuota Terlindungi" agar jatah Amil tidak terpakai.`;
        }

        return null;
    }, [hakAmilSelectedDana, totalPengajuan]);

    const handleOpenConfirmation = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline || data.penerima.length === 0) return;
        setConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = () => {
        if (!isOnline || data.penerima.length === 0) return;
        setConfirmDialogOpen(false);
        post('/penyaluran');
    };

    const kandidatKelompokCount = getFilteredKandidatKelompok().length;

    return (
        <AuthenticatedLayout
            title="Buat Pengajuan Bukti Kas Keluar (BKK) Penyaluran Zakat"
            subtitle="Sinkronisasi nilai real-time, indeks pembagian per Ketua RT/RW, dan perlindungan porsi 8 Asnaf & Hak Amil 12,5%"
        >
            <Head title="Buat Pengajuan BKK Zakat" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                {daftarProgram.length === 0 && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                                Seluruh Program Penyaluran Telah Selesai
                            </p>
                            <p className="text-amber-900 dark:text-amber-200">
                                Tidak ada program penyaluran aktif (Draft / Berjalan) pada periode saat ini. Petugas wajib membuat program penyaluran baru terlebih dahulu (atau meminta Admin membuka program periode/tahun berikutnya) sebelum mengajukan BKK.
                            </p>
                        </div>
                        {isAdmin && (
                            <Button asChild size="sm" variant="outline" className="shrink-0">
                                <Link href="/master/program">Buat Program Baru</Link>
                            </Button>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/penyaluran">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span>Kembali ke Daftar BKK</span>
                        </Link>
                    </Button>

                    <Button asChild variant="secondary" size="sm">
                        <Link href="/dasar-hukum">
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                            <span>Lihat Dasar Hukum &amp; Pasal Pembagian 8 Asnaf</span>
                        </Link>
                    </Button>
                </div>

                <form onSubmit={handleOpenConfirmation} className="grid gap-6 lg:grid-cols-12 lg:items-start">
                    <section className="lg:col-span-8 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            1. Pilih Program &amp; Kantong Dana Zakat
                                        </CardTitle>
                                    </div>
                                    <Badge variant={selectedDana?.kode_dana === 'ZKT-FTR' ? 'warning' : 'success'}>
                                        {selectedDana?.kode_dana === 'ZKT-FTR'
                                            ? 'Terikat Periode Ramadhan'
                                            : 'Zakat Mal (Lintas Periode)'}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Kantong sumber dana otomatis mengikuti program penyaluran zakat yang dipilih.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="no_bkk_input">Nomor Dokumen BKK (Otomatis)</Label>
                                        <Input
                                            id="no_bkk_input"
                                            readOnly
                                            disabled
                                            value={data.no_bkk}
                                            className="font-mono text-xs bg-muted/60 cursor-not-allowed"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            Dibuat otomatis oleh sistem dan tidak dapat diubah manual.
                                        </p>
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
                                            2. Susun Daftar Mustahik Penerima (Indeks per RT/RW &amp; Sinkronisasi Live)
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline">
                                        {data.penerima.length} Mustahik Terpilih
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Setiap perubahan angka pada input di bawah langsung memperbarui tabel dan keterangan ringkasan BKK secara sinkron (real-time).
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <Tabs
                                    value={modePenyaluran}
                                    onValueChange={(val) =>
                                        setModePenyaluran(val as 'kelompok' | 'perorangan')
                                    }
                                >
                                    <TabsList className="grid w-full grid-cols-1 gap-1 sm:inline-grid sm:w-auto sm:grid-cols-2">
                                        <TabsTrigger value="kelompok">
                                            Kolektif Asnaf &amp; RT/RW
                                        </TabsTrigger>
                                        <TabsTrigger value="perorangan">
                                            Pilih Perorangan (Cari KK)
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="kelompok" className="space-y-3 pt-3">
                                        <div className="rounded-xl border bg-accent/25 p-4 space-y-4">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="asnaf_kelompok_select">
                                                        Golongan Asnaf (Layak)
                                                    </Label>
                                                    <Select
                                                        value={asnafGenerator}
                                                        onValueChange={setAsnafGenerator}
                                                    >
                                                        <SelectTrigger id="asnaf_kelompok_select">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="SEMUA_NON_AMIL">
                                                                7 Asnaf Non-Amil (Lindungi 12,5% Amil)
                                                            </SelectItem>
                                                            <SelectItem value="SEMUA_LAYAK">
                                                                Semua Mustahik Layak ({mustahikLayakList.length} KK)
                                                            </SelectItem>
                                                            {daftarAsnaf.map((a) => {
                                                                const count = mustahikLayakList.filter(
                                                                    (m) => m.kode_asnaf === a.kode_asnaf
                                                                ).length;
                                                                return (
                                                                    <SelectItem key={a.id} value={a.kode_asnaf}>
                                                                        {a.kode_asnaf} - {a.nama_asnaf} ({count} KK)
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="rtrw_kelompok_select">
                                                        Indeks Wilayah Ketua RT / RW
                                                    </Label>
                                                    <Select
                                                        value={rtRwGenerator}
                                                        onValueChange={setRtRwGenerator}
                                                    >
                                                        <SelectTrigger id="rtrw_kelompok_select">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="SEMUA_RT_RW">
                                                                Semua Wilayah RT/RW
                                                            </SelectItem>
                                                            {daftarRtRwLayak.map((rt) => (
                                                                <SelectItem key={rt.wilayah} value={rt.wilayah}>
                                                                    {rt.wilayah} ({rt.jumlah} KK Layak)
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="nominal_per_orang">
                                                        Nominal per KK (Rp)
                                                    </Label>
                                                    <Input
                                                        id="nominal_per_orang"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        placeholder="0"
                                                        value={nominalPerOrang}
                                                        onChange={(e) =>
                                                            handleNominalPerOrangChange(e.target.value)
                                                        }
                                                        className="tabular-nums font-semibold"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="beras_per_orang">
                                                        Beras per KK (Kg)
                                                    </Label>
                                                    <Input
                                                        id="beras_per_orang"
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0"
                                                        value={berasPerOrang}
                                                        onChange={(e) =>
                                                            handleBerasPerOrangChange(e.target.value)
                                                        }
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
                                                        Muat Kelompok ({kandidatKelompokCount} KK)
                                                    </span>
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    title="Bagi rata sisa kuota aman (87,5% Non-Amil / 12,5% Amil) ke seluruh penerima"
                                                    onClick={handleBagiRataTerlindungi}
                                                >
                                                    <Calculator className="h-4 w-4" aria-hidden="true" />
                                                    <span>Bagi Rata Kuota Aman</span>
                                                </Button>

                                                {data.penerima.length > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() => setData('penerima', [])}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        Kosongkan Daftar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="perorangan" className="space-y-3 pt-3">
                                        <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                                            <MustahikSearchPicker
                                                id="cari_nama_kk_create_bkk"
                                                label="Cari & Ketik Nama Kepala Keluarga (KK), NIK, atau Pilih Indeks RT/RW"
                                                daftarMustahik={daftarMustahik}
                                                selectedId={singleCandidateId}
                                                onSelect={(idNum) => setSingleCandidateId(idNum)}
                                                excludeIds={data.penerima.map((p) => p.mustahik_id)}
                                                onlyAsnafKode={isProgramAmil ? 'ASN-03' : undefined}
                                            />

                                            <div className="grid gap-3 sm:grid-cols-12">
                                                <div className="sm:col-span-4 space-y-1.5">
                                                    <Label htmlFor="single_nominal">Nominal Uang (Rp)</Label>
                                                    <Input
                                                        id="single_nominal"
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        placeholder="0"
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
                                                        placeholder="0"
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
                                            Klik tombol Muat Kelompok Ini di atas untuk memuat daftar mustahik layak sesuai golongan Asnaf dan RT/RW.
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
                                                    placeholder="Filter nama kepala keluarga, NIK, atau RT/RW di tabel ini..."
                                                    value={cariPenerimaTabel}
                                                    onChange={(e) => setCariPenerimaTabel(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                Total terdaftar di BKK: <strong>{data.penerima.length} KK</strong> ({totalPengajuan.rekapRtRw.length} Wilayah RT/RW)
                                            </span>
                                        </div>

                                        <div className="hidden md:block max-h-[480px] overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead className="w-10">No</TableHead>
                                                        <TableHead>Kepala Keluarga, Asnaf &amp; RT/RW</TableHead>
                                                        <TableHead className="w-24">Status</TableHead>
                                                        <TableHead className="w-36">Nominal (Rp)</TableHead>
                                                        <TableHead className="w-28">Beras (Kg)</TableHead>
                                                        <TableHead className="w-14 text-right">Hapus</TableHead>
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
                                                                <TableCell className="tabular-nums text-xs text-muted-foreground">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <p className="font-semibold text-sm">
                                                                        {info?.nama_lengkap ?? `Mustahik #${row.mustahik_id}`}
                                                                    </p>
                                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                                            {info?.kode_asnaf} - {info?.nama_asnaf}
                                                                        </Badge>
                                                                        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                                                                            <MapPin className="mr-1 h-2.5 w-2.5 text-primary" aria-hidden="true" />
                                                                            {info?.alamat_rt_rw || 'Belum Diisi'}
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {layak ? (
                                                                        <Badge variant="success" className="text-[11px]">
                                                                            <CheckCircle2
                                                                                className="mr-1 h-3 w-3"
                                                                                aria-hidden="true"
                                                                            />
                                                                            Layak
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="destructive" className="text-[11px]">
                                                                            <XCircle
                                                                                className="mr-1 h-3 w-3"
                                                                                aria-hidden="true"
                                                                            />
                                                                            Belum
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        min="0"
                                                                        placeholder="0"
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
                                                                        placeholder="0"
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
                                                            Total Rencana Penyaluran Live ({data.penerima.length} KK)
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

                                        {/* Tampilan Card List Mobile (< 768px) */}
                                        <div className="grid gap-3 md:hidden">
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

                                                return (
                                                    <div
                                                        key={row.mustahik_id}
                                                        className="rounded-lg border bg-card p-3.5 space-y-2.5"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold truncate">
                                                                    {idx + 1}. {info?.nama_lengkap ?? `Mustahik #${row.mustahik_id}`}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {info?.kode_asnaf} ({info?.nama_asnaf}) • {info?.alamat_rt_rw || 'RT/RW -'}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`Hapus ${info?.nama_lengkap ?? row.mustahik_id}`}
                                                                onClick={() => handleHapusBaris(idx)}
                                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                                                            >
                                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                            </Button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Label className="text-[11px]">Nominal (Rp)</Label>
                                                                <Input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={row.nominal}
                                                                    onChange={(e) =>
                                                                        handleUbahBaris(idx, 'nominal', e.target.value)
                                                                    }
                                                                    className="h-9 tabular-nums font-semibold"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px]">Beras (Kg)</Label>
                                                                <Input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    value={row.beras_kg}
                                                                    onChange={(e) =>
                                                                        handleUbahBaris(idx, 'beras_kg', e.target.value)
                                                                    }
                                                                    className="h-9 tabular-nums font-semibold"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Keterangan BKK Live &amp; Perlindungan Porsi 8 Asnaf
                                </CardTitle>
                                <CardDescription>
                                    Nilai di bawah ini tersinkronisasi langsung (real-time) dengan kolom input di sebelah kiri.
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
                                    <div className="rounded-lg border p-3.5 space-y-2.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                                                <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                                <span>Perlindungan Porsi 8 Asnaf [{hakAmilSelectedDana.kode_dana}]</span>
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
                                                Amil: {formatPercentage(hakAmilSelectedDana.persentase_amil)} / 12,50%
                                            </Badge>
                                        </div>
                                        <div className="space-y-1.5 text-[11px] tabular-nums">
                                            <div className="rounded bg-muted/40 p-2 space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    1. Cadangan Wajib Hak Amil (12,50% / 1/8 Bagian - Terlindungi):
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Sisa Kuota Uang Amil:</span>
                                                    <span className="font-bold text-primary">
                                                        {formatRupiah(hakAmilSelectedDana.sisa_kuota_amil_uang ?? 0)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Sisa Kuota Beras Amil:</span>
                                                    <span className="font-bold">
                                                        {formatBerasKg(hakAmilSelectedDana.sisa_kuota_amil_beras ?? 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="rounded bg-muted/40 p-2 space-y-1">
                                                <p className="font-semibold text-foreground">
                                                    2. Batas Aman 7 Asnaf Non-Amil (87,50% / 7/8 Bagian):
                                                </p>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Maks Uang Non-Amil:</span>
                                                    <span className="font-bold text-primary">
                                                        {formatRupiah(hakAmilSelectedDana.sisa_kuota_non_amil_uang ?? 0)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Maks Beras Non-Amil:</span>
                                                    <span className="font-bold">
                                                        {formatBerasKg(hakAmilSelectedDana.sisa_kuota_non_amil_beras ?? 0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {peringatanPorsi && (
                                    <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-[11px] font-medium text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                                        {peringatanPorsi}
                                    </div>
                                )}

                                <Separator />

                                {/* Ringkasan Live BKK & Indeks per RT/RW */}
                                <div className="rounded-lg border bg-card p-3.5 space-y-2.5">
                                    <p className="font-bold text-foreground">
                                        Ringkasan Nilai BKK (Tersinkronisasi Live)
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Jumlah KK Penerima:</span>
                                        <span className="font-bold tabular-nums">
                                            {data.penerima.length} KK
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Total Pengajuan Uang (Live):</span>
                                        <span className="font-bold tabular-nums text-primary text-sm">
                                            {formatRupiah(totalPengajuan.uang)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Total Pengajuan Beras (Live):</span>
                                        <span className="font-bold tabular-nums text-sm">
                                            {formatBerasKg(totalPengajuan.beras)}
                                        </span>
                                    </div>

                                    {selectedDana && (
                                        <>
                                            <Separator />
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">Estimasi Sisa Saldo Uang:</span>
                                                <span className="font-semibold tabular-nums">
                                                    {formatRupiah(
                                                        Math.max(
                                                            0,
                                                            Number(selectedDana.saldo_tersedia) - totalPengajuan.uang
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-muted-foreground">Estimasi Sisa Saldo Beras:</span>
                                                <span className="font-semibold tabular-nums">
                                                    {formatBerasKg(
                                                        Math.max(
                                                            0,
                                                            Number(selectedDana.saldo_beras_kg) - totalPengajuan.beras
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {totalPengajuan.rekapRtRw.length > 0 && (
                                    <div className="rounded-lg border p-3.5 space-y-2">
                                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                            <span>Indeks Distribusi per Ketua RT / RW</span>
                                        </p>
                                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                            {totalPengajuan.rekapRtRw.map((rt) => (
                                                <div
                                                    key={rt.wilayah}
                                                    className="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 text-[11px] tabular-nums"
                                                >
                                                    <span className="font-semibold">
                                                        {rt.wilayah} ({rt.kk} KK)
                                                    </span>
                                                    <span>
                                                        {formatRupiah(rt.uang)} / {formatBerasKg(rt.beras)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

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
                                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                    <span>
                                        {!isOnline
                                            ? 'Perangkat Offline (Pengajuan Dikunci)'
                                            : processing
                                              ? 'Menyimpan BKK Kolektif...'
                                              : `Tinjau & Konfirmasi Pengajuan BKK (${data.penerima.length} KK)`}
                                    </span>
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>

            {/* Dialog Konfirmasi Rincian BKK Sebelum Benar-Benar Dikirim ke Database */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pengajuan Dokumen BKK {data.no_bkk}</DialogTitle>
                        <DialogDescription>
                            Periksa kembali kesesuaian total nilai uang, beras, dan pembagian wilayah RT/RW di bawah ini sebelum dokumen BKK resmi dibuat.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 text-xs">
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Nomor BKK:</span>
                                <span className="font-mono font-bold">{data.no_bkk}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Program Penyaluran:</span>
                                <span className="font-semibold">{selectedProgram?.nama_program ?? '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Kantong Dana Zakat:</span>
                                <span className="font-semibold">
                                    [{selectedDana?.kode_dana}] {selectedDana?.nama_dana}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Jumlah Kepala Keluarga (KK):</span>
                                <span className="font-bold tabular-nums">{data.penerima.length} KK</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Uang Diajukan:</span>
                                <span className="font-bold tabular-nums text-primary text-sm">
                                    {formatRupiah(totalPengajuan.uang)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Beras Diajukan:</span>
                                <span className="font-bold tabular-nums text-sm">
                                    {formatBerasKg(totalPengajuan.beras)}
                                </span>
                            </div>
                        </div>

                        {totalPengajuan.rekapRtRw.length > 0 && (
                            <div className="rounded-lg border p-3 space-y-1.5">
                                <p className="font-semibold">Rincian Indeks per Ketua RT / RW:</p>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {totalPengajuan.rekapRtRw.map((rt) => (
                                        <div
                                            key={rt.wilayah}
                                            className="flex items-center justify-between text-[11px] tabular-nums"
                                        >
                                            <span>
                                                {rt.wilayah} ({rt.kk} KK)
                                            </span>
                                            <span className="font-semibold">
                                                {formatRupiah(rt.uang)} + {formatBerasKg(rt.beras)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {peringatanPorsi && (
                            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                                <p className="font-bold">Peringatan Perlindungan Porsi 8 Asnaf:</p>
                                <p className="mt-0.5">{peringatanPorsi}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                        >
                            Periksa Kembali
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSubmit}
                            disabled={processing || !isOnline}
                        >
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                            <span>
                                {processing ? 'Menyimpan...' : 'Ya, Konfirmasi & Simpan BKK'}
                            </span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
