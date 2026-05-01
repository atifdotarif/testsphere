import 'server-only';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, ProjectRole } from '@/lib/supabase/database.types';

// Returns the authenticated user + profile, redirecting to /login if missing.
export async function requireUser(): Promise<{
  userId: string;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) redirect('/login');
  return { userId: user.id, profile: profile as Profile };
}

// Optional: returns user/profile or null without redirecting.
export async function getOptionalUser(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  return { userId: user.id, profile: profile as Profile };
}

// Look up the caller's role within a project. `null` means non-member.
export async function getProjectRole(projectId: string): Promise<ProjectRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  return (data?.role as ProjectRole | undefined) ?? null;
}

const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  developer: 1,
  qa_engineer: 2,
  manager: 3,
  owner: 4,
};

// Returns true when the project member role is at least the given role.
export function roleAtLeast(role: ProjectRole | null, atLeast: ProjectRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[atLeast];
}
