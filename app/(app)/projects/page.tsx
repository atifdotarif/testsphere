import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge, ROLE_TONES } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils/format';
import type { ProjectRole } from '@/lib/supabase/database.types';

export const metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const { profile } = await requireUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('project_members')
    .select(
      'role, joined_at, projects(id, key, name, description, created_at, archived)'
    )
    .eq('user_id', profile.id)
    .order('joined_at', { ascending: false });

  type Row = {
    role: ProjectRole;
    joined_at: string;
    projects: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      created_at: string;
      archived: boolean;
    } | null;
  };
  const projects = (rows ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Workspaces that group test cases, runs and bugs."
        actions={
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="No projects yet"
          description="Create your first project to start authoring test cases and tracking bugs."
          action={
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4" /> Create project
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(({ role, projects: p }) =>
            p ? (
              <Card key={p.id} className="flex flex-col transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--primary)]/10 text-xs font-semibold text-[color:var(--primary)]">
                      {p.key}
                    </span>
                    <Badge tone={ROLE_TONES[role]}>{role.replace('_', ' ')}</Badge>
                  </div>
                  <CardTitle className="mt-2">
                    <Link href={`/projects/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {p.description ?? 'No description.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter>
                  <span className="text-xs text-[color:var(--muted-foreground)]">
                    Created {formatDate(p.created_at)}
                  </span>
                  <Link
                    href={`/projects/${p.id}`}
                    className="text-xs font-medium text-[color:var(--primary)] hover:underline"
                  >
                    Open →
                  </Link>
                </CardFooter>
              </Card>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
