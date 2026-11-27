import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
    return (
        <div className="relative w-full overflow-x-auto">
            <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={cn('border-b bg-secondary/70', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={cn('divide-y divide-border', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tfoot className={cn('border-t bg-muted/40 font-medium', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return <tr className={cn('transition-colors hover:bg-muted/40', className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={cn('h-11 px-4 text-left align-middle text-xs font-semibold tracking-wider text-foreground', className)}
            {...props}
        />
    );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return <td className={cn('p-4 align-middle', className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
    return <caption className={cn('mt-3 text-sm text-muted-foreground', className)} {...props} />;
}
