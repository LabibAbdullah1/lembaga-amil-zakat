const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export function formatRupiah(value: number | string | null | undefined): string {
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
    if (Number.isNaN(numeric)) {
        return 'Rp 0';
    }
    return rupiahFormatter.format(numeric).replace('Rp\u00a0', 'Rp ');
}

export function formatBerasKg(value: number | string | null | undefined): string {
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
    if (Number.isNaN(numeric)) {
        return '0,00 kg';
    }
    return `${numberFormatter.format(numeric)} kg`;
}

export function formatPercentage(value: number | string | null | undefined): string {
    const numeric = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
    if (Number.isNaN(numeric)) {
        return '0,00%';
    }
    return `${numberFormatter.format(numeric)}%`;
}

export function formatTanggalIndonesia(dateInput: string | Date | null | undefined): string {
    if (!dateInput) {
        return '-';
    }
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) {
        return String(dateInput);
    }
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}
