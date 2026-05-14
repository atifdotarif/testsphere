import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bug, CheckCircle2, RotateCcw, Users, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import {
  Badge,
  BUG_PRIORITY_TONES,
  BUG_SEVERITY_TONES,
  BUG_STATUS_TONES,
  RUN_TONES,
} from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getProjectRole, requireUser, roleAtLeast } from '@/lib/auth';
import { formatDateTime, formatRelative } from '@/lib/utils/format';
import RunRow from './run-row';
import BulkAssign from './bulk-assign';
import RunFilters from './run-filters';
import { completeRunAction, reopenRunAction } from '../actions';
import type {
  BugPriority,
  BugSeverity,
  BugStatus,
  ResultStatus,
  TestStep,
} from '@/lib/supabase/database.types';

export const metadata = { title: 'Test run' };

export default async function RunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; runId: string }>;
  searchParams: Promise<{ mine?: string; status?: string }>;
}) {
  const { id, runId } = await params;
  const sp = await searchParams;
  const { userId } = await requireUser();
  const role = await getProjectRole(id);
  const canManage = roleAtLeast(role, 'manager');

  const supabase = await createClient();

  const { data: run } = await supabase
    .from('test_runs')
    .select(
      'id, name, description, status, environment, started_at, completed_at, plan_id, profiles(full_name)'
    )
    .eq('id', runId)
    .eq('project_id', id)
    .maybeSingle();

  if (!run) notFound();

  const [
    { data: results },
    { data: memberRows },
    { data: runBugs },
  ] = await Promise.all([
    supabase
      .from('test_run_results')
      .select(
        'id, status, notes, duration_ms, executed_at, executed_by, assigned_to, case_id, test_cases(id, title, preconditions, expected_result, steps, priority), assignee:profiles!assigned_to(full_name, avatar_url), executor:profiles!executed_by(full_name, avatar_url)'
      )
      .eq('run_id', runId)
      .order('case_id'),
    supabase
      .from('project_members')
      .select('profiles(id, full_name, avatar_url)')
      .eq('project_id', id),
    // All bugs filed during this run — one round-trip used both for the
    // per-row linkage badge and the "Bugs filed in this run" panel below.
    supabase
      .from('bugs')
      .select(
        'id, title, status, severity, priority, run_result_id, created_at, reporter:profiles!reporter_id(full_name)'
      )
      .eq('project_id', id)
      .not('run_result_id', 'is', null),
  ]);

  type Row = {
    id: string;
    status: ResultStatus;
    notes: string | null;
    duration_ms: number | null;
    executed_at: string | null;
    executed_by: string | null;
    assigned_to: string | null;
    case_id: string;
    test_cases: {
      id: string;
      title: string;
      preconditions: string | null;
      expected_result: string | null;
      steps: TestStep[];
      priority: 'low' | 'medium' | 'high' | 'critical';
    } | null;
    assignee: { full_name: string; avatar_url: string | null } | null;
    executor: { full_name: string; avatar_url: string | null } | null;
  };

  type MemberRow = { profiles: { id: string; full_name: string; avatar_url: string | null } | null };

  type RunBug = {
    id: string;
    title: string;
    status: BugStatus;
    severity: BugSeverity;
    priority: BugPriority;
    run_result_id: string | null;
    created_at: string;
    reporter: { full_name: string } | null;
  };

  const allRows = (results ?? []) as unknown as Row[];
  const resultIdSet = new Set(allRows.map((r) => r.id));
  const allBugs = ((runBugs ?? []) as unknown as RunBug[]).filter(
    (b) => b.run_result_id && resultIdSet.has(b.run_result_id)
  );

  // Lookup: result-id → bugs filed against it. Each result usually has
  // 0–1 bugs but we tolerate more.
  const bugsByResult = new Map<string, RunBug[]>();
  for (const b of allBugs) {
    if (!b.run_result_id) continue;
    const list = bugsByResult.get(b.run_result_id) ?? [];
    list.push(b);
    bugsByResult.set(b.run_result_id, list);
  }

  // Counters use the unfiltered totals so they reflect the actual run health.
  const total = allRows.length;
  const passed = allRows.filter((r) => r.status === 'passed').length;
  const failed = allRows.filter((r) => r.status === 'failed').length;
  const blocked = allRows.filter((r) => r.status === 'blocked').length;
  const skipped = allRows.filter((r) => r.status === 'skipped').length;
  const pending = allRows.filter((r) => r.status === 'pending').length;
  const assignedToMe = allRows.filter((r) => r.assigned_to === userId).length;
  // Pass rate = passed / executed (excluding skipped and pending), matching
  // the convention every QA tool uses. Otherwise skipping a single case
  // would tank the rate.
  const executed = passed + failed + blocked;
  const passRate = executed ? Math.round((passed / executed) * 100) : 0;

  // Apply view filters from the URL.
  const filterMine = sp.mine === '1';
  const filterStatus = sp.status;
  const rows = allRows.filter((row) => {
    if (filterMine && row.assigned_to !== userId) return false;
    if (filterStatus && filterStatus !== 'all' && row.status !== filterStatus) return false;
    return true;
  });

  const members = ((memberRows ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; full_name: string; avatar_url: string | null } => Boolean(p));

  const r = run as unknown as {
    id: string;
    name: string;
    description: string | null;
    status: 'not_started' | 'in_progress' | 'completed' | 'aborted';
    environment: string | null;
    started_at: string | null;
    completed_at: string | null;
    plan_id: string | null;
    profiles: { full_name: string } | null;
  };

  const locked = r.status !== 'in_progress';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Test runs', href: `/projects/${id}/runs` },
          { label: r.name },
        ]}
        title={r.name}
        description={r.description ?? `Started by ${r.profiles?.full_name ?? 'someone'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={RUN_TONES[r.status]} dot>
              {r.status.replace('_', ' ')}
            </Badge>
            {r.status === 'in_progress' ? (
              <>
                <form action={completeRunAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete run
                  </button>
                </form>
                <form action={completeRunAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <input type="hidden" name="status" value="aborted" />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-medium hover:bg-[color:var(--muted)]"
                  >
                    <XCircle className="h-4 w-4" />
                    Abort
                  </button>
                </form>
              </>
            ) : canManage ? (
              <form action={reopenRunAction}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="run_id" value={runId} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm font-medium hover:bg-[color:var(--muted)]"
                  title="Reopen this run so testers can finish their cases"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reopen run
                </button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={total} />
        <Stat label="Passed" value={passed} tone="success" />
        <Stat label="Failed" value={failed} tone="danger" hint={`${allBugs.length} bug${allBugs.length === 1 ? '' : 's'} filed`} />
        <Stat label="Blocked" value={blocked} tone="warning" />
        <Stat label="Pending" value={pending} tone="neutral" hint={skipped > 0 ? `${skipped} skipped` : undefined} />
        <Stat label="Yours" value={assignedToMe} tone="info" hint="Assigned to you" />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
        <span>Environment: {r.environment ?? '—'}</span>
        <span>·</span>
        <span>Started: {formatDateTime(r.started_at)}</span>
        {r.completed_at ? (
          <>
            <span>·</span>
            <span>Finished: {formatDateTime(r.completed_at)}</span>
          </>
        ) : null}
        <span>·</span>
        <span>
          Pass rate: <span className="font-medium text-[color:var(--foreground)]">{passRate}%</span>
          {executed > 0 ? ` (${passed}/${executed} executed)` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RunFilters
          basePath={`/projects/${id}/runs/${runId}`}
          mine={filterMine}
          status={filterStatus ?? 'all'}
        />
        {canManage && !locked ? (
          <BulkAssign
            projectId={id}
            runId={runId}
            members={members}
            pendingCount={pending}
          />
        ) : null}
      </div>

      <div className="space-y-3">
        {rows.map((row) =>
          row.test_cases ? (
            <RunRow
              key={row.id}
              projectId={id}
              runId={runId}
              currentUserId={userId}
              canAssign={canManage}
              members={members}
              linkedBugs={bugsByResult.get(row.id) ?? []}
              row={{
                resultId: row.id,
                status: row.status,
                notes: row.notes,
                durationMs: row.duration_ms,
                executedAt: row.executed_at,
                assigneeId: row.assigned_to,
                assignee: row.assignee,
                executor: row.executor,
                tcase: row.test_cases,
              }}
              locked={locked}
            />
          ) : null
        )}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center text-sm text-[color:var(--muted-foreground)]">
            {allRows.length === 0
              ? 'This run has no cases attached.'
              : 'No rows match the current filters.'}
          </div>
        ) : null}
      </div>

      {allBugs.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Bug className="h-4 w-4 text-[color:var(--destructive)]" />
              Bugs filed during this run
              <span className="rounded-full bg-[color:var(--destructive)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--destructive)]">
                {allBugs.length}
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
            {allBugs.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-[color:var(--muted)]/40"
              >
                <Link
                  href={`/projects/${id}/bugs/${b.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {b.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={BUG_SEVERITY_TONES[b.severity]}>{b.severity}</Badge>
                  <Badge tone={BUG_PRIORITY_TONES[b.priority]}>{b.priority}</Badge>
                  <Badge tone={BUG_STATUS_TONES[b.status]}>
                    {b.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    {b.reporter?.full_name ?? '—'} · {formatRelative(b.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
        <Users className="h-3.5 w-3.5" />
        Owners and managers can assign or bulk-assign rows. Assignees can always
        update their own result regardless of their project role.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  hint?: string;
}) {
  const toneClass = {
    success: 'text-emerald-700 dark:text-emerald-300',
    danger: 'text-red-700 dark:text-red-300',
    warning: 'text-amber-700 dark:text-amber-300',
    info: 'text-sky-700 dark:text-sky-300',
    neutral: 'text-[color:var(--muted-foreground)]',
  }[tone ?? 'neutral'];
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint ? (
        <div className="text-[10px] text-[color:var(--muted-foreground)]">{hint}</div>
      ) : null}
    </div>
  );
}
