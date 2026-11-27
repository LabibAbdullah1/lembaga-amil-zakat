<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GaleriKegiatan extends Model
{
    protected $table = 'galeri_kegiatan';

    protected $fillable = [
        'judul',
        'kategori',
        'deskripsi',
        'gambar_url',
        'tanggal_kegiatan',
        'lokasi',
        'jumlah_penerima',
        'is_tampil',
        'urutan',
        'created_by',
    ];

    protected $casts = [
        'tanggal_kegiatan' => 'date',
        'is_tampil' => 'boolean',
        'jumlah_penerima' => 'integer',
        'urutan' => 'integer',
    ];
}
