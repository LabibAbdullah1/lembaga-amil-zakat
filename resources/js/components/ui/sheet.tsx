import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

export function SheetOverlay({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            className={cn('fixed inset-0 z-50 bg-black/60', className)}
            {...props}
        />
    );
}

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
    side?: 'left' | 'right' | 'top' | 'bottom';
}

export function SheetContent({
    side = 'right',
    className,
    children,
    ...props
}: SheetContentProps) {
    const sideClasses: Record<NonNullable<SheetContentProps['side']>, string> = {
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r',
        right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l',
        top: 'inset-x-0 top-0 border-b',
        bottom: 'inset-x-0 bottom-0 border-t',
    };

    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Content
                className={cn(
                    'fixed z-50 bg-card p-6 shadow-lg',
                    sideClasses[side],
                    className
                )}
                {...props}
            >
                {children}
                <SheetPrimitive.Close
                    aria-label="Tutup panel"
                    className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </SheetPrimitive.Close>
            </SheetPrimitive.Content>
        </SheetPortal>
    );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    );
}

export function SheetTitle({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
    return (
        <SheetPrimitive.Title
            className={cn('text-lg font-semibold text-foreground', className)}
            {...props}
        />
    );
}

export function SheetDescription({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
    return (
        <SheetPrimitive.Description
            className={cn('text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}
