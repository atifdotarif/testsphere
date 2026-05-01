'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { createPlanAction } from './actions';

export default function NewPlanForm({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      action={(formData) => startTransition(() => createPlanAction(projectId, formData))}
    >
      <div>
        <Label htmlFor="name">Plan name</Label>
        <Input id="name" name="name" required placeholder="Sprint 14 regression" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create plan'}
      </Button>
    </form>
  );
}
