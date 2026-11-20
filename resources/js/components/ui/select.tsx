import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            className={cn(
                'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}

export function SelectContent({
    className,
    children,
    position = 'popper',
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                position={position}
                className={cn(
                    'relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
                    className
                )}
                {...props}
            >
                <SelectPrimitive.Viewport className="p-1">
                    {children}
                </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}

export function SelectLabel({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
            {...props}
        />
    );
}

export function SelectItem({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            className={cn(
                'relative flex w-full select-none items-center rounded-sm py-2 pl-2.5 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className
            )}
            {...props}
        >
            <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    );
}

export function SelectSeparator({
    className,
    ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            className={cn('-mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    );
}
