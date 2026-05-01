'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

const PlanSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
});

export async function createPlanAction(projectId: string, formData: FormData) {
  const { userId } = await requireUser();
  const parsed = PlanSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('test_plans')
    .insert({
      project_id: projectId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      created_by: userId,
    })
    .select('id')
    .single();
  if (error || !data) return;

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: userId,
    entity_type: 'test_plan',
    entity_id: data.id,
    action: 'created',
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/projects/${projectId}/plans`);
  redirect(`/projects/${projectId}/plans/${data.id}`);
}

export async function setPlanCasesAction(formData: FormData) {
  await requireUser();
  const projectId = formData.get('project_id') as string;
  const planId = formData.get('plan_id') as string;
  const ids = formData.getAll('case_id').map((v) => String(v));

  const supabase = await createClient();
  await supabase.from('test_plan_cases').delete().eq('plan_id', planId);
  if (ids.length > 0) {
    await supabase.from('test_plan_cases').insert(
      ids.map((id, idx) => ({ plan_id: planId, case_id: id, position: idx }))
    );
  }
  revalidatePath(`/projects/${projectId}/plans/${planId}`);
}

export async function deletePlanAction(formData: FormData) {
  await requireUser();
  const projectId = formData.get('project_id') as string;
  const planId = formData.get('plan_id') as string;
  const supabase = await createClient();
  await supabase.from('test_plans').delete().eq('id', planId).eq('project_id', projectId);
  revalidatePath(`/projects/${projectId}/plans`);
  redirect(`/projects/${projectId}/plans`);
}
