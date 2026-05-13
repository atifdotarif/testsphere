import Link from 'next/link';
import { CheckCircle2, ClipboardList, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, PRIORITY_TONES, RESULT_TONES, RUN_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import type {
  ResultStatus,
  RunStatus,
  TestPriority,
} from '@/lib/supabase/database.types';

export const metadata = { title: 'My cases' };

// "My cases" = test executions assigned to the current user, grouped by
// project → run → cases. Defaults to the queue (pending only). The "All"
// filter also includes already-completed work for context.
export default async function MyCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: 'pending' | 'all' }>;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const filter = sp.filter ?? 'pending';

  const supabase = await createClient();
  let q = supabase
    .from('test_run_results')
    .select(
      'id, status, executed_at, test_cases(id, title, priority), test_runs!inner(id, name, status, environment, project_id, projects(id, name, key))'
    )
    .eq('assigned_to', profile.id)
    .order('executed_at', { ascending: false, nullsFirst: true });

  if (filter === 'pending') q = q.eq('status', 'pending');

  const { data } = await q;

  type Row = {
    id: string;
    status: ResultStatus;
    executed_at: string | null;
    test_cases: { id: string; title: string; priority: TestPriority } | null;
    test_runs: {
      id: string;
      name: string;
      status: RunStatus;
      environment: string | null;
      project_id: string;
      projects: { id: string; name: string; key: string } | null;
    } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).filter(
    (r) => r.test_cases && r.test_runs && r.test_runs.projects
  );

  // Bucket by project → run.
  type RunBucket = {
    run: { id: string; name: string; status: RunStatus; environment: string | null };
    items: Row[];
  };
  type ProjectBucket = {
    project: { id: string; name: string; key: string };
    runs: Map<string, RunBucket>;
    pendingCount: number;
  };
  const byProject = new Map<string, ProjectBucket>();

  for (const row of rows) {
    const project = row.test_runs!.projects!;
    const run = row.test_runs!;
    let p = byProject.get(project.id);
    if (!p) {
      p = { project, runs: new Map(), pendingCount: 0 };
      byProject.set(project.id, p);
    }
    if (row.status === 'pending') p.pendingCount += 1;
    let r = p.runs.get(run.id);
    if (!r) {
      r = {
        run: {
          id: run.id,
          name: run.name,
          status: run.status,
          environment: run.environment,
        },
        items: [],
      };
      p.runs.set(run.id, r);
    }
    r.items.push(row);
  }

  const projects = Array.from(byProject.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount
  );

  const totalPending = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My cases"
        description="Test cases assigned to you, grouped by project and run."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-0.5 text-xs">
            <FilterTab href="/test-cases?filter=pending" active={filter === 'pending'}>
              Pending {totalPending > 0 ? `(${totalPending})` : ''}
            </FilterTab>
            <FilterTab href="/test-cases?filter=all" active={filter === 'all'}>
              All
            </FilterTab>
          </div>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={
            filter === 'pending' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Inbox className="h-5 w-5" />
            )
          }
          title={filter === 'pending' ? 'Nothing assigned to you' : 'No assignments yet'}
          description={
            filter === 'pending'
              ? "You're caught up. When a manager assigns a case to you it will show here."
              : 'When testers complete cases assigned to them they will show up here.'
          }
        />
      ) : (
        <div className="space-y-6">
          {projects.map(({ project, runs, pendingCount }) => (
            <section key={project.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[color:var(--primary)]/10 text-xs font-semibold text-[color:var(--primary)]">
                    {project.key}
                  </span>
                  <h2 className="text-base font-semibold">
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </h2>
                  {pendingCount > 0 ? (
                    <Badge tone="warning">{pendingCount} pending</Badge>
                  ) : null}
                </div>
                <Link
                  href={`/projects/${project.id}`}
                  className="text-xs text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  Open project →
                </Link>
              </div>

              <div className="space-y-3">
                {Array.from(runs.values()).map(({ run, items }) => (
                  <div
                    key={run.id}
                    className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/projects/${project.id}/runs/${run.id}?mine=1`}
                          className="font-medium hover:underline"
                        >
                          {run.name}
                        </Link>
                        {run.environment ? (
                          <span className="rounded bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)]">
                            {run.environment}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={RUN_TONES[run.status]}>
                          {run.status.replace('_', ' ')}
                        </Badge>
                        <Link
                          href={`/projects/${project.id}/runs/${run.id}?mine=1`}
                          className="text-xs font-medium text-[color:var(--primary)] hover:underline"
                        >
                          Open queue →
                        </Link>
                      </div>
                    </div>
                    <ul className="divide-y divide-[color:var(--border)] text-sm">
                      {items.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 hover:bg-[color:var(--muted)]/40"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/projects/${project.id}/runs/${run.id}?mine=1`}
                              className="truncate font-medium hover:underline"
                            >
                              {row.test_cases!.title}
                            </Link>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge tone={PRIORITY_TONES[row.test_cases!.priority]}>
                              {row.test_cases!.priority}
                            </Badge>
                            <Badge tone={RESULT_TONES[row.status]}>{row.status}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <ClipboardList className="h-3.5 w-3.5" />
        Tip: managers can pre-assign cases from a run, or you can claim
        unassigned rows from inside the run with the &ldquo;Take it&rdquo; button.
      </p>
    </div>
  );
}

function FilterTab({
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
      className={
        active
          ? 'rounded-md bg-[color:var(--accent)] px-2.5 py-1 font-medium text-[color:var(--accent-foreground)]'
          : 'rounded-md px-2.5 py-1 text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]'
      }
    >
      {children}
    </Link>
  );
}
