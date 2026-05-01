import Link from 'next/link';
import { Bug } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, BUG_PRIORITY_TONES, BUG_SEVERITY_TONES, BUG_STATUS_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import type { BugPriority, BugSeverity, BugStatus } from '@/lib/supabase/database.types';

export const metadata = { title: 'My bugs' };

export default async function MyBugsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: 'assigned' | 'reported' }>;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const filter = sp.filter ?? 'assigned';

  const supabase = await createClient();
  let q = supabase
    .from('bugs')
    .select(
      'id, title, severity, priority, status, project_id, created_at, projects(name, key)'
    )
    .order('created_at', { ascending: false });

  if (filter === 'reported') q = q.eq('reporter_id', profile.id);
  else q = q.eq('assignee_id', profile.id);

  const { data } = await q;
  type Row = {
    id: string;
    title: string;
    severity: BugSeverity;
    priority: BugPriority;
    status: BugStatus;
    project_id: string;
    created_at: string;
    projects: { name: string; key: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My bugs"
        description="Bugs you reported or are responsible for, across every project."
      />

      <div className="flex gap-2">
        <Link
          href="/bugs?filter=assigned"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'assigned'
              ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
              : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]'
          }`}
        >
          Assigned to me
        </Link>
        <Link
          href="/bugs?filter=reported"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'reported'
              ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]'
              : 'text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]'
          }`}
        >
          Reported by me
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bug className="h-5 w-5" />}
          title="Nothing here"
          description={
            filter === 'assigned'
              ? "You don't have any bugs assigned to you."
              : "You haven't filed any bugs yet."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Bug</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Filed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50">
                  <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {b.projects?.key ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${b.project_id}/bugs/${b.id}`}
                      className="font-medium hover:underline"
                    >
                      {b.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={BUG_STATUS_TONES[b.status]}>
                      {b.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={BUG_SEVERITY_TONES[b.severity]}>{b.severity}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={BUG_PRIORITY_TONES[b.priority]}>{b.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {formatRelative(b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
