import * as React from 'react';
import { Check, CheckCircle2, Search, UserCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Mustahik } from '@/types';

export interface SearchableMustahikOption extends Mustahik {
    kode_asnaf: string;
    nama_asnaf: string;
    is_layak_syariat: number | boolean;
}

interface MustahikSearchPickerProps {
    id?: string;
    label?: string;
    daftarMustahik: SearchableMustahikOption[];
    selectedId: number;
    onSelect: (mustahikId: number) => void;
    excludeIds?: number[];
}

export function MustahikSearchPicker({
    id = 'cari-nama-mustahik',
    label = 'Ketik Nama Kepala Keluarga (KK), NIK, atau RT/RW',
    daftarMustahik = [],
    selectedId,
    onSelect,
    excludeIds = [],
}: MustahikSearchPickerProps) {
    const [query, setQuery] = React.useState<string>('');
    const [rtRwFilter, setRtRwFilter] = React.useState<string>('SEMUA');
    const [openList, setOpenList] = React.useState<boolean>(false);

    const selectedMustahik = React.useMemo(
        () => daftarMustahik.find((m) => m.id === selectedId) ?? null,
        [daftarMustahik, selectedId]
    );

    const excludedSet = React.useMemo(() => new Set(excludeIds), [excludeIds]);

    const daftarRtRw = React.useMemo(() => {
        const counts = new Map<string, number>();
        for (const m of daftarMustahik) {
            const rt = (m.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
            counts.set(rt, (counts.get(rt) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([wilayah, total]) => ({ wilayah, total }))
            .sort((a, b) => a.wilayah.localeCompare(b.wilayah));
    }, [daftarMustahik]);

    const filteredCandidates = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        const matches = daftarMustahik.filter((m) => {
            const rt = (m.alamat_rt_rw ?? '').trim() || 'Belum Diisi';
            if (rtRwFilter !== 'SEMUA' && rt !== rtRwFilter) {
                return false;
            }
            if (q === '') return true;
            return (
                m.nama_lengkap.toLowerCase().includes(q) ||
                m.nik.toLowerCase().includes(q) ||
                m.kode_asnaf.toLowerCase().includes(q) ||
                m.nama_asnaf.toLowerCase().includes(q) ||
                (m.alamat_rt_rw ?? '').toLowerCase().includes(q)
            );
        });
        return matches.slice(0, 30);
    }, [daftarMustahik, query, rtRwFilter]);

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                    Terdaftar: {daftarMustahik.length} KK ({daftarRtRw.length} Wilayah RT/RW)
                </span>
            </div>

            {daftarRtRw.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1.5">
                    <span className="px-1.5 text-[11px] font-semibold text-muted-foreground">
                        Indeks RT/RW:
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            setRtRwFilter('SEMUA');
                            setOpenList(true);
                        }}
                        className={cn(
                            'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                            rtRwFilter === 'SEMUA'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                        )}
                    >
                        Semua ({daftarMustahik.length})
                    </button>
                    {daftarRtRw.map((rt) => (
                        <button
                            key={rt.wilayah}
                            type="button"
                            onClick={() => {
                                setRtRwFilter(rt.wilayah);
                                setOpenList(true);
                            }}
                            className={cn(
                                'rounded px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors',
                                rtRwFilter === rt.wilayah
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {rt.wilayah} ({rt.total})
                        </button>
                    ))}
                </div>
            )}

            <div className="relative">
                <Search
                    className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                />
                <Input
                    id={id}
                    type="search"
                    autoComplete="off"
                    placeholder="Ketik nama kepala keluarga, NIK 16 digit, atau RT/RW untuk mencari..."
                    value={query}
                    onFocus={() => setOpenList(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpenList(true);
                    }}
                    className="pl-9"
                />
            </div>

            {/* Kotak Hasil Pencarian (Scroll Internal, Maksimal 30 Hasil Teratas) */}
            {(openList || query.trim() !== '') && (
                <div className="max-h-56 overflow-y-auto rounded-lg border bg-card p-1.5 shadow-sm space-y-1">
                    {filteredCandidates.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">
                            Tidak ditemukan nama KK atau NIK yang cocok dengan &quot;{query}&quot;.
                        </p>
                    ) : (
                        filteredCandidates.map((m) => {
                            const isSelected = m.id === selectedId;
                            const isAlreadyInBkk = excludedSet.has(m.id);
                            const layak =
                                Number(m.is_layak_syariat) === 1 || m.is_layak_syariat === true;

                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    disabled={isAlreadyInBkk}
                                    onClick={() => {
                                        onSelect(m.id);
                                        setQuery(m.nama_lengkap);
                                        setOpenList(false);
                                    }}
                                    className={cn(
                                        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors',
                                        isSelected
                                            ? 'bg-accent text-accent-foreground font-semibold'
                                            : 'hover:bg-muted',
                                        isAlreadyInBkk && 'opacity-50'
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
                                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                                {m.kode_asnaf}
                                            </Badge>
                                        </div>
                                        <p className="font-mono text-[11px] text-muted-foreground truncate">
                                            NIK: {m.nik} • {m.alamat_rt_rw || 'Alamat belum diisi'}
                                        </p>
                                    </div>

                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                        {isAlreadyInBkk ? (
                                            <Badge variant="secondary">Sudah di Daftar</Badge>
                                        ) : layak ? (
                                            <Badge variant="success" className="text-[10px]">
                                                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                                                Layak
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="text-[10px]">
                                                <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                                                {m.status_verifikasi}
                                            </Badge>
                                        )}
                                        {m.penerimaan_periode_ini && m.penerimaan_periode_ini.length > 0 ? (
                                            <div className="flex flex-wrap justify-end gap-1">
                                                {m.penerimaan_periode_ini.map((p) => (
                                                    <span
                                                        key={p.jenis_dana_id}
                                                        className="rounded border border-amber-300 bg-amber-50 px-1 py-0.5 font-mono text-[9px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                                        title={p.nama_dana}
                                                    >
                                                        {p.kode_dana}: {p.jumlah_diterima_kali}x
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">
                                                Belum Terima (0x)
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {/* Kartu Penerima KK yang Sedang Terpilih */}
            {selectedMustahik && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-accent/40 px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">
                                Terpilih: {selectedMustahik.nama_lengkap} ({selectedMustahik.kode_asnaf} -{' '}
                                {selectedMustahik.nama_asnaf})
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground truncate">
                                NIK: {selectedMustahik.nik} • {selectedMustahik.alamat_rt_rw || '-'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {selectedMustahik.penerimaan_periode_ini &&
                        selectedMustahik.penerimaan_periode_ini.length > 0 ? (
                            <Badge variant="warning">
                                Sudah Terima {selectedMustahik.total_kali_terima ?? 0}x (
                                {selectedMustahik.penerimaan_periode_ini
                                    .map((p) => `${p.kode_dana}: ${p.jumlah_diterima_kali}x`)
                                    .join(', ')}
                                )
                            </Badge>
                        ) : (
                            <Badge variant="outline">Belum Terima Periode Ini</Badge>
                        )}
                        {Number(selectedMustahik.is_layak_syariat) === 1 ||
                        selectedMustahik.is_layak_syariat === true ? (
                            <Badge variant="success">Layak Terima Zakat</Badge>
                        ) : (
                            <Badge variant="destructive">Belum Memenuhi Syarat</Badge>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
