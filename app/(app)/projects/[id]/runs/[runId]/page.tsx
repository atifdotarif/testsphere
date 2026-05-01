import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, RUN_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils/format';
import RunRow from './run-row';
import { completeRunAction } from '../actions';
import type { ResultStatus, TestStep } from '@/lib/supabase/database.types';

export const metadata = { title: 'Test run' };

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  await requireUser();
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

  const { data: results } = await supabase
    .from('test_run_results')
    .select(
      'id, status, notes, duration_ms, executed_at, executed_by, case_id, test_cases(id, title, preconditions, expected_result, steps, priority)'
    )
    .eq('run_id', runId)
    .order('case_id');

  type Row = {
    id: string;
    status: ResultStatus;
    notes: string | null;
    duration_ms: number | null;
    executed_at: string | null;
    executed_by: string | null;
    case_id: string;
    test_cases: {
      id: string;
      title: string;
      preconditions: string | null;
      expected_result: string | null;
      steps: TestStep[];
      priority: 'low' | 'medium' | 'high' | 'critical';
    } | null;
  };

  const rows = (results ?? []) as unknown as Row[];
  const total = rows.length;
  const passed = rows.filter((r) => r.status === 'passed').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const blocked = rows.filter((r) => r.status === 'blocked').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const passRate = total ? Math.round((passed / total) * 100) : 0;

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
            <Badge tone={RUN_TONES[r.status]}>{r.status.replace('_', ' ')}</Badge>
            {r.status === 'in_progress' ? (
              <>
                <form action={completeRunAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <input type="hidden" name="status" value="completed" />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
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
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-sm font-medium hover:bg-[color:var(--muted)]"
                  >
                    <XCircle className="h-4 w-4" />
                    Abort
                  </button>
                </form>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <Stat label="Total" value={total} />
        <Stat label="Passed" value={passed} tone="success" />
        <Stat label="Failed" value={failed} tone="danger" />
        <Stat label="Blocked" value={blocked} tone="warning" />
        <Stat label="Pending" value={pending} tone="neutral" />
      </div>

      <div className="flex items-center gap-3 text-xs text-[color:var(--muted-foreground)]">
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
        <span>Pass rate: {passRate}%</span>
      </div>

      <div className="space-y-3">
        {rows.map((row) =>
          row.test_cases ? (
            <RunRow
              key={row.id}
              projectId={id}
              runId={runId}
              row={{
                resultId: row.id,
                status: row.status,
                notes: row.notes,
                durationMs: row.duration_ms,
                executedAt: row.executed_at,
                tcase: row.test_cases,
              }}
              locked={r.status !== 'in_progress'}
            />
          ) : null
        )}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center text-sm text-[color:var(--muted-foreground)]">
            This run has no cases attached.
          </div>
        ) : null}
      </div>

      <p className="text-xs text-[color:var(--muted-foreground)]">
        Use the &ldquo;File bug&rdquo; button on a failing case to open a defect linked
        to that result.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'danger' | 'warning' | 'neutral';
}) {
  const toneClass = {
    success: 'text-emerald-700 dark:text-emerald-300',
    danger: 'text-red-700 dark:text-red-300',
    warning: 'text-amber-700 dark:text-amber-300',
    neutral: 'text-[color:var(--muted-foreground)]',
  }[tone ?? 'neutral'];
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <div className="text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

