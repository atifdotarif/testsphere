'use client';

import { useTransition } from 'react';
import { Users } from 'lucide-react';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { bulkAssignRunAction } from '../actions';

export default function BulkAssign({
  projectId,
  runId,
  members,
  pendingCount,
}: {
  projectId: string;
  runId: string;
  members: { id: string; full_name: string }[];
  pendingCount: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd) => startTransition(() => bulkAssignRunAction(fd))}
      className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-2 text-xs"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="run_id" value={runId} />
      <Users className="h-4 w-4 text-[color:var(--muted-foreground)]" />
      <span className="text-[color:var(--muted-foreground)]">
        Assign {pendingCount} pending to
      </span>
      <Select name="assignee_id" defaultValue="" className="h-8 w-[180px] text-xs">
        <option value="">— pick a tester —</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.full_name}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" disabled={pending || pendingCount === 0}>
        {pending ? 'Assigning…' : 'Apply'}
      </Button>
    </form>
  );
}
