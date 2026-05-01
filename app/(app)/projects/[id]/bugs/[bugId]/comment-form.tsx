'use client';

import { useRef, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { addBugCommentAction } from '../actions';

export default function CommentForm({
  projectId,
  bugId,
}: {
  projectId: string;
  bugId: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={ref}
      action={(fd) => {
        startTransition(async () => {
          await addBugCommentAction(fd);
          ref.current?.reset();
        });
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="bug_id" value={bugId} />
      <Textarea
        name="body"
        rows={3}
        placeholder="Leave a comment, paste links, or @-mention developers in the description…"
        required
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </form>
  );
}
