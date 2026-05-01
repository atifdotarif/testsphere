import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-medium text-[color:var(--muted-foreground)]">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          The page you are looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-[color:var(--primary)] px-4 text-sm font-medium text-[color:var(--primary-foreground)]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
