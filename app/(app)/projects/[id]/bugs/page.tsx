import Link from 'next/link';
import { Bug, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar } from '@/components/ui/avatar';
import {
  Badge,
  BUG_PRIORITY_TONES,
  BUG_SEVERITY_TONES,
  BUG_STATUS_TONES,
} from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import type {
  BugPriority,
  BugSeverity,
  BugStatus,
} from '@/lib/supabase/database.types';

export const metadata = { title: 'Bugs' };

const STATUS_OPTIONS: { value: BugStatus | 'open' | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'verified', label: 'Verified' },
  { value: 'closed', label: 'Closed' },
];

export default async function BugsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser();
  const supabase = await createClient();

  let q = supabase
    .from('bugs')
    .select(
      'id, title, severity, priority, status, created_at, reporter:profiles!reporter_id(full_name, avatar_url), assignee:profiles!assignee_id(full_name, avatar_url)'
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (sp.status === 'open') {
    q = q.not('status', 'in', '("closed","wont_fix","verified")');
  } else if (sp.status) {
    q = q.eq('status', sp.status as BugStatus);
  }
  if (sp.q) q = q.ilike('title', `%${sp.q}%`);

  const { data } = await q;

  type Row = {
    id: string;
    title: string;
    severity: BugSeverity;
    priority: BugPriority;
    status: BugStatus;
    created_at: string;
    reporter: { full_name: string; avatar_url: string | null } | null;
    assignee: { full_name: string; avatar_url: string | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bugs"
        description="Track defects from filing to verification."
        actions={
          <Link href={`/projects/${id}/bugs/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              File a bug
            </Button>
          </Link>
        }
      />

      <form className="flex flex-wrap items-center gap-3" action={`/projects/${id}/bugs`}>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-9 rounded-lg border border-[color:var(--input)] bg-[color:var(--card)] px-3 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search bug titles…"
          className="h-9 max-w-sm flex-1 rounded-lg border border-[color:var(--input)] bg-[color:var(--card)] px-3 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Bug className="h-5 w-5" />}
          title="No bugs match"
          description="Either no bugs are filed yet, or your filters excluded everything."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Assignee</th>
                <th className="px-4 py-3 text-left">Filed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${id}/bugs/${b.id}`}
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
                  <td className="px-4 py-3">
                    {b.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={b.assignee.full_name}
                          src={b.assignee.avatar_url}
                          size="xs"
                        />
                        <span className="text-xs">{b.assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        Unassigned
                      </span>
                    )}
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
