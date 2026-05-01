'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input';
import type { CaseStatus, TestPriority, TestStep } from '@/lib/supabase/database.types';
import { createCaseAction, updateCaseAction, type CaseState } from './actions';

type Suite = { id: string; name: string };

type Initial = {
  id?: string;
  title?: string;
  preconditions?: string | null;
  expected_result?: string | null;
  priority?: TestPriority;
  status?: CaseStatus;
  suite_id?: string | null;
  tags?: string[];
  steps?: TestStep[];
};

export default function CaseForm({
  projectId,
  suites,
  initial,
}: {
  projectId: string;
  suites: Suite[];
  initial?: Initial;
}) {
  const editing = Boolean(initial?.id);
  const action = editing
    ? updateCaseAction.bind(null, projectId, initial!.id!)
    : createCaseAction.bind(null, projectId);

  const [state, formAction, pending] = useActionState<CaseState, FormData>(
    action,
    undefined
  );

  const [steps, setSteps] = useState<TestStep[]>(
    initial?.steps && initial.steps.length > 0
      ? initial.steps
      : [{ step: '', expected: '' }]
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={initial?.title ?? ''} />
        <FieldError message={state?.errors?.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="suite_id">Suite</Label>
          <Select id="suite_id" name="suite_id" defaultValue={initial?.suite_id ?? ''}>
            <option value="">Unassigned</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={initial?.priority ?? 'medium'}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? 'active'}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="deprecated">Deprecated</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={initial?.tags?.join(', ') ?? ''}
          placeholder="comma, separated, tags"
        />
      </div>

      <div>
        <Label htmlFor="preconditions">Preconditions</Label>
        <Textarea
          id="preconditions"
          name="preconditions"
          rows={2}
          defaultValue={initial?.preconditions ?? ''}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">Steps</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSteps((s) => [...s, { step: '', expected: '' }])}
          >
            <Plus className="h-4 w-4" />
            Add step
          </Button>
        </div>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:grid-cols-[2fr_2fr_auto]"
            >
              <Textarea
                name={`step[${i}]`}
                defaultValue={s.step}
                rows={2}
                placeholder={`Step ${i + 1}`}
              />
              <Textarea
                name={`expected[${i}]`}
                defaultValue={s.expected}
                rows={2}
                placeholder="Expected result"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setSteps((arr) => arr.filter((_, idx) => idx !== i))}
                aria-label="Remove step"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <FieldError message={state?.errors?.steps} />
      </div>

      <div>
        <Label htmlFor="expected_result">Final expected outcome</Label>
        <Textarea
          id="expected_result"
          name="expected_result"
          rows={2}
          defaultValue={initial?.expected_result ?? ''}
          placeholder="Optional summary of overall expected result"
        />
      </div>

      {state?.message ? (
        <div className="rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
          {state.message}
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create test case'}
        </Button>
      </div>
    </form>
  );
}
