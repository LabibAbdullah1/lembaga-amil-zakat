import * as React from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    FileDown,
    Plus,
    Search,
    ShieldCheck,
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
import { formatBerasKg, formatPercentage, formatRupiah, formatTanggalIndonesia } from '@/lib/format';
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
        () => hakAmilPerKategori.find((h) => Number(h.jenis_dana_id) === Number(bkk.jenis_dana_id)) ?? null,
        [hakAmilPerKategori, bkk.jenis_dana_id]
    );

    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [tolakDialogOpen, setTolakDialogOpen] = React.useState<boolean>(false);
    const [processingAction, setProcessingAction] = React.useState<boolean>(false);
    const [cariPenerimaDetail, setCariPenerimaDetail] = React.useState<string>('');

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
        nominal: '300000',
        beras_kg: '0',
    });

    const tolakForm = useForm<{
        catatan_penolakan: string;
    }>({
        catatan_penolakan: '',
    });

    const handleTambahMustahik = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline || !isDraft) return;
        addForm.post(`/penyaluran/${bkk.id}/mustahik`, {
            preserveScroll: true,
        });
    };

    const handleSetujuiBkk = () => {
        if (!isOnline) return;
        setProcessingAction(true);
        router.post(
            `/penyaluran/${bkk.id}/setujui`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setProcessingAction(false),
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
                onFinish: () => setProcessingAction(false),
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
                    <Button asChild variant="outline" size="sm">
                        <Link href="/penyaluran">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span>Kembali ke Daftar BKK</span>
                        </Link>
                    </Button>

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
                                    onClick={handleSetujuiBkk}
                                >
                                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                    <span>Setujui BKK (Disetujui)</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={processingAction || !isOnline}
                                    onClick={() => setTolakDialogOpen(true)}
                                >
                                    <XCircle className="h-4 w-4" aria-hidden="true" />
                                    <span>Tolak BKK (Ditolak)</span>
                                </Button>
                            </>
                        )}

                        {isKetuaOrAdmin && isDisetujui && (
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                disabled={processingAction || !isOnline}
                                onClick={handleEksekusiPenyaluran}
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
                                    <CardTitle className="text-base">Informasi Dokumen BKK</CardTitle>
                                    <Badge variant={getStatusBadgeVariant(bkk.status_persetujuan)}>
                                        {bkk.status_persetujuan}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    Total nilai penyaluran dihitung secara otomatis berdasarkan daftar penerima manfaat di dalam dokumen BKK ini.
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
                                        [{bkk.kode_dana}] {bkk.nama_dana} ({bkk.kategori_utama.replace('_', ' ')})
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
                                    <span className="text-muted-foreground">Total BKK</span>
                                    <span className="col-span-2 font-bold tabular-nums">
                                        {formatRupiah(bkk.total_disalurkan)} / {formatBerasKg(bkk.total_beras_kg)}
                                    </span>
                                </div>
                                {hakAmilKategoriIni && (
                                    <>
                                        <Separator />
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <span className="text-muted-foreground">
                                                Hak Amil [{hakAmilKategoriIni.kode_dana}]
                                            </span>
                                            <div className="col-span-2 flex flex-wrap items-center gap-1.5 tabular-nums">
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
                                                <span className="text-[11px] text-muted-foreground">
                                                    (Sisa Kuota: {formatRupiah(hakAmilKategoriIni.sisa_kuota_rupiah)})
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
                                        <Badge variant="outline">Multi-Mustahik</Badge>
                                    </div>
                                    <CardDescription>
                                        Tambahkan penerima manfaat lain ke dalam dokumen BKK ini sebelum diajukan untuk persetujuan Ketua DKM.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleTambahMustahik} className="space-y-4">
                                        <MustahikSearchPicker
                                            id="cari_nama_kk_show_bkk"
                                            label="Cari & Ketik Nama Kepala Keluarga (KK), NIK, atau RT/RW"
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
                                                    required
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
                                                    required
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
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                                    <CardTitle className="text-base">
                                        Daftar Penerima Manfaat Mustahik dalam BKK ({detailMustahik.length} orang)
                                    </CardTitle>
                                </div>
                                <CardDescription>
                                    Status serah terima otomatis diperbarui menjadi Sudah setelah BKK dicairkan oleh Ketua DKM.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                {detailMustahik.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                                        Belum ada rincian penerima mustahik pada BKK ini.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="relative max-w-md">
                                            <Search
                                                className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                type="search"
                                                placeholder="Cari nama kepala keluarga atau NIK penerima di BKK ini..."
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
                                                        <TableHead>Nama Kepala Keluarga (Mustahik) & NIK</TableHead>
                                                        <TableHead>Asnaf & Kelayakan</TableHead>
                                                        <TableHead className="text-right">Uang Diterima</TableHead>
                                                        <TableHead className="text-right">Beras (Kg)</TableHead>
                                                        <TableHead>Serah Terima</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {detailMustahik.map((item, idx) => {
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

                                                        return (
                                                            <TableRow key={item.id}>
                                                                <TableCell className="tabular-nums">
                                                                    {idx + 1}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <p className="font-semibold text-sm">
                                                                        {item.nama_mustahik}
                                                                    </p>
                                                                    <p className="font-mono text-xs text-muted-foreground">
                                                                        {item.nik_mustahik} • {item.alamat_rt_rw || '-'}
                                                                    </p>
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
                                                                                Layak (1)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center text-[11px] font-medium text-rose-700 dark:text-rose-400">
                                                                                <XCircle
                                                                                    className="mr-1 h-3 w-3"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                {item.status_verifikasi} (0)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold tabular-nums">
                                                                    {formatRupiah(item.nominal_diterima)}
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold tabular-nums">
                                                                    {formatBerasKg(item.beras_diterima_kg)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={
                                                                            item.status_serah_terima === 'Sudah'
                                                                                ? 'success'
                                                                                : 'secondary'
                                                                        }
                                                                    >
                                                                        {item.status_serah_terima}
                                                                    </Badge>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="font-bold">
                                                            Total BKK ({detailMustahik.length} penerima)
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatRupiah(bkk.total_disalurkan)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold tabular-nums text-primary">
                                                            {formatBerasKg(bkk.total_beras_kg)}
                                                        </TableCell>
                                                        <TableCell />
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>

                                        <div className="grid gap-3 md:hidden">
                                            {detailMustahik.map((item, idx) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-lg border bg-card p-4 space-y-2"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                #{idx + 1} • NIK: {item.nik_mustahik}
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

                                                    <div className="flex items-center justify-between rounded bg-muted/40 p-2 text-xs">
                                                        <span>Diterima:</span>
                                                        <span className="font-bold tabular-nums">
                                                            {formatRupiah(item.nominal_diterima)} /{' '}
                                                            {formatBerasKg(item.beras_diterima_kg)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>

            {/* Dialog Penolakan BKK oleh Ketua DKM */}
            <Dialog open={tolakDialogOpen} onOpenChange={setTolakDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak Pengajuan BKK {bkk.no_bkk}</DialogTitle>
                        <DialogDescription>
                            Status BKK akan berubah menjadi <code className="font-mono text-xs">Ditolak</code> (bersifat final / immutable di RDBMS). Masukkan alasan penolakan secara jelas.
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
