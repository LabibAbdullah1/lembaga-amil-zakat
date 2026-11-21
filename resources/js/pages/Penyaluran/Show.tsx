import * as React from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    BookOpen,
    CheckCircle2,
    FileDown,
    MapPin,
    Plus,
    Save,
    Search,
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
import {
    formatBerasKg,
    formatPercentage,
    formatRupiah,
    formatTanggalIndonesia,
} from '@/lib/format';
import type {
    DetailPenyaluranMustahik,
    Mustahik,
    PenyaluranDana,
    SharedProps,
    StatusPersetujuanBkk,
} from '@/types';

interface BkkDetailHeader extends PenyaluranDana {
    kode_program: string;
    nama_program: string;
    kode_dana: string;
    nama_dana: string;
    kategori_utama: string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
    nama_pembuat: string;
    nama_penyetuju: string | null;
}

interface DetailMustahikRow extends DetailPenyaluranMustahik {
    nik_mustahik: string;
    nama_mustahik: string;
    alamat_rt_rw: string | null;
    status_verifikasi: string;
    is_layak_syariat: number | boolean;
    kode_asnaf: string;
    nama_asnaf: string;
}

interface MustahikOption extends Mustahik {
    kode_asnaf: string;
    nama_asnaf: string;
    is_layak_syariat: number | boolean;
}

interface EditableDetailRow {
    id: number;
    nominal_diterima: string;
    beras_diterima_kg: string;
}

interface PenyaluranShowProps {
    bkk: BkkDetailHeader;
    detailMustahik: DetailMustahikRow[];
    daftarMustahik: MustahikOption[];
    rdbmsError?: string | null;
}

export default function PenyaluranShow({
    bkk,
    detailMustahik = [],
    daftarMustahik = [],
    rdbmsError,
}: PenyaluranShowProps) {
    const { auth, hakAmilPerKategori = [] } = usePage<SharedProps>().props;
    const userRole = auth?.user?.peran;
    const isKetuaOrAdmin = userRole === 'Ketua_DKM' || userRole === 'Admin';
    const isDraft = bkk.status_persetujuan === 'Draft';
    const isDisetujui = bkk.status_persetujuan === 'Disetujui';

    const hakAmilKategoriIni = React.useMemo(
        () =>
            hakAmilPerKategori.find((h) => Number(h.jenis_dana_id) === Number(bkk.jenis_dana_id)) ??
            null,
        [hakAmilPerKategori, bkk.jenis_dana_id]
    );

    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [tolakDialogOpen, setTolakDialogOpen] = React.useState<boolean>(false);
    const [accConfirmOpen, setAccConfirmOpen] = React.useState<boolean>(false);
    const [eksekusiConfirmOpen, setEksekusiConfirmOpen] = React.useState<boolean>(false);
    const [processingAction, setProcessingAction] = React.useState<boolean>(false);
    const [cariPenerimaDetail, setCariPenerimaDetail] = React.useState<string>('');
    const [rtRwFilterDetail, setRtRwFilterDetail] = React.useState<string>('SEMUA');

    // State edit nilai baris penerima secara live ketika status BKK masih Draft
    const [editableRows, setEditableRows] = React.useState<Record<number, EditableDetailRow>>({});

    React.useEffect(() => {
        const initialMap: Record<number, EditableDetailRow> = {};
        for (const item of detailMustahik) {
            initialMap[item.id] = {
                id: item.id,
                nominal_diterima:
                    Number(item.nominal_diterima) > 0 ? String(Number(item.nominal_diterima)) : '',
                beras_diterima_kg:
                    Number(item.beras_diterima_kg) > 0
                        ? String(Number(item.beras_diterima_kg))
                        : '',
            };
        }
        setEditableRows(initialMap);
    }, [detailMustahik]);

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

    const defaultMustahikId = daftarMustahik[0]?.id ?? 0;

    const addForm = useForm<{
        mustahik_id: number;
        nominal: string;
        beras_kg: string;
    }>({
        mustahik_id: defaultMustahikId,
        nominal: '',
        beras_kg: '',
    });

    const tolakForm = useForm<{
        catatan_penolakan: string;
    }>({
        catatan_penolakan: '',
    });

    const handleEditRowChange = (
        detailId: number,
        field: 'nominal_diterima' | 'beras_diterima_kg',
        val: string
    ) => {
        setEditableRows((prev) => ({
            ...prev,
            [detailId]: {
                ...(prev[detailId] ?? { id: detailId, nominal_diterima: '', beras_diterima_kg: '' }),
                [field]: val,
            },
        }));
    };

    const hasUnsavedTableChanges = React.useMemo(() => {
        if (!isDraft) return false;
        for (const item of detailMustahik) {
            const edited = editableRows[item.id];
            if (!edited) continue;
            const origNom = Number(item.nominal_diterima) || 0;
            const origBrs = Number(item.beras_diterima_kg) || 0;
            const newNom = Number.parseFloat(edited.nominal_diterima) || 0;
            const newBrs = Number.parseFloat(edited.beras_diterima_kg) || 0;
            if (Math.abs(origNom - newNom) > 0.001 || Math.abs(origBrs - newBrs) > 0.001) {
                return true;
            }
        }
        return false;
    }, [isDraft, detailMustahik, editableRows]);

    // Total BKK yang tersinkronisasi secara Live dari baris tabel + input form tambah penerima baru
    const liveTotals = React.useMemo(() => {
        let tabelUang = 0;
        let tabelBeras = 0;
        const perRtRw = new Map<string, { kk: number; uang: number; beras: number }>();

        for (const item of detailMustahik) {
            const edited = editableRows[item.id];
            const nom = isDraft && edited
                ? Number.parseFloat(edited.nominal_diterima) || 0
                : Number.parseFloat(String(item.nominal_diterima)) || 0;
            const brs = isDraft && edited
                ? Number.parseFloat(edited.beras_diterima_kg) || 0
                : Number.parseFloat(String(item.beras_diterima_kg)) || 0;

            tabelUang += nom;
            tabelBeras += brs;

            const rt = (item.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
            const prev = perRtRw.get(rt) ?? { kk: 0, uang: 0, beras: 0 };
            perRtRw.set(rt, {
                kk: prev.kk + 1,
                uang: prev.uang + nom,
                beras: prev.beras + brs,
            });
        }

        const tambahUang = isDraft ? Number.parseFloat(addForm.data.nominal) || 0 : 0;
        const tambahBeras = isDraft ? Number.parseFloat(addForm.data.beras_kg) || 0 : 0;

        return {
            tabelUang,
            tabelBeras,
            tambahUang,
            tambahBeras,
            proyeksiTotalUang: tabelUang + tambahUang,
            proyeksiTotalBeras: tabelBeras + tambahBeras,
            rekapRtRw: Array.from(perRtRw.entries())
                .map(([wilayah, val]) => ({ wilayah, ...val }))
                .sort((a, b) => a.wilayah.localeCompare(b.wilayah)),
        };
    }, [detailMustahik, editableRows, isDraft, addForm.data.nominal, addForm.data.beras_kg]);

    const handleSimpanPerubahanTabel = () => {
        if (!isOnline || !isDraft) return;
        setProcessingAction(true);
        const itemsPayload = detailMustahik.map((item) => {
            const edited = editableRows[item.id];
            return {
                id: item.id,
                nominal_diterima: edited ? edited.nominal_diterima : String(item.nominal_diterima),
                beras_diterima_kg: edited ? edited.beras_diterima_kg : String(item.beras_diterima_kg),
            };
        });

        router.put(
            `/penyaluran/${bkk.id}/mustahik`,
            { items: itemsPayload },
            {
                preserveScroll: true,
                onFinish: () => setProcessingAction(false),
            }
        );
    };

    const handleHapusBarisMustahik = (detailId: number) => {
        if (!isOnline || !isDraft || detailMustahik.length <= 1) return;
        setProcessingAction(true);
        router.delete(`/penyaluran/${bkk.id}/mustahik/${detailId}`, {
            preserveScroll: true,
            onFinish: () => setProcessingAction(false),
        });
    };

    const handleTambahMustahik = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline || !isDraft) return;
        addForm.post(`/penyaluran/${bkk.id}/mustahik`, {
            preserveScroll: true,
            onSuccess: () => {
                addForm.setData((prev) => ({
                    ...prev,
                    nominal: '',
                    beras_kg: '',
                }));
            },
        });
    };

    const handleSetujuiBkk = () => {
        if (!isOnline) return;
        setProcessingAction(true);

        // Jika ada perubahan angka di tabel yang belum disimpan, simpan terlebih dahulu lalu setujui
        if (hasUnsavedTableChanges) {
            const itemsPayload = detailMustahik.map((item) => {
                const edited = editableRows[item.id];
                return {
                    id: item.id,
                    nominal_diterima: edited ? edited.nominal_diterima : String(item.nominal_diterima),
                    beras_diterima_kg: edited ? edited.beras_diterima_kg : String(item.beras_diterima_kg),
                };
            });

            router.put(
                `/penyaluran/${bkk.id}/mustahik`,
                { items: itemsPayload },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        router.post(
                            `/penyaluran/${bkk.id}/setujui`,
                            {},
                            {
                                preserveScroll: true,
                                onFinish: () => {
                                    setProcessingAction(false);
                                    setAccConfirmOpen(false);
                                },
                            }
                        );
                    },
                    onError: () => {
                        setProcessingAction(false);
                        setAccConfirmOpen(false);
                    },
                }
            );
            return;
        }

        router.post(
            `/penyaluran/${bkk.id}/setujui`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessingAction(false);
                    setAccConfirmOpen(false);
                },
            }
        );
    };

    const handleTolakBkk = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline) return;
        tolakForm.post(`/penyaluran/${bkk.id}/tolak`, {
            preserveScroll: true,
            onSuccess: () => {
                setTolakDialogOpen(false);
                tolakForm.reset();
            },
        });
    };

    const handleEksekusiPenyaluran = () => {
        if (!isOnline) return;
        setProcessingAction(true);
        router.post(
            `/penyaluran/${bkk.id}/eksekusi`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessingAction(false);
                    setEksekusiConfirmOpen(false);
                },
            }
        );
    };

    const getStatusBadgeVariant = (
        status: StatusPersetujuanBkk
    ): 'warning' | 'default' | 'success' | 'destructive' => {
        if (status === 'Draft') return 'warning';
        if (status === 'Disetujui') return 'default';
        if (status === 'Disalurkan') return 'success';
        return 'destructive';
    };

    return (
        <AuthenticatedLayout
            title={`Detail BKK: ${bkk.no_bkk}`}
            subtitle={`Program: [${bkk.kode_program}] ${bkk.nama_program} • Status Persetujuan: ${bkk.status_persetujuan}`}
        >
            <Head title={`BKK ${bkk.no_bkk}`} />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/penyaluran">
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                <span>Kembali ke Daftar BKK</span>
                            </Link>
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                            <Link href="/dasar-hukum">
                                <BookOpen className="h-4 w-4" aria-hidden="true" />
                                <span>Dasar Hukum Syariat</span>
                            </Link>
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a href={`/penyaluran/${bkk.id}/pdf`} target="_blank" rel="noreferrer">
                                <FileDown className="h-4 w-4" aria-hidden="true" />
                                <span>Unduh PDF BKK</span>
                            </a>
                        </Button>

                        {isKetuaOrAdmin && isDraft && (
                            <>
                                <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={processingAction || !isOnline}
                                    onClick={() => setAccConfirmOpen(true)}
                                >
                                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                    <span>Setujui BKK (ACC)</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={processingAction || !isOnline}
                                    onClick={() => setTolakDialogOpen(true)}
                                >
                                    <XCircle className="h-4 w-4" aria-hidden="true" />
                                    <span>Tolak BKK</span>
                                </Button>
                            </>
                        )}

                        {isKetuaOrAdmin && isDisetujui && (
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                disabled={processingAction || !isOnline}
                                onClick={() => setEksekusiConfirmOpen(true)}
                            >
                                <Banknote className="h-4 w-4" aria-hidden="true" />
                                <span>
                                    {processingAction
                                        ? 'Memproses Pencairan Dana...'
                                        : 'Eksekusi Pencairan Dana (Disalurkan)'}
                                </span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12">
                    <section className="lg:col-span-5 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <CardTitle className="text-base">
                                        Keterangan Dokumen BKK (Sinkronisasi Live)
                                    </CardTitle>
                                    <Badge variant={getStatusBadgeVariant(bkk.status_persetujuan)}>
                                        {bkk.status_persetujuan}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Setiap perubahan nilai di kolom input langsung menyesuaikan total keterangan BKK ini secara real-time sebelum di-ACC.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">No. Dokumen</span>
                                    <span className="col-span-2 font-mono font-bold">{bkk.no_bkk}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Tanggal</span>
                                    <span className="col-span-2">
                                        {formatTanggalIndonesia(bkk.tanggal_penyaluran)}
                                    </span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Program</span>
                                    <span className="col-span-2 font-semibold">
                                        [{bkk.kode_program}] {bkk.nama_program}
                                    </span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Kantong Dana</span>
                                    <span className="col-span-2 font-semibold">
                                        [{bkk.kode_dana}] {bkk.nama_dana}
                                    </span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Saldo Kantong Saat Ini</span>
                                    <span className="col-span-2 font-bold tabular-nums text-primary">
                                        {formatRupiah(bkk.saldo_tersedia)} / {formatBerasKg(bkk.saldo_beras_kg)}
                                    </span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Total Tabel BKK (Live)</span>
                                    <span className="col-span-2 font-bold tabular-nums text-sm">
                                        {formatRupiah(liveTotals.tabelUang)} /{' '}
                                        {formatBerasKg(liveTotals.tabelBeras)}
                                    </span>
                                </div>

                                {isDraft && (liveTotals.tambahUang > 0 || liveTotals.tambahBeras > 0) && (
                                    <>
                                        <Separator />
                                        <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-2.5 space-y-1 dark:border-emerald-800 dark:bg-emerald-950/40">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    + Input Tambah Penerima Baru (Live):
                                                </span>
                                                <span className="font-semibold tabular-nums">
                                                    + {formatRupiah(liveTotals.tambahUang)} / +{' '}
                                                    {formatBerasKg(liveTotals.tambahBeras)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between font-bold text-primary">
                                                <span>Proyeksi Total BKK Baru:</span>
                                                <span className="tabular-nums">
                                                    {formatRupiah(liveTotals.proyeksiTotalUang)} /{' '}
                                                    {formatBerasKg(liveTotals.proyeksiTotalBeras)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {hakAmilKategoriIni && (
                                    <>
                                        <Separator />
                                        <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">
                                                    Perlindungan Hak Amil [{hakAmilKategoriIni.kode_dana}]
                                                </span>
                                                <Badge
                                                    variant={
                                                        hakAmilKategoriIni.persentase_amil >= 12.5
                                                            ? 'destructive'
                                                            : hakAmilKategoriIni.persentase_amil >= 10
                                                              ? 'warning'
                                                              : 'success'
                                                    }
                                                >
                                                    {formatPercentage(hakAmilKategoriIni.persentase_amil)} / 12,50%
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                                                <span className="text-muted-foreground">
                                                    Cadangan Hak Amil Terlindungi:
                                                </span>
                                                <span className="font-semibold text-primary">
                                                    {formatRupiah(hakAmilKategoriIni.sisa_kuota_amil_uang ?? 0)} /{' '}
                                                    {formatBerasKg(hakAmilKategoriIni.sisa_kuota_amil_beras ?? 0)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                                                <span className="text-muted-foreground">
                                                    Sisa Kuota Aman Non-Amil (87,5%):
                                                </span>
                                                <span className="font-semibold">
                                                    {formatRupiah(hakAmilKategoriIni.sisa_kuota_non_amil_uang ?? 0)} /{' '}
                                                    {formatBerasKg(hakAmilKategoriIni.sisa_kuota_non_amil_beras ?? 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Diajukan Oleh</span>
                                    <span className="col-span-2">{bkk.nama_pembuat}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-3 gap-2">
                                    <span className="text-muted-foreground">Penyetuju (Ketua DKM)</span>
                                    <span className="col-span-2">{bkk.nama_penyetuju || '-'}</span>
                                </div>

                                {bkk.status_persetujuan === 'Ditolak' && bkk.catatan_penolakan && (
                                    <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                                        <p className="font-semibold">Catatan Penolakan Ketua DKM:</p>
                                        <p className="mt-0.5">{bkk.catatan_penolakan}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {isDraft && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-base">
                                            Tambah Penerima Mustahik ke BKK
                                        </CardTitle>
                                        <Badge variant="outline">Live Sync</Badge>
                                    </div>
                                    <CardDescription>
                                        Ketik nominal uang atau beras di bawah untuk melihat proyeksi total BKK secara langsung di panel atas.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleTambahMustahik} className="space-y-4">
                                        <MustahikSearchPicker
                                            id="cari_nama_kk_show_bkk"
                                            label="Cari & Ketik Nama Kepala Keluarga (KK), NIK, atau Pilih Indeks RT/RW"
                                            daftarMustahik={daftarMustahik}
                                            selectedId={addForm.data.mustahik_id}
                                            onSelect={(idNum) => addForm.setData('mustahik_id', idNum)}
                                            excludeIds={detailMustahik.map((d) => d.mustahik_id)}
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="nominal_tambah">Nominal Uang (Rp)</Label>
                                                <Input
                                                    id="nominal_tambah"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    placeholder="0"
                                                    value={addForm.data.nominal}
                                                    onChange={(e) => addForm.setData('nominal', e.target.value)}
                                                    className="tabular-nums font-semibold"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="beras_tambah">Beras (Kg)</Label>
                                                <Input
                                                    id="beras_tambah"
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0"
                                                    value={addForm.data.beras_kg}
                                                    onChange={(e) => addForm.setData('beras_kg', e.target.value)}
                                                    className="tabular-nums font-semibold"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={addForm.processing || !isOnline}
                                        >
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                            <span>
                                                {addForm.processing
                                                    ? 'Menambahkan Penerima...'
                                                    : 'Tambahkan Mustahik ke BKK'}
                                            </span>
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    <section className="lg:col-span-7">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            Daftar Penerima Manfaat Mustahik dalam BKK ({detailMustahik.length} KK)
                                        </CardTitle>
                                    </div>
                                    {isDraft && hasUnsavedTableChanges && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSimpanPerubahanTabel}
                                            disabled={processingAction || !isOnline}
                                        >
                                            <Save className="h-3.5 w-3.5" aria-hidden="true" />
                                            <span>Simpan Perubahan Nilai Tabel</span>
                                        </Button>
                                    )}
                                </div>
                                <CardDescription>
                                    {isDraft
                                        ? 'Status BKK masih Draft: Anda dapat mengubah langsung nominal uang/beras pada baris tabel di bawah ini dan total keterangan BKK akan langsung menyesuaikan.'
                                        : 'Daftar penerima manfaat yang tercantum dalam dokumen BKK ini, dikelompokkan berdasarkan indeks wilayah RT/RW.'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {detailMustahik.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada rincian penerima mustahik pada BKK ini.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Indeks Wilayah per Ketua RT / RW */}
                                        {liveTotals.rekapRtRw.length > 0 && (
                                            <div className="rounded-xl border bg-muted/25 p-3 space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                                                        <span>Indeks Wilayah Ketua RT / RW pada BKK Ini:</span>
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={rtRwFilterDetail === 'SEMUA' ? 'default' : 'outline'}
                                                        onClick={() => setRtRwFilterDetail('SEMUA')}
                                                        className="h-7 px-2.5 text-xs"
                                                    >
                                                        Semua RT/RW ({detailMustahik.length} KK)
                                                    </Button>
                                                    {liveTotals.rekapRtRw.map((rt) => (
                                                        <Button
                                                            key={rt.wilayah}
                                                            type="button"
                                                            size="sm"
                                                            variant={
                                                                rtRwFilterDetail === rt.wilayah ? 'default' : 'outline'
                                                            }
                                                            onClick={() => setRtRwFilterDetail(rt.wilayah)}
                                                            className="h-7 px-2.5 text-xs tabular-nums"
                                                        >
                                                            {rt.wilayah} ({rt.kk} KK • {formatRupiah(rt.uang)})
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="relative max-w-md">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                type="search"
                                                placeholder="Cari nama kepala keluarga, NIK, atau RT/RW penerima di BKK ini..."
                                                value={cariPenerimaDetail}
                                                onChange={(e) => setCariPenerimaDetail(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>

                                        <div className="hidden md:block max-h-[540px] overflow-y-auto rounded-lg border">
                                            <Table>
                                                <TableHeader className="sticky top-0 z-10 bg-card shadow-2xs">
                                                    <TableRow>
                                                        <TableHead>No</TableHead>
                                                        <TableHead>Nama Kepala Keluarga &amp; RT/RW</TableHead>
                                                        <TableHead>Asnaf &amp; Kelayakan</TableHead>
                                                        <TableHead className="text-right w-40">Uang Diterima (Rp)</TableHead>
                                                        <TableHead className="text-right w-32">Beras (Kg)</TableHead>
                                                        <TableHead className="text-right">
                                                            {isDraft ? 'Aksi' : 'Serah Terima'}
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {detailMustahik.map((item, idx) => {
                                                        const rt = (item.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
                                                        if (rtRwFilterDetail !== 'SEMUA' && rt !== rtRwFilterDetail) {
                                                            return null;
                                                        }

                                                        const qDetail = cariPenerimaDetail.trim().toLowerCase();
                                                        if (
                                                            qDetail !== '' &&
                                                            !item.nama_mustahik.toLowerCase().includes(qDetail) &&
                                                            !item.nik_mustahik.toLowerCase().includes(qDetail) &&
                                                            !(item.alamat_rt_rw ?? '').toLowerCase().includes(qDetail)
                                                        ) {
                                                            return null;
                                                        }

                                                        const layak =
                                                            Number(item.is_layak_syariat) === 1 ||
                                                            item.is_layak_syariat === true;
                                                        const edited = editableRows[item.id];

                                                        return (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="tabular-nums">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <p className="font-semibold text-sm">
                                                                        {item.nama_mustahik}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                                            <MapPin className="mr-1 h-2.5 w-2.5 text-primary" aria-hidden="true" />
                                                                            {rt}
                                                                        </Badge>
                                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                                            NIK: {item.nik_mustahik}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        <Badge variant="outline">
                                                                            {item.kode_asnaf} - {item.nama_asnaf}
                                                                        </Badge>
                                                                        {layak ? (
                                                                            <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                                                                <CheckCircle2
                                                                                    className="mr-1 h-3 w-3"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                Layak
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center text-[11px] font-medium text-rose-700 dark:text-rose-400">
                                                                                <XCircle
                                                                                    className="mr-1 h-3 w-3"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                {item.status_verifikasi}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {isDraft ? (
                                                                        <Input
                                                                            type="number"
                                                                            inputMode="numeric"
                                                                            min="0"
                                                                            placeholder="0"
                                                                            value={edited?.nominal_diterima ?? ''}
                                                                            onChange={(e) =>
                                                                                handleEditRowChange(
                                                                                    item.id,
                                                                                    'nominal_diterima',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="h-9 text-right font-semibold tabular-nums"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-semibold tabular-nums">
                                                                            {formatRupiah(item.nominal_diterima)}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {isDraft ? (
                                                                        <Input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            step="0.01"
                                                                            min="0"
                                                                            placeholder="0"
                                                                            value={edited?.beras_diterima_kg ?? ''}
                                                                            onChange={(e) =>
                                                                                handleEditRowChange(
                                                                                    item.id,
                                                                                    'beras_diterima_kg',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="h-9 text-right font-semibold tabular-nums"
                                                                        />
                                                                    ) : (
                                                                        <span className="font-semibold tabular-nums">
                                                                            {formatBerasKg(item.beras_diterima_kg)}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {isDraft ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            disabled={
                                                                                detailMustahik.length <= 1 ||
                                                                                processingAction ||
                                                                                !isOnline
                                                                            }
                                                                            title={
                                                                                detailMustahik.length <= 1
                                                                                    ? 'Minimal 1 penerima wajib ada'
                                                                                    : `Hapus ${item.nama_mustahik}`
                                                                            }
                                                                            onClick={() => handleHapusBarisMustahik(item.id)}
                                                                            className="text-destructive hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                        </Button>
                                                                    ) : (
                                                                        <Badge
                                                                            variant={
                                                                                item.status_serah_terima === 'Sudah'
                                                                                    ? 'success'
                                                                                    : 'secondary'
                                                                            }
                                                                        >
                                                                            {item.status_serah_terima}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="font-bold">
                                                            Total BKK Tersinkronisasi ({detailMustahik.length} KK)
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(liveTotals.tabelUang)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatBerasKg(liveTotals.tabelBeras)}
                                                        </TableCell>
                                                        <TableCell />
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {detailMustahik.map((item, idx) => {
                                                const edited = editableRows[item.id];
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="rounded-lg border bg-card p-4 space-y-2"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-mono text-xs text-muted-foreground">
                                                                    #{idx + 1} • {item.alamat_rt_rw || 'RT/RW -'}
                                                                </p>
                                                                <p className="text-sm font-bold">{item.nama_mustahik}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {item.kode_asnaf} ({item.nama_asnaf})
                                                                </p>
                                                            </div>
                                                            <Badge
                                                                variant={
                                                                    item.status_serah_terima === 'Sudah'
                                                                        ? 'success'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                Serah: {item.status_serah_terima}
                                                            </Badge>
                                                        </div>

                                                        {isDraft ? (
                                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                                <div>
                                                                    <Label className="text-[11px]">Uang (Rp)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        min="0"
                                                                        placeholder="0"
                                                                        value={edited?.nominal_diterima ?? ''}
                                                                        onChange={(e) =>
                                                                            handleEditRowChange(
                                                                                item.id,
                                                                                'nominal_diterima',
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="h-9 tabular-nums"
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
                                                                        value={edited?.beras_diterima_kg ?? ''}
                                                                        onChange={(e) =>
                                                                            handleEditRowChange(
                                                                                item.id,
                                                                                'beras_diterima_kg',
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="h-9 tabular-nums"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                                                                <span>Diterima:</span>
                                                                <span className="font-bold tabular-nums">
                                                                    {formatRupiah(item.nominal_diterima)} /{' '}
                                                                    {formatBerasKg(item.beras_diterima_kg)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>

            {/* Dialog Konfirmasi Persetujuan (ACC) BKK oleh Ketua DKM */}
            <Dialog open={accConfirmOpen} onOpenChange={setAccConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Persetujuan (ACC) BKK {bkk.no_bkk}</DialogTitle>
                        <DialogDescription>
                            Pastikan nilai di tabel penerima dan keterangan BKK di bawah ini sudah sesuai sebelum disetujui.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Jumlah Penerima:</span>
                            <span className="font-bold">{detailMustahik.length} KK</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Uang Disetujui (Live):</span>
                            <span className="font-bold tabular-nums text-primary text-sm">
                                {formatRupiah(liveTotals.tabelUang)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Beras Disetujui (Live):</span>
                            <span className="font-bold tabular-nums text-sm">
                                {formatBerasKg(liveTotals.tabelBeras)}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAccConfirmOpen(false)}
                        >
                            Periksa Kembali
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSetujuiBkk}
                            disabled={processingAction || !isOnline}
                        >
                            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                            <span>{processingAction ? 'Memproses...' : 'Ya, Setujui BKK (ACC)'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Konfirmasi Eksekusi Pencairan Dana */}
            <Dialog open={eksekusiConfirmOpen} onOpenChange={setEksekusiConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Eksekusi Pencairan BKK {bkk.no_bkk}</DialogTitle>
                        <DialogDescription>
                            Pencairan dana akan memotong saldo kantong [{bkk.kode_dana}] {bkk.nama_dana} secara permanen dan memperbarui status serah terima seluruh penerima menjadi Sudah.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border bg-muted/30 p-3.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Saldo Kantong Saat Ini:</span>
                            <span className="font-semibold tabular-nums">
                                {formatRupiah(bkk.saldo_tersedia)} / {formatBerasKg(bkk.saldo_beras_kg)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Dicairkan:</span>
                            <span className="font-bold tabular-nums text-primary">
                                {formatRupiah(bkk.total_disalurkan)} / {formatBerasKg(bkk.total_beras_kg)}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEksekusiConfirmOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleEksekusiPenyaluran}
                            disabled={processingAction || !isOnline}
                        >
                            <Banknote className="h-4 w-4" aria-hidden="true" />
                            <span>
                                {processingAction ? 'Mencairkan...' : 'Ya, Cairkan Dana Sekarang'}
                            </span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Penolakan BKK oleh Ketua DKM */}
            <Dialog open={tolakDialogOpen} onOpenChange={setTolakDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Pengajuan BKK {bkk.no_bkk}</DialogTitle>
                        <DialogDescription>
                            Status BKK akan berubah menjadi <code className="font-mono text-xs">Ditolak</code> (bersifat final). Masukkan alasan penolakan secara jelas.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleTolakBkk} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="catatan_penolakan_input">Catatan Alasan Penolakan (Wajib)</Label>
                            <Input
                                id="catatan_penolakan_input"
                                required
                                minLength={5}
                                placeholder="Contoh: Alokasi anggaran perlu direvisi atau dokumen pendukung belum lengkap"
                                value={tolakForm.data.catatan_penolakan}
                                onChange={(e) => tolakForm.setData('catatan_penolakan', e.target.value)}
                            />
                            {tolakForm.errors.catatan_penolakan && (
                                <p className="text-xs text-destructive">
                                    {tolakForm.errors.catatan_penolakan}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTolakDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={tolakForm.processing || !isOnline}
                            >
                                {tolakForm.processing ? 'Memproses...' : 'Konfirmasi Tolak BKK'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
