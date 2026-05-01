'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { signupAction, type AuthState } from '../actions';

export default function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signupAction,
    undefined
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" autoComplete="name" required />
        <FieldError message={state?.errors?.full_name} />
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError message={state?.errors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError message={state?.errors?.password} />
      </div>
      {state?.message ? (
        <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-sm">
          {state.message}
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
