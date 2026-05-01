'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

const BugSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(4000).optional(),
  steps_to_reproduce: z.string().max(4000).optional(),
  expected_result: z.string().max(2000).optional(),
  actual_result: z.string().max(2000).optional(),
  severity: z.enum(['trivial', 'minor', 'major', 'critical', 'blocker']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  environment: z.string().max(80).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  run_result_id: z.string().uuid().optional().nullable(),
});

export type BugFormState =
  | { ok: false; errors?: Record<string, string[] | undefined>; message?: string }
  | undefined;

export async function createBugAction(
  projectId: string,
  _prev: BugFormState,
  formData: FormData
): Promise<BugFormState> {
  const { userId } = await requireUser();

  const parsed = BugSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    steps_to_reproduce: formData.get('steps_to_reproduce') || undefined,
    expected_result: formData.get('expected_result') || undefined,
    actual_result: formData.get('actual_result') || undefined,
    severity: formData.get('severity') ?? 'minor',
    priority: formData.get('priority') ?? 'medium',
    environment: formData.get('environment') || undefined,
    assignee_id: (formData.get('assignee_id') as string) || null,
    run_result_id: (formData.get('run_result_id') as string) || null,
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bugs')
    .insert({
      project_id: projectId,
      reporter_id: userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      steps_to_reproduce: parsed.data.steps_to_reproduce ?? null,
      expected_result: parsed.data.expected_result ?? null,
      actual_result: parsed.data.actual_result ?? null,
      severity: parsed.data.severity,
      priority: parsed.data.priority,
      status: 'new',
      environment: parsed.data.environment ?? null,
      assignee_id: parsed.data.assignee_id ?? null,
      run_result_id: parsed.data.run_result_id ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not file bug.' };
  }

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'bug',
    entity_id: data.id,
    action: 'created',
    metadata: { title: parsed.data.title, severity: parsed.data.severity },
  });

  revalidatePath(`/projects/${projectId}/bugs`);
  redirect(`/projects/${projectId}/bugs/${data.id}`);
}

export async function updateBugAction(formData: FormData) {
  const { userId } = await requireUser();
  const projectId = formData.get('project_id') as string;
  const bugId = formData.get('bug_id') as string;
  const status = formData.get('status') as string | null;
  const assigneeId = formData.get('assignee_id') as string | null;
  const priority = formData.get('priority') as string | null;
  const severity = formData.get('severity') as string | null;

  type Updates = {
    status?: string;
    assignee_id?: string | null;
    priority?: string;
    severity?: string;
    closed_at?: string | null;
  };
  const updates: Updates = {};
  if (status) updates.status = status;
  if (assigneeId !== null) updates.assignee_id = assigneeId === '' ? null : assigneeId;
  if (priority) updates.priority = priority;
  if (severity) updates.severity = severity;
  if (status === 'closed' || status === 'verified' || status === 'wont_fix') {
    updates.closed_at = new Date().toISOString();
  } else if (status) {
    updates.closed_at = null;
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();
  // Cast because the partial Update type requires keys to be optional fields.
  await supabase
    .from('bugs')
    .update(updates as never)
    .eq('id', bugId)
    .eq('project_id', projectId);

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'bug',
    entity_id: bugId,
    action: 'updated',
    metadata: updates,
  });

  revalidatePath(`/projects/${projectId}/bugs`);
  revalidatePath(`/projects/${projectId}/bugs/${bugId}`);
}

const CommentSchema = z.object({ body: z.string().min(1).max(4000) });

export async function addBugCommentAction(formData: FormData) {
  const { userId } = await requireUser();
  const projectId = formData.get('project_id') as string;
  const bugId = formData.get('bug_id') as string;
  const parsed = CommentSchema.safeParse({ body: formData.get('body') });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from('bug_comments').insert({
    bug_id: bugId,
    user_id: userId,
    body: parsed.data.body,
  });
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'bug',
    entity_id: bugId,
    action: 'commented',
    metadata: {},
  });
  revalidatePath(`/projects/${projectId}/bugs/${bugId}`);
}
