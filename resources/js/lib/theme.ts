import * as React from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'laz-theme';

export function getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' ? 'light' : 'dark';
}

export function applyThemeToDom(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', mode === 'dark' ? '#1A1A1A' : '#FAF8F5');
    }
}

export function useTheme() {
    const [theme, setThemeState] = React.useState<ThemeMode>(() => getStoredTheme());

    React.useEffect(() => {
        applyThemeToDom(theme);
    }, [theme]);

    const setTheme = React.useCallback((next: ThemeMode) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
        applyThemeToDom(next);
        setThemeState(next);
        window.dispatchEvent(new CustomEvent('laz-theme-change', { detail: next }));
    }, []);

    const toggleTheme = React.useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<ThemeMode>;
            if (custom.detail === 'light' || custom.detail === 'dark') {
                setThemeState(custom.detail);
            }
        };
        window.addEventListener('laz-theme-change', handler);
        return () => window.removeEventListener('laz-theme-change', handler);
    }, []);

    return { theme, setTheme, toggleTheme };
}
