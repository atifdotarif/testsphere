import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import CaseForm from '../case-form';
import { deleteCaseAction } from '../actions';
import type { TestCase } from '@/lib/supabase/database.types';

export const metadata = { title: 'Edit test case' };

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = await params;
  await requireUser();
  const supabase = await createClient();

  const [{ data: row }, { data: suites }] = await Promise.all([
    supabase
      .from('test_cases')
      .select('*')
      .eq('id', caseId)
      .eq('project_id', id)
      .maybeSingle(),
    supabase.from('test_suites').select('id, name').eq('project_id', id).order('name'),
  ]);

  if (!row) notFound();
  const tc = row as TestCase;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Test cases', href: `/projects/${id}/cases` },
          { label: tc.title },
        ]}
        title={tc.title}
        description="Edit the case definition. Changes apply to future executions."
        actions={
          <form action={deleteCaseAction}>
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="case_id" value={caseId} />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color:var(--destructive)]/40 px-3 text-sm font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </form>
        }
      />
      <Card>
        <CardContent>
          <CaseForm
            projectId={id}
            suites={suites ?? []}
            initial={{
              id: tc.id,
              title: tc.title,
              preconditions: tc.preconditions,
              expected_result: tc.expected_result,
              priority: tc.priority,
              status: tc.status,
              suite_id: tc.suite_id,
              tags: tc.tags,
              steps: tc.steps,
            }}
          />
        </CardContent>
      </Card>
      <p className="text-xs text-[color:var(--muted-foreground)]">
        Looking to execute this case?{' '}
        <Link className="underline" href={`/projects/${id}/runs`}>
          Open the test runs page
        </Link>{' '}
        and add it to a run.
      </p>
    </div>
  );
}
