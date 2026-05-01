import Link from 'next/link';
import { Bug, FlaskConical, ListChecks, PlayCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, BUG_STATUS_TONES, RUN_TONES } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import type { ResultStatus } from '@/lib/supabase/database.types';

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const [
    { count: cases },
    { count: plans },
    { count: openBugs },
    { data: runs },
    { data: results },
    { data: activity },
  ] = await Promise.all([
    supabase.from('test_cases').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('test_plans').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase
      .from('bugs')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', id)
      .not('status', 'in', '("closed","wont_fix","verified")'),
    supabase
      .from('test_runs')
      .select('id, name, status, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('test_run_results')
      .select('status, run_id, test_runs!inner(project_id)')
      .eq('test_runs.project_id', id),
    supabase
      .from('activity_log')
      .select('id, action, entity_type, metadata, created_at, profiles(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  type ResultRow = { status: ResultStatus };
  const resultRows = (results ?? []) as ResultRow[];
  const passed = resultRows.filter((r) => r.status === 'passed').length;
  const failed = resultRows.filter((r) => r.status === 'failed').length;
  const blocked = resultRows.filter((r) => r.status === 'blocked').length;
  const passRate =
    resultRows.length > 0 ? Math.round((passed / resultRows.length) * 100) : 0;

  type Run = { id: string; name: string; status: 'not_started' | 'in_progress' | 'completed' | 'aborted'; created_at: string };
  type Activity = {
    id: string;
    action: string;
    entity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
    profiles: { full_name: string } | null;
  };

  const runRows = (runs ?? []) as Run[];
  const activityRows = (activity ?? []) as unknown as Activity[];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Test cases"
          value={cases ?? 0}
          icon={<FlaskConical className="h-5 w-5" />}
        />
        <StatCard
          label="Test plans"
          value={plans ?? 0}
          icon={<ListChecks className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Open bugs"
          value={openBugs ?? 0}
          icon={<Bug className="h-5 w-5" />}
          tone={openBugs && openBugs > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Pass rate"
          value={`${passRate}%`}
          hint={`${passed} passed · ${failed} failed · ${blocked} blocked`}
          icon={<PlayCircle className="h-5 w-5" />}
          tone={passRate >= 80 ? 'success' : passRate >= 50 ? 'warning' : 'danger'}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-base font-semibold">Recent test runs</h2>
          {runRows.length === 0 ? (
            <EmptyState
              icon={<PlayCircle className="h-5 w-5" />}
              title="No test runs"
              description="Create a test plan and start executing it."
            />
          ) : (
            <div className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {runRows.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${id}/runs/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[color:var(--muted)]"
                >
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)]">
                      {formatRelative(r.created_at)}
                    </div>
                  </div>
                  <Badge tone={RUN_TONES[r.status]}>{r.status.replace('_', ' ')}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold">Activity</h2>
          {activityRows.length === 0 ? (
            <EmptyState title="Nothing yet" description="Activity will appear once your team starts working." />
          ) : (
            <ul className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {activityRows.map((a) => (
                <li key={a.id} className="px-4 py-3 text-sm">
                  <span className="font-medium">{a.profiles?.full_name ?? 'Someone'}</span>{' '}
                  <span className="text-[color:var(--muted-foreground)]">
                    {a.action.replace('_', ' ')} {a.entity_type.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-[color:var(--muted-foreground)]">
                    {formatRelative(a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
