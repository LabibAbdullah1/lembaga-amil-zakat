import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme';

interface ThemeToggleProps {
    showLabel?: boolean;
    className?: string;
}

export function ThemeToggle({ showLabel = false, className = '' }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Button
            type="button"
            variant="outline"
            size={showLabel ? 'sm' : 'icon'}
            onClick={toggleTheme}
            aria-label={isDark ? 'Aktifkan Tema Terang' : 'Aktifkan Tema Gelap'}
            title={isDark ? 'Beralih ke Tema Terang' : 'Beralih ke Tema Gelap'}
            className={className}
        >
            {isDark ? (
                <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
                <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            {showLabel && (
                <span>{isDark ? 'Tema Terang' : 'Tema Gelap'}</span>
            )}
        </Button>
    );
}
