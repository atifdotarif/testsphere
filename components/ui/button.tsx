import * as React from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:var(--primary-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary:
    'border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]',
  ghost: 'text-[color:var(--foreground)] hover:bg-[color:var(--muted)]',
  destructive:
    'bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] hover:opacity-90',
  outline:
    'border border-[color:var(--border)] bg-transparent text-[color:var(--foreground)] hover:bg-[color:var(--muted)]',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 text-sm rounded-md gap-2',
  icon: 'h-8 w-8 rounded-md',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
});
