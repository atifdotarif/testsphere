import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}) {
  const accentClass = {
    default: 'text-[color:var(--foreground)]',
    success: 'text-emerald-700 dark:text-emerald-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
    info: 'text-sky-700 dark:text-sky-300',
  }[tone ?? 'default'];

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4',
        className
      )}
    >
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
        <span>{label}</span>
        {icon ? <span className="text-[color:var(--muted-foreground)]">{icon}</span> : null}
      </div>
      <div className={cn('text-2xl font-semibold tabular-nums tracking-tight', accentClass)}>
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-[color:var(--muted-foreground)]">{hint}</div>
      ) : null}
    </div>
  );
}
