<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Periode Ramadhan {{ $periode->tahun_hijriah ?? '' }} ({{ $periode->tahun_masehi ?? '' }})</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10.5px;
            color: #0f172a;
            margin: 0;
            padding: 18px 22px;
        }
        .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 14px;
        }
        .title {
            font-size: 14px;
            font-weight: bold;
            color: #059669;
            margin: 0;
        }
        .subtitle {
            font-size: 9.5px;
            color: #475569;
            margin: 3px 0 0 0;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #065f46;
            margin: 14px 0 6px 0;
            border-left: 3px solid #059669;
            padding-left: 6px;
        }
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .kpi-table td {
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            padding: 7px 9px;
            width: 20%;
            vertical-align: top;
        }
        .kpi-label {
            font-size: 8.5px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .kpi-value {
            font-size: 11.5px;
            font-weight: bold;
            color: #0f172a;
        }
        .kpi-sub {
            font-size: 8.5px;
            color: #475569;
            margin-top: 2px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        table.data-table th {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            text-align: left;
            font-size: 9.5px;
        }
        table.data-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            font-size: 9.5px;
            vertical-align: top;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8.5px;
            font-weight: bold;
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .badge-warn {
            background-color: #fef3c7;
            color: #92400e;
            border-color: #fde68a;
        }
        .footer-sign {
            margin-top: 20px;
            width: 100%;
        }
        .footer-sign td {
            width: 50%;
            text-align: center;
            vertical-align: top;
            font-size: 9.5px;
        }
    </style>
</head>
<body>
    @php
        $totalUangHimpun = (float) ($ringkasanHimpun->total_dana_uang ?? 0);
        $totalBerasHimpun = (float) ($ringkasanHimpun->total_dana_beras_kg ?? 0);
        $totalMuzaki = (int) ($ringkasanHimpun->jumlah_muzaki ?? 0);
        $totalTransaksi = (int) ($ringkasanHimpun->jumlah_transaksi ?? 0);

        $totalUangSalur = (float) ($ringkasanSalur->total_salur_uang ?? 0);
        $totalBerasSalur = (float) ($ringkasanSalur->total_salur_beras_kg ?? 0);
        $totalPenerimaManfaat = (int) ($ringkasanSalur->jumlah_penerima_manfaat ?? 0);
        $totalBkk = (int) ($ringkasanSalur->jumlah_bkk ?? 0);

        $uangAmil = (float) ($danaAmil->total_uang_amil ?? 0);
        $berasAmil = (float) ($danaAmil->total_beras_amil_kg ?? 0);
        $persenAmil = $totalUangSalur > 0 ? ($uangAmil / $totalUangSalur) * 100 : 0;
    @endphp

    <div class="header">
        <p class="title">LAPORAN PENGHIMPUNAN &amp; PENYALURAN PERIODE RAMADHAN</p>
        <p class="subtitle">
            Lembaga Amil Zakat (LAZ) Masjid Istiqamah Rumbai &bull;
            Periode {{ $periode->tahun_hijriah }} ({{ $periode->tahun_masehi }} M) &bull;
            Dicetak: {{ $dicetakPada }}
        </p>
    </div>

    <div class="section-title">1. Ringkasan Eksekutif Periode Ramadhan {{ $periode->tahun_masehi }}</div>
    <table class="kpi-table">
        <tr>
            <td>
                <div class="kpi-label">Dana Didapat</div>
                <div class="kpi-value">Rp {{ number_format($totalUangHimpun, 0, ',', '.') }}</div>
                <div class="kpi-sub">Beras: {{ number_format($totalBerasHimpun, 2, ',', '.') }} kg</div>
            </td>
            <td>
                <div class="kpi-label">Jumlah Muzaki</div>
                <div class="kpi-value">{{ number_format($totalMuzaki, 0, ',', '.') }} Orang</div>
                <div class="kpi-sub">{{ number_format($totalTransaksi, 0, ',', '.') }} transaksi sah</div>
            </td>
            <td>
                <div class="kpi-label">Penerima Manfaat</div>
                <div class="kpi-value">{{ number_format($totalPenerimaManfaat, 0, ',', '.') }} KK</div>
                <div class="kpi-sub">Belum terima: {{ number_format($jumlahBelumTerima, 0, ',', '.') }} KK</div>
            </td>
            <td>
                <div class="kpi-label">Dana Disalurkan</div>
                <div class="kpi-value">Rp {{ number_format($totalUangSalur, 0, ',', '.') }}</div>
                <div class="kpi-sub">Beras: {{ number_format($totalBerasSalur, 2, ',', '.') }} kg ({{ $totalBkk }} BKK)</div>
            </td>
            <td>
                <div class="kpi-label">Diterima Amil (ASN-03)</div>
                <div class="kpi-value">Rp {{ number_format($uangAmil, 0, ',', '.') }}</div>
                <div class="kpi-sub">Beras: {{ number_format($berasAmil, 2, ',', '.') }} kg ({{ number_format($persenAmil, 2, ',', '.') }}%)</div>
            </td>
        </tr>
    </table>

    <div class="section-title">2. Rincian Dana Terhimpun per Jenis Zakat / Dana</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode</th>
                <th>Jenis Dana</th>
                <th>Kategori</th>
                <th class="text-right">Muzaki</th>
                <th class="text-right">Dana Uang (Rp)</th>
                <th class="text-right">Beras (kg)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rincianHimpunDana as $row)
                <tr>
                    <td>{{ $row->kode_dana }}</td>
                    <td>{{ $row->nama_dana }}</td>
                    <td>{{ $row->kategori_utama }}</td>
                    <td class="text-right">{{ number_format((int) $row->jumlah_muzaki, 0, ',', '.') }}</td>
                    <td class="text-right">Rp {{ number_format((float) $row->total_uang, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) $row->total_beras_kg, 2, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="text-center">Belum ada transaksi penghimpunan sah pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="section-title">3. Rincian Penyaluran per Golongan 8 Asnaf (Termasuk Hak Amil)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode</th>
                <th>Golongan Asnaf</th>
                <th class="text-right">Penerima (KK)</th>
                <th class="text-right">Total Disalurkan (Rp)</th>
                <th class="text-right">Total Beras (kg)</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rincianAsnaf as $asnaf)
                <tr>
                    <td>{{ $asnaf->kode_asnaf }}</td>
                    <td>{{ $asnaf->nama_asnaf }}</td>
                    <td class="text-right">{{ number_format((int) $asnaf->jumlah_mustahik, 0, ',', '.') }}</td>
                    <td class="text-right">Rp {{ number_format((float) $asnaf->total_uang, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) $asnaf->total_beras_kg, 2, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="section-title">4. Ringkasan Total Penyaluran &amp; Frekuensi Penerimaan Mustahik per Jenis Zakat</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode</th>
                <th>Jenis Zakat / Dana</th>
                <th class="text-right">Penerima (KK)</th>
                <th class="text-right">Terima 1x</th>
                <th class="text-right">Terima &ge;2x</th>
                <th class="text-right">Total Tersalurkan (Rp)</th>
                <th class="text-right">Total Beras (kg)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($catatanMustahik as $cat)
                <tr>
                    <td>{{ $cat->kode_dana }}</td>
                    <td><strong>{{ $cat->nama_dana }}</strong></td>
                    <td class="text-right">{{ number_format((int) $cat->jumlah_penerima_kk, 0, ',', '.') }} KK</td>
                    <td class="text-right">{{ number_format((int) $cat->terima_1x, 0, ',', '.') }} KK</td>
                    <td class="text-right">{{ number_format((int) $cat->terima_2x_plus, 0, ',', '.') }} KK</td>
                    <td class="text-right">Rp {{ number_format((float) $cat->total_nominal_diterima, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) $cat->total_beras_diterima_kg, 2, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center">Belum ada catatan penyaluran mustahik pada periode ini.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
    <p style="font-size: 9px; color: #475569; margin: 4px 0 0 0;">
        Catatan: Mustahik berstatus Layak yang belum menerima zakat pada periode ini: <strong>{{ number_format($jumlahBelumTerima, 0, ',', '.') }} KK</strong>.
    </p>

    <table class="footer-sign">
        <tr>
            <td>
                Mengetahui,<br>
                Ketua DKM / Pimpinan LAZ Masjid Istiqamah Rumbai
                <br><br><br><br>
                ( ______________________________ )
            </td>
            <td>
                Disusun Oleh,<br>
                Bendahara / Admin Keuangan ZIS
                <br><br><br><br>
                ( ______________________________ )
            </td>
        </tr>
    </table>
</body>
</html>
