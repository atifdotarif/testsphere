import { notFound } from 'next/navigation';
import { TabNav } from '@/components/app-shell/tab-nav';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, key')
    .eq('id', id)
    .maybeSingle();

  if (!project) notFound();

  const base = `/projects/${id}`;
  const tabs = [
    { href: `${base}`, label: 'Overview' },
    { href: `${base}/cases`, label: 'Test cases' },
    { href: `${base}/plans`, label: 'Test plans' },
    { href: `${base}/runs`, label: 'Test runs' },
    { href: `${base}/bugs`, label: 'Bugs' },
    { href: `${base}/activity`, label: 'Activity' },
    { href: `${base}/members`, label: 'Members' },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md border border-[color:var(--border)] bg-[color:var(--muted)] text-[11px] font-semibold tracking-wider text-[color:var(--subtle-foreground)]">
          {project.key}
        </span>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
            Project
          </div>
          <h1 className="text-xl font-semibold leading-tight tracking-tight">
            {project.name}
          </h1>
        </div>
      </div>
      <TabNav items={tabs} />
      <div>{children}</div>
    </div>
  );
}
