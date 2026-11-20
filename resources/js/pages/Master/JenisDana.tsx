import * as React from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Edit3, FolderTree, Lock, Plus } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatBerasKg, formatRupiah } from '@/lib/format';
import type { JenisDana, KategoriUtamaDana } from '@/types';

interface JenisDanaRow extends JenisDana {
    nama_induk?: string | null;
    jumlah_sub_dana?: number;
}

interface TreeJenisDanaRow extends JenisDanaRow {
    level: number;
}

interface MasterJenisDanaProps {
    daftarDana: JenisDanaRow[];
    rdbmsError?: string | null;
}

export default function MasterJenisDana({
    daftarDana = [],
    rdbmsError,
}: MasterJenisDanaProps) {
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [editingDana, setEditingDana] = React.useState<JenisDanaRow | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        parent_id: number | null;
        kode_dana: string;
        nama_dana: string;
        kategori_utama: KategoriUtamaDana;
        is_terikat: boolean;
    }>({
        parent_id: null,
        kode_dana: '',
        nama_dana: '',
        kategori_utama: 'Zakat',
        is_terikat: true,
    });

    // Susun struktur pohon hierarki 3 level dari parent_id
    const pohonHierarki = React.useMemo<TreeJenisDanaRow[]>(() => {
        const mapByParent = new Map<number | null, JenisDanaRow[]>();
        for (const item of daftarDana) {
            const parentKey = item.parent_id ? Number(item.parent_id) : null;
            const list = mapByParent.get(parentKey) ?? [];
            list.push(item);
            mapByParent.set(parentKey, list);
        }

        const result: TreeJenisDanaRow[] = [];
        const visited = new Set<number>();

        const traverse = (parentId: number | null, level: number) => {
            const children = mapByParent.get(parentId) ?? [];
            for (const child of children) {
                if (visited.has(child.id)) continue;
                visited.add(child.id);
                result.push({ ...child, level });
                traverse(child.id, Math.min(3, level + 1));
            }
        };

        traverse(null, 1);

        // Tambahkan baris yatim bila ada filter/urutan khusus
        for (const item of daftarDana) {
            if (!visited.has(item.id)) {
                result.push({ ...item, level: 1 });
            }
        }

        return result;
    }, [daftarDana]);

    const openCreateModal = () => {
        setEditingDana(null);
        reset();
        setDialogOpen(true);
    };

    const openEditModal = (dana: JenisDanaRow) => {
        setEditingDana(dana);
        setData({
            parent_id: dana.parent_id ? Number(dana.parent_id) : null,
            kode_dana: dana.kode_dana,
            nama_dana: dana.nama_dana,
            kategori_utama: dana.kategori_utama,
            is_terikat: Number(dana.is_terikat) === 1 || dana.is_terikat === true,
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (editingDana) {
            put(`/master/jenis-dana/${editingDana.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            post('/master/jenis-dana', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    return (
        <AuthenticatedLayout
            title="Hierarki Kantong Dana Zakat (Fitrah & Mal)"
            subtitle="Pengelolaan struktur kantong dana Zakat Fitrah dan Zakat Mal beserta posisi saldo terkini"
        >
            <Head title="Hierarki Jenis Dana Zakat" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <FolderTree className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Pohon Hierarki Kantong Dana Zakat ({pohonHierarki.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Struktur kantong dana zakat berjenjang (Zakat Fitrah, Zakat Mal, Zakat Profesi, Zakat Perniagaan). Nilai saldo uang dan beras diperbarui secara otomatis dari transaksi penerimaan dan penyaluran.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Tambah Kantong Dana</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {pohonHierarki.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Belum ada data jenis_dana</p>
                                <p className="text-xs text-muted-foreground">
                                    Pastikan skema dan seed awal db_laz_zis_masjid sudah dimuat.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Hierarki & Nama Kantong Dana Zakat</TableHead>
                                                <TableHead>Kode</TableHead>
                                                <TableHead>Kategori</TableHead>
                                                <TableHead className="text-right">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Lock className="h-3 w-3" aria-hidden="true" />
                                                        Saldo Uang (Read-Only)
                                                    </span>
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Lock className="h-3 w-3" aria-hidden="true" />
                                                        Saldo Beras (Read-Only)
                                                    </span>
                                                </TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pohonHierarki.map((row) => {
                                                const terikat = Number(row.is_terikat) === 1 || row.is_terikat === true;
                                                const indentPadding =
                                                    row.level === 1
                                                        ? 'pl-0 font-bold'
                                                        : row.level === 2
                                                          ? 'pl-6 font-semibold'
                                                          : 'pl-12 font-medium';

                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell>
                                                            <div className={indentPadding}>
                                                                <span className="text-xs text-muted-foreground mr-1.5">
                                                                    L{row.level}
                                                                </span>
                                                                <span>{row.nama_dana}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs font-semibold">
                                                            {row.kode_dana}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="success">
                                                                Zakat (8 Asnaf)
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatRupiah(row.saldo_tersedia)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold tabular-nums">
                                                            {formatBerasKg(row.saldo_beras_kg)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditModal(row)}
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                                <span>Ubah</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {pohonHierarki.map((row) => (
                                        <div
                                            key={row.id}
                                            className="rounded-lg border bg-card p-4 space-y-2.5"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-mono text-xs font-semibold text-muted-foreground">
                                                        Level {row.level} • {row.kode_dana}
                                                    </p>
                                                    <p className="text-sm font-bold">{row.nama_dana}</p>
                                                    {row.nama_induk && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Induk: {row.nama_induk}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline">
                                                    {row.kategori_utama.replace('_', ' ')}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Saldo Uang (RDBMS)</p>
                                                    <p className="font-bold tabular-nums">
                                                        {formatRupiah(row.saldo_tersedia)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Saldo Beras (RDBMS)</p>
                                                    <p className="font-bold tabular-nums">
                                                        {formatBerasKg(row.saldo_beras_kg)}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => openEditModal(row)}
                                            >
                                                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                <span>Ubah Metadata Kantong Dana</span>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingDana ? `Ubah Kantong Dana ${editingDana.kode_dana}` : 'Tambah Kantong Dana Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Saldo uang dan beras dikelola otomatis oleh trigger database dan tidak dapat diedit secara manual.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="parent_id_select">Induk Kantong Dana (Opsional untuk Level 2/3)</Label>
                            <Select
                                value={data.parent_id ? String(data.parent_id) : 'ROOT'}
                                onValueChange={(val) =>
                                    setData('parent_id', val === 'ROOT' ? null : Number.parseInt(val, 10))
                                }
                            >
                                <SelectTrigger id="parent_id_select">
                                    <SelectValue placeholder="Pilih induk dana" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ROOT">-- Tanpa Induk (Level 1 / Induk Utama) --</SelectItem>
                                    {daftarDana
                                        .filter((item) => !editingDana || item.id !== editingDana.id)
                                        .map((item) => (
                                            <SelectItem key={item.id} value={String(item.id)}>
                                                {item.kode_dana} - {item.nama_dana}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="kode_dana">Kode Dana Zakat</Label>
                                <Input
                                    id="kode_dana"
                                    required
                                    placeholder="Contoh: ZKT-FTR"
                                    value={data.kode_dana}
                                    onChange={(e) => setData('kode_dana', e.target.value)}
                                />
                                {errors.kode_dana && (
                                    <p className="text-xs text-destructive">{errors.kode_dana}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Kategori Syariat</Label>
                                <div className="flex h-11 items-center rounded-md border bg-muted/40 px-3 text-xs font-semibold text-primary">
                                    Zakat Wajib (8 Asnaf)
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="nama_dana">Nama Kantong Dana Zakat</Label>
                            <Input
                                id="nama_dana"
                                required
                                placeholder="Contoh: Zakat Fitrah / Zakat Mal Profesi"
                                value={data.nama_dana}
                                onChange={(e) => setData('nama_dana', e.target.value)}
                            />
                            {errors.nama_dana && (
                                <p className="text-xs text-destructive">{errors.nama_dana}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Kantong Dana'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
