import * as React from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Edit3, Plus, Power, UserCog } from 'lucide-react';
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
import type { PenggunaSistem, PeranPengguna } from '@/types';

interface MasterPenggunaProps {
    daftarPengguna: PenggunaSistem[];
    rdbmsError?: string | null;
}

const DAFTAR_PERAN: PeranPengguna[] = [
    'Admin',
    'Amil_Penerima',
    'Verifikator',
    'Staf_Penyaluran',
    'Ketua_DKM',
];

export default function MasterPengguna({
    daftarPengguna = [],
    rdbmsError,
}: MasterPenggunaProps) {
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [editingUser, setEditingUser] = React.useState<PenggunaSistem | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        nama_lengkap: string;
        username: string;
        email: string;
        no_hp: string;
        password: string;
        peran: PeranPengguna;
        status_aktif: boolean;
    }>({
        nama_lengkap: '',
        username: '',
        email: '',
        no_hp: '',
        password: '',
        peran: 'Amil_Penerima',
        status_aktif: true,
    });

    const openCreateModal = () => {
        setEditingUser(null);
        reset();
        setDialogOpen(true);
    };

    const openEditModal = (user: PenggunaSistem) => {
        setEditingUser(user);
        setData({
            nama_lengkap: user.nama_lengkap,
            username: user.username,
            email: user.email,
            no_hp: user.no_hp ?? '',
            password: '',
            peran: user.peran,
            status_aktif: Number(user.status_aktif) === 1 || user.status_aktif === true,
        });
        setDialogOpen(true);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (editingUser) {
            put(`/master/pengguna/${editingUser.id}`, {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            post('/master/pengguna', {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const handleToggleStatus = (user: PenggunaSistem) => {
        const aktif = Number(user.status_aktif) === 1 || user.status_aktif === true;
        router.patch(`/master/pengguna/${user.id}/toggle`, {
            status_aktif: !aktif,
        });
    };

    return (
        <AuthenticatedLayout
            title="Master Pengguna Sistem (5 Peran RBAC)"
            subtitle="Pengelolaan akun panitia dengan hash Bcrypt pada kolom password_hash dan kontrol status_aktif"
        >
            <Head title="Master Pengguna Sistem" />

            <div className="space-y-6">
                <RdbmsAlert message={rdbmsError} />

                <Card>
                    <CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <UserCog className="h-5 w-5 text-primary" aria-hidden="true" />
                                <CardTitle className="text-lg">
                                    Daftar Akun Panitia & Pengurus DKM ({daftarPengguna.length})
                                </CardTitle>
                            </div>
                            <CardDescription>
                                Hanya akun dengan <code className="font-mono text-xs">status_aktif = 1</code> yang dapat masuk dan menyuntikkan <code className="font-mono text-xs">@app_user</code>.
                            </CardDescription>
                        </div>

                        <Button type="button" onClick={openCreateModal}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>Tambah Akun Panitia</span>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {daftarPengguna.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                                <p className="text-sm font-semibold">Belum ada data pengguna_sistem</p>
                                <p className="text-xs text-muted-foreground">
                                    Tambahkan akun panitia baru dengan peran yang sesuai.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden md:block rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nama Lengkap</TableHead>
                                                <TableHead>Username</TableHead>
                                                <TableHead>Email & No. HP</TableHead>
                                                <TableHead>Peran (RBAC)</TableHead>
                                                <TableHead>Status Akun</TableHead>
                                                <TableHead className="text-right">Tindakan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daftarPengguna.map((row) => {
                                                const aktif = Number(row.status_aktif) === 1 || row.status_aktif === true;

                                                return (
                                                    <TableRow key={row.id}>
                                                        <TableCell className="font-semibold">
                                                            {row.nama_lengkap}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {row.username}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <p>{row.email}</p>
                                                            <p className="text-muted-foreground">{row.no_hp || '-'}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{row.peran}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {aktif ? (
                                                                <Badge variant="success">Aktif</Badge>
                                                            ) : (
                                                                <Badge variant="destructive">Nonaktif</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleToggleStatus(row)}
                                                                >
                                                                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>{aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openEditModal(row)}
                                                                >
                                                                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                                    <span>Ubah</span>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="grid gap-3 md:hidden">
                                    {daftarPengguna.map((row) => {
                                        const aktif = Number(row.status_aktif) === 1 || row.status_aktif === true;

                                        return (
                                            <div
                                                key={row.id}
                                                className="rounded-lg border bg-card p-4 space-y-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold">{row.nama_lengkap}</p>
                                                        <p className="font-mono text-xs text-muted-foreground">
                                                            @{row.username} • {row.email}
                                                        </p>
                                                    </div>
                                                    {aktif ? (
                                                        <Badge variant="success">Aktif</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">Nonaktif</Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Peran:</span>
                                                    <Badge variant="outline">{row.peran}</Badge>
                                                </div>

                                                <div className="flex items-center gap-2 pt-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleToggleStatus(row)}
                                                    >
                                                        <Power className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>{aktif ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                                        <span>Ubah</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                            {editingUser ? `Ubah Akun ${editingUser.nama_lengkap}` : 'Tambah Akun Panitia Baru'}
                        </DialogTitle>
                        <DialogDescription>
                            Kata sandi akan di-hash menggunakan Bcrypt ke kolom <code className="font-mono text-xs">password_hash</code>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="nama_lengkap_user">Nama Lengkap</Label>
                            <Input
                                id="nama_lengkap_user"
                                required
                                placeholder="Masukkan nama lengkap panitia"
                                value={data.nama_lengkap}
                                onChange={(e) => setData('nama_lengkap', e.target.value)}
                            />
                            {errors.nama_lengkap && (
                                <p className="text-xs text-destructive">{errors.nama_lengkap}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="username_user">Username</Label>
                                <Input
                                    id="username_user"
                                    required
                                    placeholder="amil_loket1"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                />
                                {errors.username && (
                                    <p className="text-xs text-destructive">{errors.username}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="peran_select">Peran Sistem (RBAC)</Label>
                                <Select
                                    value={data.peran}
                                    onValueChange={(val) => setData('peran', val as PeranPengguna)}
                                >
                                    <SelectTrigger id="peran_select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAFTAR_PERAN.map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="email_user">Alamat Email</Label>
                                <Input
                                    id="email_user"
                                    type="email"
                                    required
                                    placeholder="panitia@masjid.local"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                />
                                {errors.email && (
                                    <p className="text-xs text-destructive">{errors.email}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="no_hp_user">Nomor HP (Opsional)</Label>
                                <Input
                                    id="no_hp_user"
                                    type="tel"
                                    placeholder="0812..."
                                    value={data.no_hp}
                                    onChange={(e) => setData('no_hp', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password_user">
                                {editingUser ? 'Kata Sandi Baru (Kosongkan bila tidak diubah)' : 'Kata Sandi'}
                            </Label>
                            <Input
                                id="password_user"
                                type="password"
                                required={!editingUser}
                                placeholder="Minimal 6 karakter"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password}</p>
                            )}
                        </div>

                        <label
                            htmlFor="status_aktif_user"
                            className="flex items-center gap-2 rounded-md border p-3 text-xs font-medium"
                        >
                            <input
                                id="status_aktif_user"
                                type="checkbox"
                                checked={data.status_aktif}
                                onChange={(e) => setData('status_aktif', e.target.checked)}
                                className="h-4 w-4 rounded accent-primary"
                            />
                            <span>Akun Aktif & Diizinkan Login (status_aktif = 1)</span>
                        </label>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Menyimpan...' : 'Simpan Akun'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
