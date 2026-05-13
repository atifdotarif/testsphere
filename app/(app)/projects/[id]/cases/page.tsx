import Link from 'next/link';
import { Plus, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge, PRIORITY_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';
import type { CaseStatus, TestPriority } from '@/lib/supabase/database.types';
import SuiteCreator from './suite-creator';

export const metadata = { title: 'Test cases' };

const STATUS_TONE: Record<CaseStatus, 'success' | 'neutral' | 'warning'> = {
  active: 'success',
  draft: 'neutral',
  deprecated: 'warning',
};

export default async function CasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ suite?: string; q?: string; tag?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const [{ data: suites }, { data: cases }] = await Promise.all([
    supabase
      .from('test_suites')
      .select('id, name')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    (async () => {
      let q = supabase
        .from('test_cases')
        .select('id, title, priority, status, tags, suite_id, updated_at, test_suites(name)')
        .eq('project_id', id)
        .order('updated_at', { ascending: false });
      if (sp.suite) q = q.eq('suite_id', sp.suite);
      if (sp.q) q = q.ilike('title', `%${sp.q}%`);
      // Postgres array contains operator — RLS-safe, no client filter needed.
      if (sp.tag) q = q.contains('tags', [sp.tag]);
      return await q;
    })(),
  ]);

  // Build a unique tag cloud from the loaded cases for one-click filtering.
  const tagsFromRows = cases ?? [];
  const tagSet = new Set<string>();
  for (const c of tagsFromRows as Array<{ tags: string[] }>) {
    for (const t of c.tags ?? []) tagSet.add(t);
  }
  const allTags = Array.from(tagSet).sort();

  type CaseRow = {
    id: string;
    title: string;
    priority: TestPriority;
    status: CaseStatus;
    tags: string[];
    suite_id: string | null;
    updated_at: string;
    test_suites: { name: string } | null;
  };

  const rows = (cases ?? []) as unknown as CaseRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test cases"
        description="Reusable, versioned definitions of what to test."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${id}/cases/generate`}>
              <Button variant="outline">
                <Sparkles className="h-4 w-4" />
                Smart Test Generator
              </Button>
            </Link>
            <Link href={`/projects/${id}/cases/new`}>
              <Button>
                <Plus className="h-4 w-4" />
                New test case
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <SuiteCreator projectId={id} />
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
            <div className="border-b border-[color:var(--border)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Suites
            </div>
            <ul className="p-2 text-sm">
              <li>
                <Link
                  href={`/projects/${id}/cases`}
                  className={`block rounded-md px-2 py-1.5 ${!sp.suite ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]' : 'hover:bg-[color:var(--muted)]'}`}
                >
                  All cases
                </Link>
              </li>
              {(suites ?? []).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/projects/${id}/cases?suite=${s.id}`}
                    className={`block rounded-md px-2 py-1.5 ${sp.suite === s.id ? 'bg-[color:var(--accent)] text-[color:var(--accent-foreground)]' : 'hover:bg-[color:var(--muted)]'}`}
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div>
          <div className="mb-3 space-y-2">
            <form action={`/projects/${id}/cases`} className="flex flex-wrap gap-2">
              {sp.suite ? <input type="hidden" name="suite" value={sp.suite} /> : null}
              {sp.tag ? <input type="hidden" name="tag" value={sp.tag} /> : null}
              <input
                name="q"
                defaultValue={sp.q ?? ''}
                placeholder="Search by title…"
                className="h-9 w-full max-w-sm rounded-lg border border-[color:var(--input)] bg-[color:var(--card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              />
              {(sp.q || sp.tag) ? (
                <Link
                  href={`/projects/${id}/cases${sp.suite ? `?suite=${sp.suite}` : ''}`}
                  className="inline-flex h-9 items-center rounded-md border border-[color:var(--border)] px-3 text-xs text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
                >
                  Clear filters
                </Link>
              ) : null}
            </form>
            {allTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[color:var(--muted-foreground)]">Tags:</span>
                {allTags.map((t) => {
                  const params = new URLSearchParams();
                  if (sp.suite) params.set('suite', sp.suite);
                  if (sp.q) params.set('q', sp.q);
                  if (sp.tag !== t) params.set('tag', t);
                  const href = `/projects/${id}/cases${params.toString() ? `?${params}` : ''}`;
                  const active = sp.tag === t;
                  return (
                    <Link
                      key={t}
                      href={href}
                      className={
                        active
                          ? 'rounded-full border border-[color:var(--primary)] bg-[color:var(--primary)] px-2 py-0.5 font-medium text-white'
                          : 'rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-2 py-0.5 text-[color:var(--muted-foreground)] hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-foreground)]'
                      }
                    >
                      {t}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="h-5 w-5" />}
              title="No test cases yet"
              description="Author cases by hand or use the Smart Test Generator to draft them from a GitHub repo."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href={`/projects/${id}/cases/generate`}>
                    <Button variant="outline">
                      <Sparkles className="h-4 w-4" />
                      Generate from a repo
                    </Button>
                  </Link>
                  <Link href={`/projects/${id}/cases/new`}>
                    <Button>
                      <Plus className="h-4 w-4" />
                      New test case
                    </Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              <table className="w-full text-sm">
                <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Suite</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${id}/cases/${c.id}`} className="font-medium hover:underline">
                          {c.title}
                        </Link>
                        {c.tags.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                        {c.test_suites?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={PRIORITY_TONES[c.priority]}>{c.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[color:var(--muted-foreground)]">
                        {formatRelative(c.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
