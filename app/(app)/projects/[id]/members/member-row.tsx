'use client';

import { Avatar } from '@/components/ui/avatar';
import { Badge, ROLE_TONES } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { formatDate } from '@/lib/utils/format';
import type { ProjectRole } from '@/lib/supabase/database.types';
import { removeMemberAction, updateMemberRoleAction } from '../../actions';

const ROLES: ProjectRole[] = ['owner', 'manager', 'qa_engineer', 'developer', 'viewer'];

export default function MemberRow({
  projectId,
  user,
  role,
  joinedAt,
  canManage,
}: {
  projectId: string;
  user: { id: string; full_name: string; email: string; avatar_url: string | null };
  role: ProjectRole;
  joinedAt: string;
  canManage: boolean;
}) {
  return (
    <tr className="border-t border-[color:var(--border)]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} src={user.avatar_url} />
          <div>
            <div className="font-medium">{user.full_name}</div>
            <div className="text-xs text-[color:var(--muted-foreground)]">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <form action={updateMemberRoleAction} className="flex items-center gap-2">
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="user_id" value={user.id} />
            <Select
              name="role"
              defaultValue={role}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="h-8 max-w-[140px] text-xs"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </form>
        ) : (
          <Badge tone={ROLE_TONES[role]}>{role.replace('_', ' ')}</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
        {formatDate(joinedAt)}
      </td>
      {canManage ? (
        <td className="px-4 py-3 text-right">
          <form action={removeMemberAction}>
            <input type="hidden" name="project_id" value={projectId} />
            <input type="hidden" name="user_id" value={user.id} />
            <button
              type="submit"
              className="text-xs font-medium text-[color:var(--destructive)] hover:underline"
            >
              Remove
            </button>
          </form>
        </td>
      ) : null}
    </tr>
  );
}
