import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-[color:var(--input)] bg-[color:var(--card)] px-3 text-sm text-[color:var(--foreground)] transition-colors placeholder:text-[color:var(--muted-foreground)] focus-visible:border-[color:var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/15 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full rounded-md border border-[color:var(--input)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--foreground)] transition-colors placeholder:text-[color:var(--muted-foreground)] focus-visible:border-[color:var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/15 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full appearance-none rounded-md border border-[color:var(--input)] bg-[color:var(--card)] bg-[length:16px_16px] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-sm text-[color:var(--foreground)] transition-colors focus-visible:border-[color:var(--ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/15 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'mb-1.5 block text-xs font-medium text-[color:var(--subtle-foreground)]',
        className
      )}
      {...props}
    />
  );
}

export function FieldError({ message }: { message?: string | string[] }) {
  if (!message) return null;
  const text = Array.isArray(message) ? message.join(', ') : message;
  return <p className="mt-1.5 text-xs text-[color:var(--destructive)]">{text}</p>;
}
