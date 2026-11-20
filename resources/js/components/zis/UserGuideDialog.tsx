import * as React from 'react';
import { BookOpen, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PeranPengguna } from '@/types';

interface GuideSection {
    roleKey: PeranPengguna | 'Publik';
    roleLabel: string;
    summary: string;
    steps: Array<{
        title: string;
        detail: string;
    }>;
    syariatRule: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
    {
        roleKey: 'Publik',
        roleLabel: 'Jamaah & Donatur',
        summary: 'Cara membaca laporan transparansi saldo zakat, penyaluran 8 asnaf, dan menjaga privasi penerima manfaat.',
        steps: [
            {
                title: 'Memantau Posisi Saldo Uang & Beras',
                detail: 'Buka tab Posisi Saldo Dana untuk melihat sisa saldo kas (Rupiah) dan persediaan beras zakat fitrah (Kg) pada setiap kantong dana secara terbuka.',
            },
            {
                title: 'Melihat Distribusi 8 Golongan Asnaf',
                detail: 'Buka tab Penyaluran per 8 Asnaf untuk memeriksa berapa jiwa mustahik yang telah terbantu pada golongan Fakir, Miskin, Amil, Fisabilillah, dan golongan lainnya.',
            },
            {
                title: 'Memeriksa Bukti Penyaluran & Partisipasi Muzaki',
                detail: 'Tab Rincian Penyaluran dan Rekap Partisipasi Muzaki menampilkan bukti kas keluar yang telah diserahterimakan dengan nama serta NIK yang disamarkan demi menjaga kehormatan mustahik dan keikhlasan donatur.',
            },
        ],
        syariatRule: 'Seluruh dana zakat dipisahkan secara ketat dari dana infak/operasional umum dan disalurkan tepat sasaran sesuai ketentuan 8 asnaf.',
    },
    {
        roleKey: 'Amil_Penerima',
        roleLabel: 'Amil Penerima (Kasir Loket)',
        summary: 'Panduan pelayanan cepat loket zakat fitrah, zakat mal, infak, sedekah, serta pencetakan kwitansi resmi.',
        steps: [
            {
                title: '1. Daftarkan Muzaki & Anggota Keluarga (KK)',
                detail: 'Buka menu Data Muzaki & KK, daftarkan NIK 16 digit kepala keluarga, lalu tambahkan rincian anggota keluarga (istri/anak) agar jumlah jiwa zakat fitrah terhitung otomatis.',
            },
            {
                title: '2. Catat Setoran di Loket ZIS & Fitrah',
                detail: 'Pada menu Loket ZIS & Fitrah, pilih nama Muzaki, pilih kantong dana (misal Zakat Fitrah Uang/Beras atau Zakat Mal), pilih metode bayar, lalu klik Simpan Kwitansi Setoran.',
            },
            {
                title: '3. Unduh Kwitansi PDF atau Batalkan (Void) Jika Salah Input',
                detail: 'Klik tombol PDF pada riwayat kwitansi untuk menyerahkan bukti resmi kepada muzaki. Jika terjadi kesalahan nominal, gunakan tombol Void disertai alasan pembatalan yang jelas.',
            },
        ],
        syariatRule: 'Kwitansi yang sudah terbit tidak pernah dihapus dari pembukuan; pembatalan (void) otomatis mengembalikan saldo kantong dana dan terekam di riwayat audit.',
    },
    {
        roleKey: 'Verifikator',
        roleLabel: 'Verifikator Survei',
        summary: 'Panduan pendaftaran calon mustahik dan pencatatan hasil survei kelayakan lapangan.',
        steps: [
            {
                title: '1. Daftarkan Calon Mustahik Baru',
                detail: 'Buka menu Mustahik & Survei, klik Daftarkan Calon Mustahik, lalu lengkapi NIK 16 digit, nama lengkap, golongan 8 asnaf, dan alamat RT/RW.',
            },
            {
                title: '2. Input Hasil Survei Kelayakan Lapangan',
                detail: 'Setelah mengunjungi tempat tinggal calon penerima, klik tombol Input Survei pada baris mustahik, pilih keputusan Layak atau Tidak Layak, dan tuliskan catatan temuan lapangan.',
            },
            {
                title: '3. Pantau Masa Berlaku Verifikasi 365 Hari',
                detail: 'Pastikan mustahik penerima dana zakat memiliki badge Memenuhi Syarat Zakat. Status kelayakan berlaku selama 365 hari sejak tanggal survei terakhir.',
            },
        ],
        syariatRule: 'Dana berkategori Zakat hanya dapat diajukan bagi mustahik yang telah diverifikasi Layak dalam 365 hari terakhir.',
    },
    {
        roleKey: 'Staf_Penyaluran',
        roleLabel: 'Staf Penyaluran (BKK)',
        summary: 'Panduan penyusunan draf Bukti Kas Keluar (BKK) Zakat secara kolektif per kelompok Asnaf (sekali jalan) maupun perorangan.',
        steps: [
            {
                title: '1. Pilih Program & Kantong Dana Zakat',
                detail: 'Buka menu Penyaluran (BKK) lalu klik Buat Pengajuan BKK Baru. Sistem kini fokus murni pada dana Zakat (8 Asnaf) sehingga seluruh program dan kantong dana non-zakat (Infak/Wakaf) telah ditiadakan.',
            },
            {
                title: '2. Gunakan Mode Kolektif per Kelompok Asnaf (Sekali Jalan)',
                detail: 'Pilih golongan Asnaf (misal Fakir atau Miskin), isi nominal uang/beras per orang, lalu klik Masukkan Seluruh Mustahik Kelompok Ini Sekaligus. Seluruh mustahik layak akan dimuat otomatis tanpa harus input satu per satu.',
            },
            {
                title: '3. Simpan Sekaligus & Cetak PDF Tanda Terima',
                detail: 'Periksa ringkasan total pengajuan dan indikator batas Hak Amil (maksimal 12,50%), klik Simpan Pengajuan BKK, lalu cetak PDF BKK untuk paraf serah terima lapangan.',
            },
        ],
        syariatRule: 'Penyaluran Zakat wajib memiliki rincian penerima manfaat (mustahik 8 Asnaf) yang telah diverifikasi Layak dalam 365 hari terakhir.',
    },
    {
        roleKey: 'Ketua_DKM',
        roleLabel: 'Ketua DKM (Penyetuju)',
        summary: 'Panduan peninjauan, persetujuan/penolakan BKK, eksekusi pencairan dana, dan pengawasan laporan.',
        steps: [
            {
                title: '1. Tinjau Draf BKK & Kelayakan Penerima',
                detail: 'Buka menu Penyaluran (BKK) dan pilih dokumen berstatus Draft. Periksa kesesuaian program, ketersediaan saldo kantong dana, dan daftar mustahik penerima.',
            },
            {
                title: '2. Setujui atau Tolak Pengajuan BKK',
                detail: 'Klik Setujui BKK jika pengajuan telah sesuai, atau klik Tolak BKK disertai catatan alasan penolakan apabila perlu direvisi oleh staf.',
            },
            {
                title: '3. Eksekusi Pencairan Dana & Pantau Audit',
                detail: 'Setelah BKK berstatus Disetujui, klik Eksekusi Pencairan Dana (Disalurkan) untuk memotong saldo secara sah. Pantau juga menu Laporan Analitik dan Riwayat Audit.',
            },
        ],
        syariatRule: 'Dilarang melompati tahapan persetujuan (wajib melalui alur Draft -> Disetujui -> Disalurkan). Status Disalurkan dan Ditolak bersifat final.',
    },
    {
        roleKey: 'Admin',
        roleLabel: 'Administrator Sistem',
        summary: 'Panduan pengaturan periode Ramadhan aktif, struktur 3 level kantong dana, program penyaluran, dan akun panitia.',
        steps: [
            {
                title: '1. Kelola Periode Ramadhan Aktif',
                detail: 'Pada menu Periode Ramadhan, tetapkan takaran beras per jiwa (default 2,50 kg) dan nominal zakat fitrah per jiwa, lalu aktifkan tepat satu periode Ramadhan berjalan.',
            },
            {
                title: '2. Kelola Hierarki Jenis Dana & Program Penyaluran',
                detail: 'Atur pohon kantong dana 3 level pada menu Hierarki Jenis Dana, lalu buat program distribusi pada menu Program Penyaluran.',
            },
            {
                title: '3. Kelola Akun Panitia & Pengawasan Menyeluruh',
                detail: 'Buka menu Pengguna Sistem untuk menambah atau menonaktifkan akun panitia sesuai 5 peran tugas, serta awasi Laporan Analitik dan Riwayat Audit.',
            },
        ],
        syariatRule: 'Hanya satu periode Ramadhan yang boleh berstatus aktif pada satu waktu, dan saldo kantong dana tidak boleh diubah manual di luar transaksi resmi.',
    },
];

interface UserGuideDialogProps {
    currentRole?: PeranPengguna | 'Publik';
    triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
    triggerLabel?: string;
}

export function UserGuideDialog({
    currentRole = 'Publik',
    triggerVariant = 'outline',
    triggerLabel = 'Panduan Pengguna',
}: UserGuideDialogProps) {
    const [open, setOpen] = React.useState<boolean>(false);

    const activeSection = React.useMemo(
        () => GUIDE_SECTIONS.find((s) => s.roleKey === currentRole) ?? GUIDE_SECTIONS[0],
        [currentRole]
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant={triggerVariant}
                    size="sm"
                    aria-label="Buka Panduan Pengguna"
                >
                    <HelpCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{triggerLabel}</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-2 pr-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                            <DialogTitle>Panduan Penggunaan Sistem LAZ & Zakat Fitrah</DialogTitle>
                        </div>
                        <Badge variant="success">{activeSection.roleLabel}</Badge>
                    </div>
                    <DialogDescription>
                        Petunjuk langkah demi langkah sesuai peran tugas untuk memastikan pengelolaan dana umat berjalan tertib, cepat, dan sesuai syariat.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={currentRole} className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-1">
                        {GUIDE_SECTIONS.map((sec) => (
                            <TabsTrigger
                                key={sec.roleKey}
                                value={sec.roleKey}
                                className="text-xs px-2.5 py-1.5"
                            >
                                {sec.roleLabel}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {GUIDE_SECTIONS.map((sec) => (
                        <TabsContent
                            key={sec.roleKey}
                            value={sec.roleKey}
                            className="space-y-4 pt-3"
                        >
                            <div className="rounded-lg border bg-accent/40 p-3.5 text-xs">
                                <p className="font-semibold text-accent-foreground">
                                    Fokus Tugas {sec.roleLabel}
                                </p>
                                <p className="mt-0.5 text-muted-foreground">{sec.summary}</p>
                            </div>

                            <div className="space-y-2.5">
                                {sec.steps.map((step) => (
                                    <div
                                        key={step.title}
                                        className="rounded-lg border bg-card p-3.5 space-y-1"
                                    >
                                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <CheckCircle2
                                                className="h-4 w-4 text-primary shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>{step.title}</span>
                                        </div>
                                        <p className="pl-6 text-xs text-muted-foreground leading-relaxed">
                                            {step.detail}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-xs">
                                <ShieldCheck
                                    className="h-4 w-4 text-primary shrink-0 mt-0.5"
                                    aria-hidden="true"
                                />
                                <div>
                                    <span className="font-semibold text-foreground">
                                        Prinsip Kepatuhan & Amanah:{' '}
                                    </span>
                                    <span className="text-muted-foreground">{sec.syariatRule}</span>
                                </div>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>

                <DialogFooter>
                    <Button type="button" onClick={() => setOpen(false)}>
                        Saya Mengerti
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
