'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { updateProfileAction } from './actions';

export default function ProfileForm({
  initial,
}: {
  initial: { full_name: string; avatar_url: string | null };
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={(fd) => startTransition(() => updateProfileAction(fd))}
    >
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required defaultValue={initial.full_name} />
      </div>
      <div>
        <Label htmlFor="avatar_url">Avatar URL</Label>
        <Input id="avatar_url" name="avatar_url" defaultValue={initial.avatar_url ?? ''} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
