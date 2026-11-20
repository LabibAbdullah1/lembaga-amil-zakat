import * as React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, ShieldAlert, XCircle } from 'lucide-react';
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
import { formatBerasKg, formatRupiah } from '@/lib/format';
import type { JenisDana, Mustahik, ProgramPenyaluran } from '@/types';

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

interface PenyaluranCreateProps {
    daftarProgram: ProgramWithDana[];
    daftarDanaOperasional: JenisDana[];
    daftarMustahik: MustahikOption[];
    saranNoBkk: string;
    rdbmsError?: string | null;
}

export default function PenyaluranCreate({
    daftarProgram = [],
    daftarDanaOperasional = [],
    daftarMustahik = [],
    saranNoBkk,
    rdbmsError,
}: PenyaluranCreateProps) {
    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

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

    const defaultProgram = daftarProgram[0] ?? null;
    const defaultMustahik = daftarMustahik[0] ?? null;

    const { data, setData, post, processing, errors } = useForm<{
        no_bkk: string;
        program_id: number;
        jenis_dana_id: number;
        mustahik_id: number;
        nominal: string;
        beras_kg: string;
    }>({
        no_bkk: saranNoBkk,
        program_id: defaultProgram?.id ?? 0,
        jenis_dana_id: defaultProgram ? Number(defaultProgram.jenis_dana_id) : (daftarDanaOperasional[0]?.id ?? 0),
        mustahik_id: defaultMustahik?.id ?? 0,
        nominal: '500000',
        beras_kg: '0',
    });

    const selectedProgram = React.useMemo(
        () => daftarProgram.find((p) => p.id === data.program_id) ?? null,
        [daftarProgram, data.program_id]
    );

    const selectedDana = React.useMemo(
        () => daftarDanaOperasional.find((d) => d.id === data.jenis_dana_id) ?? null,
        [daftarDanaOperasional, data.jenis_dana_id]
    );

    const selectedMustahik = React.useMemo(
        () => daftarMustahik.find((m) => m.id === data.mustahik_id) ?? null,
        [daftarMustahik, data.mustahik_id]
    );

    const handleProgramChange = (programIdStr: string) => {
        const idNum = Number.parseInt(programIdStr, 10);
        const prog = daftarProgram.find((p) => p.id === idNum);
        setData((prev) => ({
            ...prev,
            program_id: idNum,
            jenis_dana_id: prog ? Number(prog.jenis_dana_id) : prev.jenis_dana_id,
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isOnline) return;
        post('/penyaluran');
    };

    const isMustahikLayak =
        selectedMustahik &&
        (Number(selectedMustahik.is_layak_syariat) === 1 || selectedMustahik.is_layak_syariat === true);

    return (
        <AuthenticatedLayout
            title="Buat Pengajuan Bukti Kas Keluar (BKK) Baru"
            subtitle="Dieksekusi melalui CALL sp_buat_pengajuan_penyaluran(p_no_bkk, p_program_id, p_jenis_dana_id, p_pembuat_id, p_mustahik_id, p_nominal, p_beras_kg)"
        >
            <Head title="Buat Pengajuan BKK Baru" />

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

                <div className="grid gap-6 lg:grid-cols-12">
                    <section className="lg:col-span-7">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden="true" />
                                        <CardTitle className="text-base">
                                            Header BKK (Draft) & Penerima Pertama
                                        </CardTitle>
                                    </div>
                                    <Badge variant="outline">sp_buat_pengajuan_penyaluran</Badge>
                                </div>
                                <CardDescription>
                                    Setelah draf BKK terbentuk, Anda akan diarahkan ke halaman detail BKK untuk menambahkan mustahik berikutnya (<code className="font-mono text-xs">sp_tambah_mustahik_bkk</code>).
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
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
                                        <Label htmlFor="program_bkk_select">Pilih Program Penyaluran</Label>
                                        <Select
                                            value={data.program_id ? String(data.program_id) : ''}
                                            onValueChange={handleProgramChange}
                                        >
                                            <SelectTrigger id="program_bkk_select">
                                                <SelectValue placeholder="Pilih program penyaluran" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {daftarProgram.map((prog) => (
                                                    <SelectItem key={prog.id} value={String(prog.id)}>
                                                        [{prog.kode_program}] {prog.nama_program} • Dana: {prog.kode_dana}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="dana_bkk_select">
                                            Kantong Sumber Dana (Diperiksa oleh trg_before_insert_penyaluran_dana)
                                        </Label>
                                        <Select
                                            value={data.jenis_dana_id ? String(data.jenis_dana_id) : ''}
                                            onValueChange={(val) =>
                                                setData('jenis_dana_id', Number.parseInt(val, 10))
                                            }
                                        >
                                            <SelectTrigger id="dana_bkk_select">
                                                <SelectValue placeholder="Pilih kantong sumber dana" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {daftarDanaOperasional.map((dana) => (
                                                    <SelectItem key={dana.id} value={String(dana.id)}>
                                                        [{dana.kode_dana}] {dana.nama_dana} ({dana.kategori_utama.replace('_', ' ')})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">
                                            Catatan: Jika kantong dana yang dipilih berbeda dari kantong dana program, trigger RDBMS akan melempar <code className="font-mono">SQLSTATE 45000</code>.
                                        </p>
                                    </div>

                                    <Separator />

                                    <div className="space-y-1.5">
                                        <Label htmlFor="mustahik_pertama_select">
                                            Pilih Mustahik Penerima Pertama
                                        </Label>
                                        <Select
                                            value={data.mustahik_id ? String(data.mustahik_id) : ''}
                                            onValueChange={(val) =>
                                                setData('mustahik_id', Number.parseInt(val, 10))
                                            }
                                        >
                                            <SelectTrigger id="mustahik_pertama_select">
                                                <SelectValue placeholder="Pilih mustahik penerima" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {daftarMustahik.map((m) => {
                                                    const layak =
                                                        Number(m.is_layak_syariat) === 1 ||
                                                        m.is_layak_syariat === true;
                                                    return (
                                                        <SelectItem key={m.id} value={String(m.id)}>
                                                            [{m.kode_asnaf}] {m.nama_lengkap} ({m.nik}) •{' '}
                                                            {layak ? 'Layak (1)' : `${m.status_verifikasi} (0)`}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="nominal_bkk">Nominal Uang Diterima (Rp)</Label>
                                            <Input
                                                id="nominal_bkk"
                                                type="number"
                                                inputMode="numeric"
                                                min="0"
                                                required
                                                value={data.nominal}
                                                onChange={(e) => setData('nominal', e.target.value)}
                                                className="tabular-nums font-semibold"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="beras_bkk">Beras Diterima (Kg)</Label>
                                            <Input
                                                id="beras_bkk"
                                                type="number"
                                                inputMode="decimal"
                                                step="0.01"
                                                min="0"
                                                required
                                                value={data.beras_kg}
                                                onChange={(e) => setData('beras_kg', e.target.value)}
                                                className="tabular-nums font-semibold"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={processing || !isOnline || daftarProgram.length === 0}
                                    >
                                        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                                        <span>
                                            {!isOnline
                                                ? 'Perangkat Offline (Pengajuan Dikunci)'
                                                : processing
                                                  ? 'Menjalankan sp_buat_pengajuan_penyaluran...'
                                                  : 'Simpan Draf BKK & Penerima Pertama'}
                                        </span>
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </section>

                    <aside className="lg:col-span-5 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Pratinjau Kontrak Validasi RDBMS
                                </CardTitle>
                                <CardDescription>
                                    Informasi saldo kantong dana dan status kelayakan mustahik yang dipilih.
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
                                            Posisi Saldo [{selectedDana.kode_dana}] {selectedDana.nama_dana}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <p className="text-muted-foreground">Saldo Uang</p>
                                                <p className="text-sm font-bold tabular-nums">
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

                                {selectedMustahik && (
                                    <div className="rounded-lg border p-3.5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold">{selectedMustahik.nama_lengkap}</span>
                                            <Badge variant="outline">{selectedMustahik.kode_asnaf}</Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">fn_cek_kelayakan_mustahik:</span>
                                            {isMustahikLayak ? (
                                                <Badge variant="success">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                                                    Layak (1)
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                                                    Tidak Layak / Kedaluwarsa (0)
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
