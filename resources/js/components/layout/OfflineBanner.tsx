import * as React from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
    const [isOnline, setIsOnline] = React.useState<boolean>(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="assertive"
            className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
                Perangkat sedang luring (offline). Input transaksi ZIS dan pencairan BKK dinonaktifkan sementara demi menjaga integritas saldo RDBMS.
            </span>
        </div>
    );
}
