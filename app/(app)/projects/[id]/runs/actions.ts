'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import type { ResultStatus } from '@/lib/supabase/database.types';

const RunSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  environment: z.string().max(80).optional(),
  plan_id: z.string().uuid().optional().nullable(),
  default_assignee_id: z.string().uuid().optional().nullable(),
});

export async function createRunAction(projectId: string, formData: FormData) {
  const { userId } = await requireUser();
  const parsed = RunSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    environment: formData.get('environment') || undefined,
    plan_id: (formData.get('plan_id') as string) || null,
    default_assignee_id: (formData.get('default_assignee_id') as string) || null,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: run, error } = await supabase
    .from('test_runs')
    .insert({
      project_id: projectId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      environment: parsed.data.environment ?? null,
      plan_id: parsed.data.plan_id ?? null,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !run) return;

  // Seed a result row per case, taken from the plan if any, otherwise from
  // the explicit case_id list submitted on the form.
  let caseIds: string[] = [];
  if (parsed.data.plan_id) {
    const { data: planCases } = await supabase
      .from('test_plan_cases')
      .select('case_id')
      .eq('plan_id', parsed.data.plan_id);
    caseIds = (planCases ?? []).map((r) => r.case_id);
  } else {
    caseIds = formData.getAll('case_id').map((v) => String(v));
  }

  if (caseIds.length > 0) {
    await supabase.from('test_run_results').insert(
      caseIds.map((cid) => ({
        run_id: run.id,
        case_id: cid,
        status: 'pending' as ResultStatus,
        assigned_to: parsed.data.default_assignee_id ?? null,
      }))
    );
  }

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_run',
    entity_id: run.id,
    action: 'created',
    metadata: { name: parsed.data.name, cases: caseIds.length },
  });

  revalidatePath(`/projects/${projectId}/runs`);
  redirect(`/projects/${projectId}/runs/${run.id}`);
}

const ResultSchema = z.object({
  result_id: z.string().uuid(),
  run_id: z.string().uuid(),
  project_id: z.string().uuid(),
  status: z.enum(['pending', 'passed', 'failed', 'blocked', 'skipped']),
  notes: z.string().max(2000).optional(),
  duration_ms: z.coerce.number().int().min(0).optional().nullable(),
});

export async function setResultAction(formData: FormData) {
  const { userId } = await requireUser();
  const parsed = ResultSchema.safeParse({
    result_id: formData.get('result_id'),
    run_id: formData.get('run_id'),
    project_id: formData.get('project_id'),
    status: formData.get('status'),
    notes: formData.get('notes') || undefined,
    duration_ms: formData.get('duration_ms') || null,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from('test_run_results')
    .update({
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      duration_ms: parsed.data.duration_ms ?? null,
      executed_by: userId,
      executed_at: parsed.data.status === 'pending' ? null : new Date().toISOString(),
    })
    .eq('id', parsed.data.result_id);

  revalidatePath(`/projects/${parsed.data.project_id}/runs/${parsed.data.run_id}`);
}

const AssignSchema = z.object({
  result_id: z.string().uuid(),
  run_id: z.string().uuid(),
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable(),
});

// Assign (or unassign) a single result row. Only project owners / managers
// can call this — RLS will reject anyone else.
export async function assignResultAction(formData: FormData) {
  const { userId } = await requireUser();
  const parsed = AssignSchema.safeParse({
    result_id: formData.get('result_id'),
    run_id: formData.get('run_id'),
    project_id: formData.get('project_id'),
    assignee_id: (formData.get('assignee_id') as string) || null,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('test_run_results')
    .update({ assigned_to: parsed.data.assignee_id })
    .eq('id', parsed.data.result_id);

  if (error) return;

  await supabase.from('activity_log').insert({
    project_id: parsed.data.project_id,
    user_id: userId,
    entity_type: 'test_run_result',
    entity_id: parsed.data.result_id,
    action: parsed.data.assignee_id ? 'assigned' : 'unassigned',
    metadata: { assignee_id: parsed.data.assignee_id },
  });

  revalidatePath(`/projects/${parsed.data.project_id}/runs/${parsed.data.run_id}`);
}

// Bulk-assign every still-pending row in a run to a single tester.
const BulkAssignSchema = z.object({
  run_id: z.string().uuid(),
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().nullable(),
});

export async function bulkAssignRunAction(formData: FormData) {
  const { userId } = await requireUser();
  const parsed = BulkAssignSchema.safeParse({
    run_id: formData.get('run_id'),
    project_id: formData.get('project_id'),
    assignee_id: (formData.get('assignee_id') as string) || null,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from('test_run_results')
    .update({ assigned_to: parsed.data.assignee_id })
    .eq('run_id', parsed.data.run_id)
    .eq('status', 'pending');

  await supabase.from('activity_log').insert({
    project_id: parsed.data.project_id,
    user_id: userId,
    entity_type: 'test_run',
    entity_id: parsed.data.run_id,
    action: 'bulk_assigned',
    metadata: { assignee_id: parsed.data.assignee_id },
  });

  revalidatePath(`/projects/${parsed.data.project_id}/runs/${parsed.data.run_id}`);
}

// Reverse of completeRunAction — flips status back to `in_progress` and
// clears completed_at so the run becomes editable again. Useful when
// "Complete run" was clicked by mistake or when a regression appears and
// the team wants to keep testing under the same run.
export async function reopenRunAction(formData: FormData) {
  const { userId } = await requireUser();
  const projectId = formData.get('project_id') as string;
  const runId = formData.get('run_id') as string;

  const supabase = await createClient();
  await supabase
    .from('test_runs')
    .update({
      status: 'in_progress',
      completed_at: null,
    })
    .eq('id', runId)
    .eq('project_id', projectId);

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_run',
    entity_id: runId,
    action: 'reopened',
    metadata: {},
  });

  revalidatePath(`/projects/${projectId}/runs/${runId}`);
  revalidatePath(`/projects/${projectId}/runs`);
}

export async function completeRunAction(formData: FormData) {
  const { userId } = await requireUser();
  const projectId = formData.get('project_id') as string;
  const runId = formData.get('run_id') as string;
  const status = (formData.get('status') as 'completed' | 'aborted') ?? 'completed';

  const supabase = await createClient();
  await supabase
    .from('test_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('project_id', projectId);

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_run',
    entity_id: runId,
    action: status === 'completed' ? 'completed' : 'aborted',
    metadata: {},
  });
  revalidatePath(`/projects/${projectId}/runs/${runId}`);
  revalidatePath(`/projects/${projectId}/runs`);
}
