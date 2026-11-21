<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DasarHukumController extends Controller
{
    public function index(): Response
    {
        $daftarAsnaf = [];

        try {
            $daftarAsnaf = DB::connection('mysql')->select(
                'SELECT id, kode_asnaf, nama_asnaf, deskripsi
                 FROM kategori_asnaf
                 ORDER BY kode_asnaf ASC'
            );
        } catch (Throwable) {
            $daftarAsnaf = [];
        }

        return Inertia::render('Syariat/DasarHukum', [
            'daftarAsnaf' => $daftarAsnaf,
        ]);
    }
}
