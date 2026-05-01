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
  const toneClass = {
    default: 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  }[tone ?? 'default'];

  return (
    <div
      className={cn(
        'flex items-start justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-sm',
        className
      )}
    >
      <div>
        <div className="text-sm font-medium text-[color:var(--muted-foreground)]">
          {label}
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <div className="mt-1 text-xs text-[color:var(--muted-foreground)]">{hint}</div>
        ) : null}
      </div>
      {icon ? (
        <div
          className={cn(
            'grid h-10 w-10 place-items-center rounded-lg',
            toneClass
          )}
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
}
