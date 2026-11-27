import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary text-primary-foreground',
                secondary: 'border-border bg-secondary text-secondary-foreground font-medium',
                destructive: 'border-red-300 bg-red-50 text-red-900 font-semibold dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-200',
                outline: 'border-border bg-transparent text-foreground font-medium',
                warning: 'border-amber-300 bg-amber-50 text-amber-950 font-semibold dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200',
                success: 'border-emerald-300 bg-emerald-50 text-emerald-950 font-semibold dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:text-emerald-200',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
