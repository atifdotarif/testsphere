import Link from 'next/link';
import LoginForm from './login-form';

export const metadata = { title: 'Sign in · Test Sphere' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        Sign in to continue to your QA workspace.
      </p>
      <LoginForm next={next ?? '/dashboard'} />
      <p className="mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-[color:var(--primary)] hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
