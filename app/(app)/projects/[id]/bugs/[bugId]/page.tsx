import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import {
  Badge,
  BUG_PRIORITY_TONES,
  BUG_SEVERITY_TONES,
  BUG_STATUS_TONES,
} from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatDateTime, formatRelative } from '@/lib/utils/format';
import BugSidebar from './bug-sidebar';
import CommentForm from './comment-form';
import type { Bug, BugComment } from '@/lib/supabase/database.types';

export const metadata = { title: 'Bug' };

export default async function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string; bugId: string }>;
}) {
  const { id, bugId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: bug } = await supabase
    .from('bugs')
    .select(
      'id, title, description, steps_to_reproduce, expected_result, actual_result, severity, priority, status, environment, run_result_id, created_at, closed_at, reporter:profiles!reporter_id(id, full_name, avatar_url, email), assignee:profiles!assignee_id(id, full_name, avatar_url, email)'
    )
    .eq('id', bugId)
    .eq('project_id', id)
    .maybeSingle();

  if (!bug) notFound();

  const { data: members } = await supabase
    .from('project_members')
    .select('profiles(id, full_name)')
    .eq('project_id', id);
  type MemberRow = { profiles: { id: string; full_name: string } | null };
  const assignees = ((members ?? []) as unknown as MemberRow[])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; full_name: string } => Boolean(p));

  const { data: comments } = await supabase
    .from('bug_comments')
    .select('id, body, created_at, profiles(full_name, avatar_url)')
    .eq('bug_id', bugId)
    .order('created_at', { ascending: true });

  // If this bug was filed from a failed test result, pull the run + case so
  // the QA reviewer can trace exactly which execution surfaced it.
  let linkedResult: {
    resultId: string;
    runId: string;
    runName: string;
    caseTitle: string;
    status: string;
  } | null = null;
  if ((bug as { run_result_id?: string | null }).run_result_id) {
    const rrId = (bug as { run_result_id: string }).run_result_id;
    const { data: rr } = await supabase
      .from('test_run_results')
      .select(
        'id, status, test_cases(title), test_runs(id, name)'
      )
      .eq('id', rrId)
      .maybeSingle();
    type RRRow = {
      id: string;
      status: string;
      test_cases: { title: string } | null;
      test_runs: { id: string; name: string } | null;
    };
    const r = rr as unknown as RRRow | null;
    if (r && r.test_runs && r.test_cases) {
      linkedResult = {
        resultId: r.id,
        runId: r.test_runs.id,
        runName: r.test_runs.name,
        caseTitle: r.test_cases.title,
        status: r.status,
      };
    }
  }

  type CommentRow = Pick<BugComment, 'id' | 'body' | 'created_at'> & {
    profiles: { full_name: string; avatar_url: string | null } | null;
  };
  const commentRows = (comments ?? []) as unknown as CommentRow[];

  const b = bug as unknown as Pick<
    Bug,
    'id' | 'title' | 'description' | 'steps_to_reproduce' | 'expected_result' | 'actual_result' | 'severity' | 'priority' | 'status' | 'environment' | 'run_result_id' | 'created_at' | 'closed_at'
  > & {
    reporter: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
    assignee: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Bugs', href: `/projects/${id}/bugs` },
          { label: b.title },
        ]}
        title={b.title}
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={BUG_STATUS_TONES[b.status]}>{b.status.replace('_', ' ')}</Badge>
            <Badge tone={BUG_SEVERITY_TONES[b.severity]}>{b.severity}</Badge>
            <Badge tone={BUG_PRIORITY_TONES[b.priority]}>{b.priority}</Badge>
            <span className="text-[color:var(--muted-foreground)]">
              · filed {formatRelative(b.created_at)}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {b.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {b.description}
              </CardContent>
            </Card>
          ) : null}
          {b.steps_to_reproduce ? (
            <Card>
              <CardHeader>
                <CardTitle>Steps to reproduce</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {b.steps_to_reproduce}
              </CardContent>
            </Card>
          ) : null}
          {(b.expected_result || b.actual_result) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {b.expected_result ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Expected</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm">
                    {b.expected_result}
                  </CardContent>
                </Card>
              ) : null}
              {b.actual_result ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Actual</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm">
                    {b.actual_result}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentRows.length === 0 ? (
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  No comments yet. Start the conversation below.
                </p>
              ) : (
                <ul className="space-y-3">
                  {commentRows.map((c) => (
                    <li key={c.id} className="flex gap-3">
                      <Avatar
                        name={c.profiles?.full_name ?? '?'}
                        src={c.profiles?.avatar_url ?? null}
                      />
                      <div className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/30 p-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold">
                            {c.profiles?.full_name ?? 'Someone'}
                          </span>
                          <span className="text-[color:var(--muted-foreground)]">
                            {formatDateTime(c.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <CommentForm projectId={id} bugId={bugId} />
            </CardContent>
          </Card>
        </div>

        <BugSidebar
          projectId={id}
          bugId={bugId}
          status={b.status}
          severity={b.severity}
          priority={b.priority}
          assignee={b.assignee}
          reporter={b.reporter}
          environment={b.environment}
          assignees={assignees}
          createdAt={b.created_at}
          closedAt={b.closed_at}
          linkedResult={linkedResult}
        />
      </div>
    </div>
  );
}
