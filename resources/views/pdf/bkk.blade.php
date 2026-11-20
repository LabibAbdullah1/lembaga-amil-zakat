<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Bukti Kas Keluar {{ $bkk->no_bkk }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #0f172a;
            margin: 0;
            padding: 20px;
        }
        .header {
            border-bottom: 2px solid #059669;
            padding-bottom: 10px;
            margin-bottom: 14px;
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
            margin: 3px 0 0 0;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .meta-table td {
            padding: 3px 4px;
            vertical-align: top;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
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
            vertical-align: middle;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 24px;
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
        <p class="title">BUKTI KAS KELUAR (BKK) PENYALURAN DANA ZIS &amp; ZAKAT FITRAH</p>
        <p class="subtitle">Lembaga Amil Zakat (LAZ) &amp; Panitia Zakat Fitrah Masjid</p>
    </div>

    <table class="meta-table">
        <tr>
            <td style="width: 20%;"><strong>No. Dokumen BKK</strong></td>
            <td style="width: 32%;">: {{ $bkk->no_bkk }}</td>
            <td style="width: 20%;"><strong>Tanggal Penyaluran</strong></td>
            <td style="width: 28%;">: {{ $bkk->tanggal_penyaluran }}</td>
        </tr>
        <tr>
            <td><strong>Program Penyaluran</strong></td>
            <td>: [{{ $bkk->kode_program }}] {{ $bkk->nama_program }}</td>
            <td><strong>Kantong Sumber Dana</strong></td>
            <td>: [{{ $bkk->kode_dana }}] {{ $bkk->nama_dana }}</td>
        </tr>
        <tr>
            <td><strong>Status Persetujuan</strong></td>
            <td>: <strong>{{ strtoupper($bkk->status_persetujuan) }}</strong></td>
            <td><strong>Disetujui Oleh</strong></td>
            <td>: {{ $bkk->nama_penyetuju ?? '-' }}</td>
        </tr>
        @if($bkk->status_persetujuan === 'Ditolak' && $bkk->catatan_penolakan)
        <tr>
            <td><strong>Catatan Penolakan</strong></td>
            <td colspan="3">: {{ $bkk->catatan_penolakan }}</td>
        </tr>
        @endif
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 28%;">Nama Mustahik &amp; NIK</th>
                <th style="width: 18%;">Golongan Asnaf</th>
                <th class="text-right" style="width: 16%;">Uang Diterima</th>
                <th class="text-right" style="width: 13%;">Beras (Kg)</th>
                <th style="width: 20%;">Paraf Serah Terima</th>
            </tr>
        </thead>
        <tbody>
            @foreach($detailMustahik as $idx => $item)
                <tr>
                    <td>{{ $idx + 1 }}</td>
                    <td>
                        <strong>{{ $item->nama_mustahik }}</strong><br>
                        <span style="font-size: 9px; color: #475569;">NIK: {{ $item->nik_mustahik }} | {{ $item->alamat_rt_rw ?? '-' }}</span>
                    </td>
                    <td>{{ $item->kode_asnaf }} ({{ $item->nama_asnaf }})</td>
                    <td class="text-right">Rp {{ number_format((float) $item->nominal_diterima, 0, ',', '.') }}</td>
                    <td class="text-right">{{ number_format((float) $item->beras_diterima_kg, 2, ',', '.') }} kg</td>
                    <td>
                        {{ $item->status_serah_terima === 'Sudah' ? 'SUDAH DISERAHKAN' : '..............................' }}
                    </td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <th colspan="3" class="text-right">TOTAL PENYALURAN BKK</th>
                <th class="text-right">Rp {{ number_format((float) $bkk->total_disalurkan, 0, ',', '.') }}</th>
                <th class="text-right">{{ number_format((float) $bkk->total_beras_kg, 2, ',', '.') }} kg</th>
                <th></th>
            </tr>
        </tfoot>
    </table>

    <table class="footer">
        <tr>
            <td>
                <p>Diajukan Oleh (Staf Penyaluran),</p>
                <br><br><br>
                <p><strong>({{ $bkk->nama_pembuat }})</strong></p>
            </td>
            <td>
                <p>Disetujui &amp; Dicairkan Oleh (Ketua DKM),</p>
                <br><br><br>
                <p><strong>({{ $bkk->nama_penyetuju ?? '...........................' }})</strong></p>
            </td>
        </tr>
    </table>
</body>
</html>
