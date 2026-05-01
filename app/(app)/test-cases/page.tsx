import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, PRIORITY_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import type { CaseStatus, TestPriority } from '@/lib/supabase/database.types';

export const metadata = { title: 'My test cases' };

export default async function MyCasesPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('test_cases')
    .select('id, title, priority, status, project_id, updated_at, projects(name, key)')
    .eq('created_by', profile.id)
    .order('updated_at', { ascending: false });

  type Row = {
    id: string;
    title: string;
    priority: TestPriority;
    status: CaseStatus;
    project_id: string;
    updated_at: string;
    projects: { name: string; key: string } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My test cases"
        description="Test cases you authored, across every project you can see."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="h-5 w-5" />}
          title="No cases yet"
          description="Author cases inside any project to see them listed here."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50">
                  <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {c.projects?.key ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${c.project_id}/cases/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITY_TONES[c.priority]}>{c.priority}</Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.status}</td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                    {formatRelative(c.updated_at)}
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
