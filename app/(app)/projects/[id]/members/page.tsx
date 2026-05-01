import { createClient } from '@/lib/supabase/server';
import { getProjectRole, requireUser, roleAtLeast } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import InviteForm from './invite-form';
import MemberRow from './member-row';
import type { ProjectRole } from '@/lib/supabase/database.types';

export const metadata = { title: 'Members' };

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const role = await getProjectRole(id);
  const canManage = roleAtLeast(role, 'manager');

  const supabase = await createClient();
  const { data } = await supabase
    .from('project_members')
    .select('role, joined_at, profiles(id, full_name, email, avatar_url)')
    .eq('project_id', id)
    .order('joined_at', { ascending: true });

  type Row = {
    role: ProjectRole;
    joined_at: string;
    profiles: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  };
  const members = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage who can access this project and what they can do."
      />
      {canManage ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
          <h2 className="mb-3 text-sm font-semibold">Invite a teammate</h2>
          <InviteForm projectId={id} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3 text-left">Member</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Joined</th>
              {canManage ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((m) =>
              m.profiles ? (
                <MemberRow
                  key={m.profiles.id}
                  projectId={id}
                  user={m.profiles}
                  role={m.role}
                  joinedAt={m.joined_at}
                  canManage={canManage}
                />
              ) : null
            )}
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!canManage ? (
        <div className="text-xs text-[color:var(--muted-foreground)]">
          You are a {role ?? 'viewer'} on this project — only managers and owners
          can invite or remove members.
        </div>
      ) : null}
    </div>
  );
}

