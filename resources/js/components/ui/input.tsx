import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({ className, type, onFocus, onChange, placeholder, ...props }, ref) => {
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            if (
                type === 'number' &&
                (e.currentTarget.value === '0' ||
                    e.currentTarget.value === '0.00' ||
                    e.currentTarget.value === '0,00')
            ) {
                e.currentTarget.select();
            }
            onFocus?.(e);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (type === 'number' && /^0+\d/.test(e.currentTarget.value)) {
                e.currentTarget.value = e.currentTarget.value.replace(/^0+(?=\d)/, '');
            }
            onChange?.(e);
        };

        return (
            <input
                type={type}
                placeholder={placeholder ?? (type === 'number' ? '0' : undefined)}
                onFocus={handleFocus}
                onChange={handleChange}
                className={cn(
                    'flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export { Input };
