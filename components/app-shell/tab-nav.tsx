'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function TabNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  // Pick the active tab as the one with the *longest* href that matches —
  // prevents parent routes from lighting up on every child.
  const activeHref = items
    .filter((it) => pathname === it.href || pathname.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="overflow-x-auto border-b border-[color:var(--border)]">
      <nav className="flex min-w-max gap-0">
        {items.map((it) => {
          const active = it.href === activeHref;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? 'text-[color:var(--foreground)]'
                  : 'text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]'
              )}
            >
              {it.label}
              {active ? (
                <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[color:var(--primary)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
