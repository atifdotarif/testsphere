import Link from 'next/link';
import { Bug, ClipboardList, FlaskConical, GitPullRequestArrow, PlayCircle, TrendingUp } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge, BUG_STATUS_TONES, RUN_TONES } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { formatRelative } from '@/lib/utils/format';
import type { Bug as BugRow, TestRun } from '@/lib/supabase/database.types';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  // RLS limits these queries to projects this user is a member of.
  const [
    { count: projectCount },
    { count: caseCount },
    { count: openBugCount },
    { count: assignedBugCount },
    { data: recentRuns },
    { data: recentBugs },
    { data: passFail },
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('test_cases').select('id', { count: 'exact', head: true }),
    supabase
      .from('bugs')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '("closed","wont_fix","verified")'),
    supabase
      .from('bugs')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', profile.id)
      .not('status', 'in', '("closed","wont_fix","verified")'),
    supabase
      .from('test_runs')
      .select('id, name, status, project_id, created_at, projects(name, key)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('bugs')
      .select('id, title, status, severity, created_at, project_id, projects(name, key)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('test_run_results').select('status'),
  ]);

  type ResultRow = { status: 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped' };
  const passFailRows = (passFail ?? []) as unknown as ResultRow[];
  const total = passFailRows.length;
  const passed = passFailRows.filter((r) => r.status === 'passed').length;
  const failed = passFailRows.filter((r) => r.status === 'failed').length;
  const blocked = passFailRows.filter((r) => r.status === 'blocked').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  type RunRow = Pick<TestRun, 'id' | 'name' | 'status' | 'project_id' | 'created_at'> & {
    projects: { name: string; key: string } | null;
  };
  type BugListRow = Pick<BugRow, 'id' | 'title' | 'status' | 'severity' | 'created_at' | 'project_id'> & {
    projects: { name: string; key: string } | null;
  };

  const runs = (recentRuns ?? []) as unknown as RunRow[];
  const bugs = (recentBugs ?? []) as unknown as BugListRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${profile.full_name.split(' ')[0]}`}
        description="A snapshot of QA activity across the projects you can see."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={projectCount ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label="Test cases"
          value={caseCount ?? 0}
          icon={<FlaskConical className="h-5 w-5" />}
          tone="default"
        />
        <StatCard
          label="Open bugs"
          value={openBugCount ?? 0}
          hint={`${assignedBugCount ?? 0} assigned to you`}
          icon={<Bug className="h-5 w-5" />}
          tone={openBugCount && openBugCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Pass rate"
          value={`${passRate}%`}
          hint={`${passed} passed · ${failed} failed · ${blocked} blocked`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={passRate >= 80 ? 'success' : passRate >= 50 ? 'warning' : 'danger'}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent test runs</h2>
            <Link
              href="/projects"
              className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              View all
            </Link>
          </div>
          {runs.length === 0 ? (
            <EmptyState
              icon={<PlayCircle className="h-5 w-5" />}
              title="No test runs yet"
              description="Create a project and execute your first test plan to see results here."
            />
          ) : (
            <div className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {runs.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${r.project_id}/runs/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[color:var(--muted)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)]">
                      {r.projects?.name ?? '—'} · {formatRelative(r.created_at)}
                    </div>
                  </div>
                  <Badge tone={RUN_TONES[r.status]}>{r.status.replace('_', ' ')}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Latest bugs</h2>
            <Link
              href="/bugs"
              className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              View all
            </Link>
          </div>
          {bugs.length === 0 ? (
            <EmptyState
              icon={<GitPullRequestArrow className="h-5 w-5" />}
              title="No bugs reported"
              description="When testers find issues, they'll show up here."
            />
          ) : (
            <div className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {bugs.map((b) => (
                <Link
                  key={b.id}
                  href={`/projects/${b.project_id}/bugs/${b.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[color:var(--muted)]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-[color:var(--muted-foreground)]">
                      {b.projects?.name ?? '—'} · {b.severity} · {formatRelative(b.created_at)}
                    </div>
                  </div>
                  <Badge tone={BUG_STATUS_TONES[b.status]}>
                    {b.status.replace('_', ' ')}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
