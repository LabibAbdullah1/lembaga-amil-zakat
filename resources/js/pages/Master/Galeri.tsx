import * as React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Calendar,
    Eye,
    EyeOff,
    Filter,
    ImagePlus,
    Images,
    MapPin,
    Pencil,
    Plus,
    Search,
    Trash2,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
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
import { formatTanggalIndonesia } from '@/lib/format';
import type { GaleriKegiatanItem, KategoriGaleri } from '@/types';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedGaleri {
    data: GaleriKegiatanItem[];
    current_page: number;
    last_page: number;
    total: number;
    links: PaginationLink[];
}

interface MasterGaleriProps {
    galeri: PaginatedGaleri;
    filters: {
        kategori: string;
        cari: string;
    };
    rdbmsError?: string | null;
}

const KATEGORI_LABEL: Record<KategoriGaleri, string> = {
    Zakat_Fitrah: 'Zakat Fitrah',
    Zakat_Mal: 'Zakat Mal & Profesi',
    Santunan_Dhuafa: 'Santunan Dhuafa & Yatim',
    Pemberdayaan: 'Pemberdayaan Usaha',
    Tanggap_Bencana: 'Tanggap Bencana',
    Kegiatan_Amil: 'Pelayanan Loket & Amil',
};

const KATEGORI_BADGE: Record<KategoriGaleri, 'success' | 'default' | 'warning' | 'secondary' | 'outline'> = {
    Zakat_Fitrah: 'success',
    Zakat_Mal: 'default',
    Santunan_Dhuafa: 'secondary',
    Pemberdayaan: 'warning',
    Tanggap_Bencana: 'outline',
    Kegiatan_Amil: 'default',
};

export default function MasterGaleri({ galeri, filters }: MasterGaleriProps) {
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);
    const [selectedItem, setSelectedItem] = React.useState<GaleriKegiatanItem | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [cariInput, setCariInput] = React.useState<string>(filters.cari ?? '');
    const [kategoriFilter, setKategoriFilter] = React.useState<string>(filters.kategori ?? 'SEMUA');

    const form = useForm<{
        judul: string;
        kategori: KategoriGaleri;
        deskripsi: string;
        tanggal_kegiatan: string;
        lokasi: string;
        jumlah_penerima: number;
        urutan: number;
        is_tampil: boolean;
        gambar: File | null;
    }>({
        judul: '',
        kategori: 'Zakat_Fitrah',
        deskripsi: '',
        tanggal_kegiatan: new Date().toISOString().split('T')[0],
        lokasi: 'Masjid Istiqamah, Rumbai',
        jumlah_penerima: 0,
        urutan: 0,
        is_tampil: true,
        gambar: null,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/master/galeri',
            { cari: cariInput, kategori: kategoriFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleKategoriChange = (val: string) => {
        setKategoriFilter(val);
        router.get(
            '/master/galeri',
            { cari: cariInput, kategori: val },
            { preserveState: true, replace: true }
        );
    };

    const openTambahDialog = () => {
        setSelectedItem(null);
        setImagePreview(null);
        form.reset();
        form.setData({
            judul: '',
            kategori: 'Zakat_Fitrah',
            deskripsi: '',
            tanggal_kegiatan: new Date().toISOString().split('T')[0],
            lokasi: 'Masjid Istiqamah, Rumbai',
            jumlah_penerima: 0,
            urutan: 0,
            is_tampil: true,
            gambar: null,
        });
        setDialogOpen(true);
    };

    const openEditDialog = (item: GaleriKegiatanItem) => {
        setSelectedItem(item);
        setImagePreview(item.gambar_url);
        form.setData({
            judul: item.judul,
            kategori: item.kategori,
            deskripsi: item.deskripsi ?? '',
            tanggal_kegiatan: typeof item.tanggal_kegiatan === 'string' ? item.tanggal_kegiatan.split('T')[0] : '',
            lokasi: item.lokasi ?? '',
            jumlah_penerima: item.jumlah_penerima ?? 0,
            urutan: item.urutan ?? 0,
            is_tampil: Boolean(item.is_tampil),
            gambar: null,
        });
        setDialogOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('gambar', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItem && !form.data.gambar) {
            toast.error('Wajib memilih berkas foto dokumentasi kegiatan.');
            return;
        }

        if (selectedItem) {
            // Update
            form.post(`/master/galeri/${selectedItem.id}`, {
                forceFormData: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    toast.success('Dokumentasi kegiatan berhasil diperbarui.');
                },
                onError: () => {
                    toast.error('Periksa kembali inputan form.');
                },
            });
        } else {
            // Tambah baru
            form.post('/master/galeri', {
                forceFormData: true,
                onSuccess: () => {
                    setDialogOpen(false);
                    toast.success('Dokumentasi kegiatan berhasil ditambahkan.');
                },
                onError: () => {
                    toast.error('Periksa kembali berkas foto dan form.');
                },
            });
        }
    };

    const handleToggleTampil = (item: GaleriKegiatanItem) => {
        router.patch(
            `/master/galeri/${item.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        item.is_tampil
                            ? 'Dokumentasi disembunyikan dari ruang publik.'
                            : 'Dokumentasi kini ditampilkan di ruang publik.'
                    );
                },
            }
        );
    };

    const handleDelete = () => {
        if (!selectedItem) return;

        router.delete(`/master/galeri/${selectedItem.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteDialogOpen(false);
                setSelectedItem(null);
                toast.success('Dokumentasi kegiatan berhasil dihapus.');
            },
        });
    };

    return (
        <AuthenticatedLayout
            title="Galeri Dokumentasi Penyaluran"
            subtitle="Kelola bukti foto kegiatan nyata, penyaluran sembako, dan santunan untuk transparansi publik"
        >
            <Head title="Kelola Galeri Dokumentasi — Panel Admin" />

            <div className="space-y-6">
                {/* Header Filter & Tombol Tambah */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2 max-w-2xl">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                placeholder="Cari judul, lokasi, atau deskripsi..."
                                value={cariInput}
                                onChange={(e) => setCariInput(e.target.value)}
                                className="pl-9 h-10 border-border bg-card"
                            />
                        </div>
                        <Select value={kategoriFilter} onValueChange={handleKategoriChange}>
                            <SelectTrigger className="w-[180px] h-10 border-border bg-card">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-primary" aria-hidden="true" />
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SEMUA">Semua Kategori</SelectItem>
                                <SelectItem value="Zakat_Fitrah">Zakat Fitrah</SelectItem>
                                <SelectItem value="Zakat_Mal">Zakat Mal &amp; Profesi</SelectItem>
                                <SelectItem value="Santunan_Dhuafa">Santunan Yatim</SelectItem>
                                <SelectItem value="Pemberdayaan">Pemberdayaan</SelectItem>
                                <SelectItem value="Tanggap_Bencana">Tanggap Bencana</SelectItem>
                                <SelectItem value="Kegiatan_Amil">Layanan Amil</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="submit" variant="secondary" size="sm" className="h-10">
                            Cari
                        </Button>
                    </form>

                    <Button onClick={openTambahDialog} size="default" className="h-10 gap-2 shrink-0">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span>Tambah Dokumentasi</span>
                    </Button>
                </div>

                {/* Grid Galeri Foto Admin */}
                {galeri.data.length === 0 ? (
                    <Card className="border-dashed border-2 border-border bg-card/50 text-center py-12">
                        <CardContent className="space-y-3">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Images className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-base font-serif">Belum Ada Dokumentasi Kegiatan</CardTitle>
                            <CardDescription className="max-w-md mx-auto text-xs">
                                Unggah foto penyerahan zakat fitrah, santunan anak yatim, atau pembagian modal usaha agar donatur dan masyarakat semakin yakin dan percaya.
                            </CardDescription>
                            <Button onClick={openTambahDialog} size="sm" className="mt-2">
                                <ImagePlus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                                Upload Foto Pertama
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {galeri.data.map((item) => (
                            <Card
                                key={item.id}
                                className={`overflow-hidden border transition-shadow hover:shadow-md flex flex-col justify-between ${
                                    item.is_tampil ? 'border-border bg-card' : 'border-border/60 bg-muted/20 opacity-80'
                                }`}
                            >
                                <div className="space-y-3">
                                    {/* Gambar Foto dengan Aspect Ratio 16:9 */}
                                    <div className="relative aspect-video w-full overflow-hidden bg-muted border-b border-border">
                                        <img
                                            src={item.gambar_url}
                                            alt={item.judul}
                                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                            loading="lazy"
                                        />
                                        <div className="absolute top-2 left-2">
                                            <Badge variant={KATEGORI_BADGE[item.kategori]}>
                                                {KATEGORI_LABEL[item.kategori]}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <Badge variant={item.is_tampil ? 'success' : 'outline'}>
                                                {item.is_tampil ? 'Tampil Publik' : 'Draf/Sembunyi'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Konten Teks */}
                                    <div className="p-4 pt-1 space-y-2">
                                        <h3 className="font-serif font-medium text-base text-foreground line-clamp-2 leading-snug" title={item.judul}>
                                            {item.judul}
                                        </h3>
                                        {item.deskripsi && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {item.deskripsi}
                                            </p>
                                        )}

                                        <div className="pt-2 border-t border-border/60 space-y-1 text-[11px] text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                                                <span>{formatTanggalIndonesia(item.tanggal_kegiatan)}</span>
                                            </div>
                                            {item.lokasi && (
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <MapPin className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                                                    <span className="truncate">{item.lokasi}</span>
                                                </div>
                                            )}
                                            {Number(item.jumlah_penerima) > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="h-3 w-3 text-primary shrink-0" aria-hidden="true" />
                                                    <span>{item.jumlah_penerima} Penerima Manfaat</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tombol Aksi di Bawah Kartu */}
                                <div className="p-3 pt-0 border-t border-border/50 flex items-center justify-between gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleTampil(item)}
                                        title={item.is_tampil ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}
                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        {item.is_tampil ? (
                                            <>
                                                <EyeOff className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                                                <span>Sembunyikan</span>
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="h-3.5 w-3.5 mr-1 text-primary" aria-hidden="true" />
                                                <span className="text-primary font-medium">Tampilkan</span>
                                            </>
                                        )}
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditDialog(item)}
                                            className="h-8 w-8 p-0"
                                            aria-label="Edit Dokumentasi"
                                        >
                                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setDeleteDialogOpen(true);
                                            }}
                                            className="h-8 w-8 p-0"
                                            aria-label="Hapus Dokumentasi"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog Form Tambah / Edit Dokumentasi */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-lg">
                            {selectedItem ? 'Edit Dokumentasi Kegiatan' : 'Unggah Dokumentasi Kegiatan Baru'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Dokumentasi foto kegiatan nyata yang diunggah akan otomatis ditampilkan pada showcase halaman publik transparansi.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        {/* Judul Kegiatan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="judul" className="text-xs font-medium">
                                Judul Kegiatan Penyaluran / ZIS <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="judul"
                                value={form.data.judul}
                                onChange={(e) => form.setData('judul', e.target.value)}
                                placeholder="Contoh: Distribusi Beras Fitrah 2.850 Kg untuk Warga RW 04"
                                required
                                className="h-9 text-xs"
                            />
                            {form.errors.judul && (
                                <p className="text-[11px] text-destructive">{form.errors.judul}</p>
                            )}
                        </div>

                        {/* Baris Kategori & Tanggal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="kategori" className="text-xs font-medium">
                                    Kategori Kegiatan <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={form.data.kategori}
                                    onValueChange={(val: KategoriGaleri) => form.setData('kategori', val)}
                                >
                                    <SelectTrigger id="kategori" className="h-9 text-xs">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Zakat_Fitrah">Zakat Fitrah</SelectItem>
                                        <SelectItem value="Zakat_Mal">Zakat Mal &amp; Profesi</SelectItem>
                                        <SelectItem value="Santunan_Dhuafa">Santunan Yatim &amp; Dhuafa</SelectItem>
                                        <SelectItem value="Pemberdayaan">Pemberdayaan Modal Usaha</SelectItem>
                                        <SelectItem value="Tanggap_Bencana">Tanggap Darurat / Bencana</SelectItem>
                                        <SelectItem value="Kegiatan_Amil">Pelayanan Loket &amp; Amil</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tanggal_kegiatan" className="text-xs font-medium">
                                    Tanggal Kegiatan <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tanggal_kegiatan"
                                    type="date"
                                    value={form.data.tanggal_kegiatan}
                                    onChange={(e) => form.setData('tanggal_kegiatan', e.target.value)}
                                    required
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Baris Lokasi & Jumlah Penerima */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="lokasi" className="text-xs font-medium">
                                    Lokasi Pelaksanaan
                                </Label>
                                <Input
                                    id="lokasi"
                                    value={form.data.lokasi}
                                    onChange={(e) => form.setData('lokasi', e.target.value)}
                                    placeholder="Contoh: Masjid Istiqamah & RW 02"
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="jumlah_penerima" className="text-xs font-medium">
                                    Estimasi Penerima (Jiwa/KK)
                                </Label>
                                <Input
                                    id="jumlah_penerima"
                                    type="number"
                                    min={0}
                                    value={form.data.jumlah_penerima}
                                    onChange={(e) => form.setData('jumlah_penerima', Number.parseInt(e.target.value, 10) || 0)}
                                    placeholder="Contoh: 150"
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Berkas Foto Unggahan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="gambar" className="text-xs font-medium">
                                Berkas Foto Dokumentasi {!selectedItem && <span className="text-destructive">*</span>}
                            </Label>
                            <input
                                ref={fileInputRef}
                                id="gambar"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Format: JPG, PNG, WEBP, atau SVG. Ukuran maksimal 5MB.
                            </p>
                            {form.errors.gambar && (
                                <p className="text-[11px] text-destructive">{form.errors.gambar}</p>
                            )}

                            {/* Preview Foto */}
                            {imagePreview && (
                                <div className="mt-2 relative aspect-video w-full max-w-sm overflow-hidden rounded border border-border bg-muted">
                                    <img
                                        src={imagePreview}
                                        alt="Preview Unggahan"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Deskripsi Kegiatan */}
                        <div className="space-y-1.5">
                            <Label htmlFor="deskripsi" className="text-xs font-medium">
                                Ringkasan Kegiatan / Catatan Penyaluran
                            </Label>
                            <textarea
                                id="deskripsi"
                                rows={3}
                                value={form.data.deskripsi}
                                onChange={(e) => form.setData('deskripsi', e.target.value)}
                                placeholder="Jelaskan secara ringkas asnaf penerima, barang/uang yang diserahkan, serta respon mustahik..."
                                className="w-full rounded border border-border bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        {/* Opsi Tampil */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="is_tampil"
                                checked={form.data.is_tampil}
                                onChange={(e) => form.setData('is_tampil', e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                            />
                            <Label htmlFor="is_tampil" className="text-xs font-medium cursor-pointer">
                                Tampilkan dokumentasi ini di halaman publik transparansi
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" size="sm" disabled={form.processing}>
                                {form.processing ? 'Menyimpan...' : selectedItem ? 'Perbarui Dokumentasi' : 'Simpan & Publikasikan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Konfirmasi Hapus */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-destructive text-base">
                            Hapus Dokumentasi Kegiatan?
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Apakah Anda yakin ingin menghapus foto kegiatan{' '}
                            <strong>{selectedItem?.judul}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                        >
                            Hapus Sekarang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
