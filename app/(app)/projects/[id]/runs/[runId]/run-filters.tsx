'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

const STATUSES: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
];

export default function RunFilters({
  basePath,
  mine,
  status,
}: {
  basePath: string;
  mine: boolean;
  status: string;
}) {
  function buildHref(patch: { mine?: boolean; status?: string }) {
    const params = new URLSearchParams();
    const nextMine = patch.mine ?? mine;
    const nextStatus = patch.status ?? status;
    if (nextMine) params.set('mine', '1');
    if (nextStatus && nextStatus !== 'all') params.set('status', nextStatus);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <Link
        href={buildHref({ mine: !mine })}
        className={cn(
          'rounded-md border px-2 py-1 font-medium transition',
          mine
            ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white'
            : 'border-[color:var(--border)] hover:bg-[color:var(--muted)]'
        )}
      >
        {mine ? '✓ Mine only' : 'Mine only'}
      </Link>
      <span className="mx-1 h-4 w-px bg-[color:var(--border)]" />
      {STATUSES.map((s) => (
        <Link
          key={s.value}
          href={buildHref({ status: s.value })}
          className={cn(
            'rounded-md border px-2 py-1 transition',
            status === s.value
              ? 'border-[color:var(--primary)] bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
              : 'border-[color:var(--border)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]'
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
