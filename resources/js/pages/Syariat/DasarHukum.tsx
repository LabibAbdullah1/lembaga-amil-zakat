import * as React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    Landmark,
    Scale,
    ShieldCheck,
    Users,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatBerasKg, formatPercentage, formatRupiah } from '@/lib/format';
import type { KategoriAsnaf, SharedProps } from '@/types';

interface DasarHukumProps {
    daftarAsnaf: KategoriAsnaf[];
}

const PASAL_SYARIAT = [
    {
        kode: 'QS. At-Taubah (9): 60',
        judul: 'Penetapan 8 Golongan Penerima Zakat (Asnaf)',
        ringkasan:
            'Zakat hanya diperuntukkan bagi delapan golongan: Fakir, Miskin, Amil (pengurus zakat), Mualaf, Riqab (memerdekakan hamba sahaya), Gharimin (orang terlilit utang untuk kebutuhan pokok), Fisabilillah (pejuang di jalan Allah), dan Ibnu Sabil (musafir kehabisan bekal).',
        implementasi:
            'Penyaluran zakat di aplikasi wajib memilih mustahik yang tergolong dalam 8 Asnaf dan telah lulus verifikasi kelayakan lapangan (masa berlaku maksimal 365 hari).',
    },
    {
        kode: 'QS. At-Taubah (9): 103',
        judul: 'Kewenangan Amil dalam Menghimpun & Mengelola Zakat',
        ringkasan:
            'Ambilah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan dan menyucikan mereka, serta berdoalah untuk mereka.',
        implementasi:
            'Setiap transaksi setoran muzaki dicatat resmi dengan kwitansi bernomor urut dan diawasi melalui jejak audit yang tidak dapat dihapus.',
    },
    {
        kode: 'HR. Bukhari & Muslim',
        judul: 'Kewajiban & Takaran Zakat Fitrah (1 Sha\')',
        ringkasan:
            'Rasulullah SAW mewajibkan zakat fitrah sebesar satu sha\' kurma atau gandum (setara ± 2,5 kg beras makanan pokok) atas setiap jiwa Muslim, merdeka maupun hamba, laki-laki maupun perempuan, kecil maupun dewasa.',
        implementasi:
            'Modul Muzaki menghitung otomatis jumlah jiwa keluarga (`fn_hitung_jiwa_muzaki`) dan mengalikannya dengan takaran beras atau nominal fitrah pada Periode Ramadhan aktif.',
    },
    {
        kode: 'HR. Abu Dawud & Ibnu Majah',
        judul: 'Batas Waktu Penyaluran Zakat Fitrah Sebelum Shalat Idul Fitri',
        ringkasan:
            'Barang siapa menunaikan zakat fitrah sebelum shalat Id maka itu adalah zakat yang diterima, dan barang siapa menunaikannya setelah shalat Id maka itu hanya dianggap sedekah biasa.',
        implementasi:
            'Periode Ramadhan aktif dikunci oleh sistem dan TIDAK BOLEH dinonaktifkan sebelum saldo Dana Zakat Fitrah Ramadhan (ZKT-FTR) habis disalurkan seluruhnya (Rp 0 dan 0,00 Kg) sebelum Hari Raya Idul Fitri.',
    },
];

const PASAL_REGULASI = [
    {
        kode: 'UU No. 23 Tahun 2011',
        judul: 'Pasal 1, 2, 3, 25 & 26 tentang Pengelolaan Zakat',
        isi: 'Pengelolaan zakat berasaskan syariat Islam, amanah, kemanfaatan, keadilan, kepastian hukum, terintegrasi, dan akuntabilitas. Pasal 25 menegaskan bahwa zakat wajib didistribusikan kepada mustahik sesuai dengan syariat Islam berdasarkan skala prioritas dengan memperhatikan prinsip pemerataan, keadilan, dan kewilayahan (RT/RW).',
    },
    {
        kode: 'Fatwa MUI No. 8 Tahun 2011 & PMA No. 52 Tahun 2014',
        judul: 'Ketentuan Bagian Amil Maksimal 12,5% (1/8 Bagian) & Keadilan 8 Asnaf',
        isi: 'Bagian Amil (ASN-03) dari dana zakat dibatasi paling tinggi sebesar 1/8 atau 12,50% dari total dana zakat yang terhimpun pada masing-masing kategori zakat (Zakat Fitrah, Zakat Profesi, Zakat Perniagaan). Sebaliknya, 7 Asnaf lainnya maksimal menggunakan 87,50% (7/8 bagian) agar hak Amil tetap terlindungi dan tidak habis terpakai.',
    },
    {
        kode: 'SK Ketua BAZNAS RI No. 15 Tahun 2026 & Fatwa MUI No. 3/2003',
        judul: 'Nisab Zakat Penghasilan (Profesi) & Zakat Perniagaan Sepanjang Tahun',
        isi: 'Zakat Mal (Zakat Profesi dan Zakat Perniagaan) dikenakan tarif 2,5% apabila telah mencapai nisab setara 85 gram emas. Berdasarkan SK Ketua BAZNAS RI Nomor 15 Tahun 2026, nilai nisab zakat penghasilan yang berlaku adalah Rp91.681.728 per tahun atau Rp7.640.144 per bulan. Pengelolaan dan saldo Zakat Mal berlaku sepanjang tahun secara berkelanjutan (lintas periode) dan tidak hangus saat pergantian Periode Ramadhan.',
    },
];

function DasarHukumBody({ daftarAsnaf }: DasarHukumProps) {
    const { hakAmilPerKategori = [] } = usePage<SharedProps>().props;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-lg">
                                Landasan Al-Qur&apos;an &amp; Hadits tentang Zakat
                            </CardTitle>
                        </div>
                        <Badge variant="success">Pedoman Syariat Islam</Badge>
                    </div>
                    <CardDescription>
                        Seluruh alur penghimpunan, verifikasi mustahik, batas waktu Zakat Fitrah, dan pembagian 8 Asnaf dalam aplikasi ini merujuk langsung pada dalil syariat di bawah ini.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {PASAL_SYARIAT.map((item) => (
                        <div key={item.kode} className="rounded-xl border bg-card p-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="font-semibold">
                                    {item.kode}
                                </Badge>
                            </div>
                            <h3 className="text-sm font-bold text-foreground">{item.judul}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.ringkasan}</p>
                            <div className="rounded-lg bg-accent/40 p-2.5 text-[11px] text-accent-foreground">
                                <strong>Penerapan di Sistem:</strong> {item.implementasi}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-lg">
                                Regulasi Nasional (UU Zakat, PP, PMA &amp; Fatwa MUI)
                            </CardTitle>
                        </div>
                        <Badge variant="outline">Pasal &amp; Ketentuan Resmi</Badge>
                    </div>
                    <CardDescription>
                        Aturan pembagian hak amil maksimal 12,50% per kategori zakat, perlindungan porsi 7/8 asnaf lainnya, serta pemisahan Zakat Fitrah dan Zakat Mal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {PASAL_REGULASI.map((reg) => (
                        <div key={reg.kode} className="rounded-xl border bg-muted/20 p-4 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success">{reg.kode}</Badge>
                                <h3 className="text-sm font-bold text-foreground">{reg.judul}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{reg.isi}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-12">
                <Card className="lg:col-span-6">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-base">
                                Perlindungan Porsi 8 Asnaf &amp; Hak Amil 12,5% per Kategori Zakat
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Pemantauan real-time batas maksimal 12,50% (1/8) untuk Amil dan batas aman 87,50% (7/8) untuk 7 Asnaf Non-Amil agar pembagian dana adil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="rounded-lg border bg-accent/30 p-3 space-y-1.5">
                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                                <span>Pemisahan Periode Zakat Fitrah vs Zakat Mal</span>
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                <li>
                                    <strong>Zakat Fitrah (ZKT-FTR):</strong> Terikat Periode Ramadhan. Periode aktif tidak dapat dinonaktifkan sebelum saldo Zakat Fitrah habis disalurkan sebelum Idul Fitri.
                                </li>
                                <li>
                                    <strong>Zakat Profesi (ZKT-PRF) &amp; Zakat Perniagaan (ZKT-PRN):</strong> Tidak terikat periode Ramadhan, berlaku sepanjang tahun, dan saldonya tetap terjaga lintas periode.
                                </li>
                            </ul>
                        </div>

                        {hakAmilPerKategori.length > 0 && (
                            <div className="space-y-2.5">
                                {hakAmilPerKategori.map((kat) => (
                                    <div key={kat.jenis_dana_id} className="rounded-lg border p-3 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold">
                                                [{kat.kode_dana}] {kat.nama_dana}
                                            </span>
                                            <Badge variant="outline" className="tabular-nums">
                                                Amil: {formatPercentage(kat.persentase_amil)} / 12,50%
                                            </Badge>
                                        </div>
                                        <Separator />
                                        <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                                            <div>
                                                <span className="text-muted-foreground block">
                                                    Cadangan Hak Amil (12,5%):
                                                </span>
                                                <span className="font-semibold text-primary">
                                                    {formatRupiah(kat.sisa_kuota_amil_uang ?? 0)} /{' '}
                                                    {formatBerasKg(kat.sisa_kuota_amil_beras ?? 0)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block">
                                                    Kuota Aman 7 Asnaf (87,5%):
                                                </span>
                                                <span className="font-semibold">
                                                    {formatRupiah(kat.sisa_kuota_non_amil_uang ?? 0)} /{' '}
                                                    {formatBerasKg(kat.sisa_kuota_non_amil_beras ?? 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-6">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
                            <CardTitle className="text-base">
                                Daftar Resmi 8 Golongan Asnaf Penerima Zakat
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Kriteria golongan penerima manfaat sesuai QS. At-Taubah Ayat 60 yang tercatat di sistem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        {daftarAsnaf.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-start gap-3 rounded-lg border bg-card p-3 text-xs"
                            >
                                <Badge variant="outline" className="font-mono shrink-0">
                                    {a.kode_asnaf}
                                </Badge>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-foreground flex items-center gap-1.5">
                                        <span>{a.nama_asnaf}</span>
                                        {a.kode_asnaf === 'ASN-03' && (
                                            <Badge variant="success" className="text-[10px]">
                                                Maks 12,50%
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {a.deskripsi || 'Golongan penerima zakat sesuai syariat Islam.'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function DasarHukumPage({ daftarAsnaf = [] }: DasarHukumProps) {
    const { auth } = usePage<SharedProps>().props;
    const isAuthenticated = Boolean(auth?.user);

    if (isAuthenticated) {
        return (
            <AuthenticatedLayout
                title="Dasar Hukum Syariat & Pasal Zakat"
                subtitle="Pedoman Al-Qur'an, Hadits, UU No. 23 Tahun 2011, dan Fatwa MUI tentang pembagian 8 Asnaf serta Hak Amil 12,5%"
            >
                <Head title="Dasar Hukum Syariat & Pasal Zakat" />
                <DasarHukumBody daftarAsnaf={daftarAsnaf} />
            </AuthenticatedLayout>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Dasar Hukum Syariat & Pasal Zakat — SI-LAZ Masjid" />
            <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-xs">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-card shadow-2xs">
                            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-serif text-sm sm:text-base font-medium text-foreground truncate">
                                Dasar Hukum Syariat Zakat
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                                QS. At-Taubah: 60 &amp; UU No. 23/2011
                            </p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle className="h-9 w-9" />
                        <Button asChild variant="outline" size="sm" className="h-9 px-2.5 sm:px-3.5">
                            <Link href="/">
                                <ArrowLeft className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="hidden sm:inline">Transparansi Publik</span>
                                <span className="sm:hidden text-xs">Beranda</span>
                            </Link>
                        </Button>
                        <Button asChild size="sm" className="h-9 px-2.5 sm:px-3.5">
                            <Link href="/login">
                                <CheckCircle2 className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="hidden sm:inline">Masuk Panitia</span>
                                <span className="sm:hidden text-xs">Masuk</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <DasarHukumBody daftarAsnaf={daftarAsnaf} />
            </main>
        </div>
    );
}
