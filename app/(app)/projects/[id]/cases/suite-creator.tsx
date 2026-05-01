'use client';

import { useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { createSuiteAction } from './actions';

export default function SuiteCreator({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4" />
        New suite
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3"
      action={(formData) => {
        startTransition(async () => {
          await createSuiteAction(projectId, formData);
          setOpen(false);
        });
      }}
    >
      <div>
        <Label htmlFor="suite-name">Suite name</Label>
        <Input id="suite-name" name="name" required placeholder="Checkout flow" />
      </div>
      <div>
        <Label htmlFor="suite-desc">Description</Label>
        <Textarea
          id="suite-desc"
          name="description"
          rows={2}
          placeholder="Optional"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
