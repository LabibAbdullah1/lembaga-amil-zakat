import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface RdbmsAlertProps {
    message?: string | null;
    title?: string;
}

export function RdbmsAlert({
    message,
    title = 'Pemberitahuan Validasi Syariat & Transaksi',
}: RdbmsAlertProps) {
    if (!message) {
        return null;
    }

    return (
        <Alert variant="destructive" className="my-3 shadow-xs">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="mt-1 font-medium">
                {message}
            </AlertDescription>
        </Alert>
    );
}
