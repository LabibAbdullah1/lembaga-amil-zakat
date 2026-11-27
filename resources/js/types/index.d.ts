export type PeranPengguna =
    | 'Admin'
    | 'Amil_Penerima'
    | 'Verifikator'
    | 'Staf_Penyaluran'
    | 'Ketua_DKM';

export type KategoriUtamaDana = 'Zakat' | 'Infak_Sedekah' | 'Wakaf';
export type JenisMuzaki = 'Individu' | 'KK_Keluarga';
export type StatusHubunganKeluarga = 'Kepala_Keluarga' | 'Istri' | 'Anak' | 'Tanggungan_Lain';
export type StatusVerifikasiMustahik = 'Menunggu' | 'Layak' | 'Tidak_Layak' | 'Kedaluwarsa';
export type HasilVerifikasi = 'Layak' | 'Tidak_Layak';
export type MetodeBayar = 'Tunai' | 'Transfer' | 'QRIS' | 'Beras' | 'Campuran';
export type StatusTransaksi = 'Sah' | 'Dibatalkan';
export type StatusProgram = 'Draft' | 'Berjalan' | 'Selesai';
export type StatusPersetujuanBkk = 'Draft' | 'Disetujui' | 'Disalurkan' | 'Ditolak';
export type StatusSerahTerima = 'Belum' | 'Sudah';
export type AksiAudit = 'INSERT' | 'UPDATE' | 'DELETE';

export interface JenisDana {
    id: number;
    parent_id: number | null;
    kode_dana: string;
    nama_dana: string;
    kategori_utama: KategoriUtamaDana;
    is_terikat: boolean | number;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
    created_at?: string;
    updated_at?: string;
}

export interface KategoriAsnaf {
    id: number;
    kode_asnaf: string;
    nama_asnaf: string;
    deskripsi: string | null;
}

export interface PeriodeRamadhan {
    id: number;
    tahun_hijriah: string;
    tahun_masehi: number;
    beras_per_jiwa_kg: number | string;
    nominal_fitrah_per_jiwa: number | string;
    status_aktif: boolean | number;
}

export interface PenggunaSistem {
    id: number;
    nama_lengkap: string;
    username: string;
    email: string;
    no_hp: string | null;
    peran: PeranPengguna;
    status_aktif: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface Muzaki {
    id: number;
    nik: string;
    nama_lengkap: string;
    no_hp: string | null;
    alamat_rt_rw: string | null;
    jenis_muzaki: JenisMuzaki;
    jumlah_jiwa?: number;
    created_at?: string;
    updated_at?: string;
}

export interface AnggotaKeluargaMuzaki {
    id: number;
    muzaki_id: number;
    nama_anggota: string;
    status_hubungan: StatusHubunganKeluarga;
}

export interface PenerimaanMustahikItem {
    jenis_dana_id: number;
    kode_dana: string;
    nama_dana: string;
    jumlah_diterima_kali: number;
    total_nominal_diterima: number | string;
    total_beras_diterima_kg: number | string;
    terakhir_diterima_pada: string | null;
}

export interface Mustahik {
    id: number;
    nik: string;
    nama_lengkap: string;
    kategori_asnaf_id: number;
    alamat_rt_rw: string | null;
    status_verifikasi: StatusVerifikasiMustahik;
    tanggal_verifikasi_terakhir: string | null;
    is_layak_syariat?: boolean | number;
    penerimaan_periode_ini?: PenerimaanMustahikItem[];
    total_kali_terima?: number;
    created_at?: string;
    updated_at?: string;
}

export interface VerifikasiMustahik {
    id: number;
    mustahik_id: number;
    verifikator_id: number;
    tanggal_verifikasi: string;
    hasil: HasilVerifikasi;
    catatan_survei: string | null;
}

export interface TransaksiPenghimpunan {
    id: number;
    no_kwitansi: string;
    muzaki_id: number;
    periode_id: number;
    amil_id: number;
    tanggal_transaksi: string;
    metode_bayar: MetodeBayar;
    total_nominal: number | string;
    total_beras_kg: number | string;
    status_transaksi: StatusTransaksi;
    alasan_batal: string | null;
}

export interface DetailPenghimpunan {
    id: number;
    transaksi_id: number;
    jenis_dana_id: number;
    jumlah_jiwa: number;
    nominal: number | string;
    berat_beras_kg: number | string;
}

export interface ProgramPenyaluran {
    id: number;
    kode_program: string;
    nama_program: string;
    jenis_dana_id: number;
    periode_id: number;
    anggaran_rencana: number | string;
    target_beras_kg?: number | string;
    target_penerima_kk?: number;
    khusus_amil?: number | boolean;
    status_program: StatusProgram;
}

export interface PenyaluranDana {
    id: number;
    no_bkk: string;
    program_id: number;
    jenis_dana_id: number;
    pembuat_id: number;
    penyetuju_id: number | null;
    tanggal_penyaluran: string;
    total_disalurkan: number | string;
    total_beras_kg: number | string;
    status_persetujuan: StatusPersetujuanBkk;
    catatan_penolakan: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface DetailPenyaluranMustahik {
    id: number;
    penyaluran_id: number;
    mustahik_id: number;
    nominal_diterima: number | string;
    beras_diterima_kg: number | string;
    status_serah_terima: StatusSerahTerima;
    waktu_serah_terima: string | null;
    petugas_serah_id: number | null;
}

export interface LogAuditZis {
    id: number;
    nama_tabel: string;
    record_id: number;
    aksi: AksiAudit;
    data_lama: Record<string, unknown> | string | null;
    data_baru: Record<string, unknown> | string | null;
    dilakukan_oleh: string;
    waktu_kejadian: string;
}

export interface ViewSaldoJenisDana {
    id?: number;
    kode_dana: string;
    nama_dana: string;
    kategori_utama: KategoriUtamaDana;
    induk_dana?: string | null;
    sifat_dana?: string;
    saldo_tersedia: number | string;
    saldo_beras_kg: number | string;
}

export interface ViewRekapPenyaluranAsnaf {
    kode_asnaf: string;
    nama_asnaf: string;
    jumlah_mustahik_terbantu: number;
    total_nominal_disalurkan: number | string;
    total_beras_disalurkan_kg: number | string;
}

export interface ViewLaporanPenyaluranPublik {
    no_bkk: string;
    tanggal_penyaluran: string;
    nama_program: string;
    nama_dana?: string;
    sumber_dana?: string;
    kode_asnaf?: string;
    nama_asnaf?: string;
    golongan_asnaf?: string;
    nik_mustahik_masked: string;
    nama_mustahik_masked: string;
    alamat_rt_rw?: string | null;
    nominal_diterima: number | string;
    beras_diterima_kg: number | string;
}

export interface ViewRekapPenghimpunanMuzaki {
    nik_muzaki_masked?: string;
    nik_masked?: string;
    nama_muzaki_masked?: string;
    nama_lengkap?: string;
    jenis_muzaki?: string;
    tahun_hijriah?: string;
    tahun_masehi?: number;
    frekuensi_transaksi?: number;
    frekuensi_setoran?: number;
    total_nominal?: number | string;
    total_beras_kg?: number | string;
    [key: string]: unknown;
}

export interface HakAmilKategoriItem {
    jenis_dana_id: number;
    kode_dana: string;
    nama_dana: string;
    is_terikat_periode_ramadhan?: boolean;
    saldo_uang_tersedia?: number;
    saldo_beras_tersedia?: number;
    pool_total_uang?: number;
    pool_total_beras?: number;
    kuota_amil_uang?: number;
    kuota_amil_beras?: number;
    terpakai_amil_uang?: number;
    terpakai_amil_beras?: number;
    sisa_kuota_amil_uang?: number;
    sisa_kuota_amil_beras?: number;
    kuota_non_amil_uang?: number;
    kuota_non_amil_beras?: number;
    terpakai_non_amil_uang?: number;
    terpakai_non_amil_beras?: number;
    sisa_kuota_non_amil_uang?: number;
    sisa_kuota_non_amil_beras?: number;
    jatah_per_asnaf_uang?: number;
    jatah_per_asnaf_beras?: number;
    total_himpun_rupiah: number;
    total_amil_rupiah: number;
    kuota_maksimal_rupiah: number;
    sisa_kuota_rupiah: number;
    persentase_amil: number;
    persentase_non_amil?: number;
}

export type KategoriGaleri =
    | 'Zakat_Fitrah'
    | 'Zakat_Mal'
    | 'Santunan_Dhuafa'
    | 'Pemberdayaan'
    | 'Tanggap_Bencana'
    | 'Kegiatan_Amil';

export interface GaleriKegiatanItem {
    id: number;
    judul: string;
    kategori: KategoriGaleri;
    deskripsi: string | null;
    gambar_url: string;
    tanggal_kegiatan: string;
    lokasi: string | null;
    jumlah_penerima: number;
    is_tampil: boolean | number;
    urutan: number;
    created_at?: string;
    updated_at?: string;
}

export interface SharedProps {
    auth: {
        user: PenggunaSistem | null;
    };
    periodeAktif?: PeriodeRamadhan | null;
    persentaseHakAmil?: number;
    hakAmilPerKategori?: HakAmilKategoriItem[];
    flash?: {
        success?: string | null;
        error?: string | null;
    };
    errors: Record<string, string> & {
        rdbms?: string;
    };
    [key: string]: unknown;
}
