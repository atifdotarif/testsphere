import Link from 'next/link';
import { ArrowRight, Bug, ClipboardCheck, FlaskConical, Gauge, TestTube2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOptionalUser } from '@/lib/auth';

export const metadata = {
  title: 'Test Sphere · Bug tracking & test management',
};

export default async function LandingPage() {
  const session = await getOptionalUser();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-base font-semibold">
          <TestTube2 className="h-5 w-5 text-[color:var(--primary)]" />
          Test Sphere
        </div>
        <nav className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button size="md">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              >
                Sign in
              </Link>
              <Link href="/signup">
                <Button size="md">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--accent)] px-3 py-1 text-xs font-medium text-[color:var(--accent-foreground)]">
              QA workspace · v1.0
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              The QA workspace for teams that ship with confidence.
            </h1>
            <p className="mt-4 max-w-lg text-base text-[color:var(--muted-foreground)]">
              Author reusable test cases, run release-ready test plans, capture
              defects on the spot and stay aligned with developers — all in one
              place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={session ? '/dashboard' : '/signup'}>
                <Button size="lg">
                  {session ? 'Open dashboard' : 'Start free'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: <FlaskConical className="h-5 w-5" />,
                title: 'Reusable test cases',
                copy: 'Versioned, tagged, organized into suites.',
              },
              {
                icon: <ClipboardCheck className="h-5 w-5" />,
                title: 'Execution sessions',
                copy: 'Pass / fail / blocked with attached evidence.',
              },
              {
                icon: <Bug className="h-5 w-5" />,
                title: 'Linked bug tracker',
                copy: 'File defects from a failing result in one click.',
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: 'Project roles',
                copy: 'Owner, manager, QA, dev — RLS-enforced access.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
                  {f.icon}
                </div>
                <div className="mt-3 text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-[color:var(--muted-foreground)]">{f.copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] bg-[color:var(--card)]/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-3">
          {[
            {
              icon: <Gauge className="h-5 w-5" />,
              title: 'Real-time health',
              copy: 'Watch test pass-rate, open bugs and overdue runs across every project you own.',
            },
            {
              icon: <ClipboardCheck className="h-5 w-5" />,
              title: 'Auditable trail',
              copy: 'Every status change, comment and run is recorded for traceability and compliance.',
            },
            {
              icon: <Users className="h-5 w-5" />,
              title: 'Built for teams',
              copy: 'Invite developers, QAs and managers with the right permissions for their role.',
            },
          ].map((f, i) => (
            <div key={i}>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[color:var(--accent)] text-[color:var(--accent-foreground)]">
                {f.icon}
              </div>
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{f.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-[color:var(--muted-foreground)]">
        © {new Date().getFullYear()} Test Sphere. Built with Next.js & Supabase.
      </footer>
    </div>
  );
}
