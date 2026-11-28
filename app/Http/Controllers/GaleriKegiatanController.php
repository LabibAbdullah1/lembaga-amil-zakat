<?php

namespace App\Http\Controllers;

use App\Models\GaleriKegiatan;
use App\Support\RdbmsErrorHandler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class GaleriKegiatanController extends Controller
{
    public function index(Request $request): Response
    {
        $query = GaleriKegiatan::query()->orderBy('urutan', 'asc')->orderBy('tanggal_kegiatan', 'desc');

        if ($request->filled('kategori') && $request->kategori !== 'SEMUA') {
            $query->where('kategori', $request->kategori);
        }

        if ($request->filled('cari')) {
            $cari = trim($request->cari);
            $query->where(function ($q) use ($cari) {
                $q->where('judul', 'like', "%{$cari}%")
                    ->orWhere('lokasi', 'like', "%{$cari}%")
                    ->orWhere('deskripsi', 'like', "%{$cari}%");
            });
        }

        $galeri = $query->paginate(12)->withQueryString();

        return Inertia::render('Master/Galeri', [
            'galeri' => $galeri,
            'filters' => [
                'kategori' => $request->kategori ?? 'SEMUA',
                'cari' => $request->cari ?? '',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'judul' => 'required|string|max:150',
            'kategori' => 'required|in:Zakat_Fitrah,Zakat_Mal,Santunan_Dhuafa,Pemberdayaan,Tanggap_Bencana,Kegiatan_Amil',
            'deskripsi' => 'nullable|string|max:1000',
            'tanggal_kegiatan' => 'required|date',
            'lokasi' => 'nullable|string|max:100',
            'jumlah_penerima' => 'nullable|integer|min:0',
            'urutan' => 'nullable|integer|min:0',
            'is_tampil' => 'nullable|boolean',
            'gambar' => 'required_without:gambar_url|nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'gambar_url' => 'nullable|string|max:255',
        ]);

        try {
            $gambarUrl = $validated['gambar_url'] ?? '';

            if ($request->hasFile('gambar')) {
                $file = $request->file('gambar');
                $extension = strtolower($file->extension() ?: 'jpg');
                $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
                $path = $file->storeAs('galeri', $filename, 'public');
                $gambarUrl = Storage::url($path);
            }

            GaleriKegiatan::create([
                'judul' => $validated['judul'],
                'kategori' => $validated['kategori'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'gambar_url' => $gambarUrl,
                'tanggal_kegiatan' => $validated['tanggal_kegiatan'],
                'lokasi' => $validated['lokasi'] ?? null,
                'jumlah_penerima' => $validated['jumlah_penerima'] ?? 0,
                'urutan' => $validated['urutan'] ?? 0,
                'is_tampil' => $request->boolean('is_tampil', true),
                'created_by' => Auth::id(),
            ]);

            return redirect()->back()->with('success', 'Dokumentasi kegiatan berhasil ditambahkan.');
        } catch (Throwable $e) {
            return RdbmsErrorHandler::handle($e, 'Gagal menyimpan dokumentasi kegiatan.');
        }
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $galeri = GaleriKegiatan::findOrFail($id);

        $validated = $request->validate([
            'judul' => 'required|string|max:150',
            'kategori' => 'required|in:Zakat_Fitrah,Zakat_Mal,Santunan_Dhuafa,Pemberdayaan,Tanggap_Bencana,Kegiatan_Amil',
            'deskripsi' => 'nullable|string|max:1000',
            'tanggal_kegiatan' => 'required|date',
            'lokasi' => 'nullable|string|max:100',
            'jumlah_penerima' => 'nullable|integer|min:0',
            'urutan' => 'nullable|integer|min:0',
            'is_tampil' => 'nullable|boolean',
            'gambar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        try {
            if ($request->hasFile('gambar')) {
                // Hapus gambar lama jika disimpan di storage dengan aman dari path traversal
                if (str_starts_with($galeri->gambar_url, '/storage/galeri/')) {
                    $safeFilename = basename($galeri->gambar_url);
                    if ($safeFilename !== '') {
                        Storage::disk('public')->delete('galeri/' . $safeFilename);
                    }
                }

                $file = $request->file('gambar');
                $extension = strtolower($file->extension() ?: 'jpg');
                $filename = time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
                $path = $file->storeAs('galeri', $filename, 'public');
                $galeri->gambar_url = Storage::url($path);
            }

            $galeri->update([
                'judul' => $validated['judul'],
                'kategori' => $validated['kategori'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'tanggal_kegiatan' => $validated['tanggal_kegiatan'],
                'lokasi' => $validated['lokasi'] ?? null,
                'jumlah_penerima' => $validated['jumlah_penerima'] ?? 0,
                'urutan' => $validated['urutan'] ?? 0,
                'is_tampil' => $request->boolean('is_tampil', true),
            ]);

            return redirect()->back()->with('success', 'Dokumentasi kegiatan berhasil diperbarui.');
        } catch (Throwable $e) {
            return RdbmsErrorHandler::handle($e, 'Gagal memperbarui dokumentasi kegiatan.');
        }
    }

    public function toggleTampil(int $id): RedirectResponse
    {
        try {
            $galeri = GaleriKegiatan::findOrFail($id);
            $galeri->is_tampil = !$galeri->is_tampil;
            $galeri->save();

            $status = $galeri->is_tampil ? 'ditampilkan di publik' : 'disembunyikan dari publik';
            return redirect()->back()->with('success', "Dokumentasi kegiatan kini {$status}.");
        } catch (Throwable $e) {
            return RdbmsErrorHandler::handle($e, 'Gagal mengubah status tampil dokumentasi.');
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $galeri = GaleriKegiatan::findOrFail($id);

            if (str_starts_with($galeri->gambar_url, '/storage/galeri/')) {
                $safeFilename = basename($galeri->gambar_url);
                if ($safeFilename !== '') {
                    Storage::disk('public')->delete('galeri/' . $safeFilename);
                }
            }

            $galeri->delete();

            return redirect()->back()->with('success', 'Dokumentasi kegiatan berhasil dihapus.');
        } catch (Throwable $e) {
            return RdbmsErrorHandler::handle($e, 'Gagal menghapus dokumentasi kegiatan.');
        }
    }
}
