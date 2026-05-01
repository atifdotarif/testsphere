'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bug,
  ClipboardList,
  FlaskConical,
  Gauge,
  TestTube2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Item = { href: string; label: string; icon: LucideIcon; pattern?: RegExp };

export function Sidebar({ projects }: { projects: { id: string; key: string; name: string }[] }) {
  const pathname = usePathname();

  const main: Item[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Gauge, pattern: /^\/dashboard/ },
    { href: '/projects', label: 'Projects', icon: ClipboardList, pattern: /^\/projects$/ },
    { href: '/bugs', label: 'My bugs', icon: Bug, pattern: /^\/bugs/ },
    { href: '/test-cases', label: 'My cases', icon: FlaskConical, pattern: /^\/test-cases/ },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] lg:flex">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2 border-b border-[color:var(--border)] px-5 text-base font-semibold"
      >
        <TestTube2 className="h-5 w-5 text-[color:var(--primary)]" />
        Test Sphere
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {main.map((item) => {
          const active = item.pattern ? item.pattern.test(pathname) : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
                  : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {projects.length > 0 ? (
          <div className="mt-6">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Your projects
            </p>
            <div className="space-y-0.5">
              {projects.slice(0, 8).map((p) => {
                const href = `/projects/${p.id}`;
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={p.id}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
                        : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]'
                    )}
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-[color:var(--primary)]/10 text-[10px] font-semibold text-[color:var(--primary)]">
                      {p.key.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </nav>
    </aside>
  );
}
