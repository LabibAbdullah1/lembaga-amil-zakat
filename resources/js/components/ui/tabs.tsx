import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            className={cn(
                'inline-flex min-h-11 items-center justify-start gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
                className
            )}
            {...props}
        />
    );
}

export function TabsTrigger({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            className={cn(
                'inline-flex min-h-9 items-center justify-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs',
                className
            )}
            {...props}
        />
    );
}

export function TabsContent({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            className={cn('mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
            {...props}
        />
    );
}
