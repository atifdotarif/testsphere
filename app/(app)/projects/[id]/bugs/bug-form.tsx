'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input';
import { createBugAction, type BugFormState } from './actions';

export default function BugForm({
  projectId,
  assignees,
  initial,
}: {
  projectId: string;
  assignees: { id: string; full_name: string }[];
  initial?: {
    title?: string;
    steps_to_reproduce?: string;
    expected_result?: string;
    actual_result?: string;
    environment?: string;
    run_result_id?: string | null;
  };
}) {
  const action = createBugAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<BugFormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {initial?.run_result_id ? (
        <input type="hidden" name="run_result_id" value={initial.run_result_id} />
      ) : null}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={initial?.title ?? ''}
          placeholder="Checkout crashes when promo code is empty"
        />
        <FieldError message={state?.errors?.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select id="severity" name="severity" defaultValue="major">
            <option value="trivial">Trivial</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
            <option value="blocker">Blocker</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="high">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="assignee_id">Assignee</Label>
          <Select id="assignee_id" name="assignee_id" defaultValue="">
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="environment">Environment</Label>
        <Input
          id="environment"
          name="environment"
          defaultValue={initial?.environment ?? ''}
          placeholder="staging / Chrome 130 / Win11"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="steps_to_reproduce">Steps to reproduce</Label>
          <Textarea
            id="steps_to_reproduce"
            name="steps_to_reproduce"
            rows={6}
            defaultValue={initial?.steps_to_reproduce ?? ''}
            placeholder={'1. Open /checkout\n2. ...'}
          />
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="expected_result">Expected</Label>
            <Textarea
              id="expected_result"
              name="expected_result"
              rows={2}
              defaultValue={initial?.expected_result ?? ''}
            />
          </div>
          <div>
            <Label htmlFor="actual_result">Actual</Label>
            <Textarea
              id="actual_result"
              name="actual_result"
              rows={2}
              defaultValue={initial?.actual_result ?? ''}
            />
          </div>
        </div>
      </div>

      {state?.message ? (
        <div className="rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
          {state.message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Filing…' : 'File bug'}
        </Button>
      </div>
    </form>
  );
}
