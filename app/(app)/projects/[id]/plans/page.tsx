import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import NewPlanForm from './new-plan-form';

export const metadata = { title: 'Test plans' };

export default async function PlansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('test_plans')
    .select('id, name, description, created_at, test_plan_cases(count)')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  type Row = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    test_plan_cases: { count: number }[] | null;
  };
  const plans = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test plans"
        description="Curate sets of test cases that should run together for a release or feature."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
            <h2 className="mb-2 text-sm font-semibold">Create a plan</h2>
            <NewPlanForm projectId={id} />
          </div>
        </div>

        <div>
          {plans.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-5 w-5" />}
              title="No test plans yet"
              description="Create your first plan to bundle related cases for a release."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Cases</th>
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projects/${id}/plans/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.description ? (
                          <div className="text-xs text-[color:var(--muted-foreground)]">
                            {p.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {p.test_plan_cases?.[0]?.count ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                        {formatRelative(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

