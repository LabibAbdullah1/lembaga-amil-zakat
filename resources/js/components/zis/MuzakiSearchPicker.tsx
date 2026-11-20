import * as React from 'react';
import { Link } from '@inertiajs/react';
import { Check, ExternalLink, Search, UserCheck, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Muzaki } from '@/types';

export interface SearchableMuzakiOption extends Muzaki {
    jumlah_jiwa: number;
}

interface MuzakiSearchPickerProps {
    id?: string;
    label?: string;
    daftarMuzaki: SearchableMuzakiOption[];
    selectedId: number;
    onSelect: (muzakiId: number) => void;
    isPreselectedFromDetail?: boolean;
}

export function MuzakiSearchPicker({
    id = 'cari-nama-muzaki',
    label = 'Cari & Pilih Muzaki / Kepala Keluarga (Nama, NIK, HP, atau RT/RW)',
    daftarMuzaki = [],
    selectedId,
    onSelect,
    isPreselectedFromDetail = false,
}: MuzakiSearchPickerProps) {
    const selectedMuzaki = React.useMemo(
        () => daftarMuzaki.find((m) => Number(m.id) === Number(selectedId)) ?? null,
        [daftarMuzaki, selectedId]
    );

    const [query, setQuery] = React.useState<string>(() => selectedMuzaki?.nama_lengkap ?? '');
    const [openList, setOpenList] = React.useState<boolean>(false);

    // Sinkronkan teks input ketika selectedId berubah (misal dari redirect /loket?muzaki_id=...)
    React.useEffect(() => {
        if (selectedMuzaki) {
            setQuery(selectedMuzaki.nama_lengkap);
        }
    }, [selectedMuzaki]);

    const filteredCandidates = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        // Jika teks sama persis dengan nama yang sedang dipilih dan pengguna baru membuka daftar,
        // tampilkan kandidat populer / terdekat agar mudah mengganti muzaki
        const effectiveQuery =
            selectedMuzaki && q === selectedMuzaki.nama_lengkap.toLowerCase() ? '' : q;

        const matches = daftarMuzaki.filter((m) => {
            if (effectiveQuery === '') return true;
            return (
                m.nama_lengkap.toLowerCase().includes(effectiveQuery) ||
                m.nik.toLowerCase().includes(effectiveQuery) ||
                (m.no_hp ?? '').toLowerCase().includes(effectiveQuery) ||
                (m.alamat_rt_rw ?? '').toLowerCase().includes(effectiveQuery)
            );
        });
        return matches.slice(0, 30);
    }, [daftarMuzaki, query, selectedMuzaki]);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                <div className="flex items-center gap-1.5">
                    {isPreselectedFromDetail && selectedMuzaki && (
                        <Badge variant="success" className="text-[10px]">
                            Dipilih dari Detail Muzaki
                        </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                        Terdaftar: {daftarMuzaki.length} Muzaki
                    </span>
                </div>
            </div>

            <div className="relative">
                <Search
                    className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                />
                <Input
                    id={id}
                    type="search"
                    autoComplete="off"
                    placeholder="Ketik nama muzaki, NIK 16 digit, No. HP, atau RT/RW..."
                    value={query}
                    onFocus={() => setOpenList(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpenList(true);
                    }}
                    className="pl-9 pr-9"
                />
                {query !== '' && (
                    <button
                        type="button"
                        aria-label="Bersihkan kata kunci pencarian Muzaki"
                        onClick={() => {
                            setQuery('');
                            setOpenList(true);
                        }}
                        className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Kotak Hasil Pencarian (Scroll Internal, Maksimal 30 Hasil Teratas) */}
            {openList && (
                <div className="max-h-56 overflow-y-auto rounded-lg border bg-card p-1.5 shadow-sm space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground border-b">
                        <span>
                            Menampilkan {filteredCandidates.length} dari {daftarMuzaki.length} Muzaki
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpenList(false)}
                            className="font-medium text-primary hover:underline"
                        >
                            Tutup Daftar
                        </button>
                    </div>

                    {filteredCandidates.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">
                            Tidak ditemukan nama Muzaki, NIK, atau RT/RW yang cocok dengan &quot;{query}&quot;.
                        </p>
                    ) : (
                        filteredCandidates.map((m) => {
                            const isSelected = Number(m.id) === Number(selectedId);
                            const isKeluarga = m.jenis_muzaki === 'KK_Keluarga';

                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(Number(m.id));
                                        setQuery(m.nama_lengkap);
                                        setOpenList(false);
                                    }}
                                    className={cn(
                                        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors',
                                        isSelected
                                            ? 'bg-accent text-accent-foreground font-semibold'
                                            : 'hover:bg-muted'
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            {isSelected && (
                                                <Check
                                                    className="h-3.5 w-3.5 text-primary shrink-0"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span className="font-semibold text-foreground truncate">
                                                {m.nama_lengkap}
                                            </span>
                                            <Badge
                                                variant={isKeluarga ? 'success' : 'secondary'}
                                                className="text-[10px] px-1.5 py-0"
                                            >
                                                {m.jenis_muzaki.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <p className="font-mono text-[11px] text-muted-foreground truncate">
                                            NIK: {m.nik} • {m.alamat_rt_rw || 'RT/RW -'} • HP: {m.no_hp || '-'}
                                        </p>
                                    </div>

                                    <div className="shrink-0">
                                        <Badge variant="outline" className="tabular-nums text-[10px]">
                                            <Users className="mr-1 h-3 w-3" aria-hidden="true" />
                                            {m.jumlah_jiwa} jiwa
                                        </Badge>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Kartu Muzaki yang Sedang Terpilih */}
            {selectedMuzaki && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-accent/40 px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <UserCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-bold text-foreground truncate">
                                    Terpilih: {selectedMuzaki.nama_lengkap}
                                </p>
                                <Badge
                                    variant={
                                        selectedMuzaki.jenis_muzaki === 'KK_Keluarga'
                                            ? 'success'
                                            : 'secondary'
                                    }
                                    className="text-[10px] px-1.5 py-0"
                                >
                                    {selectedMuzaki.jenis_muzaki.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="tabular-nums text-[10px] px-1.5 py-0">
                                    {selectedMuzaki.jumlah_jiwa} jiwa
                                </Badge>
                            </div>
                            <p className="font-mono text-[11px] text-muted-foreground truncate">
                                NIK: {selectedMuzaki.nik} • {selectedMuzaki.alamat_rt_rw || '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setQuery('');
                                setOpenList(true);
                            }}
                            className="h-7 px-2 text-[11px]"
                        >
                            Ganti Muzaki
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                            <Link href={`/muzaki/${selectedMuzaki.id}`}>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                <span>Detail</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
