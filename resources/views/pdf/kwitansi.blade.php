<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Kwitansi ZIS {{ $transaksi->no_kwitansi }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #0f172a;
            margin: 0;
            padding: 16px;
        }
        .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .title {
            font-size: 15px;
            font-weight: bold;
            color: #059669;
            margin: 0;
        }
        .subtitle {
            font-size: 10px;
            color: #475569;
            margin: 2px 0 0 0;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .meta-table td {
            padding: 3px 4px;
            vertical-align: top;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .items-table th {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-size: 10px;
        }
        .items-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
        }
        .text-right {
            text-align: right;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
        }
        .status-sah {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status-batal {
            background-color: #ffe4e6;
            color: #9f1239;
        }
        .footer {
            margin-top: 18px;
            width: 100%;
        }
        .footer td {
            width: 50%;
            text-align: center;
            vertical-align: top;
        }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">LEMBAGA AMIL ZAKAT (LAZ / ZIS) &amp; ZAKAT FITRAH MASJID</p>
        <p class="subtitle">Bukti Penerimaan Zakat, Infak, Sedekah &amp; Wakaf Resmi</p>
    </div>

    <table class="meta-table">
        <tr>
            <td style="width: 18%;"><strong>No. Kwitansi</strong></td>
            <td style="width: 34%;">: {{ $transaksi->no_kwitansi }}</td>
            <td style="width: 18%;"><strong>Tanggal</strong></td>
            <td style="width: 30%;">: {{ $transaksi->tanggal_transaksi }}</td>
        </tr>
        <tr>
            <td><strong>Nama Muzaki</strong></td>
            <td>: {{ $transaksi->nama_muzaki }} (NIK: {{ $transaksi->nik_muzaki }})</td>
            <td><strong>Periode</strong></td>
            <td>: Ramadhan {{ $transaksi->tahun_hijriah }} H ({{ $transaksi->tahun_masehi }})</td>
        </tr>
        <tr>
            <td><strong>Alamat RT/RW</strong></td>
            <td>: {{ $transaksi->alamat_rt_rw ?? '-' }}</td>
            <td><strong>Metode Bayar</strong></td>
            <td>: {{ $transaksi->metode_bayar }}</td>
        </tr>
        <tr>
            <td><strong>Status</strong></td>
            <td colspan="3">
                :
                @if($transaksi->status_transaksi === 'Sah')
                    <span class="status-badge status-sah">SAH</span>
                @else
                    <span class="status-badge status-batal">DIBATALKAN (VOID): {{ $transaksi->alasan_batal }}</span>
                @endif
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th>Kode Dana</th>
                <th>Kantong Jenis Dana</th>
                <th>Kategori</th>
                <th class="text-right">Jumlah Jiwa</th>
                <th class="text-right">Nominal (Rp)</th>
                <th class="text-right">Beras (Kg)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($detailItems as $item)
                <tr>
                    <td>{{ $item->kode_dana }}</td>
                    <td>{{ $item->nama_dana }}</td>
                    <td>{{ str_replace('_', ' ', $item->kategori_utama) }}</td>
                    <td class="text-right">{{ $item->jumlah_jiwa }} jiwa</td>
                    <td class="text-right">Rp {{ number_format((float) $item->nominal, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) $item->berat_beras_kg, 2, ',', '.') }} kg</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <th colspan="4" class="text-right">TOTAL DITERIMA</th>
                <th class="text-right">Rp {{ number_format((float) $transaksi->total_nominal, 0, ',', '.') }}</th>
                <th class="text-right">{{ number_format((float) $transaksi->total_beras_kg, 2, ',', '.') }} kg</th>
            </tr>
        </tfoot>
    </table>

    <table class="footer">
        <tr>
            <td>
                <p>Muzaki / Penyetor,</p>
                <br><br>
                <p><strong>({{ $transaksi->nama_muzaki }})</strong></p>
            </td>
            <td>
                <p>Amil Penerima,</p>
                <br><br>
                <p><strong>({{ $transaksi->nama_amil }})</strong></p>
            </td>
        </tr>
    </table>
</body>
</html>
