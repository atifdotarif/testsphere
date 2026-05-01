'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import { createProjectAction, type ActionState } from '../actions';

export default function NewProjectForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createProjectAction,
    undefined
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" required placeholder="Acme Checkout" />
        <FieldError message={state?.errors?.name} />
      </div>
      <div>
        <Label htmlFor="key">Key</Label>
        <Input
          id="key"
          name="key"
          required
          placeholder="ACM"
          maxLength={10}
          className="uppercase"
        />
        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
          Short prefix used in IDs and the sidebar (2–10 letters/digits).
        </p>
        <FieldError message={state?.errors?.key} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Short summary, owners, scope…"
        />
        <FieldError message={state?.errors?.description} />
      </div>
      {state?.message ? (
        <div className="rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
          {state.message}
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create project'}
      </Button>
    </form>
  );
}
