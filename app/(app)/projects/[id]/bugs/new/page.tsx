import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import BugForm from '../bug-form';

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

  let prefillTitle = '';
  if (sp.run_result) {
    const { data: result } = await supabase
      .from('test_run_results')
      .select('test_cases(title)')
      .eq('id', sp.run_result)
      .maybeSingle();
    type ResRow = { test_cases: { title: string } | null };
    const title = (result as unknown as ResRow | null)?.test_cases?.title;
    if (title) prefillTitle = `[Run failure] ${title}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Bugs', href: `/projects/${id}/bugs` },
          { label: 'New' },
        ]}
        title="File a bug"
        description="Capture all the context developers will need to reproduce and fix the issue."
      />
      <Card>
        <CardContent>
          <BugForm
            projectId={id}
            assignees={assignees}
            initial={{
              title: prefillTitle,
              run_result_id: sp.run_result ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
