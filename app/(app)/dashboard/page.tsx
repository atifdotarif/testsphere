import Link from 'next/link';
import {
  Bug,
  ClipboardList,
  GitPullRequestArrow,
  PlayCircle,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
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
    { count: assignedCasesCount },
    { data: assignedRuns },
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
      .from('test_run_results')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', profile.id)
      .eq('status', 'pending'),
    supabase
      .from('test_run_results')
      .select(
        'id, status, test_runs!inner(id, name, project_id, status, projects(name, key))'
      )
      .eq('assigned_to', profile.id)
      .eq('status', 'pending')
      .limit(50),
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
  type AssignedRunRow = {
    id: string;
    status: string;
    test_runs: {
      id: string;
      name: string;
      project_id: string;
      status: 'not_started' | 'in_progress' | 'completed' | 'aborted';
      projects: { name: string; key: string } | null;
    };
  };

  const runs = (recentRuns ?? []) as unknown as RunRow[];
  const bugs = (recentBugs ?? []) as unknown as BugListRow[];
  // Group pending assignments by test_run so the dashboard doesn't list 30
  // individual rows when one tester owns a whole run.
  const assignedByRun = new Map<
    string,
    {
      runId: string;
      runName: string;
      projectId: string;
      runStatus: 'not_started' | 'in_progress' | 'completed' | 'aborted';
      projectName: string;
      count: number;
    }
  >();
  for (const row of (assignedRuns ?? []) as unknown as AssignedRunRow[]) {
    const r = row.test_runs;
    if (!r) continue;
    const key = r.id;
    const existing = assignedByRun.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      assignedByRun.set(key, {
        runId: r.id,
        runName: r.name,
        projectId: r.project_id,
        runStatus: r.status,
        projectName: r.projects?.name ?? '—',
        count: 1,
      });
    }
  }
  const myWork = Array.from(assignedByRun.values()).sort((a, b) => b.count - a.count);

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <PageHeader
        title={`Good to see you, ${firstName}.`}
        description="A snapshot of QA activity across the projects you can see."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cases for you"
          value={assignedCasesCount ?? 0}
          hint={
            (assignedCasesCount ?? 0) > 0
              ? `across ${myWork.length} run${myWork.length === 1 ? '' : 's'}`
              : 'No pending executions'
          }
          icon={<UserCircle2 className="h-3.5 w-3.5" />}
          tone={(assignedCasesCount ?? 0) > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Open bugs"
          value={openBugCount ?? 0}
          hint={`${assignedBugCount ?? 0} assigned to you`}
          icon={<Bug className="h-3.5 w-3.5" />}
          tone={openBugCount && openBugCount > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Pass rate"
          value={`${passRate}%`}
          hint={`${passed} passed · ${failed} failed · ${blocked} blocked`}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          tone={passRate >= 80 ? 'success' : passRate >= 50 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Projects"
          value={projectCount ?? 0}
          hint={`${caseCount ?? 0} test cases total`}
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          tone="info"
        />
      </section>

      {myWork.length > 0 ? (
        <section>
          <SectionHeader title="Your queue" hint="Runs with cases assigned to you" />
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {myWork.slice(0, 6).map((w) => (
              <Link
                key={w.runId}
                href={`/projects/${w.projectId}/runs/${w.runId}?mine=1`}
                className="group flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3.5 transition hover:border-[color:var(--border-strong)]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{w.runName}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                    {w.projectName}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded bg-[color:var(--primary)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--primary)] tabular-nums">
                    {w.count}
                  </span>
                  <Badge tone={RUN_TONES[w.runStatus]} dot>
                    {w.runStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <FeedBlock
          title="Recent test runs"
          link={{ href: '/projects', label: 'View all' }}
          empty={runs.length === 0}
          emptyIcon={<PlayCircle className="h-4 w-4" />}
          emptyTitle="No test runs yet"
          emptyDescription="Create a project and execute your first test plan to see results here."
        >
          {runs.map((r) => (
            <Link
              key={r.id}
              href={`/projects/${r.project_id}/runs/${r.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[color:var(--muted)]/60"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                  {r.projects?.name ?? '—'} · {formatRelative(r.created_at)}
                </div>
              </div>
              <Badge tone={RUN_TONES[r.status]} dot>
                {r.status.replace('_', ' ')}
              </Badge>
            </Link>
          ))}
        </FeedBlock>

        <FeedBlock
          title="Latest bugs"
          link={{ href: '/bugs', label: 'View all' }}
          empty={bugs.length === 0}
          emptyIcon={<GitPullRequestArrow className="h-4 w-4" />}
          emptyTitle="No bugs reported"
          emptyDescription="When testers find issues, they'll show up here."
        >
          {bugs.map((b) => (
            <Link
              key={b.id}
              href={`/projects/${b.project_id}/bugs/${b.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[color:var(--muted)]/60"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{b.title}</div>
                <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                  {b.projects?.name ?? '—'} · {b.severity} · {formatRelative(b.created_at)}
                </div>
              </div>
              <Badge tone={BUG_STATUS_TONES[b.status]} dot>
                {b.status.replace('_', ' ')}
              </Badge>
            </Link>
          ))}
        </FeedBlock>
      </section>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {title}
      </h2>
      {hint ? (
        <span className="text-xs text-[color:var(--muted-foreground)]">{hint}</span>
      ) : null}
    </div>
  );
}

function FeedBlock({
  title,
  link,
  empty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  link: { href: string; label: string };
  empty: boolean;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
          {title}
        </h2>
        <Link
          href={link.href}
          className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          {link.label} →
        </Link>
      </div>
      {empty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="divide-y divide-[color:var(--border)] overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
          {children}
        </div>
      )}
    </div>
  );
}
