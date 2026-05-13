import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import GeneratorClient from './generator-client';

export const metadata = { title: 'Smart Test Generator' };

export default async function GeneratePage({
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

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const githubAuthed = Boolean(process.env.GITHUB_TOKEN);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Test cases', href: `/projects/${id}/cases` },
          { label: 'Smart Test Generator' },
        ]}
        title="Smart Test Generator"
        description="Point at a public GitHub repo, pick a few files, let AI draft test cases for you to review and save."
      />
      <GeneratorClient
        projectId={id}
        suites={suites ?? []}
        aiConfigured={aiConfigured}
        githubAuthed={githubAuthed}
      />
    </div>
  );
}
