import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { formatDate, formatRelative } from '@/lib/utils/format';
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
      .select('*, author:profiles!created_by(full_name, avatar_url)')
      .eq('id', caseId)
      .eq('project_id', id)
      .maybeSingle(),
    supabase.from('test_suites').select('id, name').eq('project_id', id).order('name'),
  ]);

  if (!row) notFound();
  const tc = row as unknown as TestCase & {
    author: { full_name: string; avatar_url: string | null } | null;
  };

  const aiSource =
    tc.source && (tc.source as { type?: string }).type === 'ai'
      ? (tc.source as {
          model?: string;
          repo?: string | null;
          ref?: string | null;
          files?: string[];
        })
      : null;

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
            <ConfirmButton
              message={`Delete test case “${tc.title}”? This cannot be undone — any past run results will still reference this case ID.`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color:var(--destructive)]/40 px-3 text-sm font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </ConfirmButton>
          </form>
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Avatar
            name={tc.author?.full_name}
            src={tc.author?.avatar_url ?? null}
            size="xs"
          />
          <span>
            Authored by{' '}
            <span className="font-medium">{tc.author?.full_name ?? 'Unknown'}</span>
          </span>
        </div>
        <span className="text-[color:var(--muted-foreground)]">·</span>
        <span className="text-[color:var(--muted-foreground)]">
          Created {formatDate(tc.created_at)}
        </span>
        {tc.updated_at && tc.updated_at !== tc.created_at ? (
          <>
            <span className="text-[color:var(--muted-foreground)]">·</span>
            <span className="text-[color:var(--muted-foreground)]">
              Updated {formatRelative(tc.updated_at)}
            </span>
          </>
        ) : null}
        {aiSource ? (
          <Badge tone="accent" className="ml-auto">
            <Sparkles className="h-3 w-3" />
            AI · {aiSource.model ?? 'openai'}
            {aiSource.repo ? ` · ${aiSource.repo}` : ''}
          </Badge>
        ) : null}
      </div>

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
