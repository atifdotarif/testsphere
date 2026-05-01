import Link from 'next/link';
import SignupForm from './signup-form';

export const metadata = { title: 'Create account · Test Sphere' };

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        Spin up your QA workspace in seconds.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[color:var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
