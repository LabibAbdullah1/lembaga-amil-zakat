import * as React from 'react';

interface LazySectionProps {
    id?: string;
    className?: string;
    minHeightClass?: string;
    children: React.ReactNode;
}

/**
 * Merender konten section secara bertahap (lazy mount) dan memunculkannya
 * dengan transisi halus saat mendekati viewport pengguna.
 */
export function LazySection({
    id,
    className = '',
    minHeightClass = 'min-h-[240px]',
    children,
}: LazySectionProps) {
    const containerRef = React.useRef<HTMLElement | null>(null);
    const [hasEntered, setHasEntered] = React.useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        return !('IntersectionObserver' in window);
    });

    React.useEffect(() => {
        if (hasEntered) return;
        const node = containerRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setHasEntered(true);
                        observer.disconnect();
                        break;
                    }
                }
            },
            { rootMargin: '140px 0px', threshold: 0.01 }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasEntered]);

    return (
        <section
            ref={containerRef}
            id={id}
            className={`transition-all duration-500 ease-out ${
                hasEntered ? 'opacity-100 translate-y-0' : `opacity-0 translate-y-4 ${minHeightClass}`
            } ${className}`}
        >
            {hasEntered ? (
                children
            ) : (
                <div
                    aria-busy="true"
                    className={`rounded-lg border border-border bg-card/60 p-6 ${minHeightClass} flex items-center justify-center`}
                >
                    <p className="text-xs font-mono text-muted-foreground">
                        Memuat bagian halaman...
                    </p>
                </div>
            )}
        </section>
    );
}
