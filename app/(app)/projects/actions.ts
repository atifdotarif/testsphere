'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import type { ProjectRole } from '@/lib/supabase/database.types';

const ProjectSchema = z.object({
  name: z.string().min(2).max(80),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, 'Use 2–10 uppercase letters or digits'),
  description: z.string().max(500).optional(),
});

export type ActionState =
  | { ok: false; errors?: Record<string, string[] | undefined>; message?: string }
  | undefined;

export async function createProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = ProjectSchema.safeParse({
    name: formData.get('name'),
    key: (formData.get('key') as string)?.toUpperCase(),
    description: formData.get('description') || undefined,
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  // Project creation, membership and the first activity entry happen in a
  // single SECURITY DEFINER function so RLS doesn't trip on the brief gap
  // between the projects insert and the project_members insert.
  const { data: newId, error } = await supabase.rpc('create_project', {
    p_name: parsed.data.name,
    p_key: parsed.data.key,
    p_description: parsed.data.description ?? null,
  });

  if (error || !newId) {
    return { ok: false, message: error?.message ?? 'Could not create project.' };
  }

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect(`/projects/${newId}`);
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'manager', 'qa_engineer', 'developer', 'viewer']),
});

export async function inviteMemberAction(
  projectId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const parsed = InviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (!target) {
    return {
      ok: false,
      message: 'No user with that email exists yet. Ask them to sign up first.',
    };
  }

  const { error } = await supabase.from('project_members').upsert({
    project_id: projectId,
    user_id: target.id,
    role: parsed.data.role,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/projects/${projectId}/members`);
  return undefined;
}

export async function updateMemberRoleAction(formData: FormData) {
  await requireUser();
  const projectId = formData.get('project_id') as string;
  const userId = formData.get('user_id') as string;
  const role = formData.get('role') as ProjectRole;

  const supabase = await createClient();
  await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  revalidatePath(`/projects/${projectId}/members`);
}

export async function removeMemberAction(formData: FormData) {
  await requireUser();
  const projectId = formData.get('project_id') as string;
  const userId = formData.get('user_id') as string;

  const supabase = await createClient();
  await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  revalidatePath(`/projects/${projectId}/members`);
}
