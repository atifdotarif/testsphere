import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import BugForm from '../bug-form';
import type { TestStep } from '@/lib/supabase/database.types';

export const metadata = { title: 'File a bug' };

export default async function NewBugPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_result?: string; case?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from('project_members')
    .select('profiles(id, full_name)')
    .eq('project_id', id);
  type MemberRow = { profiles: { id: string; full_name: string } | null };
  const assignees = ((members ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  // When filing from a failed run row, pull rich context so the reporter
  // doesn't have to retype what the case already documents.
  let prefillTitle = '';
  let prefillSteps = '';
  let prefillExpected = '';
  let prefillActual = '';
  let prefillEnv = '';
  let runContext: { runId: string; runName: string } | null = null;

  if (sp.run_result) {
    const { data: result } = await supabase
      .from('test_run_results')
      .select(
        'notes, test_cases(title, preconditions, steps, expected_result), test_runs(id, name, environment)'
      )
      .eq('id', sp.run_result)
      .maybeSingle();

    type ResRow = {
      notes: string | null;
      test_cases: {
        title: string;
        preconditions: string | null;
        steps: TestStep[];
        expected_result: string | null;
      } | null;
      test_runs: { id: string; name: string; environment: string | null } | null;
    };

    const row = result as unknown as ResRow | null;
    const c = row?.test_cases;
    if (c) {
      prefillTitle = `[Failed] ${c.title}`;
      const lines: string[] = [];
      if (c.preconditions) {
        lines.push('### Preconditions');
        lines.push(c.preconditions);
        lines.push('');
      }
      lines.push('### Steps');
      c.steps.forEach((s, i) => {
        lines.push(`${i + 1}. ${s.step}`);
      });
      prefillSteps = lines.join('\n');
      prefillExpected = c.expected_result || c.steps.map((s) => s.expected).filter(Boolean).join('\n') || '';
    }
    if (row?.notes) {
      prefillActual = row.notes;
    }
    if (row?.test_runs) {
      runContext = { runId: row.test_runs.id, runName: row.test_runs.name };
      if (row.test_runs.environment) prefillEnv = row.test_runs.environment;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Bugs', href: `/projects/${id}/bugs` },
          { label: 'New' },
        ]}
        title="File a bug"
        description={
          runContext
            ? `Pre-filled from run “${runContext.runName}”. Edit anything that needs polishing before saving.`
            : 'Capture all the context developers will need to reproduce and fix the issue.'
        }
      />
      <Card>
        <CardContent>
          <BugForm
            projectId={id}
            assignees={assignees}
            initial={{
              title: prefillTitle,
              steps_to_reproduce: prefillSteps,
              expected_result: prefillExpected,
              actual_result: prefillActual,
              environment: prefillEnv,
              run_result_id: sp.run_result ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
