import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, RUN_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import NewRunForm from './new-run-form';
import type { ResultStatus, RunStatus } from '@/lib/supabase/database.types';

export const metadata = { title: 'Test runs' };

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const [{ data: runs }, { data: plans }, { data: cases }] = await Promise.all([
    supabase
      .from('test_runs')
      .select(
        'id, name, status, environment, started_at, completed_at, created_at, test_run_results(status)'
      )
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('test_plans').select('id, name').eq('project_id', id).order('name'),
    supabase
      .from('test_cases')
      .select('id, title')
      .eq('project_id', id)
      .eq('status', 'active')
      .order('title'),
  ]);

  type RunRow = {
    id: string;
    name: string;
    status: RunStatus;
    environment: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    test_run_results: { status: ResultStatus }[] | null;
  };

  const runRows = (runs ?? []) as unknown as RunRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test runs"
        description="Execution sessions where you actually run cases and record results."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <h2 className="mb-3 text-sm font-semibold">Start a new run</h2>
          <NewRunForm
            projectId={id}
            plans={plans ?? []}
            cases={cases ?? []}
            preselectedPlanId={sp.plan ?? null}
          />
        </div>

        {runRows.length === 0 ? (
          <EmptyState
            icon={<PlayCircle className="h-5 w-5" />}
            title="No runs yet"
            description="Spin up a run from a plan or pick cases ad-hoc to get started."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3 text-left">Run</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Progress</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {runRows.map((r) => {
                  const total = r.test_run_results?.length ?? 0;
                  const done =
                    r.test_run_results?.filter((x) => x.status !== 'pending').length ?? 0;
                  const passed =
                    r.test_run_results?.filter((x) => x.status === 'passed').length ?? 0;
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${id}/runs/${r.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.environment ? (
                          <span className="ml-2 rounded bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)]">
                            {r.environment}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={RUN_TONES[r.status]}>
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-[color:var(--muted)]">
                            <div
                              className="h-full bg-[color:var(--primary)]"
                              style={{
                                width: total ? `${(done / total) * 100}%` : '0%',
                              }}
                            />
                          </div>
                          <span className="text-xs text-[color:var(--muted-foreground)]">
                            {done}/{total} · {passed} passed
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                        {formatRelative(r.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
