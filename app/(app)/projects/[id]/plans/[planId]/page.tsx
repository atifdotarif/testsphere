import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import PlanCasePicker from './plan-case-picker';
import { deletePlanAction } from '../actions';

export const metadata = { title: 'Test plan' };

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: plan }, { data: cases }, { data: planCases }] = await Promise.all([
    supabase
      .from('test_plans')
      .select('id, name, description, created_at')
      .eq('id', planId)
      .eq('project_id', id)
      .maybeSingle(),
    supabase
      .from('test_cases')
      .select('id, title, priority, suite_id, test_suites(name)')
      .eq('project_id', id)
      .order('title'),
    supabase
      .from('test_plan_cases')
      .select('case_id, position')
      .eq('plan_id', planId)
      .order('position'),
  ]);

  if (!plan) notFound();
  const includedIds = new Set((planCases ?? []).map((r) => r.case_id));

  type CaseRow = {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    suite_id: string | null;
    test_suites: { name: string } | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Test plans', href: `/projects/${id}/plans` },
          { label: plan.name },
        ]}
        title={plan.name}
        description={plan.description ?? 'Pick the cases that belong to this plan.'}
        actions={
          <div className="flex gap-2">
            <Link href={`/projects/${id}/runs?plan=${planId}`}>
              <Button>Start a run</Button>
            </Link>
            <form action={deletePlanAction}>
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="plan_id" value={planId} />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--destructive)]/40 px-3 text-sm font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </form>
          </div>
        }
      />

      <PlanCasePicker
        projectId={id}
        planId={planId}
        cases={(cases ?? []) as unknown as CaseRow[]}
        included={Array.from(includedIds)}
      />
    </div>
  );
}
