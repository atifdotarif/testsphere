'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/5 p-6 text-center">
      <h2 className="text-lg font-semibold text-[color:var(--destructive)]">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="mt-4">
        <Button onClick={reset} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    </div>
  );
}
