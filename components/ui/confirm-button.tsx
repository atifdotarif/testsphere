'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils/cn';

// A tiny client-side wrapper that intercepts submit to confirm() before
// letting the surrounding <form action={…}> proceed. Used for delete /
// destructive operations so a stray click doesn't wipe data.
export function ConfirmButton({
  message,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const id = useId();
  return (
    <button
      {...props}
      id={id}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        props.onClick?.(e);
      }}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
