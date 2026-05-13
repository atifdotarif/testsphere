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

const NAV: Item[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Gauge, pattern: /^\/dashboard/ },
  { href: '/projects', label: 'Projects', icon: ClipboardList, pattern: /^\/projects$/ },
  { href: '/test-cases', label: 'My cases', icon: FlaskConical, pattern: /^\/test-cases/ },
  { href: '/bugs', label: 'My bugs', icon: Bug, pattern: /^\/bugs/ },
];

export function Sidebar({ projects }: { projects: { id: string; key: string; name: string }[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] lg:flex">
      {/* Brand */}
      <Link
        href="/dashboard"
        className="flex h-14 items-center gap-2 border-b border-[color:var(--border)] px-4"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--primary)] text-white">
          <TestTube2 className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Test Sphere</span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 text-[13px]">
        <SidebarSection label="Workspace">
          {NAV.map((item) => {
            const active = item.pattern ? item.pattern.test(pathname) : pathname === item.href;
            return (
              <SidebarLink key={item.href} href={item.href} active={active}>
                <item.icon className="h-[15px] w-[15px]" />
                {item.label}
              </SidebarLink>
            );
          })}
        </SidebarSection>

        {projects.length > 0 ? (
          <SidebarSection label="Projects" count={projects.length}>
            {projects.slice(0, 10).map((p) => {
              const href = `/projects/${p.id}`;
              const active = pathname.startsWith(href);
              return (
                <SidebarLink key={p.id} href={href} active={active}>
                  <span
                    className={cn(
                      'grid h-[15px] w-[15px] place-items-center rounded text-[9px] font-semibold',
                      active
                        ? 'bg-[color:var(--primary)] text-white'
                        : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
                    )}
                  >
                    {p.key.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate">{p.name}</span>
                </SidebarLink>
              );
            })}
            {projects.length > 10 ? (
              <Link
                href="/projects"
                className="block px-2.5 py-1.5 text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              >
                + {projects.length - 10} more
              </Link>
            ) : null}
          </SidebarSection>
        ) : null}
      </nav>

      <div className="border-t border-[color:var(--border)] px-4 py-3 text-[11px] text-[color:var(--muted-foreground)]">
        v1.0 · QA workspace
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
        <span>{label}</span>
        {typeof count === 'number' ? (
          <span className="rounded-sm bg-[color:var(--muted)] px-1 text-[10px] font-medium">
            {count}
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors',
        active
          ? 'bg-[color:var(--muted)] font-medium text-[color:var(--foreground)]'
          : 'text-[color:var(--subtle-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]'
      )}
    >
      {children}
    </Link>
  );
}
