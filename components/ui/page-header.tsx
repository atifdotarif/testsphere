import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-2', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)]">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {c.href ? (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-[color:var(--foreground)]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-[color:var(--foreground)]">{c.label}</span>
              )}
              {i < breadcrumbs.length - 1 ? (
                <ChevronRight className="h-3 w-3 text-[color:var(--border-strong)]" />
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[color:var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
