import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import CaseForm from '../case-form';

export const metadata = { title: 'New test case' };

export default async function NewCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();
  const { data: suites } = await supabase
    .from('test_suites')
    .select('id, name')
    .eq('project_id', id)
    .order('name');

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Test cases', href: `/projects/${id}/cases` },
          { label: 'New' },
        ]}
        title="New test case"
        description="Document the precondition, steps and expected outcome so anyone on the team can run this case."
      />
      <Card>
        <CardContent>
          <CaseForm projectId={id} suites={suites ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
