import * as React from 'react';
import { BookOpen, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PeranPengguna } from '@/types';

interface RoleQuickTip {
    badgeLabel: string;
    headline: string;
    bullets: string[];
    caution: string;
}

const ROLE_QUICK_TIPS: Record<PeranPengguna, RoleQuickTip> = {
    Admin: {
        badgeLabel: 'Panduan Administrator',
        headline: 'Pengaturan Master Data & Pengawasan Sistem',
        bullets: [
            'Pastikan hanya 1 Periode Ramadhan yang berstatus Aktif agar perhitungan zakat fitrah dan batas hak amil berjalan akurat.',
            'Kelola pohon kantong dana 3 level pada menu Hierarki Jenis Dana (saldo uang & beras otomatis mengikuti transaksi).',
            'Atur akun panitia sesuai 5 peran tugas dan pantau Laporan Analitik serta Riwayat Audit.',
        ],
        caution: 'Saldo kantong dana tidak boleh diubah secara manual di luar transaksi penerimaan dan penyaluran resmi.',
    },
    Amil_Penerima: {
        badgeLabel: 'Panduan Kasir Loket Zakat',
        headline: 'Pelayanan Cepat Penerimaan Zakat Fitrah & Zakat Mal',
        bullets: [
            'Pilih atau daftarkan Muzaki beserta anggota keluarga (KK) terlebih dahulu agar jumlah jiwa terisi otomatis.',
            'Pilih kantong dana Zakat (Fitrah, Profesi, atau Perniagaan) dan metode pembayaran, lalu simpan kwitansi.',
            'Unduh PDF Kwitansi sebagai tanda terima sah. Gunakan tombol Batalkan (Void) disertai alasan jika terjadi salah input.',
        ],
        caution: 'Kwitansi yang sudah terbit tidak dihapus fisik; pembatalan (void) otomatis mengembalikan saldo kantong dana.',
    },
    Verifikator: {
        badgeLabel: 'Panduan Tim Survei Lapangan',
        headline: 'Pendaftaran Calon Mustahik & Verifikasi Kelayakan 8 Asnaf',
        bullets: [
            'Daftarkan calon penerima manfaat baru dengan NIK 16 digit dan golongan asnaf yang sesuai (status awal: Menunggu).',
            'Klik tombol Input Survei setelah peninjauan lapangan untuk menetapkan status Layak atau Tidak Layak.',
            'Tuliskan catatan temuan survei secara spesifik sebagai dasar pertimbangan penyaluran dana.',
        ],
        caution: 'Status kelayakan mustahik berlaku selama 365 hari sejak tanggal survei terakhir.',
    },
    Staf_Penyaluran: {
        badgeLabel: 'Panduan Staf Penyaluran',
        headline: 'Penyusunan Bukti Kas Keluar (BKK) Zakat: Kolektif per Kelompok Asnaf & Perorangan',
        bullets: [
            'Gunakan tab Kolektif per Kelompok Asnaf (Sekali Jalan) saat membuat BKK untuk memuat seluruh mustahik layak sekaligus tanpa input satu per satu.',
            'Anda juga dapat menyesuaikan nominal per baris atau menggunakan tab Pilih Perorangan jika penyaluran hanya untuk mustahik tertentu.',
            'Perhatikan indikator Persentase Hak Amil (maksimal 12,50%) sebelum mengalokasikan dana untuk bagian Amil (ASN-03).',
        ],
        caution: 'Sistem dikhususkan murni untuk Zakat (8 Asnaf). Penerima wajib berstatus Layak (<= 365 hari) dan tidak duplikat dalam 1 BKK.',
    },
    Ketua_DKM: {
        badgeLabel: 'Panduan Ketua DKM',
        headline: 'Persetujuan BKK, Eksekusi Pencairan Dana, & Pengawasan',
        bullets: [
            'Tinjau pengajuan BKK berstatus Draft, lalu klik Setujui BKK atau Tolak BKK disertai catatan alasan penolakan.',
            'Setelah BKK berstatus Disetujui, klik Eksekusi Pencairan Dana (Disalurkan) untuk memotong saldo kantong dana secara sah.',
            'Gunakan menu Laporan Analitik dan Riwayat Audit untuk mengawasi pertumbuhan penghimpunan serta porsi 8 asnaf.',
        ],
        caution: 'Alur persetujuan wajib berurutan (Draft -> Disetujui -> Disalurkan) dan tidak dapat dilompati.',
    },
};

interface RoleGuideBannerProps {
    role?: PeranPengguna;
    moduleHint?: string;
}

export function RoleGuideBanner({ role = 'Admin', moduleHint }: RoleGuideBannerProps) {
    const [expanded, setExpanded] = React.useState<boolean>(false);
    const tip = ROLE_QUICK_TIPS[role] ?? ROLE_QUICK_TIPS.Admin;

    return (
        <div className="rounded-xl border bg-card p-4 shadow-2xs transition-all laz-stagger-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                                {tip.headline}
                            </span>
                            <Badge variant="success">{tip.badgeLabel}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {moduleHint ?? tip.caution}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-expanded={expanded}
                        onClick={() => setExpanded((prev) => !prev)}
                    >
                        <span>{expanded ? 'Tutup Langkah' : 'Lihat Langkah Kerja'}</span>
                        {expanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="mt-3.5 border-t pt-3.5 space-y-2.5 laz-page-enter">
                    <div className="grid gap-2.5 md:grid-cols-3">
                        {tip.bullets.map((item) => (
                            <div
                                key={item}
                                className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed"
                            >
                                <CheckCircle2
                                    className="h-4 w-4 text-primary shrink-0 mt-0.5"
                                    aria-hidden="true"
                                />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                        <span>
                            <strong>Ketentuan Amanah & Syariat:</strong> {tip.caution}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
