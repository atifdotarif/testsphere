'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

const StepSchema = z.object({
  step: z.string().min(1),
  expected: z.string().min(1),
});

const CaseSchema = z.object({
  title: z.string().min(3).max(160),
  preconditions: z.string().max(2000).optional(),
  expected_result: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['draft', 'active', 'deprecated']),
  suite_id: z.string().uuid().optional().nullable(),
  tags: z.string().optional(),
  steps: z.array(StepSchema).min(1, 'At least one step is required'),
});

export type CaseState =
  | { ok: false; errors?: Record<string, string[] | undefined>; message?: string }
  | undefined;

function parseStepsField(formData: FormData) {
  // The form serializes steps as repeated `step[i]` and `expected[i]` fields.
  const steps: { step: string; expected: string }[] = [];
  const stepEntries = Array.from(formData.entries()).filter(([k]) =>
    k.startsWith('step[')
  );
  stepEntries.forEach(([k]) => {
    const idx = Number(k.match(/^step\[(\d+)\]$/)?.[1]);
    if (Number.isNaN(idx)) return;
    const step = (formData.get(`step[${idx}]`) as string | null) ?? '';
    const expected = (formData.get(`expected[${idx}]`) as string | null) ?? '';
    if (step.trim() || expected.trim()) {
      steps.push({ step: step.trim(), expected: expected.trim() });
    }
  });
  return steps;
}

export async function createCaseAction(
  projectId: string,
  _prev: CaseState,
  formData: FormData
): Promise<CaseState> {
  const { userId } = await requireUser();
  const tags = (formData.get('tags') as string | null) ?? '';

  const parsed = CaseSchema.safeParse({
    title: formData.get('title'),
    preconditions: formData.get('preconditions') || undefined,
    expected_result: formData.get('expected_result') || undefined,
    priority: formData.get('priority') ?? 'medium',
    status: formData.get('status') ?? 'active',
    suite_id: (formData.get('suite_id') as string) || null,
    tags,
    steps: parseStepsField(formData),
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('test_cases')
    .insert({
      project_id: projectId,
      title: parsed.data.title,
      preconditions: parsed.data.preconditions ?? null,
      expected_result: parsed.data.expected_result ?? null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      suite_id: parsed.data.suite_id ?? null,
      tags: parsed.data.tags
        ? parsed.data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      steps: parsed.data.steps,
      created_by: userId,
    })
    .select('id')
    .single();

  if (error || !row) return { ok: false, message: error?.message ?? 'Could not create.' };

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_case',
    entity_id: row.id,
    action: 'created',
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/projects/${projectId}/cases`);
  redirect(`/projects/${projectId}/cases/${row.id}`);
}

export async function updateCaseAction(
  projectId: string,
  caseId: string,
  _prev: CaseState,
  formData: FormData
): Promise<CaseState> {
  const { userId } = await requireUser();
  const tags = (formData.get('tags') as string | null) ?? '';

  const parsed = CaseSchema.safeParse({
    title: formData.get('title'),
    preconditions: formData.get('preconditions') || undefined,
    expected_result: formData.get('expected_result') || undefined,
    priority: formData.get('priority') ?? 'medium',
    status: formData.get('status') ?? 'active',
    suite_id: (formData.get('suite_id') as string) || null,
    tags,
    steps: parseStepsField(formData),
  });

  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('test_cases')
    .update({
      title: parsed.data.title,
      preconditions: parsed.data.preconditions ?? null,
      expected_result: parsed.data.expected_result ?? null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      suite_id: parsed.data.suite_id ?? null,
      tags: parsed.data.tags
        ? parsed.data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      steps: parsed.data.steps,
    })
    .eq('id', caseId)
    .eq('project_id', projectId);

  if (error) return { ok: false, message: error.message };

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_case',
    entity_id: caseId,
    action: 'updated',
    metadata: { title: parsed.data.title },
  });

  revalidatePath(`/projects/${projectId}/cases`);
  revalidatePath(`/projects/${projectId}/cases/${caseId}`);
  return undefined;
}

export async function deleteCaseAction(formData: FormData) {
  const { userId } = await requireUser();
  const projectId = formData.get('project_id') as string;
  const caseId = formData.get('case_id') as string;

  const supabase = await createClient();
  await supabase.from('test_cases').delete().eq('id', caseId).eq('project_id', projectId);
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_case',
    entity_id: caseId,
    action: 'deleted',
    metadata: {},
  });
  revalidatePath(`/projects/${projectId}/cases`);
  redirect(`/projects/${projectId}/cases`);
}

const SuiteSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
});

export async function createSuiteAction(projectId: string, formData: FormData) {
  const { userId } = await requireUser();
  const parsed = SuiteSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from('test_suites').insert({
    project_id: projectId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    created_by: userId,
  });
  revalidatePath(`/projects/${projectId}/cases`);
}
