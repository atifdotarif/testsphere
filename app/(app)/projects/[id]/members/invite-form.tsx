'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Select } from '@/components/ui/input';
import { inviteMemberAction, type ActionState } from '../../actions';

export default function InviteForm({ projectId }: { projectId: string }) {
  const action = inviteMemberAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="teammate@company.com" />
        <FieldError message={state?.errors?.email} />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue="qa_engineer">
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
          <option value="qa_engineer">QA Engineer</option>
          <option value="developer">Developer</option>
          <option value="viewer">Viewer</option>
        </Select>
        <FieldError message={state?.errors?.role} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add member'}
      </Button>
      {state?.message ? (
        <div className="sm:col-span-3 rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
          {state.message}
        </div>
      ) : null}
    </form>
  );
}
