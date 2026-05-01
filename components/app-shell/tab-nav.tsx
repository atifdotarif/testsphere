'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function TabNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto border-b border-[color:var(--border)]">
      <nav className="flex min-w-max gap-1">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== '/' && pathname.startsWith(it.href + '/'));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors',
                active
                  ? 'text-[color:var(--primary)]'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              )}
            >
              {it.label}
              {active ? (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-[color:var(--primary)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
